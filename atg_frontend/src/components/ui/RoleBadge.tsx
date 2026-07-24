import type { User } from '../../types/user.types';

const roleBadgeStyles: Record<User['role'], { bg: string; color: string; border: string }> = {
  admin:    { bg: '#f3f0ff', color: '#6d28d9', border: '#ddd6fe' },
  operator: { bg: '#f3f4f6', color: '#3730a3', border: '#d1d5db' },
  candidate: { bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0' },
  visitor:  { bg: '#f8fafc', color: '#475569', border: '#e2e8f0' },
  company:  { bg: '#fef9c3', color: '#854d0e', border: '#fde68a' },
};

export default function RoleBadge({ role }: { role: User['role'] }) {
  const style = roleBadgeStyles[role] || roleBadgeStyles.visitor;
  return (
    <span
      className="text-[11px] px-2.5 py-0.5 rounded-full font-bold capitalize tracking-wide"
      style={{
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
      }}
    >
      {role}
    </span>
  );
}
