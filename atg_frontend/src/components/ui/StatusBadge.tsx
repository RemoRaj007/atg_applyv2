interface StatusBadgeProps {
  status: string;
}

type StyleEntry = { bg: string; color: string; border: string };

const styles: Record<string, StyleEntry> = {
  pending_approval: { bg: 'rgba(245, 158, 11, 0.15)', color: '#fcd34d', border: 'rgba(245, 158, 11, 0.35)' },
  requested:        { bg: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd', border: 'rgba(59, 130, 246, 0.35)' },
  approved:         { bg: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7', border: 'rgba(16, 185, 129, 0.35)' },
  submitted:        { bg: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', border: 'rgba(99, 102, 241, 0.35)' },
  completed:        { bg: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: 'rgba(168, 85, 247, 0.35)' },
  rejected:         { bg: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', border: 'rgba(239, 68, 68, 0.35)' },
  skipped:          { bg: 'rgba(100, 116, 139, 0.15)', color: '#cbd5e1', border: 'rgba(100, 116, 139, 0.35)' },
};

const fallback: StyleEntry = { bg: 'rgba(100, 116, 139, 0.15)', color: '#cbd5e1', border: 'rgba(100, 116, 139, 0.35)' };

export default function StatusBadge({ status }: StatusBadgeProps) {
  const s = styles[status] || fallback;
  return (
    <span
      className="inline-flex items-center text-[11px] px-2.5 py-0.5 rounded-full font-bold capitalize tracking-wide"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}
