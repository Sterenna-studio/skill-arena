import { supabase } from '/lab/shared/supabaseClient.js';

export async function addGold(earned) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    alert("Non connecté, impossible d'ajouter de l'or !");
    return;
  }

  const { error } = await supabase
    .from('players')
    .update({ gold: supabase.sql`gold + ${earned}` })
    .eq('id', user.id);

  if (error) {
    console.error(error);
    alert("Erreur lors de l'ajout d'or !");
  } else {
    alert(`+${earned} gold ajoutés à ton compte !`);
  }
}
