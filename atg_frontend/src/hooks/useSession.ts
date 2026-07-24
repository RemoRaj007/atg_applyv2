import React from 'react';
import { AuthContext } from '../contexts/AtgAuthContext';

export function useSession() {
  const session = React.useContext(AuthContext);
  if (!session) {
    throw new Error('Session context accessed outside Provider boundary');
  }
  return session;
}
