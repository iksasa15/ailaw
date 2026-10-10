import { Link } from 'react-router-dom'
import { usePlatform } from '../../platform/PlatformContext'
import { BrandIcon, BrandMark } from '../../components/brand/BrandMark'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Icon } from '../../components/ui/Icon'

const STEPS = [
  { icon: 'calendar', title: 'احجز جلستك', text: 'اختر محامياً يفهم احتياجك، وحدد اليوم والوقت وطريقة التواصل.' },
  { icon: 'video', title: 'ادخل الجلسة', text: 'إشارتك تُنطق صوتاً للمحامي، وكلامه يظهر لك نصاً وإشارة — مباشرة.' },
  { icon: 'file', title: 'استلم المحضر', text: 'ملخص بالوقائع والتوجيهات وسجل كامل للمحادثة، جاهز للطباعة.' },
]

const FEATURES = [
  { icon: 'hand', title: 'ترجمة فورية بالاتجاهين', text: 'الكاميرا تقرأ الإشارة وعدد الأصابع والحروف، والمايك يحوّل الكلام إلى نص ومترجم إشارة.' },
  { icon: 'users', title: 'محامون يفهمونك', text: 'دليل محامين بتخصصاتهم، ومن يتقن لغة الإشارة واضح من أول نظرة.' },
  { icon: 'file', title: 'محضر موثّق', text: 'كل جلسة تنتهي بمحضر: الوقائع، أسئلة المحامي، والسجل بالأوقات.' },
  { icon: 'book', title: 'تعلّم الإشارة', text: 'دروس للحروف والكلمات وعبارات القضية، مع تدريب بالكاميرا يصحّح لك.' },
  { icon: 'shield', title: 'الخصوصية أولاً', text: 'التعرف على اليد والإشارة يتم داخل جهازك، بدون رفع الفيديو لأي خادم.' },
  { icon: 'glasses', title: 'عدسة ونظارة ذكية', text: 'العدسة نفسها تعمل في الشارع: تنبيه لأصوات الخطر والحواجز القريبة.' },
]

