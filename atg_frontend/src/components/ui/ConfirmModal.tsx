import { AlertTriangle, X, Check } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'primary';
  confirmVariant?: 'danger' | 'warning' | 'info' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title = 'Are you sure?',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant,
  confirmVariant,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const activeVariant = confirmVariant || variant || 'danger';

  const getVariantStyles = () => {
    switch (activeVariant) {
      case 'danger':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-rose-400" />,
          btn: 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/40 text-white',
          border: 'border-rose-500/30',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-amber-400" />,
          btn: 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/40 text-white',
          border: 'border-amber-500/30',
        };
      case 'info':
      default:
        return {
          icon: <AlertTriangle className="w-6 h-6 text-blue-400" />,
          btn: 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/40 text-white',
          border: 'border-blue-500/30',
        };
    }
  };

  const style = getVariantStyles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className={`w-full max-w-md bg-slate-900/95 border ${style.border} rounded-3xl p-6 shadow-[0_25px_60px_rgba(0,0,0,0.8)] relative text-white animate-scaleUp`}>
        {/* Close Button */}
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 shrink-0">
            {style.icon}
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-white tracking-tight">{title}</h3>
            <p className="text-sm text-slate-300 mt-1.5 leading-relaxed font-medium">{message}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-xl shadow-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${style.btn}`}
          >
            <Check className="w-4 h-4" />
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
