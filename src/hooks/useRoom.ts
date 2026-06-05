'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type PlayerState = {
  id: string
  name: string
  ready: boolean
  score: number | null
  finishedAt: number | null
}

export type RoomPhase = 'lobby' | 'countdown' | 'playing' | 'results'

export type RoomEvent =
  | { type: 'ready'; playerId: string }
  | { type: 'countdown_start'; startAt: number }
  | { type: 'score'; playerId: string; score: number; finishedAt: number }
  | { type: 'game_start' }

export type RoomState = {
  phase: RoomPhase
  players: Record<string, PlayerState>
  countdown: number
  gameSlug: string
  hostId: string
}

function generateId() {
  return Math.random().toString(36).slice(2, 10)
}

function getStoredPlayer(): { id: string; name: string } {
  if (typeof window === 'undefined') return { id: '', name: '' }
  const stored = localStorage.getItem('sa_player')
  if (stored) return JSON.parse(stored)
  const player = { id: generateId(), name: `Player_${Math.floor(Math.random() * 9999)}` }
  localStorage.setItem('sa_player', JSON.stringify(player))
  return player
}

export function useRoom(roomCode: string, gameSlug: string) {
  const [room, setRoom] = useState<RoomState>({
    phase: 'lobby',
    players: {},
    countdown: 3,
    gameSlug,
    hostId: '',
  })
  const [me, setMe] = useState<PlayerState | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const meRef = useRef<PlayerState | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const player = getStoredPlayer()
    const myState: PlayerState = { id: player.id, name: player.name, ready: false, score: null, finishedAt: null }
    setMe(myState)
    meRef.current = myState

    const supabase = createClient()
    const channel = supabase.channel(`room:${roomCode}`, {
      config: { presence: { key: player.id } },
    })
    channelRef.current = channel

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PlayerState>()
        const players: Record<string, PlayerState> = {}
        let hostId = ''
        Object.entries(state).forEach(([key, presences]) => {
          const p = presences[0] as PlayerState
          players[key] = p
          if (!hostId) hostId = key
        })
        setRoom(r => ({ ...r, players, hostId }))
      })
      .on('broadcast', { event: 'room_event' }, ({ payload }: { payload: RoomEvent }) => {
        handleEvent(payload)
      })
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          await channel.track(myState)
        }
      })

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
      supabase.removeChannel(channel)
    }
  }, [roomCode]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleEvent = useCallback((event: RoomEvent) => {
    if (event.type === 'countdown_start') {
      const { startAt } = event
      setRoom(r => ({ ...r, phase: 'countdown', countdown: 3 }))
      countdownRef.current = setInterval(() => {
        const remaining = Math.ceil((startAt - Date.now()) / 1000)
        if (remaining <= 0) {
          clearInterval(countdownRef.current!)
          setRoom(r => ({ ...r, phase: 'playing', countdown: 0 }))
          broadcast({ type: 'game_start' })
        } else {
          setRoom(r => ({ ...r, countdown: remaining }))
        }
      }, 100)
    }

    if (event.type === 'ready') {
      setRoom(r => ({
        ...r,
        players: {
          ...r.players,
          [event.playerId]: { ...r.players[event.playerId], ready: true },
        },
      }))
    }

    if (event.type === 'score') {
      setRoom(r => {
        const updated = {
          ...r,
          players: {
            ...r.players,
            [event.playerId]: {
              ...r.players[event.playerId],
              score: event.score,
              finishedAt: event.finishedAt,
            },
          },
        }
        const allDone = Object.values(updated.players).every(p => p.score !== null)
        return { ...updated, phase: allDone ? 'results' : r.phase }
      })
    }
  }, [])

  const broadcast = useCallback((event: RoomEvent) => {
    channelRef.current?.send({ type: 'broadcast', event: 'room_event', payload: event })
  }, [])

  const setReady = useCallback(() => {
    const me = meRef.current
    if (!me) return
    broadcast({ type: 'ready', playerId: me.id })
    setRoom(r => ({
      ...r,
      players: { ...r.players, [me.id]: { ...r.players[me.id], ready: true } },
    }))
  }, [broadcast])

  const startCountdown = useCallback(() => {
    const startAt = Date.now() + 3500
    broadcast({ type: 'countdown_start', startAt })
    handleEvent({ type: 'countdown_start', startAt })
  }, [broadcast, handleEvent])

  const submitScore = useCallback((score: number) => {
    const me = meRef.current
    if (!me) return
    const payload: RoomEvent = { type: 'score', playerId: me.id, score, finishedAt: Date.now() }
    broadcast(payload)
    handleEvent(payload)
  }, [broadcast, handleEvent])

  const isHost = me ? room.hostId === me.id : false
  const allReady = Object.values(room.players).length >= 2 &&
    Object.values(room.players).every(p => p.ready)

  return { room, me, isHost, allReady, setReady, startCountdown, submitScore }
}
