import { useCallback, useEffect, useRef, useState } from 'react'
import { predictArsl } from '../services/api'

/**
 * Stable ARSL recognition via fixed-interval polling of landmarksRef + temporal voting.
 * When tracking is locked, show low-confidence live guesses in the center and accept
 * sooner — HF word model often peaks ~0.20–0.35 on live demos.
 */
export function useArsl({
  landmarksRef,
  enabled = false,
  intervalMs = 450,
  threshold = 0.38,
  voteSize = 6,
  voteNeed = 3,
  trackingQuality = 'lost',
} = {}) {
  const [result, setResult] = useState(null)
  const [status, setStatus] = useState('idle')
  const busy = useRef(false)
  const votesRef = useRef([])
  const lastAcceptedRef = useRef(null)
  const qualityRef = useRef(trackingQuality)
  qualityRef.current = trackingQuality

  useEffect(() => {
    if (trackingQuality === 'lost') {
      votesRef.current = []
      lastAcceptedRef.current = null
      setResult(null)
    }
  }, [trackingQuality])

  useEffect(() => {
    if (!enabled) {
      setStatus('idle')
      votesRef.current = []
      return
    }

    const id = setInterval(async () => {
      const landmarks = landmarksRef?.current
      if (!landmarks || busy.current) return
      if (qualityRef.current === 'lost') return

      const locked = qualityRef.current === 'locked'
      // Live demo: model often returns ~0.22–0.35; don't insist on settings threshold while locked
      const acceptFloor = locked ? Math.min(threshold, 0.22) : threshold
      const tallyFloor = locked ? 0.15 : threshold * 0.85
      const need = locked ? Math.min(voteNeed, 2) : voteNeed + 1
      const guessFloor = locked ? 0.18 : Math.max(0.55, threshold + 0.12)

      busy.current = true
      setStatus('predicting')
      try {
        // Ask backend with softer threshold when locked so `accepted` aligns with demo UX
        const data = await predictArsl(landmarks, locked ? acceptFloor : threshold)
        if (!data || data.error) {
          setStatus('ready')
          return
        }

        votesRef.current.push({
          label: data.label,
          display: data.display,
          confidence: data.confidence,
          accepted: Boolean(data.accepted),
        })
        if (votesRef.current.length > voteSize) {
          votesRef.current = votesRef.current.slice(-voteSize)
        }

        const tallies = new Map()
        for (const v of votesRef.current) {
          if (v.confidence < tallyFloor) continue
          const prev = tallies.get(v.label) || { count: 0, conf: 0, display: v.display }
          prev.count += 1
          prev.conf += v.confidence
          tallies.set(v.label, prev)
        }

        let winner = null
        for (const [label, info] of tallies.entries()) {
          const avg = info.conf / info.count
          if (info.count >= need && avg >= acceptFloor) {
            if (
              !winner ||
              info.count > winner.votes ||
              (info.count === winner.votes && avg > winner.confidence)
            ) {
              winner = {
                label,
                display: info.display,
                confidence: avg,
                accepted: true,
                votes: info.count,
              }
            }
          }
        }

        if (winner) {
          const prev = lastAcceptedRef.current
          if (!prev || prev.label !== winner.label) {
            lastAcceptedRef.current = winner
            setResult(winner)
          } else {
            setResult((r) =>
              r ? { ...r, confidence: winner.confidence, votes: winner.votes } : winner,
            )
          }
        } else {
          const last = votesRef.current[votesRef.current.length - 1]
          if (last && last.confidence >= guessFloor) {
            setResult((r) => {
              if (r?.accepted && lastAcceptedRef.current?.label === r.label) return r
              return {
                label: last.label,
                display: last.display,
                confidence: last.confidence,
                accepted: false,
              }
            })
          } else if (!lastAcceptedRef.current) {
            setResult(null)
          }
        }
        setStatus('ready')
      } catch (err) {
        setStatus('error')
        setResult({ error: err?.message || 'فشل التعرف', accepted: false })
      } finally {
        busy.current = false
      }
    }, intervalMs)

    return () => clearInterval(id)
  }, [enabled, landmarksRef, intervalMs, threshold, voteSize, voteNeed])

  const reset = useCallback(() => {
    setResult(null)
    votesRef.current = []
    lastAcceptedRef.current = null
  }, [])

  return { result, status, reset }
}
