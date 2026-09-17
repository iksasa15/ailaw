import { Link } from 'react-router-dom'

/** اختيار شاشة مستقلة: كل جهاز/تبويب بكاميرا خاصة */
export default function ScreenPick() {
  return (
    <div className="h-full overflow-y-auto bg-[#0b1220] px-4 py-8 text-white">
      <div className="mx-auto flex max-w-lg flex-col gap-5">
        <div className="text-center">
          <p className="text-sm text-[#3ecf8e]">النظارة الذكية · قضية</p>
          <h1 className="mt-1 text-2xl font-bold">اختر الشاشة</h1>
          <p className="mt-2 text-sm leading-7 text-white/70">
            افتح كل شاشة على جوال مختلف — لكل واحد كاميرا خاصة به.
          </p>
        </div>

        <Link
          to="/screen/lawyer"
          className="flex flex-col gap-2 rounded-2xl bg-[#5eb8ff]/15 p-5 ring-1 ring-[#5eb8ff]/40"
        >
          <span className="text-3xl" aria-hidden>
            ⚖️
          </span>
          <span className="text-xl font-bold">شاشة المحامي</span>
          <span className="text-sm text-white/70">كاميرا هذا الجهاز · عبارات المحامي · صوت</span>
        </Link>

        <Link
          to="/screen/person"
          className="flex flex-col gap-2 rounded-2xl bg-[#3ecf8e]/15 p-5 ring-1 ring-[#3ecf8e]/40"
        >
          <span className="text-3xl" aria-hidden>
            👤
          </span>
          <span className="text-xl font-bold">شاشة الشخص</span>
          <span className="text-sm text-white/70">
            كاميرا هذا الجهاز · عبارات الشخص · أفتار يترجم كلام المحامي لإشارة
          </span>
        </Link>

        <Link
          to="/"
          className="rounded-xl bg-white/10 px-4 py-3 text-center text-sm text-white"
        >
          العدسة المشتركة (تبديل الأدوار على جهاز واحد)
        </Link>

        <Link to="/guide" className="text-center text-sm text-white/50">
          📖 تعليمات
        </Link>
      </div>
    </div>
  )
}
