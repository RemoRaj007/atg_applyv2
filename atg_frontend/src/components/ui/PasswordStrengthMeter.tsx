import { Check, X, Shield, ShieldCheck, ShieldAlert } from 'lucide-react';
import { validatePasswordStrength } from '../../utils/validation';

interface PasswordStrengthMeterProps {
  password: string;
  darkBg?: boolean;
  className?: string;
}

export default function PasswordStrengthMeter({
  password,
  darkBg = true,
  className = '',
}: PasswordStrengthMeterProps) {
  if (!password) return null;

  const { score, checks } = validatePasswordStrength(password);

  const getStrengthLabel = () => {
    switch (score) {
      case 0:
      case 1:
        return { label: 'Weak', color: 'bg-rose-500', textColor: 'text-rose-400', width: 'w-1/5' };
      case 2:
        return { label: 'Fair', color: 'bg-orange-500', textColor: 'text-orange-400', width: 'w-2/5' };
      case 3:
        return { label: 'Medium', color: 'bg-amber-500', textColor: 'text-amber-400', width: 'w-3/5' };
      case 4:
        return { label: 'Strong', color: 'bg-blue-500', textColor: 'text-blue-400', width: 'w-4/5' };
      case 5:
        return { label: 'Very Strong', color: 'bg-emerald-500', textColor: 'text-emerald-400', width: 'w-full' };
      default:
        return { label: 'Weak', color: 'bg-rose-500', textColor: 'text-rose-400', width: 'w-1/5' };
    }
  };

  const strength = getStrengthLabel();

  const criteria = [
    { key: 'length', label: '8+ characters', met: checks.length },
    { key: 'uppercase', label: 'Uppercase letter (A-Z)', met: checks.uppercase },
    { key: 'lowercase', label: 'Lowercase letter (a-z)', met: checks.lowercase },
    { key: 'number', label: 'Number (0-9)', met: checks.number },
    { key: 'special', label: 'Special character (!@#$%^&*)', met: checks.special },
  ];

  return (
    <div className={`space-y-2 mt-2 p-3.5 rounded-2xl border transition-all ${
      darkBg
        ? 'bg-slate-950/70 border-white/15 backdrop-blur-md text-slate-200 shadow-inner'
        : 'bg-gray-50 border-gray-200 text-gray-800'
    } ${className}`}>
      {/* Strength Bar & Header */}
      <div className="flex items-center justify-between text-xs font-bold mb-1.5">
        <span className="flex items-center gap-1.5">
          {score === 5 ? (
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          ) : score >= 3 ? (
            <Shield className="w-4 h-4 text-amber-400" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          )}
          <span>Password Strength:</span>
        </span>
        <span className={`font-black uppercase tracking-wider ${strength.textColor}`}>
          {strength.label} ({score}/5)
        </span>
      </div>

      {/* Progress Track */}
      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 rounded-full ${strength.color} ${strength.width}`}
        />
      </div>

      {/* Criteria Checklist Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2 text-[11px]">
        {criteria.map((item) => (
          <div
            key={item.key}
            className={`flex items-center gap-1.5 font-semibold transition-colors ${
              item.met
                ? darkBg ? 'text-emerald-400' : 'text-emerald-600'
                : darkBg ? 'text-slate-500' : 'text-gray-400'
            }`}
          >
            {item.met ? (
              <Check className="w-3.5 h-3.5 shrink-0 text-emerald-400 stroke-[3]" />
            ) : (
              <X className="w-3.5 h-3.5 shrink-0 opacity-50 stroke-[2]" />
            )}
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
