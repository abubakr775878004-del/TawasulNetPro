import { STORAGE_KEYS, ADMIN_EMAIL, OWNER_NAME, CONTACT_PHONE } from '@/constants';
import type { User, Package, Loan, SystemSettings, MikroTikConfig } from '@/types';

// ── Helpers ────────────────────────────────────────────────────────────────
const read = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const write = <T>(key: string, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

// ── Seed defaults ──────────────────────────────────────────────────────────
const seedDefaultPackages = (): Package[] => [
  { id: 'pkg-200', name: 'باقة 200', value: 200, color: 'sky', loanCount: 0, createdAt: new Date().toISOString() },
  { id: 'pkg-300', name: 'باقة 300', value: 300, color: 'green', loanCount: 0, createdAt: new Date().toISOString() },
  { id: 'pkg-400', name: 'باقة 400', value: 400, color: 'purple', loanCount: 0, createdAt: new Date().toISOString() },
  { id: 'pkg-1000', name: 'باقة 1000', value: 1000, color: 'orange', loanCount: 0, createdAt: new Date().toISOString() },
];

const seedDefaultUsers = (): User[] => [
  {
    id: 'admin-001',
    name: OWNER_NAME,
    email: ADMIN_EMAIL,
    role: 'admin',
    status: 'active',
    createdAt: new Date().toISOString(),
    phone: CONTACT_PHONE,
    balance: 0,
  },
  {
    id: 'reseller-001',
    name: 'أحمد علي',
    email: 'ahmed@reseller.com',
    role: 'reseller',
    status: 'active',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    phone: '771234567',
    balance: 5000,
  },
  {
    id: 'reseller-002',
    name: 'محمد حسن',
    email: 'mohammed@reseller.com',
    role: 'reseller',
    status: 'active',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    phone: '779876543',
    balance: 3200,
  },
];

const seedDefaultSettings = (): SystemSettings => ({
  systemName: 'TawasulNet Pro',
  ownerName: OWNER_NAME,
  contactPhone: CONTACT_PHONE,
  currency: 'ريال',
  theme: 'dark',
  allowRegistration: true,
  maintenanceMode: false,
});

const seedDefaultMikrotik = (): MikroTikConfig => ({
  host: '',
  port: '8728',
  username: 'admin',
  password: '',
  isConnected: false,
});

// ── Init ───────────────────────────────────────────────────────────────────
export const initStorage = () => {
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    write(STORAGE_KEYS.USERS, seedDefaultUsers());
  }
  if (!localStorage.getItem(STORAGE_KEYS.PACKAGES)) {
    write(STORAGE_KEYS.PACKAGES, seedDefaultPackages());
  }
  if (!localStorage.getItem(STORAGE_KEYS.LOANS)) {
    write(STORAGE_KEYS.LOANS, []);
  }
  if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
    write(STORAGE_KEYS.SETTINGS, seedDefaultSettings());
  }
  if (!localStorage.getItem(STORAGE_KEYS.MIKROTIK)) {
    write(STORAGE_KEYS.MIKROTIK, seedDefaultMikrotik());
  }
};

// ── Users ──────────────────────────────────────────────────────────────────
export const getUsers = (): User[] => read<User[]>(STORAGE_KEYS.USERS, []);
export const saveUsers = (users: User[]) => write(STORAGE_KEYS.USERS, users);

export const createUser = (data: Omit<User, 'id' | 'createdAt'>): User => {
  const user: User = { ...data, id: `user-${Date.now()}`, createdAt: new Date().toISOString() };
  const users = getUsers();
  users.push(user);
  saveUsers(users);
  return user;
};

export const deleteUser = (id: string) => {
  saveUsers(getUsers().filter((u) => u.id !== id));
};

export const updateUser = (id: string, data: Partial<User>) => {
  saveUsers(getUsers().map((u) => (u.id === id ? { ...u, ...data } : u)));
};

// ── Packages ───────────────────────────────────────────────────────────────
export const getPackages = (): Package[] => read<Package[]>(STORAGE_KEYS.PACKAGES, []);
export const savePackages = (packages: Package[]) => write(STORAGE_KEYS.PACKAGES, packages);

export const createPackage = (data: Omit<Package, 'id' | 'createdAt' | 'loanCount'>): Package => {
  const pkg: Package = { ...data, id: `pkg-${Date.now()}`, loanCount: 0, createdAt: new Date().toISOString() };
  const packages = getPackages();
  packages.push(pkg);
  savePackages(packages);
  return pkg;
};

