import React, { useState } from 'react';
import { Plus, Package, Trash2, Edit3, X, Check, FileText } from 'lucide-react';
import { getPackages, createPackage, deletePackage, savePackages, getLoans, createLoans } from '@/lib/storage';
import { PACKAGE_COLORS } from '@/constants';
import { formatCurrency, PACKAGE_COLOR_MAP } from '@/lib/utils';
import { toast } from 'sonner';
import type { Package as PackageType } from '@/types';

// ── PDF.js worker (loaded lazily from CDN, نفس المنطق المستخدم في صفحة القروض) ──
let pdfjsLib: typeof import('pdfjs-dist') | null = null;
const loadPdfjs = async () => {
  if (pdfjsLib) return pdfjsLib;
  const lib = await import('pdfjs-dist');
  lib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${lib.version}/pdf.worker.min.js`;
  pdfjsLib = lib;
  return lib;
};

const PHONE_RE = /^[\d\s\+\-\(\)]{7,15}$/;
const extractCardsFromPdfText = (text: string): string[] => {
  const matches = text.match(/([A-Za-z]?\d{7,12})/g) || [];
  return Array.from(new Set(matches)).filter((code) => !PHONE_RE.test(code) && !/^77\d{7}$/.test(code));
};

interface PackagesPageProps {
  user: { role: string };
}

// ── Reseller read-only view ──────────────────────────────────────────────────
const ResellerPackagesView = () => {
  const packages = getPackages();
  const loans = getLoans();
  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-white">الباقات المتاحة</h1>
        <p className="text-gray-500 text-sm mt-0.5">عرض جميع الباقات وأسعارها وعدد البطاقات المتوفرة</p>
      </div>
      {packages.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {packages.map((pkg) => {
            const available = loans.filter((l) => l.packageId === pkg.id && l.status === 'available').length;
            const colors = PACKAGE_COLOR_MAP[pkg.color || 'sky'];
            return (
              <div key={pkg.id} className={`card-bg rounded-xl p-5 border ${colors.border} hover:border-opacity-60 transition-all`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${colors.bg} border ${colors.border}`}>
                  <Package size={18} className={colors.text} />
                </div>
                <h3 className="text-white font-bold text-lg">{pkg.name}</h3>
                {pkg.description && <p className="text-gray-500 text-sm mt-0.5">{pkg.description}</p>}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                  <div>
                    <p className="text-gray-500 text-xs">السعر</p>
                    <p className={`font-bold text-lg ${colors.text}`}>{pkg.value} ريال</p>
                  </div>
                  <div className="text-left">
                    <p className="text-gray-500 text-xs">متوفر</p>
                    <p className={`font-bold text-2xl ${available > 0 ? 'text-green-400' : 'text-red-400'}`}>{available}</p>
                  </div>
                </div>
                {available === 0 && (
                  <div className="mt-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                    <span className="text-red-400 text-xs font-medium">نفد المخزون</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card-bg rounded-xl py-20 text-center">
          <Package size={48} className="mx-auto mb-4 text-gray-700" />
          <p className="text-white font-medium">لا توجد باقات بعد</p>
        </div>
      )}
    </div>
  );
};

