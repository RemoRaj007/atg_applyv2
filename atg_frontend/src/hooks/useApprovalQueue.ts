import { useCallback, useEffect, useState } from 'react';
import { applicationApi } from '../api/applicationApi';
import type { Application } from '../types/application.types';

export const useApprovalQueue = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await applicationApi.list();
      setApplications(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const respond = async (id: number, approved: boolean, comment?: string) => {
    const updated = await applicationApi.setCandidateApproval(id, approved, comment);
    setApplications((prev) => prev.map((app) => (app.id === id ? updated : app)));
  };

  return {
    applications,
    loading,
    error,
    approve: (id: number, comment?: string) => respond(id, true, comment),
    skip: (id: number, comment?: string) => respond(id, false, comment),
    refetch,
  };
};
