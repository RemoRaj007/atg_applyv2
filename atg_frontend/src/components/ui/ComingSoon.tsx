interface ComingSoonProps {
  title: string;
  description: string;
}

export default function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="bg-slate-800/80 rounded-3xl border border-slate-700/60 shadow-xl p-12 text-center animate-fadeIn backdrop-blur-sm">
      <h1 className="text-2xl font-serif font-extrabold text-white">{title}</h1>
      <p className="text-slate-400 mt-3 max-w-md mx-auto">{description}</p>
    </div>
  );
}