export default function Landing() {
  const { state } = usePlatform()
  const featured = [...state.lawyers].sort((a, b) => b.rating - a.rating || Number(b.signFluent) - Number(a.signFluent)).slice(0, 3)
  const completed = state.bookings.filter((b) => b.status === 'completed').length
  const enter = state.role ? '/app' : '/login'

  return (
    <div className="h-full overflow-y-auto bg-[var(--bg)]">
      <header className="hero-bg relative overflow-hidden text-white">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-5 py-5 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <BrandIcon size={42} />
            <span className="text-xl font-black">النظارة الذكية</span>
          </Link>
          <nav className="hidden items-center gap-7 text-[15px] font-bold text-white/80 md:flex">
            <a href="#how" className="hover:text-white">كيف تعمل</a>
            <a href="#features" className="hover:text-white">المميزات</a>
            <a href="#lawyers" className="hover:text-white">المحامون</a>
          </nav>
          <Link to={enter} className="rounded-full bg-white px-5 py-2.5 text-sm font-black text-[#0b4f4a] hover:bg-white/90">
            {state.role ? 'لوحتي' : 'دخول'}
          </Link>
        </div>

        <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-5 pb-20 pt-10 lg:grid-cols-[1.1fr_1fr] lg:px-8 lg:pb-28 lg:pt-16">
          <div>
            <Badge tone="green" className="!bg-white/12 !text-[#5eead4]">منصة عدالة للصم والبكم</Badge>
            <h1 className="mt-5 text-4xl font-black leading-[1.25] lg:text-6xl">
              كلام المحامي يصبح إشارة
              <br />
              <span className="text-[#5eead4]">وإشارتك تُسمَع صوتاً</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-white/80">
              احجز جلسة مع محامٍ، وادخلها بترجمة فورية بين لغة الإشارة والكلام، واستلم محضراً موثّقاً — كل ذلك من متصفحك.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to={state.role ? '/app/lawyers' : '/login?next=/app/lawyers'}
                className="inline-flex min-h-13 items-center gap-2 rounded-2xl bg-[#5eead4] px-7 text-base font-black text-[#0b1c24] hover:bg-[#7ff0dd]"
              >
                <Icon name="calendar" size={20} /> احجز جلسة
              </Link>
              <Link
                to={state.role ? '/app/lens' : '/login?next=/app/lens'}
                className="inline-flex min-h-13 items-center gap-2 rounded-2xl bg-white/10 px-7 text-base font-black text-white ring-1 ring-white/25 hover:bg-white/15"
              >
                <Icon name="glasses" size={20} /> جرّب العدسة
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="rounded-[28px] bg-white/8 p-6 ring-1 ring-white/15 backdrop-blur">
              <BrandMark height={110} tone="white" className="mx-auto" />
              <div className="mt-6 grid gap-3">
                <div className="rounded-2xl bg-black/25 p-4">
                  <div className="text-xs font-bold text-[#5eead4]">المحامي (صوت ← إشارة)</div>
                  <div className="mt-1 text-lg font-bold">من كان يقود السيارة؟</div>
                </div>
                <div className="rounded-2xl bg-[#0f766e]/60 p-4">
                  <div className="text-xs font-bold text-[#a7f3d0]">الشخص (إشارة ← صوت) · 5 أصابع</div>
                  <div className="mt-1 text-lg font-bold">أنا كنت أقود</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto -mt-10 grid max-w-[1200px] gap-4 px-5 sm:grid-cols-3 lg:px-8">
        {[
          [state.lawyers.length, 'محامين على المنصة', 'users'],
          [completed, 'جلسات مكتملة بمحضر', 'file'],
          ['28 + 10', 'حرفاً وكلمة للتعلّم', 'book'],
        ].map(([value, label, icon]) => (
          <div key={label} className="flex items-center gap-4 rounded-[20px] bg-white p-5 shadow-[0_12px_32px_rgba(11,28,36,0.10)]">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)]">
              <Icon name={icon} size={24} />
            </span>
            <div>
              <div className="text-2xl font-black tabular-nums">{value}</div>
              <div className="text-sm text-[var(--muted)]">{label}</div>
            </div>
          </div>
        ))}
      </section>

      <section id="how" className="mx-auto max-w-[1200px] px-5 py-20 lg:px-8">
        <h2 className="text-center text-3xl font-black">كيف تعمل المنصة؟</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="rounded-[24px] border border-[var(--ring)] bg-white p-6">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-full bg-[var(--accent)] text-lg font-black text-white">{i + 1}</span>
                <Icon name={s.icon} size={24} className="text-[var(--accent)]" />
              </div>
              <h3 className="mt-4 text-xl font-black">{s.title}</h3>
              <p className="mt-2 leading-7 text-[var(--muted)]">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="bg-white py-20">
        <div className="mx-auto max-w-[1200px] px-5 lg:px-8">
          <h2 className="text-center text-3xl font-black">كل ما تحتاجه في مكان واحد</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-[24px] bg-[var(--bg)] p-6">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-white text-[var(--accent)] shadow-sm">
                  <Icon name={f.icon} size={24} />
                </span>
                <h3 className="mt-4 text-lg font-black">{f.title}</h3>
                <p className="mt-2 leading-7 text-[var(--muted)]">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="lawyers" className="mx-auto max-w-[1200px] px-5 py-20 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-3xl font-black">محامون مميزون</h2>
          <Link to={state.role ? '/app/lawyers' : '/login?next=/app/lawyers'} className="font-bold text-[var(--accent)]">
            كل المحامين ←
          </Link>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {featured.map((l) => (
            <div key={l.id} className="rounded-[24px] border border-[var(--ring)] bg-white p-6">
              <div className="flex items-center gap-3">
                <Avatar name={l.name} size={52} />
                <div>
                  <div className="text-lg font-black">{l.name}</div>
                  <div className="text-sm text-[var(--muted)]">{l.title} · {l.city}</div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {l.specialties.map((s) => (
                  <Badge key={s} tone="gray">{s}</Badge>
                ))}
                {l.signFluent ? <Badge tone="accent"><Icon name="hand" size={14} /> يتقن الإشارة</Badge> : null}
              </div>
              <div className="mt-4 flex items-center gap-1 text-sm font-bold text-amber-500">
                <Icon name="star" size={16} /> {l.rating}
                <span className="font-normal text-[var(--muted)]">({l.reviewsCount} تقييم)</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="hero-bg text-white">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-4 px-5 py-10 text-center md:flex-row md:text-right lg:px-8">
          <div className="flex items-center gap-3">
            <BrandIcon size={36} />
            <div>
              <div className="font-black">النظارة الذكية</div>
              <div className="text-sm text-white/65">عدسة AR ومنصة عدالة للصم والبكم</div>
            </div>
          </div>
          <div className="text-sm text-white/65">كل المعالجة على جهازك · بيانات عرض تجريبية</div>
        </div>
      </footer>
    </div>
  )
}
