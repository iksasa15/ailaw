import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import { resolveSignClips, STEP_MS, translateToSigns } from './signTranslate'
import { SIGN_VOCABULARY } from '../data/signVocabulary'

const V = (clip) => `/signs/videos/${clip}.mp4`
const kinds = (r) => r.steps.map((s) => s.kind)
const srcs = (r) => r.steps.filter((s) => s.kind === 'video').map((s) => s.src)
const labels = (r) => r.steps.map((s) => s.label)

describe('scenario sentences', () => {
  test('a full scenario sentence plays its sentence clips', () => {
    const r = translateToSigns('السلام عليكم، أنا محاميك')
    expect(srcs(r)).toEqual([V('word-hello'), V('word-lawyer')])
    expect(r.steps.every((s) => s.token === null)).toBe(true)
  })
  test('diacritics, and a scenario sentence inside longer speech', () => {
    expect(srcs(translateToSigns('سأتابعُ القضيةَ غداً'))).toEqual([V('word-follow'), V('word-case')])
    expect(srcs(translateToSigns('طيب، هل لديك تقرير شرطة؟ أخبرني'))).toEqual([V('word-ask'), V('word-paper')])
  })
  test('every scenario sentence in one chunk is played, in spoken order', () => {
    expect(srcs(translateToSigns('سنطالب بالتعويض وبعدها سأتابع القضية غداً'))).toEqual([
      V('word-protect'),
      V('word-case'),
      V('word-follow'),
      V('word-case'),
    ])
    expect(srcs(translateToSigns('سأتابع القضية غداً ثم سنطالب بالتعويض'))).toEqual([
      V('word-follow'),
      V('word-case'),
      V('word-protect'),
      V('word-case'),
    ])
  })
})

describe('word by word', () => {
  test('the spec example: card, sign, then spelling', () => {
    const r = translateToSigns('نحتاج الأوراق يوم الأحد')
    expect(r.tokens).toEqual(['نحتاج', 'الأوراق', 'يوم', 'الأحد'])
    expect(kinds(r)).toEqual(['word', 'video', 'letter', 'letter', 'letter', 'letter', 'letter', 'letter'])
    expect(labels(r)).toEqual(['نحتاج', 'ورقة', 'ي', 'و', 'م', 'ا', 'ح', 'د'])
    expect(r.steps.map((s) => s.token)).toEqual([0, 1, 2, 2, 2, 3, 3, 3])
  })
  test('prefixes and suffixes are stripped for lookup', () => {
    expect(srcs(translateToSigns('والأوراق'))).toEqual([V('word-paper')])
    expect(srcs(translateToSigns('قضيتك'))).toEqual([V('word-case')])
    expect(srcs(translateToSigns('محاميكم'))).toEqual([V('word-lawyer')])
  })
  test('a stripped stem shorter than 3 letters is not a match', () => {
    expect(labels(translateToSigns('كما'))).toEqual(['ك', 'م', 'ا'])
  })
  test('a two-word phrase wins over its particle', () => {
    const r = translateToSigns('من فضلك اكتب')
    expect(srcs(r)).toEqual([V('word-please'), V('word-write')])
    expect(r.steps.map((s) => [s.token, s.span])).toEqual([[0, 2], [2, 1]])
  })
  test('particles are skipped in signs but kept in tokens', () => {
    const r = translateToSigns('في القضية')
    expect(r.tokens).toEqual(['في', 'القضية'])
    expect(r.steps.map((s) => [s.kind, s.token])).toEqual([['video', 1]])
    expect(translateToSigns('في على').steps).toEqual([])
  })
  test('short unknown words are spelled, لا counts as one letter', () => {
    expect(labels(translateToSigns('علاج'))).toEqual(['ع', 'لا', 'ج'])
  })
  test('spelling follows the spoken word: ة and ى keep their own hand-shapes', () => {
    expect(labels(translateToSigns('سنة'))).toEqual(['س', 'ن', 'ة'])
    expect(labels(translateToSigns('سَنَةٌ'))).toEqual(['س', 'ن', 'ة'])
    expect(labels(translateToSigns('ليلة شرطة'))).toEqual(['ل', 'ي', 'ل', 'ة', 'ش', 'ر', 'ط', 'ة'])
    expect(labels(translateToSigns('هدى'))).toEqual(['ه', 'د', 'ى'])
  })
  test('longer unknown words and numbers become a written card', () => {
    expect(translateToSigns('المستشفى').steps).toEqual([{ kind: 'word', label: 'المستشفى', token: 0, span: 1 }])
    expect(kinds(translateToSigns('2025 ٢٠٢٥'))).toEqual(['word', 'word'])
  })
  test('empty input', () => {
    expect(translateToSigns('')).toEqual({ tokens: [], steps: [] })
    expect(translateToSigns('  ،،  ').steps).toEqual([])
  })
})

describe('resolveSignClips (lens and record)', () => {
  test('a finger count picks the scenario clips', () => {
    expect(resolveSignClips({ fingers: 4 }).map((c) => c.src)).toEqual([V('word-ask'), V('word-paper')])
  })
  test('spellLetters spells everything', () => {
    expect(resolveSignClips({ text: 'سلام' }, { spellLetters: true }).map((c) => c.label)).toEqual(['س', 'لا', 'م'])
  })
  test('free text uses the engine; written cards have type word', () => {
    expect(resolveSignClips({ text: 'نحتاج الأوراق' }).map((c) => c.type)).toEqual(['word', 'video'])
  })
  test('nothing to sign → null', () => {
    expect(resolveSignClips({ text: 'في' })).toBeNull()
    expect(resolveSignClips(null)).toBeNull()
  })
})

test('every vocabulary clip exists on disk', () => {
  for (const { clip } of SIGN_VOCABULARY) {
    const file = fileURLToPath(new URL(`../../public/signs/videos/${clip}.mp4`, import.meta.url))
    expect(existsSync(file), clip).toBe(true)
  }
})

test('step durations', () => {
  expect(STEP_MS).toEqual({ letter: 800, word: 1200, videoMax: 4000, gap: 400 })
})
