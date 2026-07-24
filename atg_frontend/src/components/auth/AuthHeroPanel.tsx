import { Mountain } from 'lucide-react';
import loginHero from '../../assets/login-hero.png';

export default function AuthHeroPanel() {
  return (
    <div className="hidden lg:flex relative w-1/2 flex-col justify-between overflow-hidden p-10" style={{ background: 'linear-gradient(to right, #3b3f71, #2b2f56)' }}>
      <div className="flex items-center gap-2 z-10">
        <Mountain className="h-8 w-8 text-white" strokeWidth={2.5} />
        <span className="text-2xl font-bold text-white">ATG Apply</span>
      </div>

      <div className="z-10 rounded-3xl overflow-hidden shadow-xl border border-white/60">
        <img src={loginHero} alt="ATG Apply — find your next career opportunity" className="w-full h-auto block" />
      </div>

      <div className="z-10 flex flex-wrap gap-2 max-w-[160px]">
        {Array.from({ length: 15 }).map((_, i) => (
          <span key={i} className="h-1.5 w-1.5 rounded-full bg-brand-300/70" />
        ))}
      </div>

      <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-brand-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-brand-100/60 blur-3xl" />
    </div>
  );
}
