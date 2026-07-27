import { useState } from 'react';
import {
  Server, Wifi, WifiOff, Settings2, RefreshCw, Shield,
  Activity, Package, AlertTriangle, CheckCircle2, ExternalLink
} from 'lucide-react';
import { getMikrotik, saveMikrotik } from '@/lib/storage';
import { toast } from 'sonner';
import type { MikroTikConfig } from '@/types';

const MikroTikPage = () => {
  const [config, setConfig] = useState<MikroTikConfig>(getMikrotik);
  const [testLoading, setTestLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleChange = (field: keyof MikroTikConfig, value: string | boolean) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleTestConnection = () => {
    if (!config.host) { toast.error('يرجى إدخال عنوان السيرفر أولاً'); return; }
    setTestLoading(true);
    setTimeout(() => {
      // Simulate connection attempt (always fails in demo - no real MikroTik)
      toast.error('تعذر الاتصال — هذه ميزة مستقبلية ستُفعّل مع ربط السيرفر الحقيقي');
      setTestLoading(false);
    }, 2000);
  };

  const handleSave = () => {
    setSaveLoading(true);
    setTimeout(() => {
      saveMikrotik(config);
      toast.success('تم حفظ إعدادات MikroTik');
      setSaveLoading(false);
    }, 400);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Server size={24} className="text-sky-400" />
            MikroTik Integration
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">ربط الباقات مع سيرفر MikroTik لإدارة القروض تلقائياً</p>
        </div>
        <span className="badge-warning text-xs px-3 py-1.5">قيد التطوير</span>
      </div>

      {/* Info banner */}
      <div className="p-4 rounded-xl bg-blue-900/20 border border-blue-500/20 flex gap-3">
        <AlertTriangle size={18} className="text-yellow-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-white font-medium text-sm mb-1">وحدة التكامل المستقبلية</p>
          <p className="text-gray-400 text-sm">
            هذه الوحدة مصممة لربط الباقات المخصصة مباشرة بسيرفر MikroTik الخاص بك، مما يتيح
            إنشاء وإدارة القروض من داخل المنصة دون الحاجة للدخول المباشر على الواجهة الخارجية.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Config form */}
        <div className="lg:col-span-2 card-bg rounded-2xl p-6 border border-border">
          <h2 className="text-white font-bold mb-5 flex items-center gap-2">
            <Settings2 size={16} className="text-sky-400" />
            إعدادات الاتصال
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-gray-400 text-sm mb-1.5">عنوان السيرفر (IP/Host)</label>
              <input
                value={config.host}
                onChange={(e) => handleChange('host', e.target.value)}
                placeholder="192.168.1.1"
                className="input-field"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">المنفذ (Port)</label>
              <input
                value={config.port}
                onChange={(e) => handleChange('port', e.target.value)}
                placeholder="8728"
                className="input-field"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">اسم المستخدم</label>
              <input
                value={config.username}
                onChange={(e) => handleChange('username', e.target.value)}
                placeholder="admin"
                className="input-field"
                dir="ltr"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-gray-400 text-sm mb-1.5">كلمة المرور</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={config.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  placeholder="••••••••"
                  className="input-field pl-10"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs"
                >
                  {showPass ? 'إخفاء' : 'إظهار'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            <button
              onClick={handleTestConnection}
              disabled={testLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-sky-500/30 text-sky-400 hover:bg-sky-500/10 text-sm transition-all"
            >
              {testLoading ? (
                <div className="w-4 h-4 border-2 border-sky-500/30 border-t-sky-400 rounded-full animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
              اختبار الاتصال
            </button>
            <button
              onClick={handleSave}
              disabled={saveLoading}
              className="btn-primary flex items-center gap-2"
            >
              {saveLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Shield size={14} />
              )}
              حفظ الإعدادات
            </button>
          </div>
        </div>

        {/* Status panel */}
        <div className="space-y-4">
          <div className="card-bg rounded-xl p-5 border border-border">
            <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
              <Activity size={14} className="text-sky-400" />
              حالة الاتصال
            </h3>
            <div className={`flex items-center gap-3 p-3 rounded-xl ${
              config.isConnected ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/5 border border-red-500/15'
            }`}>
              {config.isConnected ? (
                <>
                  <Wifi size={18} className="text-green-400" />
                  <span className="text-green-400 text-sm font-medium">متصل</span>
                </>
              ) : (
                <>
                  <WifiOff size={18} className="text-red-400" />
                  <span className="text-red-400 text-sm font-medium">غير متصل</span>
                </>
              )}
            </div>
            {config.host && (
              <p className="text-gray-500 text-xs mt-2 font-mono" dir="ltr">{config.host}:{config.port}</p>
            )}
          </div>

          {/* Planned features */}
          <div className="card-bg rounded-xl p-5 border border-border">
            <h3 className="text-white font-semibold text-sm mb-4">الميزات المخططة</h3>
            <div className="space-y-3">
              {[
                'ربط الباقات بـ User Profiles',
                'إنشاء قروض تلقائياً',
                'مزامنة فورية للبيانات',
                'إدارة منتهية الصلاحية',
                'لوحة إحصائيات متقدمة',
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-gray-400 text-xs">
                  <CheckCircle2 size={12} className="text-sky-500/50 flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Package linking table */}
      <div className="card-bg rounded-xl p-5 border border-border">
        <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
          <Package size={14} className="text-sky-400" />
          ربط الباقات بـ MikroTik Profiles (قادمًا)
        </h3>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>باقة TawasulNet</th>
                <th>MikroTik Profile</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {['باقة 200', 'باقة 300', 'باقة 400', 'باقة 1000'].map((pkg) => (
                <tr key={pkg}>
                  <td className="text-white">{pkg}</td>
                  <td>
                    <input
                      disabled
                      placeholder="اسم الـ Profile في MikroTik"
                      className="bg-muted border border-border rounded px-2 py-1 text-gray-500 text-xs w-48 cursor-not-allowed"
                      dir="ltr"
                    />
                  </td>
                  <td><span className="badge-warning">غير مربوط</span></td>
                  <td>
                    <button disabled className="text-xs text-gray-600 flex items-center gap-1 cursor-not-allowed">
                      <ExternalLink size={11} />
                      ربط (قريباً)
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-gray-600 text-xs mt-3">* سيتم تفعيل هذه الميزة بعد اكتمال ربط سيرفر MikroTik</p>
      </div>
    </div>
  );
};

export default MikroTikPage;
