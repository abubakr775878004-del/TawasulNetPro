import { useState, useRef, useCallback, useEffect } from 'react';
import {
  CreditCard, Plus, Upload, Trash2, FileText, X, Check,
  Filter, Calendar, AlertCircle, Lock, CheckSquare, Square, Layers,
  ClipboardList, ShoppingCart, Eye, EyeOff
} from 'lucide-react';
import {
  getLoans, getPackages, createLoan, createLoans,
  deleteLoan, deleteLoansByDate, saveLoans, updatePackageLoanCount,
  markLoanSold, purgeSoldCardsOlderThan24h
} from '@/lib/storage';
import { formatDate, getTodayDate } from '@/lib/utils';
import { toast } from 'sonner';
import type { Loan, Package, User } from '@/types';

// ── PDF.js worker (loaded from CDN) ───────────────────────────────────────
let pdfjsLib: typeof import('pdfjs-dist') | null = null;

const loadPdfjs = async () => {
  if (pdfjsLib) return pdfjsLib;
  const lib = await import('pdfjs-dist');
  lib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${lib.version}/pdf.worker.min.js`;
  pdfjsLib = lib;
  return lib;
};

// Phone number pattern filter
const PHONE_RE = /^[\d\s\+\-\(\)]{7,15}$/;

const extractCodesFromText = (text: string): string[] => {
  return text
    .split(/[\n\r]+/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 4 && l.length <= 80)
    .filter((l) => !PHONE_RE.test(l.replace(/\s/g, '')));
};

interface LoansPageProps {
  user: User;
}

// ────────────────────────────────────────────────────────────────────────────
// Reseller-only view: shows available packages + card counts — NO raw codes
// ────────────────────────────────────────────────────────────────────────────
const ResellerView = ({ user }: { user: User }) => {
  const [packages] = useState(() => getPackages());
  const [loans, setLoans] = useState(() => getLoans());
  const [soldConfirm, setSoldConfirm] = useState<string | null>(null);

  // Purge expired sold cards on mount
  useEffect(() => { purgeSoldCardsOlderThan24h(); setLoans(getLoans()); }, []);

  // Cards sold by THIS reseller still within 24h window
  const mySold = loans.filter(
    (l) => l.status === 'sold' && l.soldBy === user.id
  );

  const handleMarkSold = (loanId: string) => {
    markLoanSold(loanId, user.id);
    toast.success('تم تسجيل البطاقة كمباعة — ستُحذف تلقائياً بعد 24 ساعة');
    setSoldConfirm(null);
    setLoans(getLoans());
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-white">الباقات المتاحة</h1>
        <p className="text-gray-500 text-sm mt-0.5">عرض الباقات المتوفرة وعدد البطاقات في المخزون</p>
      </div>

      {/* Package availability cards — NO codes shown */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {packages.map((pkg) => {
          const available = loans.filter(
            (l) => l.packageId === pkg.id && l.status === 'available'
          ).length;
          return (
            <div key={pkg.id} className="card-bg rounded-xl p-5 border border-border hover:border-sky-500/30 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/20 flex items-center justify-center">
                  <CreditCard size={18} className="text-sky-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold">{pkg.name}</h3>
                  {pkg.description && <p className="text-gray-500 text-xs">{pkg.description}</p>}
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-border/50">
                <div>
                  <p className="text-gray-500 text-xs mb-0.5">السعر</p>
                  <p className="text-sky-400 font-bold text-lg">{pkg.value} ريال</p>
                </div>
                <div className="text-left">
                  <p className="text-gray-500 text-xs mb-0.5">متوفر</p>
                  <p className={`font-bold text-2xl ${available > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {available}
                  </p>
                </div>
              </div>
              {available === 0 && (
                <div className="mt-3 text-center py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                  <span className="text-red-400 text-xs font-medium">نفد المخزون</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sold cards (reseller's own — codes visible for 24h) */}
      {mySold.length > 0 && (
        <div className="card-bg rounded-xl overflow-hidden border border-orange-500/20">
          <div className="p-4 border-b border-border flex items-center gap-3">
            <ShoppingCart size={16} className="text-orange-400" />
            <h3 className="text-white font-semibold text-sm">
              البطاقات المباعة — تُحذف تلقائياً بعد 24 ساعة
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>كود البطاقة</th>
                  <th>الباقة</th>
                  <th>وقت البيع</th>
                  <th>يُحذف بعد</th>
                </tr>
              </thead>
              <tbody>
                {mySold.map((loan) => {
                  const soldMs = loan.soldAt ? new Date(loan.soldAt).getTime() : 0;
                  const expiresIn = Math.max(0, Math.round((soldMs + 86400000 - Date.now()) / 3600000));
                  return (
                    <tr key={loan.id}>
                      <td>
                        <code className="text-orange-400 text-xs bg-orange-500/10 px-2 py-0.5 rounded">
                          {loan.code}
                        </code>
                      </td>
                      <td className="text-gray-300 text-sm">{loan.packageName}</td>
                      <td className="text-gray-500 text-xs">{loan.soldAt ? formatDate(loan.soldAt) : '—'}</td>
                      <td>
                        <span className={`text-xs font-medium ${expiresIn < 3 ? 'text-red-400' : 'text-orange-400'}`}>
                          {expiresIn} ساعة
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Available cards — reseller can mark as sold */}
      <div className="card-bg rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <Eye size={16} className="text-sky-400" />
          <h3 className="text-white font-semibold text-sm">البطاقات المتاحة — انقر "بيع" لتسجيل البيع</h3>
        </div>
        {loans.filter((l) => l.status === 'available').length > 0 ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>الباقة</th>
                  <th>السعر</th>
                  <th>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {loans
                  .filter((l) => l.status === 'available')
                  .map((loan, idx) => (
                    <tr key={loan.id}>
                      <td className="text-gray-600 text-xs">{idx + 1}</td>
                      <td className="text-gray-300 text-sm">{loan.packageName}</td>
                      <td className="text-sky-400 font-medium text-sm">
                        {packages.find((p) => p.id === loan.packageId)?.value ?? '—'} ريال
                      </td>
                      <td>
                        {soldConfirm === loan.id ? (
                          <div className="flex gap-1.5 items-center">
                            <span className="text-orange-300 text-xs">تأكيد البيع؟</span>
                            <button
                              onClick={() => handleMarkSold(loan.id)}
                              className="px-2 py-1 rounded bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 text-xs flex items-center gap-1"
                            >
                              <Check size={11} /> نعم
                            </button>
                            <button
                              onClick={() => setSoldConfirm(null)}
                              className="px-2 py-1 rounded border border-border text-gray-400 text-xs"
                            >
                              إلغاء
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setSoldConfirm(loan.id)}
                            className="px-3 py-1.5 rounded-lg bg-orange-500/15 border border-orange-500/25 text-orange-400 hover:bg-orange-500/25 text-xs flex items-center gap-1 transition-colors"
                          >
                            <ShoppingCart size={12} /> بيع
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-14 text-center">
            <CreditCard size={40} className="mx-auto mb-3 text-gray-700" />
            <p className="text-gray-500 text-sm">لا توجد بطاقات متاحة حالياً</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────────────────────────────────
const LoansPage = ({ user }: LoansPageProps) => {
  const isManager = user.role === 'admin';

  // Purge expired sold cards on mount
  useEffect(() => { purgeSoldCardsOlderThan24h(); }, []);

  // Non-admin → restricted reseller view
  if (!isManager) return <ResellerView user={user} />;

  // ──────────────────────────── Manager state ──────────────────────────────
  const [loans, setLoans] = useState<Loan[]>(() => getLoans());
  const [packages] = useState<Package[]>(() => getPackages());
  const [activeTab, setActiveTab] = useState<'list' | 'manual' | 'bulk' | 'pdf' | 'delete'>('list');

  // Manual single
  const [manualCode, setManualCode] = useState('');
  const [manualPkgId, setManualPkgId] = useState('');
  const [manualLoading, setManualLoading] = useState(false);

  // Bulk textarea
  const [bulkText, setBulkText] = useState('');
  const [bulkPkgId, setBulkPkgId] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkPreview, setBulkPreview] = useState<string[]>([]);
  const [showBulkPreview, setShowBulkPreview] = useState(false);

  // PDF import
  const [pdfPkgId, setPdfPkgId] = useState('');
  const [pdfLines, setPdfLines] = useState<string[]>([]);
  const [pdfFileName, setPdfFileName] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [selectedPdfLines, setSelectedPdfLines] = useState<Set<number>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  // Delete filters
  const [deleteMode, setDeleteMode] = useState<'bulk' | 'batch' | 'single'>('bulk');
  const [batchDate, setBatchDate] = useState(getTodayDate());
  const [batchPkgId, setBatchPkgId] = useState('');
  const [singleDeleteConfirm, setSingleDeleteConfirm] = useState<string | null>(null);
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  // List filters
  const [filterPkg, setFilterPkg] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const refresh = () => setLoans(getLoans());

  const filteredLoans = loans.filter((l) => {
    const matchPkg = filterPkg ? l.packageId === filterPkg : true;
    const matchStatus = filterStatus ? l.status === filterStatus : true;
    return matchPkg && matchStatus;
  });

  // ── Manual single entry ───────────────────────────────────────────────────
  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) { toast.error('يرجى إدخال كود البطاقة'); return; }
    if (!manualPkgId) { toast.error('يرجى اختيار الباقة'); return; }
    setManualLoading(true);
    const pkg = packages.find((p) => p.id === manualPkgId);
    setTimeout(() => {
      createLoan({ code: manualCode.trim(), packageId: manualPkgId, packageName: pkg?.name || '', addedBy: user.id, status: 'available', source: 'manual' });
      toast.success(`تم إضافة البطاقة: ${manualCode}`);
      setManualCode('');
      setManualLoading(false);
      refresh();
    }, 200);
  };

  // ── Bulk textarea import ──────────────────────────────────────────────────
  const parseBulkText = (text: string): string[] =>
    text
      .split(/[\n\r]+/)
      .map((l) => l.trim())
      .filter((l) => l.length >= 4 && l.length <= 80)
      .filter((l) => !PHONE_RE.test(l.replace(/\s/g, '')));

  const handleBulkPreview = () => {
    const codes = parseBulkText(bulkText);
    if (codes.length === 0) { toast.error('لا توجد أكواد صالحة في النص'); return; }
    setBulkPreview(codes);
    setShowBulkPreview(true);
  };

  const handleBulkImport = () => {
    if (!bulkPkgId) { toast.error('يرجى اختيار الباقة المستهدفة'); return; }
    if (bulkPreview.length === 0) { toast.error('لا توجد أكواد للاستيراد'); return; }
    setBulkLoading(true);
    const pkg = packages.find((p) => p.id === bulkPkgId);
    const dataList = bulkPreview.map((code) => ({
      code,
      packageId: bulkPkgId,
      packageName: pkg?.name || '',
      addedBy: user.id,
      status: 'available' as const,
      source: 'bulk' as const,
    }));
    createLoans(dataList);
    toast.success(`تم استيراد ${bulkPreview.length} بطاقة إلى ${pkg?.name}`);
    setBulkText('');
    setBulkPreview([]);
    setShowBulkPreview(false);
    setBulkPkgId('');
    setBulkLoading(false);
    refresh();
    setActiveTab('list');
  };

  // ── PDF parsing ───────────────────────────────────────────────────────────
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isText = file.type.startsWith('text/') || file.name.toLowerCase().endsWith('.txt');
    if (!isPdf && !isText) { toast.error('يُرجى رفع ملف PDF أو TXT فقط'); return; }
    setPdfFileName(file.name);
    setPdfLoading(true);
    setPdfLines([]);
    setSelectedPdfLines(new Set());
    try {
      let fullText = '';
      if (isText) {
        fullText = await file.text();
      } else {
        const lib = await loadPdfjs();
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await lib.getDocument({ data: arrayBuffer }).promise;
        const pageTexts: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items.map((item) => ('str' in item ? item.str : '')).join('\n');
          pageTexts.push(pageText);
        }
        fullText = pageTexts.join('\n');
      }
      const extracted = extractCodesFromText(fullText);
      if (extracted.length === 0) {
        toast.warning('لم يتم العثور على أكواد في الملف');
      } else {
        setPdfLines(extracted);
        setSelectedPdfLines(new Set(extracted.map((_, i) => i)));
        toast.success(`تم استخراج ${extracted.length} كود من الملف`);
      }
    } catch (err) {
      console.error('PDF parse error:', err);
      toast.error('فشل تحليل الملف — تأكد من صحة الملف وحاول مجدداً');
    } finally {
      setPdfLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }, []);

  const handlePdfImport = () => {
    if (!pdfPkgId) { toast.error('يرجى اختيار الباقة المستهدفة'); return; }
    const selectedCodes = pdfLines.filter((_, i) => selectedPdfLines.has(i));
    if (selectedCodes.length === 0) { toast.error('يرجى تحديد أكواد للاستيراد'); return; }
    const pkg = packages.find((p) => p.id === pdfPkgId);
    const dataList = selectedCodes.map((code) => ({
      code, packageId: pdfPkgId, packageName: pkg?.name || '',
      addedBy: user.id, status: 'available' as const, source: 'pdf' as const,
    }));
    createLoans(dataList);
    toast.success(`تم استيراد ${selectedCodes.length} بطاقة إلى ${pkg?.name}`);
    setPdfLines([]); setPdfFileName(''); setSelectedPdfLines(new Set()); setPdfPkgId('');
    refresh(); setActiveTab('list');
  };

  // ── Deletion helpers ──────────────────────────────────────────────────────
  const handleSingleDelete = (id: string) => {
    deleteLoan(id); toast.success('تم حذف البطاقة'); setSingleDeleteConfirm(null); refresh();
  };

  const handleBulkDelete = () => {
    if (bulkSelected.size === 0) { toast.error('لم تحدد أي بطاقات'); return; }
    const all = getLoans();
    const pkgIds = [...new Set(all.filter((l) => bulkSelected.has(l.id)).map((l) => l.packageId))];
    saveLoans(all.filter((l) => !bulkSelected.has(l.id)));
    pkgIds.forEach(updatePackageLoanCount);
    toast.success(`تم حذف ${bulkSelected.size} بطاقة`);
    setBulkSelected(new Set()); setBulkDeleteConfirm(false); refresh();
  };

  const handleBatchDelete = () => {
    const count = deleteLoansByDate(batchDate, batchPkgId || undefined);
    if (count === 0) toast.info('لا توجد بطاقات في هذا التاريخ');
    else toast.success(`تم حذف ${count} بطاقة`);
    setBatchDeleteConfirm(false); refresh();
  };

  const togglePdfLine = (i: number) => setSelectedPdfLines((prev) => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });
  const toggleBulkSelect = (id: string) => setBulkSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSelectAll = () => {
    bulkSelected.size === filteredLoans.length
      ? setBulkSelected(new Set())
      : setBulkSelected(new Set(filteredLoans.map((l) => l.id)));
  };

  const tabs = [
    { id: 'list',   label: 'القائمة',       icon: CreditCard },
    { id: 'manual', label: 'إضافة فردي',    icon: Plus },
    { id: 'bulk',   label: 'إضافة مجمع',   icon: ClipboardList },
    { id: 'pdf',    label: 'استيراد PDF',   icon: FileText },
    { id: 'delete', label: 'حذف متقدم',    icon: Trash2 },
  ] as const;

  const statusLabel = (s: string) => s === 'available' ? 'متاح' : s === 'sold' ? 'مباع' : 'مستخدم';
  const statusBadge = (s: string) => s === 'available' ? 'badge-success' : s === 'sold' ? 'badge-warning' : 'badge-danger';

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">إدارة البطاقات</h1>
        <p className="text-gray-500 text-sm mt-0.5">إضافة وإدارة البطاقات يدوياً أو عبر الاستيراد المجمع أو PDF</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 card-bg rounded-xl border border-border overflow-x-auto">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as typeof activeTab)}
            className={`flex-shrink-0 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === id
                ? id === 'delete' ? 'bg-red-500/20 text-red-400' : 'bg-sky-500/20 text-sky-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Icon size={14} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ── List ── */}
      {activeTab === 'list' && (
        <div className="card-bg rounded-xl">
          <div className="p-4 border-b border-border flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Filter size={14} /><span>فلترة:</span>
            </div>
            <select value={filterPkg} onChange={(e) => setFilterPkg(e.target.value)} className="bg-muted border border-border rounded-lg px-3 py-1.5 text-gray-300 text-sm focus:outline-none focus:border-sky-500">
              <option value="">جميع الباقات</option>
              {packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-muted border border-border rounded-lg px-3 py-1.5 text-gray-300 text-sm focus:outline-none focus:border-sky-500">
              <option value="">جميع الحالات</option>
              <option value="available">متاح</option>
              <option value="sold">مباع</option>
              <option value="used">مستخدم</option>
            </select>
            <span className="text-gray-500 text-xs mr-auto">{filteredLoans.length} بطاقة</span>
          </div>
          {filteredLoans.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>كود البطاقة</th>
                    <th>الباقة</th>
                    <th>المصدر</th>
                    <th>الحالة</th>
                    <th>تاريخ الإضافة</th>
                    <th>حذف</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLoans.map((loan, idx) => (
                    <tr key={loan.id}>
                      <td className="text-gray-600 text-xs">{idx + 1}</td>
                      <td><code className="text-sky-400 text-xs bg-sky-500/10 px-2 py-0.5 rounded">{loan.code}</code></td>
                      <td className="text-gray-300 text-sm">{loan.packageName}</td>
                      <td>
                        <span className={loan.source === 'pdf' ? 'badge-warning' : loan.source === 'bulk' ? 'badge-blue' : 'badge-blue'}>
                          {loan.source === 'pdf' ? 'PDF' : loan.source === 'bulk' ? 'مجمع' : 'يدوي'}
                        </span>
                      </td>
                      <td><span className={statusBadge(loan.status)}>{statusLabel(loan.status)}</span></td>
                      <td className="text-gray-500 text-xs">{formatDate(loan.addedAt)}</td>
                      <td>
                        {singleDeleteConfirm === loan.id ? (
                          <div className="flex gap-1">
                            <button onClick={() => handleSingleDelete(loan.id)} className="p-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"><Check size={12} /></button>
                            <button onClick={() => setSingleDeleteConfirm(null)} className="p-1 rounded hover:bg-white/5 text-gray-400"><X size={12} /></button>
                          </div>
                        ) : (
                          <button onClick={() => setSingleDeleteConfirm(loan.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-20 text-center">
              <CreditCard size={48} className="mx-auto mb-4 text-gray-700" />
              <p className="text-white font-medium">لا توجد بطاقات</p>
              <p className="text-gray-500 text-sm mt-1">أضف بطاقات يدوياً أو استورد من PDF أو أدخل مجمع</p>
            </div>
          )}
        </div>
      )}

      {/* ── Manual Single Entry ── */}
      {activeTab === 'manual' && (
        <div className="card-bg rounded-2xl p-6 border border-sky-500/20 animate-fade-in max-w-lg">
          <h2 className="text-white font-bold mb-5 flex items-center gap-2">
            <Plus size={18} className="text-sky-400" />إضافة بطاقة واحدة يدوياً
          </h2>
          <form onSubmit={handleManualAdd} className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">اختر الباقة *</label>
              <select value={manualPkgId} onChange={(e) => setManualPkgId(e.target.value)} className="input-field" required>
                <option value="">-- اختر باقة --</option>
                {packages.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.value} ريال)</option>)}
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">كود البطاقة *</label>
              <input value={manualCode} onChange={(e) => setManualCode(e.target.value)} placeholder="أدخل كود البطاقة هنا" className="input-field" dir="ltr" />
            </div>
            <button type="submit" disabled={manualLoading} className="btn-primary w-full flex items-center justify-center gap-2">
              {manualLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={16} />}
              إضافة البطاقة
            </button>
          </form>
        </div>
      )}

      {/* ── Bulk Textarea Import (Manager Only) ── */}
      {activeTab === 'bulk' && (
        <div className="space-y-4 animate-fade-in">
          <div className="card-bg rounded-2xl p-6 border border-sky-500/20">
            <h2 className="text-white font-bold mb-5 flex items-center gap-2">
              <ClipboardList size={18} className="text-sky-400" />
              إضافة مجمعة — لصق قائمة الأكواد
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1.5">الباقة المستهدفة *</label>
                <select value={bulkPkgId} onChange={(e) => setBulkPkgId(e.target.value)} className="input-field">
                  <option value="">-- اختر باقة --</option>
                  {packages.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.value} ريال)</option>)}
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1.5">
                  أكواد البطاقات * <span className="text-gray-600">(كود واحد في كل سطر)</span>
                </label>
                <textarea
                  value={bulkText}
                  onChange={(e) => { setBulkText(e.target.value); setShowBulkPreview(false); setBulkPreview([]); }}
                  placeholder={"CODE-001\nCODE-002\nCODE-003\n..."}
                  rows={10}
                  className="input-field font-mono text-sm resize-y"
                  dir="ltr"
                />
                <p className="text-gray-600 text-xs mt-1">
                  أرقام الهاتف تُستبعد تلقائياً — يُقبل كل سطر يحتوي على 4–80 حرف
                </p>
              </div>

              {!showBulkPreview ? (
                <button onClick={handleBulkPreview} className="btn-primary flex items-center gap-2">
                  <Eye size={15} /> معاينة الأكواد
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-sky-500/5 border border-sky-500/20">
                    <div className="flex items-center gap-2">
                      <Check size={15} className="text-green-400" />
                      <span className="text-white text-sm font-medium">{bulkPreview.length} كود جاهز للاستيراد</span>
                    </div>
                    <button onClick={() => { setShowBulkPreview(false); setBulkPreview([]); }} className="text-gray-500 hover:text-white">
                      <EyeOff size={14} />
                    </button>
                  </div>
                  <div className="card-bg rounded-xl border border-border max-h-48 overflow-y-auto">
                    {bulkPreview.map((code, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-2 border-b border-border/50 last:border-0">
                        <span className="text-gray-600 text-xs w-6">{i + 1}</span>
                        <code className="text-sky-400 text-xs">{code}</code>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={handleBulkImport}
                    disabled={bulkLoading || !bulkPkgId}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {bulkLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Upload size={15} />}
                    استيراد {bulkPreview.length} بطاقة
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── PDF Import ── */}
      {activeTab === 'pdf' && (
        <div className="space-y-4 animate-fade-in">
          <div className="card-bg rounded-2xl p-6 border border-sky-500/20">
            <h2 className="text-white font-bold mb-5 flex items-center gap-2">
              <FileText size={18} className="text-sky-400" />استيراد البطاقات من PDF
            </h2>
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-1.5">الباقة المستهدفة *</label>
              <select value={pdfPkgId} onChange={(e) => setPdfPkgId(e.target.value)} className="input-field">
                <option value="">-- اختر باقة --</option>
                {packages.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.value} ريال)</option>)}
              </select>
            </div>
            <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-border hover:border-sky-500/50 rounded-xl p-10 text-center cursor-pointer transition-all hover:bg-sky-500/5">
              <Upload size={32} className="mx-auto mb-3 text-gray-600" />
              <p className="text-white font-medium mb-1">{pdfFileName || 'اسحب ملف PDF أو TXT هنا أو انقر للرفع'}</p>
              <p className="text-gray-500 text-xs">سيتم استخراج الأكواد تلقائياً وتصفية أرقام الهاتف</p>
              <input ref={fileRef} type="file" accept=".pdf,.txt,text/plain,application/pdf" onChange={handleFileUpload} className="hidden" />
            </div>
            {pdfLoading && (
              <div className="mt-4 flex items-center gap-3 text-sky-400 text-sm">
                <div className="w-4 h-4 border-2 border-sky-500/30 border-t-sky-400 rounded-full animate-spin" />
                جاري تحليل الملف...
              </div>
            )}
          </div>

          {pdfLines.length > 0 && (
            <div className="card-bg rounded-xl overflow-hidden border border-border">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="text-white font-semibold text-sm">الأكواد المستخرجة — {pdfLines.length} كود</h3>
                <div className="flex gap-2">
                  <button onClick={() => setSelectedPdfLines(new Set(pdfLines.map((_, i) => i)))} className="text-sky-400 text-xs hover:underline">تحديد الكل</button>
                  <span className="text-gray-600">|</span>
                  <button onClick={() => setSelectedPdfLines(new Set())} className="text-gray-400 text-xs hover:underline">إلغاء الكل</button>
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {pdfLines.map((line, i) => (
                  <div key={i} onClick={() => togglePdfLine(i)} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer border-b border-border/50 last:border-0 transition-colors ${selectedPdfLines.has(i) ? 'bg-sky-500/5' : 'hover:bg-white/2'}`}>
                    <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${selectedPdfLines.has(i) ? 'bg-sky-500 border-sky-500' : 'border-border'}`}>
                      {selectedPdfLines.has(i) && <Check size={10} className="text-white" />}
                    </div>
                    <span className="text-sm font-mono text-gray-200">{line}</span>
                    <span className="text-xs text-gray-600 mr-auto">سطر {i + 1}</span>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-border flex items-center justify-between">
                <span className="text-gray-400 text-sm">{selectedPdfLines.size} محدد</span>
                <button onClick={handlePdfImport} className="btn-primary flex items-center gap-2">
                  <Upload size={14} />استيراد المحدد
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Advanced Delete ── */}
      {activeTab === 'delete' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/5 border border-red-500/20">
            <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
            <p className="text-red-300 text-sm">تحذير: عمليات الحذف لا يمكن التراجع عنها</p>
          </div>
          <div className="flex gap-2">
            {(['bulk', 'batch', 'single'] as const).map((m) => (
              <button key={m} onClick={() => setDeleteMode(m)} className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${deleteMode === m ? 'bg-red-500/15 border-red-500/30 text-red-400' : 'border-border text-gray-400 hover:bg-white/5'}`}>
                {m === 'bulk' ? <><Layers size={14} /> مجمع</> : m === 'batch' ? <><Calendar size={14} /> بالتاريخ</> : <><Trash2 size={14} /> فردي</>}
              </button>
            ))}
          </div>

          {/* Bulk select */}
          {deleteMode === 'bulk' && (
            <div className="card-bg rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={toggleSelectAll} className="text-gray-400 hover:text-sky-400">
                    {bulkSelected.size === filteredLoans.length && filteredLoans.length > 0 ? <CheckSquare size={16} className="text-sky-400" /> : <Square size={16} />}
                  </button>
                  <h3 className="text-white font-semibold text-sm">تحديد البطاقات للحذف</h3>
                </div>
                {bulkSelected.size > 0 && (
                  <div className="flex items-center gap-3">
                    <span className="text-red-400 text-sm font-medium">{bulkSelected.size} محدد</span>
                    {!bulkDeleteConfirm ? (
                      <button onClick={() => setBulkDeleteConfirm(true)} className="btn-danger text-sm px-3 py-1.5 flex items-center gap-1.5">
                        <Trash2 size={13} />حذف المحدد
                      </button>
                    ) : (
                      <div className="flex gap-2 items-center">
                        <span className="text-red-300 text-xs">تأكيد؟</span>
                        <button onClick={handleBulkDelete} className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs flex items-center gap-1"><Check size={12} /> نعم</button>
                        <button onClick={() => setBulkDeleteConfirm(false)} className="px-3 py-1.5 rounded-lg border border-border text-gray-400 text-xs">إلغاء</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="px-4 py-3 border-b border-border/50 flex gap-3">
                <select value={filterPkg} onChange={(e) => setFilterPkg(e.target.value)} className="bg-muted border border-border rounded-lg px-3 py-1.5 text-gray-300 text-sm focus:outline-none focus:border-sky-500">
                  <option value="">جميع الباقات</option>
                  {packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {filteredLoans.length > 0 ? (
                <div className="overflow-x-auto max-h-96">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="w-10"><button onClick={toggleSelectAll} className="text-gray-400 hover:text-sky-400">{bulkSelected.size === filteredLoans.length && filteredLoans.length > 0 ? <CheckSquare size={14} className="text-sky-400" /> : <Square size={14} />}</button></th>
                        <th>كود البطاقة</th><th>الباقة</th><th>تاريخ الإضافة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLoans.map((loan) => (
                        <tr key={loan.id} onClick={() => toggleBulkSelect(loan.id)} className={`cursor-pointer ${bulkSelected.has(loan.id) ? 'bg-red-500/5' : ''}`}>
                          <td><div className={`w-4 h-4 rounded border flex items-center justify-center ${bulkSelected.has(loan.id) ? 'bg-red-500 border-red-500' : 'border-border'}`}>{bulkSelected.has(loan.id) && <Check size={10} className="text-white" />}</div></td>
                          <td><code className="text-sky-400 text-xs bg-sky-500/10 px-2 py-0.5 rounded">{loan.code}</code></td>
                          <td className="text-gray-300 text-sm">{loan.packageName}</td>
                          <td className="text-gray-500 text-xs">{formatDate(loan.addedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-gray-600 text-sm">لا توجد بطاقات</div>
              )}
            </div>
          )}

          {/* Single */}
          {deleteMode === 'single' && (
            <div className="card-bg rounded-xl overflow-hidden">
              <div className="p-4 border-b border-border"><h3 className="text-white font-semibold text-sm">اختر بطاقة للحذف</h3></div>
              {loans.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead><tr><th>كود البطاقة</th><th>الباقة</th><th>تاريخ الإضافة</th><th>حذف</th></tr></thead>
                    <tbody>
                      {loans.map((loan) => (
                        <tr key={loan.id}>
                          <td><code className="text-sky-400 text-xs">{loan.code}</code></td>
                          <td>{loan.packageName}</td>
                          <td className="text-gray-500 text-xs">{formatDate(loan.addedAt)}</td>
                          <td>
                            {singleDeleteConfirm === loan.id ? (
                              <div className="flex gap-1">
                                <button onClick={() => handleSingleDelete(loan.id)} className="btn-danger text-xs px-2 py-1 flex items-center gap-1"><Check size={11} /> تأكيد</button>
                                <button onClick={() => setSingleDeleteConfirm(null)} className="px-2 py-1 rounded border border-border text-gray-400 text-xs">إلغاء</button>
                              </div>
                            ) : (
                              <button onClick={() => setSingleDeleteConfirm(loan.id)} className="btn-danger text-xs px-3 py-1.5 flex items-center gap-1"><Trash2 size={12} /> حذف</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-gray-600 text-sm">لا توجد بطاقات</div>
              )}
            </div>
          )}

          {/* Batch by date */}
          {deleteMode === 'batch' && (
            <div className="card-bg rounded-2xl p-6 border border-red-500/20 max-w-md">
              <h3 className="text-white font-bold mb-5 flex items-center gap-2"><Calendar size={16} className="text-red-400" />حذف مجمع بالتاريخ</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1.5">التاريخ *</label>
                  <input type="date" value={batchDate} onChange={(e) => setBatchDate(e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1.5">الباقة (اختياري)</label>
                  <select value={batchPkgId} onChange={(e) => setBatchPkgId(e.target.value)} className="input-field">
                    <option value="">جميع الباقات</option>
                    {packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                {!batchDeleteConfirm ? (
                  <button onClick={() => setBatchDeleteConfirm(true)} className="btn-danger w-full flex items-center justify-center gap-2"><Trash2 size={15} />حذف البطاقات المحددة</button>
                ) : (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                    <p className="text-red-300 text-sm mb-3">هل أنت متأكد من الحذف؟</p>
                    <div className="flex gap-2">
                      <button onClick={handleBatchDelete} className="btn-danger flex-1 flex items-center justify-center gap-1 text-sm"><Check size={14} /> نعم</button>
                      <button onClick={() => setBatchDeleteConfirm(false)} className="flex-1 px-4 py-2 rounded-lg border border-border text-gray-400 text-sm hover:bg-white/5">إلغاء</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LoansPage;
