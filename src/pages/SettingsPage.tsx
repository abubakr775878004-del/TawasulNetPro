import { useState } from 'react';
import {
  Settings, Save, Shield, Globe, Bell, Database, Palette, Info
} from 'lucide-react';
import { getSettings, saveSettings } from '@/lib/storage';
import { toast } from 'sonner';
import type { SystemSettings } from '@/types';

const SettingsPage = () => {
  const [settings, setSettings] = useState<SystemSettings>(getSettings);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('general');

  const handleChange = (field: keyof SystemSettings, value: string | boolean) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      saveSettings(settings);
      toast.success('تم حفظ الإعدادات بنجاح');
      setSaving(false);
    }, 500);
  };

  const sections = [
    { id: 'general', label: 'عام', icon: Settings },
    { id: 'security', label: 'الأمان', icon: Shield },
    { id: 'system', label: 'النظام', icon: Database },
    { id: 'about', label: 'حول النظام', icon: Info },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">الإعدادات</h1>
          <p className="text-gray-500 text-sm mt-0.5">تهيئة وضبط إعدادات النظام</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
          {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={15} />}
          حفظ الإعدادات
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Section nav */}
        <div className="card-bg rounded-xl p-3 border border-border h-fit">
          {sections.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                activeSection === id ? 'bg-sky-500/15 text-sky-400' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="lg:col-span-3 card-bg rounded-xl p-6 border border-border animate-fade-in">
          {activeSection === 'general' && (
            <div className="space-y-5">
              <h2 className="text-white font-bold flex items-center gap-2">
                <Settings size={16} className="text-sky-400" />
                الإعدادات العامة
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1.5">اسم النظام</label>
                  <input
                    value={settings.systemName}
                    onChange={(e) => handleChange('systemName', e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1.5">اسم المالك</label>
                  <input
                    value={settings.ownerName}
                    onChange={(e) => handleChange('ownerName', e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1.5">رقم التواصل</label>
                  <input
                    value={settings.contactPhone}
                    onChange={(e) => handleChange('contactPhone', e.target.value)}
                    className="input-field"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1.5">العملة</label>
                  <input
                    value={settings.currency}
                    readOnly
                    className="input-field opacity-60 cursor-not-allowed"
                  />
                  <p className="text-gray-600 text-xs mt-1">العملة ثابتة: ريال فقط</p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="space-y-5">
              <h2 className="text-white font-bold flex items-center gap-2">
                <Shield size={16} className="text-sky-400" />
                إعدادات الأمان
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted border border-border">
                  <div>
                    <p className="text-white font-medium text-sm">السماح بالتسجيل المفتوح</p>
                    <p className="text-gray-500 text-xs mt-0.5">يتيح لأي مستخدم إنشاء حساب موزع جديد</p>
                  </div>
                  <button
                    onClick={() => handleChange('allowRegistration', !settings.allowRegistration)}
                    className={`w-12 h-6 rounded-full relative transition-colors ${
                      settings.allowRegistration ? 'bg-sky-500' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        settings.allowRegistration ? 'right-1' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-muted border border-border">
                  <div>
                    <p className="text-white font-medium text-sm">وضع الصيانة</p>
                    <p className="text-gray-500 text-xs mt-0.5">إيقاف وصول الموزعين مؤقتاً</p>
                  </div>
                  <button
                    onClick={() => handleChange('maintenanceMode', !settings.maintenanceMode)}
                    className={`w-12 h-6 rounded-full relative transition-colors ${
                      settings.maintenanceMode ? 'bg-red-500' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        settings.maintenanceMode ? 'right-1' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'system' && (
            <div className="space-y-5">
              <h2 className="text-white font-bold flex items-center gap-2">
                <Database size={16} className="text-sky-400" />
                إدارة البيانات
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'تخزين البيانات', value: 'LocalStorage (مؤقت)', icon: Database },
                  { label: 'العملة المستخدمة', value: 'ريال يمني فقط', icon: Globe },
                  { label: 'الإشعارات', value: 'نشطة', icon: Bell },
                  { label: 'الثيم', value: 'داكن (Dark Mode)', icon: Palette },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="p-4 rounded-xl bg-muted border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon size={14} className="text-sky-400" />
                      <p className="text-gray-400 text-xs">{label}</p>
                    </div>
                    <p className="text-white font-medium text-sm">{value}</p>
                  </div>
                ))}
              </div>
              <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
                <p className="text-yellow-400 text-sm font-medium mb-1">تنبيه: التخزين المحلي</p>
                <p className="text-gray-400 text-xs">
                  البيانات مخزنة حالياً في المتصفح. لإدارة بيانات دائمة وآمنة، يُنصح بتفعيل قاعدة البيانات السحابية.
                </p>
              </div>
            </div>
          )}

          {activeSection === 'about' && (
            <div className="space-y-5">
              <h2 className="text-white font-bold flex items-center gap-2">
                <Info size={16} className="text-sky-400" />
                حول النظام
              </h2>
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center mx-auto mb-4"
                  style={{ boxShadow: '0 0 30px hsl(199 89% 48% / 0.2)' }}>
                  <Shield size={28} className="text-sky-400" />
                </div>
                <h3 className="text-white font-bold text-xl">TawasulNet Pro</h3>
                <p className="text-gray-500 text-sm mt-1">نظام إدارة القروض المتكامل للموزعين</p>
                <div className="badge-blue inline-flex mt-2">الإصدار 1.0.0</div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'المالك', value: settings.ownerName },
                  { label: 'رقم التواصل', value: settings.contactPhone },
                  { label: 'العملة', value: 'ريال يمني' },
                  { label: 'البيئة', value: 'Web App (React + Vite)' },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 rounded-lg bg-muted border border-border">
                    <p className="text-gray-500 text-xs mb-0.5">{label}</p>
                    <p className="text-white font-medium">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
