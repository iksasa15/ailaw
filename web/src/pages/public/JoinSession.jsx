import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useSettings } from '../../app/SettingsContext'
import { publishScenePhrase, setApiBase } from '../../services/api'
import { parseJoinParams } from '../../platform/linkSession'
import Home from '../Home'
import { BrandIcon } from '../../components/brand/BrandMark'
import { Icon } from '../../components/ui/Icon'

const QUICK = ['نعم', 'لا', 'لم أفهم، أعد من فضلك', 'انتظر لحظة', 'أحتاج مساعدة', 'شكراً']
const ROLE_NAMES = { person: 'الشخص الأصم', lawyer: 'المحامي' }

/**
 * ما يفتحه الجوال بعد مسح رمز QR: شاشة دوره في نفس غرفة الجلسة.
 * الشخص يشير بيده (أو يختار رداً سريعاً) فتصل عبارته للحاسب وتُنطق وتُسجَّل في المحضر،
 * ويرى كلام المحامي بمترجم الإشارة.
 */
export default function JoinSession() {
  const [params] = useSearchParams()
  const invite = useMemo(() => parseJoinParams(params), [params])
  const { settings, update } = useSettings()
  const [draft, setDraft] = useState('')
  const [sent, setSent] = useState('')

  // مرة واحدة لكل دعوة: `update` يتغيّر مع كل تغيير في الإعدادات، فالحارس يمنع حلقة
  // تحديث ← إعادة رسم ← إعادة اتصال بالغرفة.
  const applied = settings.roomId === invite?.room && settings.apiBase === invite?.api
  useEffect(() => {
    if (!invite || applied) return
    setApiBase(invite.api)
    update({ apiBase: invite.api, roomId: invite.room, receiveEnabled: true })
  }, [invite, applied, update])

  if (!invite) {
    return (
      <div className="platform-bg flex h-full items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-[24px] bg-white p-6 text-center shadow-lg">
          <BrandIcon size={56} className="mx-auto" />
          <h1 className="mt-4 text-xl font-black">رابط الجلسة غير صالح</h1>
          <p className="mt-2 text-[var(--muted)]">امسح رمز QR من شاشة الجلسة مرة أخرى.</p>
          <Link to="/" className="mt-5 inline-block font-bold text-[var(--accent)]">
            المحامون العرب
          </Link>
        </div>
      </div>
    )
  }

  const ready = applied
  const send = async (text) => {
    const message = String(text || '').trim()
    if (!message) return
    try {
      await publishScenePhrase({ role: invite.role, text: message, fingers: null, room: invite.room })
      setSent(message)
      setDraft('')
      window.setTimeout(() => setSent(''), 2500)
    } catch {
      setSent('تعذّر الإرسال — تحقّق من الاتصال')
    }
  }

  return (
    <div className="flex h-full flex-col bg-black">
      <header className="flex items-center gap-3 bg-[#0b1630] px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
        <BrandIcon size={38} />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate font-black">
            {invite.role === 'person' ? `جلستك مع ${invite.lawyerName || 'المحامي'}` : `جلسة ${invite.personName || 'الموكّل'}`}
          </div>
          <div className="truncate text-xs text-white/65">
            {invite.caseType ? `${invite.caseType} · ` : ''}أنت: {ROLE_NAMES[invite.role]}
          </div>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-300">
          <span className="size-2 animate-pulse rounded-full bg-emerald-400" /> مرتبط
        </span>
      </header>

      <main className="relative min-h-0 flex-1">{ready ? <Home key={invite.room} lockedRole={invite.role} /> : null}</main>

      {invite.role === 'person' ? (
        <form
          className="flex flex-col gap-2 bg-[#0b1630] px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          onSubmit={(e) => {
            e.preventDefault()
            send(draft)
          }}
        >
          {sent ? <div className="rounded-xl bg-emerald-500/15 px-3 py-1.5 text-center text-sm font-bold text-emerald-300">أُرسلت للمحامي: {sent}</div> : null}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {QUICK.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => send(q)}
                className="shrink-0 rounded-full bg-white/10 px-3.5 py-2 text-sm font-bold text-white ring-1 ring-white/10 active:bg-[var(--accent)]"
              >
                {q}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={200}
              placeholder="اكتب للمحامي…"
              aria-label="اكتب للمحامي"
              className="min-h-11 flex-1 rounded-xl bg-white/10 px-3 text-white placeholder:text-white/40 outline-none"
            />
            <button type="submit" disabled={!draft.trim()} aria-label="إرسال" className="flex size-11 items-center justify-center rounded-xl bg-[var(--accent)] text-white disabled:opacity-40">
              <Icon name="send" size={18} />
            </button>
          </div>
        </form>
      ) : null}
    </div>
  )
}
