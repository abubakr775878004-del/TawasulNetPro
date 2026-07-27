export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'reseller';
  status: 'active' | 'suspended';
  createdAt: string;
  phone?: string;
  balance?: number;
}

export interface Package {
  id: string;
  name: string;
  value: number;
  description?: string;
  color?: string;
  loanCount: number;
  createdAt: string;
}

export interface Loan {
  id: string;
  code: string;
  packageId: string;
  packageName: string;
  addedBy: string;
  addedAt: string;
  status: 'available' | 'sold' | 'used';
  source: 'manual' | 'pdf' | 'bulk';
  soldAt?: string;       // ISO timestamp — set when reseller sells the card
  soldBy?: string;       // reseller user ID
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
}

export interface DashboardStats {
  totalPackages: number;
  totalLoans: number;
  totalResellers: number;
  availableLoans: number;
  usedLoans: number;
  totalValueRiyal: number;
}

export interface MikroTikConfig {
  host: string;
  port: string;
  username: string;
  password: string;
  isConnected: boolean;
}

export interface SystemSettings {
  systemName: string;
  ownerName: string;
  contactPhone: string;
  currency: string;
  theme: string;
  allowRegistration: boolean;
  maintenanceMode: boolean;
}
