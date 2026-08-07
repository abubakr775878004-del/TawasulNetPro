import { STORAGE_KEYS, ADMIN_EMAIL, ADMIN_PASSWORD } from '@/constants';
import { getUsers, createUser, getPasswords } from '@/lib/storage';
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
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = password.trim();

  // 1. فحص دخول المدير
  if (cleanEmail === ADMIN_EMAIL.toLowerCase() && cleanPass === ADMIN_PASSWORD) {
    const users = getUsers();
    const admin = users.find((u) => u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
    if (admin) {
      const state: AuthState = { isAuthenticated: true, user: admin };
      setAuth(state);
      return { success: true, user: admin };
    }
  }

  // 2. البحث عن المستخدم في النظام
  const users = getUsers();
  const passwords = getPasswords();
  
  const user = users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (!user) return { success: false, error: 'البريد الإلكتروني غير موجود' };

  // 3. التحقق من حالة الحساب
  if (user.status === 'suspended') {
    return { success: false, error: 'الحساب موقوف. تواصل مع الإدارة.' };
  }
  if (user.status === 'pending') {
    return { success: false, error: 'حسابك قيد المراجعة وبانتظار موافقة المدير.' };
  }

  // 4. التحقق من كلمة المرور الحقيقية المحفوظة للموزع
  const savedPass = passwords[user.id];
  if (!savedPass || savedPass.trim() !== cleanPass) {
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
  const cleanEmail = email.trim().toLowerCase();
  const users = getUsers();
  
  if (users.find((u) => u.email.toLowerCase() === cleanEmail)) {
    return { success: false, error: 'البريد الإلكتروني مسجل مسبقاً' };
  }

  // إنشاء مستخدم جديد بحالة 'pending' (بانتظار موافقة المدير) وتمرير كلمة المرور لحفظها
  const newUser = createUser({
    name: name.trim(),
    email: cleanEmail,
    role: 'reseller',
    status: 'pending',
    balance: 0
  }, password);

  return { 
    success: true, 
    user: newUser, 
    error: 'تم تسجيل الحساب بنجاح، يانتظار موافقة المدير لتسجيل الدخول.' 
  };
};

export const logout = () => {
  localStorage.removeItem(STORAGE_KEYS.AUTH);
};
