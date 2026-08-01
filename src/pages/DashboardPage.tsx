import { useMemo, useState } from 'react';
import {
  Package, CreditCard, Users, TrendingUp, Activity,
  Zap, Globe, RefreshCw, BarChart3, ShoppingBag, Wallet, CheckCircle2, AlertCircle
} from 'lucide-react';
import { getPackages, getLoans, getUsers, createCardRequest } from '@/lib/storage';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { User, Package as PackageType } from '@/types';
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
    purple: 'text-purple-400 bg-purple-500/15 border-purple-500/20',
  };
  const cls = colorMap[color] || colorMap.sky;

  return (
    <div className="metric-card bg-slate-900/60 p-4 rounded-xl border border-slate-800">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm mb-1">{label}</p>
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
// Reseller dashboard: Allows requesting cards based on user balance
// ─────────────────────────────────────────────────────────────────────────────
const ResellerDashboard = ({ user }: DashboardPageProps) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedPkg, setSelectedPkg] = useState<PackageType | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // تحديث بيانات الموزع الحالية ورصيده
  const currentUser = useMemo(() => {
    const users = getUsers();
    return users.find((u) => u.id === user.id) || user;
  }, [refreshKey, user]);

  const { packages, assignedLoansCount } = useMemo(() => {
    const pkgs = getPackages();
    const loans = getLoans();
    // الكروت المخصصة للموزع الحالية
    const myLoans = loans.filter((l) => l.assignedTo === currentUser.id && l.status !== 'sold');
    return {
      packages: pkgs,
      assignedLoansCount: myLoans.length,
    };
  }, [refreshKey, currentUser.id]);

  const handleSendRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg || quantity <= 0) return;

    const totalPrice = quantity * selectedPkg.value;

    // فحص الرصيد المتاح عند الموزع
    if (currentUser.balance < totalPrice) {
      setStatusMsg({
        type: 'error',
        text: `رصيدك غير كافٍ! إجمالي الطلب: ${totalPrice} ريال — رصيدك الحالي: ${currentUser.balance} ريال`,
      });
      return;
    }

    // إرسال الطلب للمدير
    createCardRequest(
      currentUser.id,
      currentUser.name,
      selectedPkg.id,
      selectedPkg.name,
      quantity,
      selectedPkg.value
    );

    setStatusMsg({
      type: 'success',
      text: `تم إرسال طلب ${quantity} كارت من (${selectedPkg.name}) بنجاح إلى إدارة الشبكة!`,
    });

    setSelectedPkg(null);
    setQuantity(1);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">لوحة الموزعين</h1>
          <p className="text-gray-400 text-sm mt-0.5">مرحباً {currentUser.name} — يمكنك طلب الكروت المباشرة من رصيدك</p>
        </div>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 hover:bg-white/5 text-gray-300 hover:text-white transition-all text-sm"
        >
          <RefreshCw size={14} /> تحديث البيانات
        </button>
      </div>

      {/* Alert Messages */}
      {statusMsg && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-sm ${
            statusMsg.type === 'success'
              ? 'bg-green-950/40 border-green-700 text-green-200'
              : 'bg-red-950/40 border-red-700 text-red-200'
          }`}
        >
          {statusMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          icon={Wallet}
          label="رصيدك الحالي"
          value={formatCurrency(currentUser.balance || 0)}
          sub="متوفر للشراء والطلب"
          color="green"
        />
        <MetricCard
          icon={CreditCard}
          label="الكروت المخصصة لك"
          value={assignedLoansCount}
          sub="جاهزة للبيع للزبائن"
          color="sky"
        />
        <MetricCard
          icon={Package}
          label="الباقات المتاحة"
          value={packages.length}
          sub="فئات جاهزة للطلب"
          color="purple"
        />
      </div>

      {/* Package Request Grid */}
      <h2 className="text-lg font-bold text-white mt-8 mb-4 flex items-center gap-2">
        <ShoppingBag size={20} className="text-sky-400" />
        طلب كروت جديدة من رصيدك
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {packages.map((pkg) => {
          const availableInNetwork = getLoans().filter((l) => l.packageId === pkg.id && l.status !== 'sold' && !l.assignedTo).length;

          return (
            <div
              key={pkg.id}
              className="bg-slate-900/80 rounded-xl p-5 border border-slate-800 hover:border-sky-500/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                    <CreditCard size={20} className="text-sky-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold">{pkg.name}</h3>
                    <p className="text-gray-400 text-xs">سعر الكارت</p>
                  </div>
                </div>

                <div className="my-4 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 flex items-center justify-between">
                  <span className="text-sky-400 font-bold text-xl">{pkg.value} ريال</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${availableInNetwork > 0 ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                    {availableInNetwork > 0 ? `متوفر بالمخزون: ${availableInNetwork}` : 'طلب على الانتظار'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setStatusMsg(null);
                  setSelectedPkg(pkg);
                }}
                className="w-full mt-2 bg-sky-600 hover:bg-sky-500 text-white font-medium py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-sky-600/20"
              >
                <ShoppingBag size={16} />
                طلب كمية من الباقة
              </button>
            </div>
          );
        })}
      </div>

      {/* Request Modal */}
      {selectedPkg && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-md shadow-2xl dir-rtl">
            <h3 className="text-xl font-bold text-white mb-1">طلب كروت: {selectedPkg.name}</h3>
            <p className="text-sm text-gray-400 mb-5">سعر الكارت الواحد: {selectedPkg.value} ريال</p>

            <form onSubmit={handleSendRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">الكمية المطلوبة (عدد الكروت):</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-sky-500 text-lg font-bold text-center"
                />
              </div>

              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2 text-sm">
                <div className="flex justify-between text-gray-300">
                  <span>المبلغ الإجمالي المطلوب:</span>
                  <span className="font-bold text-sky-400 text-base">{quantity * selectedPkg.value} ريال</span>
                </div>
                <div className="flex justify-between text-gray-400 text-xs pt-2 border-t border-slate-800">
                  <span>رصيدك الحالي المتاح:</span>
                  <span className={currentUser.balance >= quantity * selectedPkg.value ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
                    {currentUser.balance} ريال
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-500 text-white font-medium py-2.5 rounded-xl transition-all shadow-lg shadow-green-600/20"
                >
                  إرسال الطلب للمدير
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPkg(null)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-gray-300 font-medium py-2.5 rounded-xl transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin Dashboard
// ─────────────────────────────────────────────────────────────────────────────
const DashboardPage = ({ user, onNavigate }: DashboardPageProps) => {
  if (user.role !== 'admin') return <ResellerDashboard user={user} onNavigate={onNavigate} />;

  const [refreshKey, setRefreshKey] = useState(0);

  const { stats, packageChartData, recentLoans, pieData } = useMemo(() => {
    const packages = getPackages();
    const loans = getLoans();
    const users = getUsers();
    const resellers = users.filter((u) => u.role === 'reseller');

    const available = loans.filter((l) => l.status === 'available' || !l.status).length;
    const used = loans.filter((l) => l.status === 'sold').length;

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
          <h1 className="text-2xl font-bold text-white">لوحة التحكم الإدارية</h1>
          <p className="text-gray-400 text-sm mt-0.5">مرحباً، {user.name} — نظرة عامة على النظام</p>
        </div>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 hover:bg-white/5 text-gray-300 hover:text-white transition-all text-sm"
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
      <div className="card-bg rounded-2xl p-6 border border-sky-500/20 bg-slate-900/80">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
            <Zap size={16} className="text-sky-400" />
          </div>
          <div>
            <h2 className="text-white font-bold text-base">لوحة التخصيص المركزية</h2>
            <p className="text-gray-400 text-xs">أدوات الضبط السريع والإعدادات الفورية</p>
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
        <div className="mt-4 flex items-center gap-4 pt-4 border-t border-slate-800">
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
            <span className="text-green-400 font-bold text-sm">{stats.availableLoans}</span>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar chart */}
        <div className="lg:col-span-2 bg-slate-900/80 rounded-xl p-5 border border-slate-800">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-sky-400" />
            <h3 className="text-white font-semibold text-sm">توزيع القروض على الباقات</h3>
          </div>
          {packageChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={packageChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
                />
                <Bar dataKey="قروض" fill="#0284c7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
              لا توجد بيانات بعد
            </div>
          )}
        </div>

        {/* Pie chart */}
        <div className="bg-slate-900/80 rounded-xl p-5 border border-slate-800">
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
                    contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
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
            <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
              لا توجد قروض
            </div>
          )}
        </div>
      </div>

      {/* Recent cards */}
      <div className="bg-slate-900/80 rounded-xl p-5 border border-slate-800">
        <h3 className="text-white font-semibold text-sm mb-4">آخر البطاقات المضافة</h3>
        {recentLoans.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-slate-800 text-xs">
                  <th className="pb-3 font-medium">كود البطاقة</th>
                  <th className="pb-3 font-medium">الباقة</th>
                  <th className="pb-3 font-medium">المصدر</th>
                  <th className="pb-3 font-medium">الحالة</th>
                  <th className="pb-3 font-medium">تاريخ الإضافة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentLoans.map((loan) => (
                  <tr key={loan.id} className="text-gray-300">
                    <td className="py-3"><code className="text-sky-400 text-xs bg-sky-500/10 px-2 py-0.5 rounded">{loan.code}</code></td>
                    <td className="py-3">{loan.packageName}</td>
                    <td className="py-3">
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-gray-300 border border-slate-700">
                        {loan.source === 'pdf' ? 'PDF' : loan.source === 'bulk' ? 'مجمع' : 'يدوي'}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${loan.status === 'sold' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
                        {loan.status === 'sold' ? 'مباع' : 'متاح'}
                      </span>
                    </td>
                    <td className="py-3 text-gray-500 text-xs">{formatDate(loan.addedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-gray-500">
            <CreditCard size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">لا توجد بطاقات بعد — أضف بطاقات من صفحة البطاقات</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
