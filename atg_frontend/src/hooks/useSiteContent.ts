import { useEffect, useState } from 'react';
import { contentApi, type PageContent, type PublicSettings } from '../api/contentApi';

// Public pages render before anyone signs in and must never go blank because a
// request failed, so every hook here takes the caller's shipped copy as a
// fallback and only overlays what the API actually returned.

const settingsCache: { value: PublicSettings | null } = { value: null };

export function usePublicSettings(): PublicSettings {
  const [settings, setSettings] = useState<PublicSettings>(settingsCache.value ?? {});

  useEffect(() => {
    let cancelled = false;
    contentApi
      .publicSettings()
      .then((loaded) => {
        settingsCache.value = loaded;
        if (!cancelled) setSettings(loaded);
      })
      .catch(() => {
        // Keep whatever the caller defaulted to.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return settings;
}

/**
 * Copy for one marketing page. `defaults` is what ships in the bundle; anything
 * the admin has edited replaces it once the request lands.
 *
 *   const t = usePageContent('landing', { 'hero.title': 'Land the role you deserve' });
 *   <h1>{t('hero.title')}</h1>
 */
export function usePageContent(page: string, defaults: PageContent) {
  const [content, setContent] = useState<PageContent>(defaults);

  useEffect(() => {
    let cancelled = false;
    contentApi
      .publicPage(page)
      .then((loaded) => {
        if (cancelled) return;
        // Merge rather than replace: a key added to the bundle but not yet in
        // the database still renders.
        setContent({ ...defaults, ...stripEmpty(loaded) });
      })
      .catch(() => {
        // Shipped copy stands.
      });
    return () => {
      cancelled = true;
    };
    // `defaults` is a literal at every call site, so keying on the page is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (key: string) => content[key] ?? defaults[key] ?? '';
}

// An admin clearing a field should hide that section, but a row that was never
// filled in should still show the shipped copy. Only non-empty values override.
const stripEmpty = (content: PageContent): PageContent =>
  Object.fromEntries(Object.entries(content).filter(([, v]) => v !== null && v !== undefined));
