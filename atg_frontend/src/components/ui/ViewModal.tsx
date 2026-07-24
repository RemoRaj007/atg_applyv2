import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import Button from './AtgButton';

export interface ViewModalField {
  label: string;
  value: React.ReactNode;
}

export interface ViewModalAction {
  label: string;
  variant?: 'primary' | 'success' | 'danger' | 'outline';
  onClick: () => void;
  disabled?: boolean;
}

interface ViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  fields: ViewModalField[];
  actions?: ViewModalAction[];
  badge?: React.ReactNode;
}

export default function ViewModal({
  isOpen,
  onClose,
  title,
  subtitle,
  fields,
  actions = [],
  badge,
}: ViewModalProps) {
  if (!isOpen) return null;
  return createPortal(
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(10,14,26,0.72)', backdropFilter: 'blur(6px)' }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-fadeIn"
          style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.22)' }}
        >
          {/* Header */}
          <div className="flex items-start justify-between px-7 pt-6 pb-5 border-b border-slate-100">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-base font-bold text-slate-900 truncate">{title}</h2>
                {badge && <div className="flex-shrink-0">{badge}</div>}
              </div>
              {subtitle && (
                <p className="text-xs text-slate-500 font-medium mt-0.5">{subtitle}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="ml-4 flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* Fields */}
          <div className="px-7 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fields.map((field, idx) => (
                <div key={idx} className="space-y-1">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {field.label}
                  </span>
                  <div className="text-sm font-medium text-slate-800 break-words">
                    {field.value ?? <span className="text-slate-400 italic">—</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          {(actions.length > 0 || true) && (
            <div className="px-7 py-4 border-t border-slate-100 flex items-center justify-end gap-2.5 bg-slate-50/70">
              <Button variant="outline" onClick={onClose} className="text-xs">
                Close
              </Button>
              {actions.map((action, idx) => {
                let variantProp: 'primary' | 'success' | 'outline' = 'primary';
                let extraClass = '';
                if (action.variant === 'danger') {
                  variantProp = 'primary';
                  extraClass = '!bg-red-600 hover:!bg-red-700 border-red-600';
                } else if (action.variant === 'success') {
                  variantProp = 'success';
                } else if (action.variant === 'outline') {
                  variantProp = 'outline';
                }
                return (
                  <Button
                    key={idx}
                    variant={variantProp}
                    onClick={action.onClick}
                    disabled={action.disabled}
                    className={`text-xs ${extraClass}`}
                  >
                    {action.label}
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      </div>,
      document.body
    );
}
