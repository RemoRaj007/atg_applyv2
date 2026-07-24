interface FitBadgeProps {
  score: number;
}

const bandFor = (score: number) => {
  if (score >= 75) return { label: 'High fit', className: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60' };
  if (score >= 50) return { label: 'Medium fit', className: 'bg-amber-950/60 text-amber-300 border-amber-800/60' };
  return { label: 'Low fit', className: 'bg-slate-800/80 text-slate-400 border-slate-700' };
};

export default function FitBadge({ score }: FitBadgeProps) {
  const band = bandFor(score);
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold border ${band.className}`}>
      {band.label}
    </span>
  );
}
