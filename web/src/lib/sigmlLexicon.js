import { LAWYER_PHRASES } from '../hooks/useFingerPhrases'

/**
 * قاموس SiGML (HamNoSys gestural) لعبارات المحامي.
 * يُشغَّل عبر CWASA — أفتار ثلاثي الأبعاد يوقّع فعلياً.
 */

function wrap(signs) {
  return `<?xml version="1.0" encoding="utf-8"?>\n<sigml>\n${signs}\n</sigml>`
}

function sign(gloss, body) {
  return `<hamgestural_sign gloss="${gloss}">
  <sign_manual>
${body}
  </sign_manual>
</hamgestural_sign>`
}

/** إشارات أساسية قابلة لإعادة الاستخدام */
const S = {
  me: sign(
    'ME',
    `    <handconfig handshape="pointflat" thumbpos="across"/>
    <handconfig extfidir="o" palmor="in"/>
    <location_bodyarm location="chest" contact="touch"/>
    <tgt_motion>
      <changeposture/>
      <handconfig extfidir="o" palmor="in"/>
    </tgt_motion>`,
  ),
  you: sign(
    'YOU',
    `    <handconfig handshape="pointflat" thumbpos="across"/>
    <handconfig extfidir="o" palmor="l"/>
    <location_bodyarm location="shoulders" contact="close"/>
    <directedmotion direction="o" size="small"/>`,
  ),
  please: sign(
    'PLEASE',
    `    <handconfig handshape="flat" thumbpos="across"/>
    <handconfig extfidir="o" palmor="down"/>
    <location_bodyarm location="chest" contact="touch"/>
    <circularmotion axis="o" size="small"/>`,
  ),
  ask: sign(
    'ASK',
    `    <handconfig handshape="pointflat"/>
    <handconfig extfidir="u" palmor="in"/>
    <location_bodyarm location="chin" contact="close"/>
    <directedmotion direction="o" size="small"/>`,
  ),
  what: sign(
    'WHAT',
    `    <handconfig handshape="flat" thumbpos="open"/>
    <handconfig extfidir="o" palmor="up"/>
    <location_bodyarm location="stomach" contact="close"/>
    <par_motion>
      <directedmotion direction="l" size="small"/>
      <directedmotion direction="r" size="small"/>
    </par_motion>`,
  ),
  when: sign(
    'WHEN',
    `    <handconfig handshape="pointflat"/>
    <handconfig extfidir="u" palmor="in"/>
    <location_bodyarm location="cheek" contact="close"/>
    <circularmotion axis="o" size="small"/>`,
  ),
  where: sign(
    'WHERE',
    `    <handconfig handshape="pointflat"/>
    <handconfig extfidir="u" palmor="l"/>
    <location_bodyarm location="shoulders"/>
    <directedmotion direction="l" size="small"/>
    <directedmotion direction="r" size="small"/>`,
  ),
  yes: sign(
    'YES',
    `    <handconfig handshape="fist" thumbpos="across"/>
    <handconfig extfidir="o" palmor="down"/>
    <location_bodyarm location="shoulders"/>
    <directedmotion direction="d" size="small"/>`,
  ),
  no: sign(
    'NO',
    `    <handconfig handshape="flat" thumbpos="across"/>
    <handconfig extfidir="o" palmor="l"/>
    <location_bodyarm location="chin" contact="close"/>
    <directedmotion direction="r" size="small"/>`,
  ),
  help: sign(
    'HELP',
    `    <handconfig handshape="fist" thumbpos="across"/>
    <handconfig extfidir="u" palmor="in"/>
    <location_bodyarm location="chest" contact="close"/>
    <directedmotion direction="u" size="small"/>`,
  ),
  thank: sign(
    'THANK',
    `    <handconfig handshape="flat" thumbpos="across"/>
    <handconfig extfidir="o" palmor="in"/>
    <location_bodyarm location="chin" contact="touch"/>
    <directedmotion direction="o" size="small"/>`,
  ),
  paper: sign(
    'PAPER',
    `    <handconfig handshape="flat" thumbpos="across"/>
    <handconfig extfidir="o" palmor="up"/>
    <location_bodyarm location="stomach"/>
    <directedmotion direction="d" size="small"/>`,
  ),
  write: sign(
    'WRITE',
    `    <handconfig handshape="pinch12" thumbpos="opposed"/>
    <handconfig extfidir="o" palmor="down"/>
    <location_bodyarm location="stomach"/>
    <directedmotion direction="l" size="small"/>`,
  ),
  protect: sign(
    'PROTECT',
    `    <handconfig handshape="flat" thumbpos="across"/>
    <handconfig extfidir="o" palmor="in"/>
    <location_bodyarm location="chest" contact="close"/>
    <circularmotion axis="o" size="small"/>`,
  ),
  lawyer: sign(
    'LAWYER',
    `    <handconfig handshape="flat" thumbpos="across"/>
    <handconfig extfidir="u" palmor="in"/>
    <location_bodyarm location="forehead" contact="close"/>
    <directedmotion direction="d" size="small"/>
    <handconfig handshape="flat"/>
    <location_bodyarm location="chest" contact="touch"/>`,
  ),
  case: sign(
    'CASE',
    `    <handconfig handshape="ceeall" thumbpos="opposed"/>
    <handconfig extfidir="o" palmor="l"/>
    <location_bodyarm location="chest"/>
    <directedmotion direction="d" size="small"/>`,
  ),
  witness: sign(
    'WITNESS',
    `    <handconfig handshape="pointflat"/>
    <handconfig extfidir="o" palmor="in"/>
    <location_bodyarm location="eye" contact="close"/>
    <directedmotion direction="o" size="small"/>`,
  ),
  evidence: sign(
    'EVIDENCE',
    `    <handconfig handshape="flat" thumbpos="open"/>
    <handconfig extfidir="o" palmor="up"/>
    <location_bodyarm location="stomach"/>
    <directedmotion direction="u" size="small"/>`,
  ),
  follow: sign(
    'FOLLOW',
    `    <handconfig handshape="pointflat"/>
    <handconfig extfidir="o" palmor="down"/>
    <location_bodyarm location="shoulders"/>
    <directedmotion direction="o" size="mod"/>`,
  ),
  hello: sign(
    'HELLO',
    `    <handconfig handshape="flat" thumbpos="open"/>
    <handconfig extfidir="u" palmor="o"/>
    <location_bodyarm location="forehead" contact="close"/>
    <directedmotion direction="o" size="small"/>`,
  ),
}

