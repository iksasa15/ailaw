import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { usePlatform } from '../../platform/PlatformContext'
import { BrandIcon } from '../../components/brand/BrandMark'
import { Avatar } from '../../components/ui/Avatar'
import { Icon } from '../../components/ui/Icon'

const LAWYER_ONLY = ['/app/requests', '/app/availability']
const PERSON_ONLY = ['/app/lawyers', '/app/learn']

/** اختيار حساب العرض: الشخص الأصم أو المحامي. */
export default function Login() {
  const { state, login } = usePlatform()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next') || '/app'

  const enter = (role) => {
    login(role)
    const blocked = role === 'lawyer' ? PERSON_ONLY : LAWYER_ONLY
    navigate(blocked.some((p) => next.startsWith(p)) ? '/app' : next, { replace: true })
  }

  const accounts = [
    {
      role: 'person',
      user: state.users.p1,
      title: 'أنا أصم / أبكم',
      text: 'تصفّح المحامين، احجز جلستك، وادخلها بالترجمة الفورية. وتعلّم الإشارة.',
      icon: 'hand',
      tone: 'var(--accent)',
    },
    {
      role: 'lawyer',
      user: state.users.l1,
      title: 'أنا محامٍ',
      text: 'راجع طلبات الحجز، حدد أوقات توفرك، وادخل جلساتك مع موكّليك.',
      icon: 'briefcase',
      tone: 'var(--accent-2)',
    },
  ]

  return (
    <div className="platform-bg flex h-full items-center justify-center overflow-y-auto px-5 py-10">
      <div className="w-full max-w-3xl">
        <Link to="/" className="mx-auto mb-8 flex w-fit items-center gap-3">
          <BrandIcon size={52} />
          <span className="text-2xl font-black text-[var(--ink)]">المحامون العرب</span>
        </Link>
        <h1 className="text-center text-3xl font-black text-[var(--ink)]">ادخل المنصة</h1>
        <p className="mt-2 text-center text-[var(--muted)]">اختر حساب العرض الذي تريد الدخول به — يمكنك التبديل بينهما في أي وقت.</p>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {accounts.map((a) => (
            <button
              key={a.role}
              type="button"
              onClick={() => enter(a.role)}
              className="group flex flex-col items-start gap-4 rounded-[28px] border-2 border-transparent bg-white p-7 text-right shadow-[0_12px_32px_rgba(11,28,36,0.08)] transition hover:-translate-y-0.5 hover:border-[var(--accent)]/40 focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
            >
              <span className="flex size-14 items-center justify-center rounded-2xl text-white" style={{ background: a.tone }}>
                <Icon name={a.icon} size={28} />
              </span>
              <div>
                <div className="text-2xl font-black text-[var(--ink)]">{a.title}</div>
                <p className="mt-2 leading-7 text-[var(--muted)]">{a.text}</p>
              </div>
              <div className="mt-auto flex w-full items-center justify-between border-t border-[var(--ring)] pt-4">
                <span className="flex items-center gap-2.5">
                  <Avatar name={a.user.name} size={34} />
                  <span className="font-bold text-[var(--ink)]">{a.user.name}</span>
                </span>
                <span className="font-black" style={{ color: a.tone }}>دخول ←</span>
              </div>
            </button>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-[var(--muted)]">حسابات عرض تجريبية — البيانات محفوظة في هذا المتصفح فقط.</p>
      </div>
    </div>
  )
}
