import { useState, useEffect, useCallback } from 'react';
import { getAuth, setAuth, logout as doLogout } from '@/lib/auth';
import type { AuthState, User } from '@/types';

export const useAuth = () => {
  const [auth, setAuthState] = useState<AuthState>(getAuth);

  const refresh = useCallback(() => {
    setAuthState(getAuth());
  }, []);

  useEffect(() => {
    const handleStorage = () => refresh();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [refresh]);

  const updateUser = (user: User) => {
    const newState: AuthState = { isAuthenticated: true, user };
    setAuth(newState);
    setAuthState(newState);
  };

  const logout = () => {
    doLogout();
    setAuthState({ isAuthenticated: false, user: null });
  };

  return { auth, refresh, updateUser, logout };
};
