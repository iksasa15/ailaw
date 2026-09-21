import { useCallback, useEffect, useRef, useState } from 'react'
import { getWsBase } from '../services/api'

/**
 * Realtime scene sync for a paired room (lawyer ↔ person).
 * Replaces HTTP polling with WSS /ws/scene?room=&role=
 */
export function useSceneSocket({
  enabled = false,
  room = '',
  role = null,
  onRemotePhrase,
} = {}) {
  const [syncState, setSyncState] = useState('waiting') // synced | waiting | offline
  const [lawyerPhrase, setLawyerPhrase] = useState(null)
  const [personPhrase, setPersonPhrase] = useState(null)
  const [history, setHistory] = useState([])
  const [connected, setConnected] = useState(false)

  const wsRef = useRef(null)
  const intentionalCloseRef = useRef(false)
  const retryRef = useRef(0)
  const retryTimerRef = useRef(0)
  const lastPhraseAtRef = useRef(0)
  const lastOkAtRef = useRef(0)
  const onRemoteRef = useRef(onRemotePhrase)
  const generationRef = useRef(0)

  onRemoteRef.current = onRemotePhrase

  const refreshBadge = useCallback(() => {
    const now = Date.now()
    const phraseFresh = now - lastPhraseAtRef.current < 2500
    const backendFresh = now - lastOkAtRef.current < 5000
    if (phraseFresh) setSyncState('synced')
    else if (backendFresh || connected) setSyncState('waiting')
    else setSyncState('offline')
  }, [connected])

  const applySnapshot = useCallback((msg) => {
    lastOkAtRef.current = Date.now()
    if (msg.lawyer?.text) {
      setLawyerPhrase({
        fingers: msg.lawyer.fingers ?? null,
        text: msg.lawyer.text,
        at: msg.lawyer.at || Date.now(),
      })
    }
    if (msg.person?.text) {
      setPersonPhrase({
        fingers: msg.person.fingers ?? null,
        text: msg.person.text,
        at: msg.person.at || Date.now(),
      })
    }
    if (Array.isArray(msg.history)) setHistory(msg.history)
    refreshBadge()
  }, [refreshBadge])

  const applyPhrase = useCallback(
    (msg) => {
      lastOkAtRef.current = Date.now()
      lastPhraseAtRef.current = Date.now()
      const phrase = {
        fingers: msg.fingers ?? null,
        text: msg.text,
        at: msg.at || Date.now(),
        role: msg.role,
      }
      if (msg.role === 'lawyer') setLawyerPhrase(phrase)
      if (msg.role === 'person') setPersonPhrase(phrase)
      setHistory((prev) => [...prev, phrase].slice(-20))
      onRemoteRef.current?.(phrase)
      refreshBadge()
    },
    [refreshBadge],
  )

  const disconnect = useCallback(() => {
    intentionalCloseRef.current = true
    generationRef.current += 1
    if (retryTimerRef.current) {
      window.clearTimeout(retryTimerRef.current)
      retryTimerRef.current = 0
    }
    try {
      wsRef.current?.close()
    } catch {
      /* ignore */
    }
    wsRef.current = null
    setConnected(false)
  }, [])

  const connect = useCallback(() => {
    if (!enabled || !room) return
    const gen = ++generationRef.current
    intentionalCloseRef.current = false
    try {
      wsRef.current?.close()
    } catch {
      /* ignore */
    }

    const q = new URLSearchParams({ room })
    if (role === 'lawyer' || role === 'person') q.set('role', role)
    const url = `${getWsBase()}/ws/scene?${q.toString()}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      if (gen !== generationRef.current) return
      lastOkAtRef.current = Date.now()
      retryRef.current = 0
      setConnected(true)
      refreshBadge()
    }

    ws.onmessage = (ev) => {
      if (gen !== generationRef.current) return
      try {
        const msg = JSON.parse(ev.data)
        if (msg.type === 'snapshot') applySnapshot(msg)
        else if (msg.type === 'phrase') applyPhrase(msg)
        else if (msg.type === 'pong') {
          lastOkAtRef.current = Date.now()
          refreshBadge()
        }
      } catch {
        /* ignore */
      }
    }

    ws.onclose = () => {
      if (gen !== generationRef.current) return
      setConnected(false)
      if (intentionalCloseRef.current) return
      setSyncState('offline')
      if (retryRef.current < 8) {
        retryRef.current += 1
        const delay = Math.min(4000, 600 * retryRef.current)
        retryTimerRef.current = window.setTimeout(() => {
          if (enabled) connect()
        }, delay)
      }
    }

    ws.onerror = () => {
      /* onclose handles retry */
    }
  }, [enabled, room, role, applySnapshot, applyPhrase, refreshBadge])

  useEffect(() => {
    if (!enabled || !room) {
      disconnect()
      setSyncState('waiting')
      return undefined
    }
    connect()
    const badgeId = window.setInterval(refreshBadge, 500)
    const pingId = window.setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }))
      }
    }, 12000)
    return () => {
      window.clearInterval(badgeId)
      window.clearInterval(pingId)
      disconnect()
    }
  }, [enabled, room, role, connect, disconnect, refreshBadge])

  const markLocalPublish = useCallback(() => {
    lastPhraseAtRef.current = Date.now()
    lastOkAtRef.current = Date.now()
    refreshBadge()
  }, [refreshBadge])

  return {
    syncState,
    connected,
    lawyerPhrase,
    personPhrase,
    history,
    markLocalPublish,
  }
}
