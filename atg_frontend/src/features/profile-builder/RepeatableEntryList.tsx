import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import type { ProfileField } from './profile.types';
import ProfileFieldRenderer from './ProfileFieldRenderer';
import { entryCount } from './profile.validation';

interface Props {
  group: string;
  fields: ProfileField[];
  valueFor: (code: string, repeatIndex: number) => string;
  onChange: (code: string, repeatIndex: number, value: string) => void;
  onRemoveEntry: (repeatIndex: number) => Promise<void> | void;
}

// The brief asks for "Add education", "Add role", "Add project", "Add reference"
// rather than one large textarea, so each group names its own action.
const ADD_LABEL: Record<string, { key: string; fallback: string }> = {
  education: { key: 'profileBuilder.addEducation', fallback: 'Add education' },
  employment: { key: 'profileBuilder.addRole', fallback: 'Add role' },
  project: { key: 'profileBuilder.addProject', fallback: 'Add project' },
  reference: { key: 'profileBuilder.addReference', fallback: 'Add reference' },
};

const ENTRY_LABEL: Record<string, { key: string; fallback: string }> = {
  education: { key: 'profileBuilder.entryEducation', fallback: 'Education' },
  employment: { key: 'profileBuilder.entryRole', fallback: 'Role' },
  project: { key: 'profileBuilder.entryProject', fallback: 'Project' },
  reference: { key: 'profileBuilder.entryReference', fallback: 'Reference' },
};

/**
 * A repeatable group rendered as a list of entry cards.
 *
 * The catalogue asked the same questions three or four times over (Education 1,
 * Education 2, Education 3), which capped a candidate's history at whatever the
 * form author guessed. Here the questions are asked once and repeated per entry
 * via repeatIndex, so "add a fourth degree" is a click rather than a migration.
 */
export default function RepeatableEntryList({ group, fields, valueFor, onChange, onRemoveEntry }: Props) {
  const { t } = useTranslation();
  const [extra, setExtra] = useState(0);

  const stored = entryCount(fields);
  const count = stored + extra;

  const add = { key: ADD_LABEL[group]?.key ?? 'profileBuilder.addEntry', fallback: ADD_LABEL[group]?.fallback ?? 'Add entry' };
  const entry = { key: ENTRY_LABEL[group]?.key ?? 'profileBuilder.entry', fallback: ENTRY_LABEL[group]?.fallback ?? 'Entry' };

  const remove = async (index: number) => {
    await onRemoveEntry(index);
    if (extra > 0) setExtra((n) => n - 1);
  };

  return (
    <section className="space-y-6">
      {Array.from({ length: count }, (_, index) => (
        <article key={index} className="border border-[#D2D2D7] rounded-xl p-5">
          <header className="flex items-center justify-between mb-2">
            <h4 className="text-base font-semibold text-[#1D1D1F]">
              {t(entry.key, { defaultValue: entry.fallback })} {index + 1}
            </h4>
            {count > 1 && (
              <button
                type="button"
                onClick={() => remove(index)}
                className="inline-flex items-center gap-1.5 min-h-11 px-3 text-sm text-[#D70015] hover:bg-[#F5F5F7] rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
                {t('common.delete', { defaultValue: 'Delete' })}
              </button>
            )}
          </header>

          <div className="divide-y divide-[#D2D2D7]">
            {fields.map((field) => (
              <ProfileFieldRenderer
                key={`${field.code}#${index}`}
                field={field}
                repeatIndex={index}
                value={valueFor(field.code, index)}
                onChange={(value) => onChange(field.code, index, value)}
              />
            ))}
          </div>
        </article>
      ))}

      <button
        type="button"
        onClick={() => setExtra((n) => n + 1)}
        className="inline-flex items-center gap-2 min-h-11 px-4 py-2 border border-[#D2D2D7] rounded-lg text-base text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors"
      >
        <Plus className="w-4 h-4" aria-hidden="true" />
        {t(add.key, { defaultValue: add.fallback })}
      </button>
    </section>
  );
}
