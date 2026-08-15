import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { resolveErrorMessage } from '../utils/errorMessage';

/**
 * Binds the current `t` to resolveErrorMessage, so call sites read:
 *
 *   const toMessage = useErrorMessage();
 *   ...
 *   catch (err) { toast.error(toMessage(err, 'Failed to save')); }
 *
 * The second argument is the old hardcoded English fallback each call site
 * already had. Keeping it means converting a component is a one-line change
 * that cannot make things worse: if nothing matches, the user sees exactly the
 * sentence they saw before.
 */
export const useErrorMessage = () => {
  const { t } = useTranslation();
  return useCallback((error: unknown, fallback?: string) => resolveErrorMessage(error, t, fallback), [t]);
};

export default useErrorMessage;
