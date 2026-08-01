export const APP_NAME = 'TawasulNet Pro';
export const OWNER_NAME = 'أبوبكر محسن';
export const OWNER_NAME_EN = 'Abubakr Mohsen';
export const CONTACT_PHONE = '775878004';
export const CURRENCY = 'ريال';
export const CURRENCY_EN = 'Riyal';

// ── بيانات المدير الجديدة (البريد بحروف صغيرة) ──────────────────────
export const ADMIN_EMAIL = 'abubakr775878004@gmail.com';
export const ADMIN_PASSWORD = 'abubakr350';

export const STORAGE_KEYS = {
  AUTH: 'tawasulnet_auth',
  USERS: 'tawasulnet_users',
  PACKAGES: 'tawasulnet_packages',
  LOANS: 'tawasulnet_loans',
  SETTINGS: 'tawasulnet_settings',
  MIKROTIK: 'tawasulnet_mikrotik',
} as const;

export const PACKAGE_COLORS = [
  { label: 'أزرق سماوي', value: 'sky', bg: 'bg-sky-500/20', text: 'text-sky-400', border: 'border-sky-500/30' },
  { label: 'أخضر', value: 'green', bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  { label: 'بنفسجي', value: 'purple', bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
  { label: 'برتقالي', value: 'orange', bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
  { label: 'وردي', value: 'pink', bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/30' },
  { label: 'أصفر', value: 'yellow', bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
];

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'لوحة التحكم', icon: 'LayoutDashboard', path: '/dashboard' },
  { id: 'packages', label: 'باقات القروض', icon: 'Package', path: '/packages' },
  { id: 'loans', label: 'القروض', icon: 'CreditCard', path: '/loans' },
  { id: 'resellers', label: 'الموزعون', icon: 'Users', path: '/resellers' },
  { id: 'mikrotik', label: 'MikroTik', icon: 'Server', path: '/mikrotik' },
  { id: 'settings', label: 'الإعدادات', icon: 'Settings', path: '/settings' },
];
