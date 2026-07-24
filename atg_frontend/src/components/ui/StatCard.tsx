interface StatCardProps {
  label: string;
  value: string | number;
  accentClass?: string;
}

export default function StatCard({ label, value, accentClass = 'border-l-action-500' }: StatCardProps) {
  return (
    <div className={`bg-white border-l-4 ${accentClass} p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow`}>
      <p className="text-sm font-semibold text-gray-500">{label}</p>
      <p className="text-3xl font-extrabold text-gray-800 mt-2">{value}</p>
    </div>
  );
}
