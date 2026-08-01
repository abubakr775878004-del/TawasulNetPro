import { STORAGE_KEYS, ADMIN_EMAIL, OWNER_NAME, CONTACT_PHONE } from '@/constants';
import type { User, Package, Loan, SystemSettings, MikroTikConfig } from '@/types';

// ── Types for Card Requests ────────────────────────────────────────────────
export interface CardRequest {
  id: string;
  resellerId: string;
  resellerName: string;
  packageId: string;
  packageName: string;
  quantity: number;
  totalPrice: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

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

export const updateUserBalance = (userId: string, newBalance: number) => {
  updateUser(userId, { balance: Math.max(0, newBalance) });
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
  const count = loans.filter((l) => l.packageId === packageId && l.status !== 'sold' && !l.assignedTo).length;
  savePackages(getPackages().map((p) => (p.id === packageId ? { ...p, loanCount: count } : p)));
};

// ── Loans (الكروت وحمايتها) ─────────────────────────────────────────────────
export const getLoans = (): Loan[] => read<Loan[]>(STORAGE_KEYS.LOANS, []);
export const saveLoans = (loans: Loan[]) => write(STORAGE_KEYS.LOANS, loans);

// جلب الكروت الخاصة بالموزع فقط مع حجب واستبدال أرقام الكروت تماماً بـ ********
export const getLoansForReseller = (resellerId: string): Loan[] => {
  purgeSoldCardsOlderThan24h();
  const loans = getLoans();
  return loans
    .filter((l) => l.assignedTo === resellerId || l.soldBy === resellerId)
    .map((l) => ({
      ...l,
      code: l.status === 'sold' ? l.code : '********',
    }));
};

// بيع الكرت للزبون: يكشف الكود، يخصم الرصيد، ويبدأ عداد الـ 24 ساعة
export const sellLoanToCustomer = (loanId: string, resellerId: string): { success: boolean; message: string; loan?: Loan } => {
  const loans = getLoans();
  const loanIndex = loans.findIndex((l) => l.id === loanId && (l.assignedTo === resellerId || l.soldBy === resellerId));

  if (loanIndex === -1) return { success: false, message: 'الكارت غير متاح في حسابك!' };
  if (loans[loanIndex].status === 'sold') return { success: false, message: 'تم بيع هذا الكارت مسبقاً!' };

  const users = getUsers();
  const resellerIndex = users.findIndex((u) => u.id === resellerId);
  if (resellerIndex === -1) return { success: false, message: 'حساب الموزع غير موجود!' };

  const reseller = users[resellerIndex];
  const pkg = getPackages().find((p) => p.id === loans[loanIndex].packageId);
  const cardPrice = pkg ? pkg.value : 0;

  if (reseller.role === 'reseller' && reseller.balance < cardPrice) {
    return { success: false, message: `رصيدك غير كافٍ! سعر الكارت: ${cardPrice} - رصيدك الحالي: ${reseller.balance}` };
  }

  // خصم الرصيد من الموزع
  if (reseller.role === 'reseller') {
    users[resellerIndex].balance -= cardPrice;
    saveUsers(users);
  }

  // تحديث حالة الكرت وتغيير تاريخ البيع
  loans[loanIndex].status = 'sold';
  loans[loanIndex].soldAt = new Date().toISOString();
  loans[loanIndex].soldBy = resellerId;

  saveLoans(loans);
  updatePackageLoanCount(loans[loanIndex].packageId);

  return { success: true, message: 'تم بيع الكارت وخصم الرصيد بنجاح!', loan: loans[loanIndex] };
};

// للتوافقية مع الأكواد القديمة
export const markLoanSold = (id: string, soldBy: string) => {
  return sellLoanToCustomer(id, soldBy);
};

const normalizeCode = (code: string): string => code.trim().toLowerCase();

export class DuplicateCodeError extends Error {
  duplicates: string[];
  constructor(duplicates: string[]) {
    super(`أكواد مكررة: ${duplicates.join(', ')}`);
    this.duplicates = duplicates;
  }
}

export const createLoan = (data: Omit<Loan, 'id' | 'addedAt'>): Loan => {
  const loans = getLoans();
  const existingCodes = new Set(loans.map((l) => normalizeCode(l.code)));
  if (existingCodes.has(normalizeCode(data.code))) {
    throw new DuplicateCodeError([data.code]);
  }
  const loan: Loan = { ...data, id: `loan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, addedAt: new Date().toISOString() };
  loans.push(loan);
  saveLoans(loans);
  updatePackageLoanCount(loan.packageId);
  return loan;
};

export const createLoans = (
  dataList: Omit<Loan, 'id' | 'addedAt'>[]
): { added: Loan[]; duplicates: string[] } => {
  const now = new Date().toISOString();
  const loans = getLoans();
  const existingCodes = new Set(loans.map((l) => normalizeCode(l.code)));
  const seenInBatch = new Set<string>();
  const duplicates: string[] = [];

  const added: Loan[] = [];
  dataList.forEach((data, i) => {
    const norm = normalizeCode(data.code);
    if (existingCodes.has(norm) || seenInBatch.has(norm)) {
      duplicates.push(data.code);
      return;
    }
    seenInBatch.add(norm);
    added.push({
      ...data,
      id: `loan-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      addedAt: now,
    });
  });

  if (added.length > 0) {
    loans.push(...added);
    saveLoans(loans);
    const packageIds = [...new Set(added.map((d) => d.packageId))];
    packageIds.forEach(updatePackageLoanCount);
  }
  return { added, duplicates };
};

