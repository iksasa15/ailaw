import { describe, expect, test } from 'vitest'
import { inviteApiBase, isLocalOrigin, makeJoinUrl, parseJoinParams, serverCandidates } from './linkSession'

describe('inviteApiBase', () => {
  test('the dev proxy path becomes reachable from the phone through the site origin', () => {
    expect(inviteApiBase('/api', 'https://192.168.1.20:5173')).toBe('https://192.168.1.20:5173/api')
    expect(inviteApiBase('https://localhost:5173/api', 'https://192.168.1.20:5173')).toBe('https://192.168.1.20:5173/api')
  })

  test('an external server (tunnel) is used as is', () => {
    expect(inviteApiBase('https://abc.trycloudflare.com/', 'https://192.168.1.20:5173')).toBe('https://abc.trycloudflare.com')
  })

  test('a localhost server is rewritten to the site host so the phone can reach it', () => {
    expect(inviteApiBase('http://localhost:8000', 'https://192.168.1.20:5173')).toBe('http://192.168.1.20:8000')
  })
})

describe('isLocalOrigin', () => {
  test('localhost and 127.0.0.1 are not reachable from a phone', () => {
    expect(isLocalOrigin('http://localhost:5173')).toBe(true)
    expect(isLocalOrigin('https://127.0.0.1:5173')).toBe(true)
    expect(isLocalOrigin('https://192.168.1.20:5173')).toBe(false)
  })
})

describe('join link', () => {
  const invite = {
    siteOrigin: 'https://192.168.1.20:5173',
    api: 'https://192.168.1.20:5173/api',
    room: 'abC_12-x',
    role: 'person',
    booking: { id: 'b-today', lawyerName: 'أ. سارة القحطاني', personName: 'أحمد العتيبي', caseType: 'حادث مروري' },
  }

  test('round-trips through the URL', () => {
    const url = new URL(makeJoinUrl(invite))
    expect(url.origin).toBe('https://192.168.1.20:5173')
    expect(url.pathname).toBe('/join')
    expect(parseJoinParams(url.searchParams)).toEqual({
      api: 'https://192.168.1.20:5173/api',
      room: 'abC_12-x',
      role: 'person',
      bookingId: 'b-today',
      lawyerName: 'أ. سارة القحطاني',
      personName: 'أحمد العتيبي',
      caseType: 'حادث مروري',
    })
  })

  test('invalid links are rejected', () => {
    const bad = (q) => parseJoinParams(new URLSearchParams(q))
    expect(bad('api=https://x.test&room=ab&role=person')).toBeNull() // room too short
    expect(bad('api=javascript:alert(1)&room=abcd1234&role=person')).toBeNull()
    expect(bad('api=https://x.test&room=abcd1234&role=judge')).toBeNull()
    expect(bad('room=abcd1234&role=person')).toBeNull()
  })
})

describe('serverCandidates', () => {
  test('stored server first, then the dev proxy, then port 8000 on this host — no duplicates', () => {
    expect(serverCandidates('https://old.trycloudflare.com', { origin: 'http://localhost:5175', protocol: 'http:', hostname: 'localhost' })).toEqual([
      'https://old.trycloudflare.com',
      'http://localhost:5175/api',
      'http://localhost:8000',
    ])
  })

  test('on https the plain http port is skipped (the browser would block it)', () => {
    expect(serverCandidates('https://192.168.1.20:5173/api', { origin: 'https://192.168.1.20:5173', protocol: 'https:', hostname: '192.168.1.20' })).toEqual([
      'https://192.168.1.20:5173/api',
    ])
  })
})
