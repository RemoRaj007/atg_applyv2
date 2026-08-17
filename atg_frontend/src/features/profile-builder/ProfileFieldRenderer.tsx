import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import type { ProfileField } from './profile.types';
import { validateField, fieldLabel, fieldHelp } from './profile.validation';

interface Props {
  field: ProfileField;
  value: string;
  repeatIndex?: number;
  onChange: (value: string) => void;
}

const BASE_INPUT =
  'w-full min-h-11 px-4 py-3 border border-[#D2D2D7] rounded-lg bg-white text-[#1D1D1F] text-base ' +
  'placeholder-[#86868B] outline-none transition-colors focus:border-[#0066CC]';

/**
 * One renderer for every schema-defined input type.
 *
 * This is what replaces a 1,000-line form component: adding a question to the
 * catalogue makes it appear here without any new JSX, which is the whole point
 * of the schema being the source of truth.
 */
export default function ProfileFieldRenderer({ field, value, repeatIndex = 0, onChange }: Props) {
  const { t } = useTranslation();
  const inputId = useId();
  const [touched, setTouched] = useState(false);

  const label = fieldLabel(field.code, field.label, t);
  const help = fieldHelp(field.code, field.helpText, t);
  const error = touched ? validateField(field, value, t) : null;
  const describedBy = [help ? `${inputId}-help` : null, error ? `${inputId}-error` : null]
    .filter(Boolean)
    .join(' ');

  // The server withheld this value because the viewer may not see it. Showing
  // the question but not the answer is deliberate: an operator should know the
  // field exists and is governed, without reading it.
  if (field.gated) {
    return (
      <div className="py-4">
        <p className="text-base font-medium text-[#1D1D1F]">{label}</p>
        <p className="mt-2 inline-flex items-center gap-2 text-sm text-[#6E6E73]">
          <Lock className="w-4 h-4" aria-hidden="true" />
          {t('profileBuilder.restrictedHidden', {
            defaultValue: 'Restricted — released only for a named application, with approval.',
          })}
        </p>
      </div>
    );
  }

  const common = {
    id: inputId,
    value,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy || undefined,
    onBlur: () => setTouched(true),
  };

  const renderControl = () => {
    switch (field.inputType) {
      case 'textarea':
        return (
          <textarea
            {...common}
            rows={5}
            onChange={(e) => onChange(e.target.value)}
            className={`${BASE_INPUT} resize-y`}
          />
        );

      case 'select':
        return (
          <select {...common} onChange={(e) => onChange(e.target.value)} className={BASE_INPUT}>
            <option value="">{t('profileBuilder.selectPlaceholder', { defaultValue: 'Select…' })}</option>
            {(field.options ?? []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'multiselect': {
        // Stored as a newline-joined string so one ProfileValue row still holds
        // the answer, which keeps the value table uniform across input types.
        const selected = value ? value.split('\n').filter(Boolean) : [];
        const toggle = (option: string) => {
          const next = selected.includes(option)
            ? selected.filter((o) => o !== option)
            : [...selected, option];
          onChange(next.join('\n'));
        };
        return (
          <fieldset className="space-y-2" aria-describedby={describedBy || undefined}>
            <legend className="sr-only">{label}</legend>
            {(field.options ?? []).map((option) => (
              <label
                key={option}
                className="flex items-center gap-3 min-h-11 px-3 rounded-lg hover:bg-[#F5F5F7] cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(option)}
                  onChange={() => toggle(option)}
                  className="h-4 w-4 rounded border-[#D2D2D7] accent-[#0066CC]"
                />
                <span className="text-base text-[#1D1D1F]">{option}</span>
              </label>
            ))}
          </fieldset>
        );
      }

      case 'boolean':
        return (
          <label className="flex items-center gap-3 min-h-11 cursor-pointer">
            <input
              id={inputId}
              type="checkbox"
              checked={value === 'true'}
              onChange={(e) => onChange(String(e.target.checked))}
              className="h-4 w-4 rounded border-[#D2D2D7] accent-[#0066CC]"
            />
            <span className="text-base text-[#1D1D1F]">{label}</span>
          </label>
        );

      case 'date':
        return <input {...common} type="date" onChange={(e) => onChange(e.target.value)} className={BASE_INPUT} />;

      case 'number':
        return <input {...common} type="number" onChange={(e) => onChange(e.target.value)} className={BASE_INPUT} />;

      case 'url':
        return (
          <input
            {...common}
            type="url"
            inputMode="url"
            placeholder="https://"
            onChange={(e) => onChange(e.target.value)}
            className={BASE_INPUT}
          />
        );

      default:
        return <input {...common} type="text" onChange={(e) => onChange(e.target.value)} className={BASE_INPUT} />;
    }
  };

  const showOwnLabel = field.inputType !== 'boolean';

  return (
    <div className="py-4" data-field-code={field.code} data-repeat-index={repeatIndex}>
      {showOwnLabel && (
        <label htmlFor={inputId} className="block text-base font-medium text-[#1D1D1F] mb-1">
          {label}
          {field.required && (
            <span className="text-[#D70015] ml-1" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      {help && (
        <p id={`${inputId}-help`} className="text-sm text-[#6E6E73] mb-2">
          {help}
        </p>
      )}

      {renderControl()}

      {/* The privacy note is part of the question, not a footnote: a candidate
          deciding whether to answer needs to know where the answer can go. */}
      {field.sensitivity !== 'CAREER' && (
        <p className="mt-2 text-xs text-[#6E6E73]">
          {field.sensitivity === 'RESTRICTED'
            ? t('profileBuilder.noteRestricted', {
                defaultValue: 'Restricted. Shared only for a named application, after you approve it.',
              })
            : field.externalAiPolicy === 'NO'
              ? t('profileBuilder.notePrivateNoAi', {
                  defaultValue: 'Private. Never sent to external AI tools.',
                })
              : t('profileBuilder.notePrivate', { defaultValue: 'Private. Used for applications only.' })}
        </p>
      )}

      {error && (
        <p id={`${inputId}-error`} role="alert" className="mt-2 text-sm text-[#D70015]">
          {error}
        </p>
      )}
    </div>
  );
}