export const deleteLoan = (id: string) => {
  const loans = getLoans();
  const loan = loans.find((l) => l.id === id);
  saveLoans(loans.filter((l) => l.id !== id));
  if (loan) updatePackageLoanCount(loan.packageId);
};

// ── 24-hour sold-card auto-purge ──────────────────────────────────────────
export const purgeSoldCardsOlderThan24h = (): number => {
  const loans = getLoans();
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const toKeep = loans.filter((l) => {
    if (l.status !== 'sold') return true;
    if (!l.soldAt) return false;
    return new Date(l.soldAt).getTime() > cutoff;
  });
  const purgedCount = loans.length - toKeep.length;
  if (purgedCount > 0) {
    saveLoans(toKeep);
    const affectedPkgIds = [...new Set(loans.filter((l) => !toKeep.find((k) => k.id === l.id)).map((l) => l.packageId))];
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

// ── Card Requests (نظام طلب الكروت بدون رؤيتها) ────────────────────────────────
const REQUESTS_KEY = 'tawasulnet_requests';

export const getCardRequests = (): CardRequest[] => read<CardRequest[]>(REQUESTS_KEY, []);
export const saveCardRequests = (requests: CardRequest[]) => write(REQUESTS_KEY, requests);

export const createCardRequest = (
  resellerId: string,
  resellerName: string,
  packageId: string,
  packageName: string,
  quantity: number,
  unitPrice: number
): CardRequest => {
  const req: CardRequest = {
    id: `req-${Date.now()}`,
    resellerId,
    resellerName,
    packageId,
    packageName,
    quantity,
    totalPrice: quantity * unitPrice,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  const requests = getCardRequests();
  requests.push(req);
  saveCardRequests(requests);
  return req;
};

export const approveCardRequest = (requestId: string): { success: boolean; message: string } => {
  const requests = getCardRequests();
  const reqIndex = requests.findIndex((r) => r.id === requestId);
  if (reqIndex === -1) return { success: false, message: 'الطلب غير موجود!' };

  const req = requests[reqIndex];
  if (req.status !== 'pending') return { success: false, message: 'تم التعامل مع هذا الطلب مسبقاً!' };

  const loans = getLoans();
  const availableLoans = loans.filter((l) => l.packageId === req.packageId && l.status !== 'sold' && !l.assignedTo);

  if (availableLoans.length < req.quantity) {
    return { success: false, message: `المخزون غير كافٍ! المتاح فقط: ${availableLoans.length} كارت.` };
  }

  let count = 0;
  for (let i = 0; i < loans.length && count < req.quantity; i++) {
    if (loans[i].packageId === req.packageId && loans[i].status !== 'sold' && !loans[i].assignedTo) {
      loans[i].assignedTo = req.resellerId;
      count++;
    }
  }

  requests[reqIndex].status = 'approved';
  saveLoans(loans);
  saveCardRequests(requests);
  updatePackageLoanCount(req.packageId);

  return { success: true, message: 'تمت الموافقة وتخصيص الكروت للموزع بنجاح!' };
};

export const rejectCardRequest = (requestId: string) => {
  const requests = getCardRequests();
  saveCardRequests(requests.map((r) => (r.id === requestId ? { ...r, status: 'rejected' } : r)));
};

// ── Settings & MikroTik ────────────────────────────────────────────────────
export const getSettings = (): SystemSettings => read<SystemSettings>(STORAGE_KEYS.SETTINGS, seedDefaultSettings());
export const saveSettings = (s: SystemSettings) => write(STORAGE_KEYS.SETTINGS, s);

export const getMikrotik = (): MikroTikConfig => read<MikroTikConfig>(STORAGE_KEYS.MIKROTIK, seedDefaultMikrotik());
export const saveMikrotik = (m: MikroTikConfig) => write(STORAGE_KEYS.MIKROTIK, m);