const PackagesPage = ({ user }: PackagesPageProps) => {
  const isManager = user.role === 'admin';

  if (!isManager) return <ResellerPackagesView />;

  const [packages, setPackages] = useState<PackageType[]>(() => getPackages());
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // حالات خاصة باستيراد الـ PDF
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [targetPackageId, setTargetPackageId] = useState('');
  const [extractedCards, setExtractedCards] = useState<string[]>([]);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);

  const [form, setForm] = useState({
    name: '',
    value: '',
    description: '',
    color: 'sky',
  });

  const refresh = () => setPackages(getPackages());

  // قراءة PDF فعلية عبر pdfjs (الطريقة القديمة كانت تقرأ ملف الـ PDF الثنائي
  // كنص عبر readAsText، مما ينتج بيانات تالفة ولا يستخرج أي كود عملياً)
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingPdf(true);
    try {
      const lib = await loadPdfjs();
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await lib.getDocument({ data: arrayBuffer }).promise;
      const pageTexts: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        pageTexts.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '));
      }
      const filteredCards = extractCardsFromPdfText(pageTexts.join(' '));

      setExtractedCards(filteredCards);
      if (filteredCards.length > 0) {
        toast.success(`تم استخراج وتصفية ${filteredCards.length} كرت بنجاح`);
      } else {
        toast.error('لم يتم العثور على أكواد صالحة، تأكد من ملف الـ PDF');
      }
    } catch (error) {
      console.error(error);
      toast.error('فشل قراءة أو تحليل ملف الـ PDF');
    } finally {
      setIsProcessingPdf(false);
    }
  };

  // حفظ الكروت المستخرجة للباقة المحددة (يستخدم نفس طبقة التخزين الموحّدة
  // مع فحص التكرار، بدلاً من الكتابة المباشرة على مفتاح localStorage خاطئ)
  const handleSaveImportedCards = () => {
    if (!targetPackageId) {
      toast.error('الرجاء اختيار الباقة المستهدفة أولاً');
      return;
    }
    if (extractedCards.length === 0) {
      toast.error('لا توجد كروت للاستيراد');
      return;
    }

    const pkg = packages.find((p) => p.id === targetPackageId);
    const dataList = extractedCards.map((code) => ({
      code,
      packageId: targetPackageId,
      packageName: pkg?.name || '',
      addedBy: 'admin-001',
      status: 'available' as const,
      source: 'pdf' as const,
    }));

    const { added, duplicates } = createLoans(dataList);
    if (added.length > 0) toast.success(`تمت إضافة ${added.length} كرت إلى الباقة بنجاح!`);
    if (duplicates.length > 0) toast.warning(`تم تجاهل ${duplicates.length} كود مكرر (موجود مسبقاً)`);

    setShowPdfModal(false);
    setExtractedCards([]);
    setTargetPackageId('');
    refresh();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.value) { toast.error('يرجى تعبئة الاسم والقيمة'); return; }
    const value = Number(form.value);
    if (isNaN(value) || value <= 0) { toast.error('يرجى إدخال قيمة صحيحة'); return; }

    if (editId) {
      savePackages(getPackages().map((p) => p.id === editId ? { ...p, name: form.name, value, description: form.description, color: form.color } : p));
      toast.success('تم تحديث الباقة');
      setEditId(null);
    } else {
      createPackage({ name: form.name, value, description: form.description, color: form.color });
      toast.success('تم إنشاء الباقة بنجاح');
    }

    setForm({ name: '', value: '', description: '', color: 'sky' });
    setShowForm(false);
    refresh();
  };

  const handleEdit = (pkg: PackageType) => {
    setForm({ name: pkg.name, value: String(pkg.value), description: pkg.description || '', color: pkg.color || 'sky' });
    setEditId(pkg.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    const loans = getLoans();
    const pkgLoans = loans.filter((l) => l.packageId === id);
    if (pkgLoans.length > 0) {
      toast.error(`لا يمكن حذف الباقة — تحتوي على ${pkgLoans.length} قرض. احذف القروض أولاً.`);
      return;
    }
    deletePackage(id);
    toast.success('تم حذف الباقة');
    setDeleteConfirm(null);
    refresh();
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm({ name: '', value: '', description: '', color: 'sky' });
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">باقات القروض والبطاقات</h1>
          <p className="text-gray-500 text-sm mt-0.5">إنشاء وإدارة الباقات واستيراد الكروت عبر PDF</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowPdfModal(true)} 
            className="px-4 py-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 hover:bg-sky-500/20 flex items-center gap-2 text-sm font-medium transition-all"
          >
            <FileText size={16} />
            استيراد PDF
          </button>
          <button onClick={() => { cancelForm(); setShowForm(true); }} className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            باقة جديدة
          </button>
        </div>
      </div>

      {/* نافذة استيراد الـ PDF المنسدلة */}
      {showPdfModal && (
        <div className="card-bg rounded-2xl p-6 border border-sky-500/30 animate-fade-in bg-slate-900/90">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <FileText size={18} className="text-sky-400" />
              استيراد البطاقات من ملف PDF
            </h2>
            <button onClick={() => setShowPdfModal(false)} className="text-gray-500 hover:text-white">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">الباقة المستهدفة *</label>
              <select
                value={targetPackageId}
                onChange={(e) => setTargetPackageId(e.target.value)}
                className="input-field w-full bg-slate-800 text-white border border-border rounded-xl p-2.5"
              >
                <option value="">اختر الباقة لإضافة الكروت إليها...</option>
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name} ({pkg.value} ريال)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-1.5">اختر ملف الـ PDF *</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={handlePdfUpload}
                className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-sky-500/20 file:text-sky-400 hover:file:bg-sky-500/30 cursor-pointer"
              />
            </div>

            {isProcessingPdf && (
              <p className="text-sky-400 text-sm animate-pulse">جاري قراءة الملف واستخراج الأكواد...</p>
            )}

            {extractedCards.length > 0 && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                <p className="text-green-400 text-sm font-medium">
                  تم استخراج وتصفية <span className="font-bold">{extractedCards.length}</span> كرت بنجاح (جاهزة للإضافة).
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowPdfModal(false)}
                className="px-4 py-2 rounded-xl border border-border text-gray-400 hover:text-white hover:bg-white/5 text-sm"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveImportedCards}
                disabled={extractedCards.length === 0 || !targetPackageId}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                <Check size={16} />
                تأكيد وإضافة الكروت للباقة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form For Packages */}
      {showForm && (
        <div className="card-bg rounded-2xl p-6 border border-sky-500/20 animate-fade-in">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-bold">{editId ? 'تعديل الباقة' : 'إضافة باقة جديدة'}</h2>
            <button onClick={cancelForm} className="text-gray-500 hover:text-white">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">اسم الباقة *</label>
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="مثال: باقة 200"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">القيمة (ريال) *</label>
              <input
                type="number"
                value={form.value}
                onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))}
                placeholder="مثال: 200"
                className="input-field"
                min="1"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-gray-400 text-sm mb-1.5">وصف الباقة (اختياري)</label>
              <input
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="وصف مختصر للباقة"
                className="input-field"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-gray-400 text-sm mb-2">اللون</label>
              <div className="flex gap-3 flex-wrap">
                {PACKAGE_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, color: c.value }))}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${PACKAGE_COLOR_MAP[c.value]?.bg} ${PACKAGE_COLOR_MAP[c.value]?.text} ${
                      form.color === c.value ? `border-2 ${PACKAGE_COLOR_MAP[c.value]?.border} scale-105` : 'border-transparent'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="md:col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={cancelForm} className="px-4 py-2 rounded-lg border border-border text-gray-400 hover:text-white hover:bg-white/5 text-sm transition-all">
                إلغاء
              </button>
              <button type="submit" className="btn-primary flex items-center gap-2">
                <Check size={16} />
                {editId ? 'حفظ التعديلات' : 'إنشاء الباقة'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Packages grid */}
      {packages.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {packages.map((pkg) => {
            const colors = PACKAGE_COLOR_MAP[pkg.color || 'sky'];
            return (
              <div key={pkg.id} className={`card-bg rounded-xl p-5 border hover:border-opacity-50 transition-all group ${colors.border}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors.bg} border ${colors.border}`}>
                    <Package size={18} className={colors.text} />
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(pkg)}
                      className="p-1.5 rounded-lg hover:bg-sky-500/10 text-gray-400 hover:text-sky-400 transition-colors"
                    >
                      <Edit3 size={14} />
                    </button>
                    {deleteConfirm === pkg.id ? (
                      <div className="flex gap-1">
                        <button onClick={() => handleDelete(pkg.id)} className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">
                          <Check size={14} />
                        </button>
                        <button onClick={() => setDeleteConfirm(null)} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 transition-colors">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(pkg.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="text-white font-bold text-lg">{pkg.name}</h3>
                {pkg.description && <p className="text-gray-500 text-sm mt-0.5">{pkg.description}</p>}

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                  <div>
                    <p className="text-gray-500 text-xs">القيمة</p>
                    <p className={`font-bold text-lg ${colors.text}`}>{formatCurrency(pkg.value)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500 text-xs">القروض</p>
                    <p className="text-neon-green font-bold text-lg">{pkg.loanCount}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card-bg rounded-xl py-20 text-center">
          <Package size={48} className="mx-auto mb-4 text-gray-700" />
          <p className="text-white font-medium mb-1">لا توجد باقات بعد</p>
          <p className="text-gray-500 text-sm">أنشئ باقتك الأولى بالضغط على "باقة جديدة"</p>
        </div>
      )}
    </div>
  );
};

export default PackagesPage;
