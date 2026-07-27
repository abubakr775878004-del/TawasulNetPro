import { useMemo, useState } from 'react';
import {
  Package, CreditCard, Users, TrendingUp, Activity,
  Zap, Globe, RefreshCw, BarChart3
} from 'lucide-react';
import { getPackages, getLoans, getUsers } from '@/lib/storage';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CURRENCY, APP_NAME } from '@/constants';
import type { User } from '@/types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

interface DashboardPageProps {
  user: User;
  onNavigate: (page: string) => void;
}

const MetricCard = ({
  icon: Icon,
  label,
  value,
  sub,
  color = 'sky',
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) => {
  const colorMap: Record<string, string> = {
    sky: 'text-sky-400 bg-sky-500/15 border-sky-500/20',
    green: 'text-green-400 bg-green-500/15 border-green-500/20',
    red: 'text-red-400 bg-red-500/15 border-red-500/20',
    orange: 'text-orange-400 bg-orange-500/15 border-orange-500/20',
  };
  const cls = colorMap[color] || colorMap.sky;

  return (
    <div className="metric-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-500 text-sm mb-1">{label}</p>
          <p className="text-white text-2xl font-bold">{value}</p>
          {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${cls}`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Reseller dashboard: shows only package availability — NO codes / admin data
// ─────────────────────────────────────────────────────────────────────────────
const ResellerDashboard = ({ user, onNavigate }: DashboardPageProps) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const { packages, available, sold } = useMemo(() => {
    const pkgs = getPackages();
    const loans = getLoans();
    return {
      packages: pkgs,
      available: loans.filter((l) => l.status === 'available').length,
      sold: loans.filter((l) => l.status === 'sold' && l.soldBy === user.id).length,
    };
  }, [refreshKey, user.id]);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">لوحة التحكم</h1>
          <p className="text-gray-500 text-sm mt-0.5">مرحباً {user.name} — الباقات المتاحة</p>
        </div>
        <button onClick={() => setRefreshKey((k) => k + 1)} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-white/5 text-gray-400 hover:text-white transition-all text-sm">
          <RefreshCw size={14} />تحديث
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <MetricCard icon={CreditCard} label="بطاقات متاحة" value={available} sub="في المخزون" color="green" />
        <MetricCard icon={Package}    label="الباقات النشطة" value={packages.length} sub="باقة" color="sky" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {packages.map((pkg) => {
          const count = getLoans().filter((l) => l.packageId === pkg.id && l.status === 'available').length;
          return (
            <div key={pkg.id} className="card-bg rounded-xl p-5 border border-border hover:border-sky-500/30 transition-all cursor-pointer" onClick={() => onNavigate('loans')}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/20 flex items-center justify-center">
                  <CreditCard size={16} className="text-sky-400" />
                </div>
                <h3 className="text-white font-bold">{pkg.name}</h3>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-xs">السعر</p>
                  <p className="text-sky-400 font-bold text-lg">{pkg.value} ريال</p>
                </div>
                <div className="text-left">
                  <p className="text-gray-500 text-xs">متوفر</p>
                  <p className={`font-bold text-2xl ${count > 0 ? 'text-green-400' : 'text-red-400'}`}>{count}</p>
                </div>
              </div>
              {count === 0 && (
                <div className="mt-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                  <span className="text-red-400 text-xs font-medium">نفد المخزون</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const DashboardPage = ({ user, onNavigate }: DashboardPageProps) => {
  // Non-admin sees restricted reseller dashboard only
  if (user.role !== 'admin') return <ResellerDashboard user={user} onNavigate={onNavigate} />;

  const [refreshKey, setRefreshKey] = useState(0);

  const { stats, packageChartData, recentLoans, pieData } = useMemo(() => {
    const packages = getPackages();
    const loans = getLoans();
    const users = getUsers();
    const resellers = users.filter((u) => u.role === 'reseller');

    const available = loans.filter((l) => l.status === 'available').length;
    const used = loans.filter((l) => l.status !== 'available').length;

    const totalValueRiyal = packages.reduce((acc, pkg) => acc + pkg.value * pkg.loanCount, 0);

    const packageChartData = packages.map((pkg) => ({
      name: pkg.name,
      قروض: loans.filter((l) => l.packageId === pkg.id).length,
      value: pkg.value,
    }));

    const recentLoans = [...loans].sort((a, b) => b.addedAt.localeCompare(a.addedAt)).slice(0, 6);

    const pieData = [
      { name: 'متاحة', value: available, color: '#22c55e' },
      { name: 'مباعة / مستخدمة', value: used, color: '#ef4444' },
    ];

    return {
      stats: {
        totalPackages: packages.length,
        totalLoans: loans.length,
        totalResellers: resellers.length,
        availableLoans: available,
        usedLoans: used,
        totalValueRiyal,
      },
      packageChartData,
      recentLoans,
      pieData,
    };
  }, [refreshKey]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">لوحة التحكم</h1>
          <p className="text-gray-500 text-sm mt-0.5">مرحباً، {user.name} — نظرة عامة على النظام</p>
        </div>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-white/5 text-gray-400 hover:text-white transition-all text-sm"
        >
          <RefreshCw size={14} />
          تحديث
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={Package} label="إجمالي الباقات" value={stats.totalPackages} sub="باقة نشطة" color="sky" />
        <MetricCard icon={CreditCard} label="إجمالي البطاقات" value={stats.totalLoans} sub={`${stats.availableLoans} متاح`} color="green" />
        <MetricCard icon={Users} label="الموزعون" value={stats.totalResellers} sub="موزع نشط" color="orange" />
        <MetricCard
          icon={TrendingUp}
          label="إجمالي القيمة"
          value={formatCurrency(stats.totalValueRiyal)}
          sub="بالريال اليمني"
          color="sky"
        />
      </div>

      {/* Central Customization Widget */}
      <div className="card-bg rounded-2xl p-6 border border-sky-500/20"
        style={{ boxShadow: '0 0 40px hsl(199 89% 48% / 0.08)' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
            <Zap size={16} className="text-sky-400" />
          </div>
          <div>
            <h2 className="text-white font-bold text-base">لوحة التخصيص المركزية</h2>
            <p className="text-gray-500 text-xs">أدوات الضبط السريع والإعدادات الفورية</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => onNavigate('packages')}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/15 transition-all group"
          >
            <Package size={20} className="text-sky-400 group-hover:scale-110 transition-transform" />
            <span className="text-white text-sm font-medium">إضافة باقة</span>
          </button>

          <button
            onClick={() => onNavigate('loans')}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-green-500/10 border border-green-500/20 hover:bg-green-500/15 transition-all group"
          >
            <CreditCard size={20} className="text-green-400 group-hover:scale-110 transition-transform" />
            <span className="text-white text-sm font-medium">إضافة قروض</span>
          </button>

          <button
            onClick={() => onNavigate('resellers')}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/15 transition-all group"
          >
            <Users size={20} className="text-orange-400 group-hover:scale-110 transition-transform" />
            <span className="text-white text-sm font-medium">إدارة الموزعين</span>
          </button>

          <button
            onClick={() => onNavigate('mikrotik')}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/15 transition-all group"
          >
            <Globe size={20} className="text-purple-400 group-hover:scale-110 transition-transform" />
            <span className="text-white text-sm font-medium">MikroTik</span>
          </button>
        </div>

        {/* Status bar */}
        <div className="mt-4 flex items-center gap-4 pt-4 border-t border-border/50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-gray-400 text-xs">النظام يعمل بكفاءة</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity size={12} className="text-sky-400" />
            <span className="text-gray-400 text-xs">آخر تحديث: الآن</span>
          </div>
          <div className="flex items-center gap-2 mr-auto">
            <span className="text-gray-500 text-xs">قروض متاحة:</span>
            <span className="text-neon-green font-bold text-sm">{stats.availableLoans}</span>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar chart */}
        <div className="lg:col-span-2 card-bg rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-sky-400" />
            <h3 className="text-white font-semibold text-sm">توزيع القروض على الباقات</h3>
          </div>
          {packageChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={packageChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 18%)" />
                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: 'hsl(0 0% 10%)', border: '1px solid hsl(0 0% 18%)', borderRadius: '8px', color: '#fff' }}
                  cursor={{ fill: 'hsl(199 89% 48% / 0.05)' }}
                />
                <Bar dataKey="قروض" fill="hsl(199 89% 48%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-600 text-sm">
              لا توجد بيانات بعد
            </div>
          )}
        </div>

        {/* Pie chart */}
        <div className="card-bg rounded-xl p-5">
          <h3 className="text-white font-semibold text-sm mb-4">حالة القروض</h3>
          {stats.totalLoans > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                    {pieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: 'hsl(0 0% 10%)', border: '1px solid hsl(0 0% 18%)', borderRadius: '8px', color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {pieData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                      <span className="text-gray-400">{d.name}</span>
                    </div>
                    <span className="text-white font-medium">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-600 text-sm">
              لا توجد قروض
            </div>
          )}
        </div>
      </div>

      {/* Recent cards */}
      <div className="card-bg rounded-xl p-5">
        <h3 className="text-white font-semibold text-sm mb-4">آخر البطاقات المضافة</h3>
        {recentLoans.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>كود البطاقة</th>
                  <th>الباقة</th>
                  <th>المصدر</th>
                  <th>الحالة</th>
                  <th>تاريخ الإضافة</th>
                </tr>
              </thead>
              <tbody>
                {recentLoans.map((loan) => (
                  <tr key={loan.id}>
                    <td><code className="text-sky-400 text-xs bg-sky-500/10 px-2 py-0.5 rounded">{loan.code}</code></td>
                    <td>{loan.packageName}</td>
                    <td>
                      <span className={loan.source === 'pdf' ? 'badge-warning' : 'badge-blue'}>
                        {loan.source === 'pdf' ? 'PDF' : loan.source === 'bulk' ? 'مجمع' : 'يدوي'}
                      </span>
                    </td>
                    <td>
                      <span className={loan.status === 'available' ? 'badge-success' : loan.status === 'sold' ? 'badge-warning' : 'badge-danger'}>
                        {loan.status === 'available' ? 'متاح' : loan.status === 'sold' ? 'مباع' : 'مستخدم'}
                      </span>
                    </td>
                    <td className="text-gray-500 text-xs">{formatDate(loan.addedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-gray-600">
            <CreditCard size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">لا توجد بطاقات بعد — أضف بطاقات من صفحة البطاقات</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
