import { useNavigate } from 'react-router-dom'
import { usePlatform } from '../../platform/PlatformContext'
import { Avatar } from '../ui/Avatar'
import { Icon } from '../ui/Icon'

const ROLE_LABEL = { person: 'مستفيد (أصم)', lawyer: 'محامٍ' }

/** الحساب الحالي + التبديل بين حسابي العرض. */
export function RoleSwitch({ compact = false }) {
  const { me, state, switchRole } = usePlatform()
  const navigate = useNavigate()
  if (!me) return null
  const other = state.role === 'lawyer' ? 'الشخص الأصم' : 'المحامي'
  return (
    <div className="flex items-center gap-2">
      {compact ? null : (
        <div className="flex items-center gap-2.5">
          <Avatar name={me.name} size={36} />
          <div className="leading-tight">
            <div className="text-sm font-bold text-[var(--ink)]">{me.name}</div>
            <div className="text-xs text-[var(--muted)]">{ROLE_LABEL[state.role]}</div>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => {
          switchRole()
          navigate('/app')
        }}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[var(--accent-2)]/10 px-3 text-sm font-bold text-[var(--accent-2)] hover:bg-[var(--accent-2)]/15"
        title={`التبديل إلى حساب ${other}`}
      >
        <Icon name="switch" size={16} />
        <span>{compact ? 'تبديل' : `دخول كـ${other}`}</span>
      </button>
    </div>
  )
}
