import React from 'react';
import { Lock, Eye, ShieldAlert, Sparkles } from 'lucide-react';
import type { ProfileField, ProfileSensitivity } from '../../api/profileSchemaApi';

/**
 * The catalogue assigns every question a sensitivity and an external-AI policy.
 * Those rules govern what ATG Apply may do with an answer, so the candidate is
 * told them at the point of answering rather than in a policy page elsewhere.
 */
const SENSITIVITY_BADGE: Record<ProfileSensitivity, { label: string; className: string; icon: React.ElementType }> = {
  CAREER: {
    label: 'Career data',
    className: 'bg-slate-800 text-slate-300 border-slate-700',
    icon: Eye,
  },
  PRIVATE: {
    label: 'Private',
    className: 'bg-blue-950/70 text-blue-300 border-blue-800/60',
    icon: Lock,
  },
  SENSITIVE: {
    label: 'Sensitive',
    className: 'bg-amber-950/70 text-amber-300 border-amber-800/60',
    icon: ShieldAlert,
  },
  RESTRICTED: {
    label: 'Restricted',
    className: 'bg-rose-950/70 text-rose-300 border-rose-800/60',
    icon: ShieldAlert,
  },
};

const INPUT_CLASS =
  'w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 ' +
  'placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-600 transition';

interface Props {
  field: ProfileField;
  value: string;
  onChange: (value: string) => void;
  /** Shown under the input when the answer fails its catalogue validation. */
  error?: string | null;
  disabled?: boolean;
}

/**
 * Renders one catalogue question. The input type comes from the catalogue's
 * form vocabulary: short answer, paragraph, multiple choice, checkboxes.
 */
const ProfileFieldRenderer: React.FC<Props> = ({ field, value, onChange, error, disabled }) => {
  const badge = SENSITIVITY_BADGE[field.sensitivity] ?? SENSITIVITY_BADGE.CAREER;
  const BadgeIcon = badge.icon;
  const inputId = `field-${field.code}`;
  const describedBy = [field.helpText ? `${inputId}-help` : null, error ? `${inputId}-error` : null]
    .filter(Boolean)
    .join(' ');

  // Checkboxes store a newline-joined list, so a multi-select answer round-trips
  // through the same text column as every other answer.
  const selected = value ? value.split('\n').filter(Boolean) : [];
  const toggle = (option: string) => {
    const next = selected.includes(option)
      ? selected.filter(item => item !== option)
      : [...selected, option];
    onChange(next.join('\n'));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <label htmlFor={inputId} className="block text-sm font-semibold text-slate-200">
          {field.label}
          {field.isRequired && <span className="text-rose-400 ml-1" aria-hidden="true">*</span>}
          {field.isRequired && <span className="sr-only"> (required)</span>}
        </label>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* NO means the answer must never leave ATG Apply for an external model. */}
          {field.externalAiPolicy === 'NO' && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-slate-800 text-slate-400 border-slate-700"
              title="This answer is never sent to external AI tools."
            >
              <Sparkles className="w-3 h-3" aria-hidden="true" /> No AI
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badge.className}`}
            title={field.defaultApplicationUse || undefined}
          >
            <BadgeIcon className="w-3 h-3" aria-hidden="true" /> {badge.label}
          </span>
        </div>
      </div>

      {field.helpText && (
        <p id={`${inputId}-help`} className="text-xs text-slate-400 leading-relaxed">
          {field.helpText}
        </p>
      )}

      {field.inputType === 'textarea' && (
        <textarea
          id={inputId}
          rows={5}
          className={INPUT_CLASS}
          value={value}
          disabled={disabled}
          aria-describedby={describedBy || undefined}
          aria-invalid={error ? true : undefined}
          onChange={event => onChange(event.target.value)}
        />
      )}

      {field.inputType === 'select' && (
        <select
          id={inputId}
          className={INPUT_CLASS}
          value={value}
          disabled={disabled}
          aria-describedby={describedBy || undefined}
          onChange={event => onChange(event.target.value)}
        >
          <option value="">Select an option…</option>
          {(field.options ?? []).map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )}

      {field.inputType === 'multiselect' && (
        <div className="space-y-2" role="group" aria-labelledby={inputId}>
          {(field.options ?? []).map(option => (
            <label
              key={option}
              className="flex items-start gap-3 text-sm text-slate-300 bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3 cursor-pointer hover:border-slate-700 transition"
            >
              <input
                type="checkbox"
                className="mt-0.5 accent-blue-500"
                checked={selected.includes(option)}
                disabled={disabled}
                onChange={() => toggle(option)}
              />
              <span className="leading-relaxed">{option}</span>
            </label>
          ))}
        </div>
      )}

      {(field.inputType === 'text' || field.inputType === 'number') && (
        <input
          id={inputId}
          // The catalogue's validation column carries the intended input type,
          // so an email question gets an email keyboard and browser validation.
          type={
            field.validation?.format === 'email'
              ? 'email'
              : field.validation?.format === 'url'
                ? 'url'
                : field.inputType === 'number'
                  ? 'number'
                  : 'text'
          }
          className={INPUT_CLASS}
          value={value}
          disabled={disabled}
          aria-describedby={describedBy || undefined}
          aria-invalid={error ? true : undefined}
          onChange={event => onChange(event.target.value)}
        />
      )}

      {error && (
        <p id={`${inputId}-error`} className="text-xs text-rose-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default ProfileFieldRenderer;
