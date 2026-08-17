import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { ProfileChapter as Chapter, ProfileField } from '../../api/profileSchemaApi';
import ProfileFieldRenderer from './ProfileFieldRenderer';

/** Human label for a repeatable card, e.g. "Education 2". */
const GROUP_LABELS: Record<string, string> = {
  education: 'Education',
  employment: 'Experience',
  project: 'Project',
  reference: 'Reference',
};

interface Props {
  chapter: Chapter;
  entriesFor: (field: ProfileField) => string[];
  entryCounts: Record<string, number>;
  errors: Record<string, string>;
  onChange: (field: ProfileField, repeatIndex: number, value: string) => void;
  onAddEntry: (group: string) => void;
  onRemoveEntry: (group: string, repeatIndex: number) => void;
}

const CARD =
  'space-y-6 bg-slate-800/80 p-6 lg:p-8 rounded-2xl border border-slate-700/60 shadow-xl backdrop-blur-sm';

const ProfileChapterView: React.FC<Props> = ({
  chapter,
  entriesFor,
  entryCounts,
  errors,
  onChange,
  onAddEntry,
  onRemoveEntry,
}) => {
  const plain = chapter.fields.filter(field => !field.repeatableGroup);

  // Questions asked once per entry are grouped so they render as one card per
  // education/role/project rather than as a flat list of near-identical fields.
  const groups = chapter.fields.reduce<Record<string, ProfileField[]>>((acc, field) => {
    if (!field.repeatableGroup) return acc;
    (acc[field.repeatableGroup] = acc[field.repeatableGroup] ?? []).push(field);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {Object.entries(groups).map(([group, fields]) => {
        const count = entryCounts[group] ?? 1;
        const label = GROUP_LABELS[group] ?? group;

        return (
          <section key={group} className="space-y-4">
            {Array.from({ length: count }, (_, entry) => (
              <div key={`${group}-${entry}`} className={CARD}>
                <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
                  <h3 className="text-base font-bold text-white">
                    {label} {entry + 1}
                  </h3>
                  {count > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemoveEntry(group, entry)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      Remove
                    </button>
                  )}
                </div>
                {fields.map(field => (
                  <ProfileFieldRenderer
                    key={`${field.code}-${entry}`}
                    field={field}
                    value={entriesFor(field)[entry] ?? ''}
                    error={errors[`${field.code}#${entry}`]}
                    onChange={value => onChange(field, entry, value)}
                  />
                ))}
              </div>
            ))}

            <button
              type="button"
              onClick={() => onAddEntry(group)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-300 hover:text-blue-200 border border-blue-800/60 bg-blue-950/40 hover:bg-blue-950/70 px-4 py-2.5 rounded-xl transition cursor-pointer"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Add another {label.toLowerCase()}
            </button>
          </section>
        );
      })}

      {plain.length > 0 && (
        <div className={CARD}>
          {plain.map(field => (
            <ProfileFieldRenderer
              key={field.code}
              field={field}
              value={entriesFor(field)[0] ?? ''}
              error={errors[`${field.code}#0`]}
              onChange={value => onChange(field, 0, value)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProfileChapterView;
