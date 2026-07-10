-- ================================================
-- GOLD GARDEN PRO - Configuration Supabase
-- ================================================

-- 1. TABLE FARMING STATE
CREATE TABLE IF NOT EXISTS public.farming_state (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  last_claim TIMESTAMPTZ DEFAULT NOW(),
  total_harvests INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  last_streak_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.farming_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "farming_select_own" ON public.farming_state FOR SELECT USING (auth.uid() = id);
CREATE POLICY "farming_insert_own" ON public.farming_state FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "farming_update_own" ON public.farming_state FOR UPDATE USING (auth.uid() = id);


-- 2. TABLE FARMING PROGRESS (pour tracer les stats avancées)
CREATE TABLE IF NOT EXISTS public.farming_progress (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  total_gold_earned BIGINT DEFAULT 0,
  dimensions_purchased INTEGER DEFAULT 1,
  has_gardener BOOLEAN DEFAULT FALSE,
  has_quantum_dimension BOOLEAN DEFAULT FALSE,
  lucky_harvests INTEGER DEFAULT 0,
  normal_harvests INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.farming_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "progress_own" ON public.farming_progress FOR ALL USING (auth.uid() = id);


-- 3. RPC CLAIM FARMING GOLD
CREATE OR REPLACE FUNCTION public.claim_farming_gold(
  p_player_id UUID,
  p_gold_amount INTEGER,
  p_game_type TEXT DEFAULT 'gold-garden'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_last_claim TIMESTAMPTZ;
  v_cooldown_minutes INTEGER := 60;
  v_current_streak INTEGER;
  v_last_streak_date DATE;
  v_new_streak INTEGER;
  v_bonus_multiplier DECIMAL := 1.0;
  v_final_gold INTEGER;
BEGIN
  IF p_player_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT last_claim, streak_days, last_streak_date 
  INTO v_last_claim, v_current_streak, v_last_streak_date
  FROM farming_state WHERE id = p_player_id;

  IF v_last_claim IS NULL THEN
    INSERT INTO farming_state (id, last_claim, total_harvests, streak_days, last_streak_date)
    VALUES (p_player_id, NOW() - INTERVAL '2 hours', 0, 0, CURRENT_DATE)
    ON CONFLICT (id) DO NOTHING;

    v_last_claim := NOW() - INTERVAL '2 hours';
    v_current_streak := 0;
    v_last_streak_date := CURRENT_DATE;
  END IF;

  -- Cooldown check
  IF NOW() - v_last_claim < (v_cooldown_minutes || ' minutes')::INTERVAL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'cooldown',
      'remaining_seconds', EXTRACT(EPOCH FROM (
        v_last_claim + (v_cooldown_minutes || ' minutes')::INTERVAL - NOW()
      ))::INTEGER
    );
  END IF;

  -- Streak calculation
  IF CURRENT_DATE > v_last_streak_date THEN
    IF CURRENT_DATE - v_last_streak_date = 1 THEN
      v_new_streak := v_current_streak + 1;
      v_bonus_multiplier := 1.0 + (v_new_streak * 0.1);
    ELSE
      v_new_streak := 1;
      v_bonus_multiplier := 1.0;
    END IF;
  ELSE
    v_new_streak := v_current_streak;
    v_bonus_multiplier := 1.0 + (v_current_streak * 0.1);
  END IF;

  v_final_gold := FLOOR(p_gold_amount * v_bonus_multiplier);

  -- Award gold
  BEGIN
    PERFORM award_gold(
      p_player_id := p_player_id,
      p_delta := v_final_gold,
      p_source := p_game_type,
      p_ref := 'farming:' || NOW()::TEXT,
      p_metadata := jsonb_build_object(
        'type', 'claim',
        'streak', v_new_streak,
        'bonus_multiplier', v_bonus_multiplier
      )
    );
  EXCEPTION WHEN undefined_function THEN
    UPDATE players SET gold = COALESCE(gold, 0) + v_final_gold WHERE id = p_player_id;
  END;

  -- Update farming state
  UPDATE farming_state
  SET 
    last_claim = NOW(),
    total_harvests = total_harvests + 1,
    streak_days = v_new_streak,
    last_streak_date = CURRENT_DATE,
    updated_at = NOW()
  WHERE id = p_player_id;

  -- Update progress
  UPDATE farming_progress
  SET total_gold_earned = total_gold_earned + v_final_gold
  WHERE id = p_player_id;

  RETURN jsonb_build_object(
    'success', true,
    'gold_earned', v_final_gold,
    'streak', v_new_streak,
    'bonus_multiplier', v_bonus_multiplier,
    'next_claim', NOW() + (v_cooldown_minutes || ' minutes')::INTERVAL
  );
END;
$$;

-- 4. INDEX
CREATE INDEX IF NOT EXISTS idx_farming_state_last_claim ON public.farming_state(last_claim);
CREATE INDEX IF NOT EXISTS idx_farming_state_streak ON public.farming_state(streak_days DESC);
CREATE INDEX IF NOT EXISTS idx_farming_progress_gold ON public.farming_progress(total_gold_earned DESC);

-- 5. Done
COMMIT;