/** عبارات المحامي 1–10 → تسلسل إشارات */
export const LAWYER_SIGML = {
  1: wrap([S.me, S.lawyer, S.you, S.please].join('\n')),
  2: wrap([S.ask, S.what, S.case].join('\n')),
  3: wrap([S.when, S.what].join('\n')),
  4: wrap([S.ask, S.witness, S.you].join('\n')),
  5: wrap([S.where, S.evidence].join('\n')),
  6: wrap([S.me, S.paper, S.you].join('\n')),
  7: wrap([S.no, S.protect, S.you].join('\n')),
  8: wrap([S.paper, S.please].join('\n')),
  9: wrap([S.write, S.please].join('\n')),
  10: wrap([S.case, S.follow, S.yes].join('\n')),
}

const WORD_SIGML = {
  أنا: S.me,
  محامي: S.lawyer,
  محاميك: S.lawyer,
  تفضل: S.please,
  تفضّل: S.please,
  اسأل: S.ask,
  تفاصيل: S.what,
  قضية: S.case,
  القضية: S.case,
  متى: S.when,
  حدث: S.what,
  شهود: S.witness,
  لديك: S.you,
  أين: S.where,
  دليل: S.evidence,
  أوراق: S.paper,
  أوراقك: S.paper,
  مستندات: S.paper,
  وقع: S.write,
  وقّع: S.write,
  توقيع: S.write,
  تخف: S.no,
  أدافع: S.protect,
  أحميك: S.protect,
  شكرا: S.thank,
  شكراً: S.thank,
  مساعدة: S.help,
  ساعدني: S.help,
  مرحبا: S.hello,
  مرحباً: S.hello,
  نعم: S.yes,
  لا: S.no,
  متابعة: S.follow,
}

function normalize(text) {
  return String(text || '')
    .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** ابنِ SiGML من رقم أصابع أو نص عربي حر */
export function buildSigmlForPhrase({ text, fingers } = {}) {
  const n = Number(fingers)
  if (n >= 1 && n <= 10 && LAWYER_SIGML[n]) return LAWYER_SIGML[n]

  const raw = normalize(text)
  if (!raw) return null

  // تطابق عبارة محامي كاملة
  for (let i = 1; i <= 10; i += 1) {
    if (normalize(LAWYER_PHRASES[i]) === raw && LAWYER_SIGML[i]) return LAWYER_SIGML[i]
  }

  const words = raw.split(' ').filter(Boolean).slice(0, 8)
  const parts = []
  for (const w of words) {
    if (WORD_SIGML[w]) parts.push(WORD_SIGML[w])
    else if (w.length <= 2) parts.push(S.what)
    else parts.push(S.ask)
  }
  if (!parts.length) parts.push(S.hello, S.you)
  return wrap(parts.join('\n'))
}