export const deletePackage = (id: string) => {
  savePackages(getPackages().filter((p) => p.id !== id));
};

export const updatePackageLoanCount = (packageId: string) => {
  const loans = getLoans();
  const count = loans.filter((l) => l.packageId === packageId).length;
  savePackages(getPackages().map((p) => (p.id === packageId ? { ...p, loanCount: count } : p)));
};

// ── Loans ──────────────────────────────────────────────────────────────────
export const getLoans = (): Loan[] => read<Loan[]>(STORAGE_KEYS.LOANS, []);
export const saveLoans = (loans: Loan[]) => write(STORAGE_KEYS.LOANS, loans);

// Mark a card as sold by a reseller (triggers 24h countdown)
export const markLoanSold = (id: string, soldBy: string) => {
  saveLoans(getLoans().map((l) =>
    l.id === id ? { ...l, status: 'sold', soldAt: new Date().toISOString(), soldBy } : l
  ));
};

export const createLoan = (data: Omit<Loan, 'id' | 'addedAt'>): Loan => {
  const loan: Loan = { ...data, id: `loan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, addedAt: new Date().toISOString() };
  const loans = getLoans();
  loans.push(loan);
  saveLoans(loans);
  updatePackageLoanCount(loan.packageId);
  return loan;
};

export const createLoans = (dataList: Omit<Loan, 'id' | 'addedAt'>[]): Loan[] => {
  const now = new Date().toISOString();
  const newLoans: Loan[] = dataList.map((data, i) => ({
    ...data,
    id: `loan-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
    addedAt: now,
  }));
  const loans = getLoans();
  loans.push(...newLoans);
  saveLoans(loans);
  const packageIds = [...new Set(dataList.map((d) => d.packageId))];
  packageIds.forEach(updatePackageLoanCount);
  return newLoans;
};

export const deleteLoan = (id: string) => {
  const loans = getLoans();
  const loan = loans.find((l) => l.id === id);
  saveLoans(loans.filter((l) => l.id !== id));
  if (loan) updatePackageLoanCount(loan.packageId);
};

// ── 24-hour sold-card auto-purge ──────────────────────────────────────────
// Call this on app boot / page load to remove sold cards that are >24 h old.
export const purgeSoldCardsOlderThan24h = (): number => {
  const loans = getLoans();
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const toKeep = loans.filter((l) => {
    if (l.status !== 'sold') return true;          // keep all non-sold
    if (!l.soldAt) return false;                   // sold but no timestamp → purge
    return new Date(l.soldAt).getTime() > cutoff;  // within 24 h → keep
  });
  const purgedCount = loans.length - toKeep.length;
  if (purgedCount > 0) {
    saveLoans(toKeep);
    // Recalculate counts for affected packages
    const affectedPkgIds = [...new Set(
      loans.filter((l) => !toKeep.find((k) => k.id === l.id)).map((l) => l.packageId)
    )];
    affectedPkgIds.forEach(updatePackageLoanCount);
  }
  return purgedCount;
};

export const deleteLoansByDate = (date: string, packageId?: string) => {
  const loans = getLoans();
  const toDelete = loans.filter((l) => {
    const loanDate = l.addedAt.substring(0, 10);
    const matchDate = loanDate === date;
    const matchPkg = packageId ? l.packageId === packageId : true;
    return matchDate && matchPkg;
  });
  const remaining = loans.filter((l) => !toDelete.find((d) => d.id === l.id));
  saveLoans(remaining);
  const pkgIds = [...new Set(toDelete.map((l) => l.packageId))];
  pkgIds.forEach(updatePackageLoanCount);
  return toDelete.length;
};

// ── Settings ───────────────────────────────────────────────────────────────
export const getSettings = (): SystemSettings => read<SystemSettings>(STORAGE_KEYS.SETTINGS, seedDefaultSettings());
export const saveSettings = (s: SystemSettings) => write(STORAGE_KEYS.SETTINGS, s);

// ── MikroTik ───────────────────────────────────────────────────────────────
export const getMikrotik = (): MikroTikConfig => read<MikroTikConfig>(STORAGE_KEYS.MIKROTIK, seedDefaultMikrotik());
export const saveMikrotik = (m: MikroTikConfig) => write(STORAGE_KEYS.MIKROTIK, m);
