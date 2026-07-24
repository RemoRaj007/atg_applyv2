import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  to?: string;
  label?: string;
  className?: string;
  variant?: 'light' | 'dark' | 'glass';
}

export default function BackButton({ to, label = 'Back', className = '', variant = 'glass' }: BackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (to) {
      navigate(to);
    } else if (window.history.length > 2) {
      navigate(-1);
    } else {
      if (location.pathname.startsWith('/candidate')) {
        navigate('/candidate');
      } else if (location.pathname.startsWith('/admin')) {
        navigate('/admin');
      } else if (location.pathname.startsWith('/operator')) {
        navigate('/operator');
      } else if (location.pathname.startsWith('/company')) {
        navigate('/company');
      } else {
        navigate('/');
      }
    }
  };

  const variantStyles = {
    glass: 'bg-slate-800/80 hover:bg-slate-700/90 text-slate-200 hover:text-white border-slate-700/80 shadow-md backdrop-blur-md',
    dark: 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border-slate-700/80 shadow-sm',
    light: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 shadow-sm',
  };

  return (
    <button
      onClick={handleBack}
      type="button"
      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 border cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${variantStyles[variant]} ${className}`}
      title="Go back"
    >
      <ArrowLeft size={15} className="shrink-0" />
      <span>{label}</span>
    </button>
  );
}
