import { useCallback, useEffect, useState } from 'react';
import { profileSchemaApi } from '../../../api/profileSchemaApi';
import type { ProfileResponse } from '../profile.types';

/**
 * Reads a profile the viewer does not own — the operator's read-only view.
 *
 * Separate from useProfileDraft because there is nothing to draft: this side
 * never writes. An operator must not be able to overwrite a candidate's facts,
 * so the absence of a save path here is the point, not an omission.
 */
export const useProfileSchema = (userId: number | null) => {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (userId === null) return;
    setLoading(true);
    setError(null);
    try {
      setProfile(await profileSchemaApi.forUser(userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the candidate profile');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { profile, loading, error, reload: load };
};

export default useProfileSchema;
