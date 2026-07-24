import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'success' | 'outline' | 'view' | 'danger';
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-md',
  success:
    'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-sm',
  danger:
    'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-sm',
  view:
    'bg-slate-800/80 hover:bg-slate-700 text-blue-400 border border-slate-700 hover:border-slate-600 shadow-sm',
  outline:
    'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 shadow-sm',
};

export default function Button({
  variant = 'primary',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 disabled:opacity-60 disabled:pointer-events-none ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
