import { useTranslation } from 'react-i18next';
import { Check, AlertCircle, Loader2 } from 'lucide-react';
import type { SaveState } from './profile.types';

/**
 * The quiet autosave indicator: `Saving…`, then `Saved`.
 *
 * aria-live is polite so a screen reader mentions the change at a natural
 * pause rather than interrupting the sentence being typed.
 */
export default function SavedState({ state, error }: { state: SaveState; error?: string | null }) {
  const { t } = useTranslation();

  if (state === 'idle') return <span className="text-sm text-transparent select-none">·</span>;

  if (state === 'error') {
    return (
      <span role="alert" className="inline-flex items-center gap-1.5 text-sm text-[#D70015]">
        <AlertCircle className="w-4 h-4" aria-hidden="true" />
        {error || t('profileBuilder.saveFailed', { defaultValue: 'Not saved' })}
      </span>
    );
  }

  return (
    <span aria-live="polite" className="inline-flex items-center gap-1.5 text-sm text-[#6E6E73]">
      {state === 'saving' ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          {t('profileBuilder.saving', { defaultValue: 'Saving…' })}
        </>
      ) : (
        <>
          <Check className="w-4 h-4 text-[#248A3D]" aria-hidden="true" />
          {t('profileBuilder.saved', { defaultValue: 'Saved' })}
        </>
      )}
    </span>
  );
}
