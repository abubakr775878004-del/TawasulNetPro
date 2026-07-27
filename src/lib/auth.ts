import { STORAGE_KEYS, ADMIN_EMAIL, ADMIN_PASSWORD } from '@/constants';
import { getUsers, createUser } from '@/lib/storage';
import type { User, AuthState } from '@/types';

export const getAuth = (): AuthState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH);
    return raw ? JSON.parse(raw) : { isAuthenticated: false, user: null };
  } catch {
    return { isAuthenticated: false, user: null };
  }
};

export const setAuth = (state: AuthState) => {
  localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(state));
};

export const login = (email: string, password: string): { success: boolean; user?: User; error?: string } => {
  // Admin login
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const users = getUsers();
    const admin = users.find((u) => u.email === ADMIN_EMAIL);
    if (admin) {
      const state: AuthState = { isAuthenticated: true, user: admin };
      setAuth(state);
      return { success: true, user: admin };
    }
  }

  // Reseller login
  const users = getUsers();
  const user = users.find((u) => u.email === email);
  if (!user) return { success: false, error: 'البريد الإلكتروني غير موجود' };
  if (user.status === 'suspended') return { success: false, error: 'الحساب موقوف. تواصل مع الإدارة.' };

  // Mock: password is always "pass123" for resellers in demo
  if (password !== 'pass123' && !(email === ADMIN_EMAIL && password === ADMIN_PASSWORD)) {
    return { success: false, error: 'كلمة المرور غير صحيحة' };
  }

  const state: AuthState = { isAuthenticated: true, user };
  setAuth(state);
  return { success: true, user };
};

export const register = (
  name: string,
  email: string,
  password: string
): { success: boolean; user?: User; error?: string } => {
  const users = getUsers();
  if (users.find((u) => u.email === email)) {
    return { success: false, error: 'البريد الإلكتروني مسجل مسبقاً' };
  }
  const newUser = createUser({ name, email, role: 'reseller', status: 'active', balance: 0 });
  const state: AuthState = { isAuthenticated: true, user: newUser };
  setAuth(state);
  return { success: true, user: newUser };
};

export const logout = () => {
  localStorage.removeItem(STORAGE_KEYS.AUTH);
};
