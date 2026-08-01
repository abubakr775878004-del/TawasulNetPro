import { useState } from 'react';
import {
  Users, Trash2, Shield, ShieldOff, Search, X, Check, Phone, Mail, Lock, Wallet, PlusCircle
} from 'lucide-react';
import { getUsers, deleteUser, updateUser } from '@/lib/storage';
import { formatDate, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import type { User } from '@/types';

interface ResellersPageProps {
  user: User;
}

const ResellersPage = ({ user }: ResellersPageProps) => {
  const isManager = user.role === 'admin';

  const [resellers, setResellers] = useState<User[]>(() =>
    getUsers().filter((u) => u.role === 'reseller')
  );
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // حالة نافذة شحن الرصيد
  const [topUpModal, setTopUpModal] = useState<{
    isOpen: boolean;
    user: User | null;
    amount: string;
  }>({
    isOpen: false,
    user: null,
    amount: '',
  });

  const refresh = () => setResellers(getUsers().filter((u) => u.role === 'reseller'));

  const filtered = resellers.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  // تنفيذ شحن/إضافة الرصيد للموزع
  const handleTopUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topUpModal.user || !topUpModal.amount) return;

    const amountToAdd = parseFloat(topUpModal.amount);
    if (isNaN(amountToAdd) || amountToAdd <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح');
      return;
    }

    const currentBalance = topUpModal.user.balance || 0;
    const newBalance = currentBalance + amountToAdd;

    // تحديث رصيد الموزع في التخزين
    updateUser(topUpModal.user.id, { balance: newBalance });

    toast.success(`تم إضافة ${formatCurrency(amountToAdd)} لرصيد الموزع (${topUpModal.user.name}) بنجاح`);
    setTopUpModal({ isOpen: false, user: null, amount: '' });
    refresh();
  };

  // DELETE /api/resellers/:id — permanently removes a reseller account
  const handleDelete = (id: string) => {
    if (!isManager) {
      toast.error('صلاحيات محدودة — المدير فقط يمكنه حذف الموزعين');
      return;
    }
    deleteUser(id);
    toast.success('تم حذف الموزع نهائياً');
    setDeleteConfirm(null);
    refresh();
  };

  const handleToggleStatus = (u: User) => {
    if (!isManager) {
      toast.error('صلاحيات محدودة');
      return;
    }
    const newStatus = u.status === 'active' ? 'suspended' : 'active';
    updateUser(u.id, { status: newStatus });
    toast.success(newStatus === 'active' ? 'تم تفعيل الحساب' : 'تم إيقاف الحساب');
    refresh();
  };

  if (!isManager) {
    return (
      <div className="space-y-6" dir="rtl">
        <div>
          <h1 className="text-2xl font-bold text-white">الموزعون</h1>
          <p className="text-gray-500 text-sm mt-0.5">عرض قائمة الموزعين المسجلين</p>
        </div>
        <div className="card-bg rounded-2xl p-10 text-center border border-red-500/20">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <Lock size={24} className="text-red-400" />
          </div>
          <h3 className="text-white font-bold text-lg mb-2">صلاحيات محدودة</h3>
          <p className="text-gray-500 text-sm max-w-xs mx-auto">
            إدارة الموزعين متاحة لمدير النظام فقط.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">إدارة الموزعين</h1>
          <p className="text-gray-500 text-sm mt-0.5">عرض وإدارة حسابات الموزعين المسجلين وشحن أرباحهم/أرصدتهم</p>
        </div>
        <div className="badge-blue text-sm px-3 py-1.5">
          {resellers.length} موزع مسجل
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="metric-card">
          <p className="text-gray-500 text-xs mb-1">إجمالي الموزعين</p>
          <p className="text-white text-2xl font-bold">{resellers.length}</p>
        </div>
        <div className="metric-card">
          <p className="text-gray-500 text-xs mb-1">نشطون</p>
          <p className="text-neon-green text-2xl font-bold">
            {resellers.filter((u) => u.status === 'active').length}
          </p>
        </div>
        <div className="metric-card">
          <p className="text-gray-500 text-xs mb-1">موقوفون</p>
          <p className="text-red-400 text-2xl font-bold">
            {resellers.filter((u) => u.status === 'suspended').length}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالاسم أو البريد الإلكتروني"
          className="input-field pr-9"
        />
      </div>

      {/* Table */}
      <div className="card-bg rounded-xl overflow-hidden">
        {filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>الموزع</th>
                  <th>التواصل</th>
                  <th>الرصيد</th>
                  <th>الحالة</th>
                  <th>تاريخ التسجيل</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 text-sm font-medium flex-shrink-0">
                          {u.name[0]}
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">{u.name}</p>
                          <p className="text-gray-500 text-xs">{u.id}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                          <Mail size={11} />
                          <span dir="ltr">{u.email}</span>
                        </div>
                        {u.phone && (
                          <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                            <Phone size={11} />
                            <span dir="ltr">{u.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="text-neon-green font-semibold">
                        {formatCurrency(u.balance || 0)}
                      </span>
                    </td>
                    <td>
                      <span className={u.status === 'active' ? 'badge-success' : 'badge-danger'}>
                        {u.status === 'active' ? 'نشط' : 'موقوف'}
                      </span>
                    </td>
                    <td className="text-gray-500 text-xs">{formatDate(u.createdAt)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        {/* زر شحن الرصيد */}
                        <button
                          onClick={() => setTopUpModal({ isOpen: true, user: u, amount: '' })}
                          className="p-1.5 rounded-lg text-green-400 hover:bg-green-500/10 transition-colors"
                          title="شحن رصيد الموزع"
                        >
                          <Wallet size={15} />
                        </button>

                        {/* Toggle status */}
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            u.status === 'active'
                              ? 'hover:bg-yellow-500/10 text-gray-400 hover:text-yellow-400'
                              : 'hover:bg-green-500/10 text-gray-400 hover:text-green-400'
                          }`}
                          title={u.status === 'active' ? 'إيقاف الحساب' : 'تفعيل الحساب'}
                        >
                          {u.status === 'active' ? <ShieldOff size={14} /> : <Shield size={14} />}
                        </button>

                        {/* Delete reseller */}
                        {deleteConfirm === u.id ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleDelete(u.id)}
                              className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
                              title="تأكيد الحذف النهائي"
                            >
                              <Check size={12} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(u.id)}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
                            title="حذف الموزع نهائياً"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 text-center">
            <Users size={48} className="mx-auto mb-4 text-gray-700" />
            <p className="text-white font-medium">لا يوجد موزعون</p>
            <p className="text-gray-500 text-sm mt-1">سيظهر هنا الموزعون المسجلون في النظام</p>
          </div>
        )}
      </div>

      {/* Modal - نافذة شحن الرصيد المنبثقة */}
      {topUpModal.isOpen && topUpModal.user && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-md shadow-2xl dir-rtl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
                <PlusCircle size={20} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">شحن رصيد الموزع</h3>
                <p className="text-xs text-gray-400">إضافة مبلغ مالي لرصيد الموزع لشراء الكروت</p>
              </div>
            </div>

            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 mb-5 space-y-1">
              <p className="text-gray-400 text-xs">
                اسم الموزع: <span className="text-white font-medium">{topUpModal.user.name}</span>
              </p>
              <p className="text-gray-400 text-xs">
                الرصيد الحالي: <span className="text-neon-green font-bold">{formatCurrency(topUpModal.user.balance || 0)}</span>
              </p>
            </div>

            <form onSubmit={handleTopUpSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  المبلغ المراد إضافته (بالريال):
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={topUpModal.amount}
                  onChange={(e) => setTopUpModal({ ...topUpModal, amount: e.target.value })}
                  placeholder="مثال: 5000"
                  className="input-field text-lg font-bold text-white text-center"
                  autoFocus
                  required
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-500 text-white font-medium py-2.5 rounded-xl transition-all shadow-lg shadow-green-600/20 text-sm"
                >
                  إيداع الرصيد
                </button>
                <button
                  type="button"
                  onClick={() => setTopUpModal({ isOpen: false, user: null, amount: '' })}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-gray-300 font-medium py-2.5 rounded-xl transition-all text-sm"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="p-4 rounded-xl bg-sky-500/5 border border-sky-500/15">
        <p className="text-gray-400 text-sm">
          💡 يمكنك النقر على أيقونة المحفظة الأخضراء <Wallet size={14} className="inline text-green-400" /> في خانة الإجراءات لشحن رصيد أي موزع بشكل مباشر.
        </p>
      </div>
    </div>
  );
};

export default ResellersPage;
