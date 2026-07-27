import { useState } from 'react';
import { Eye, EyeOff, LogIn, UserPlus, Shield } from 'lucide-react';
import { login, register } from '@/lib/auth';
import { APP_NAME, OWNER_NAME, CONTACT_PHONE } from '@/constants';
import { toast } from 'sonner';
import type { User } from '@/types';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

const LoginPage = ({ onLogin }: LoginPageProps) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      if (mode === 'login') {
        const result = login(form.email, form.password);
        if (result.success && result.user) {
          toast.success('تم تسجيل الدخول بنجاح');
          onLogin(result.user);
        } else {
          toast.error(result.error || 'فشل تسجيل الدخول');
        }
      } else {
        if (!form.name || !form.email || !form.password) {
          toast.error('يرجى تعبئة جميع الحقول المطلوبة');
          setLoading(false);
          return;
        }
        const result = register(form.name, form.email, form.password);
        if (result.success && result.user) {
          toast.success('تم إنشاء الحساب بنجاح');
          onLogin(result.user);
        } else {
          toast.error(result.error || 'فشل إنشاء الحساب');
        }
      }
      setLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      {/* Background pattern */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-blue-900/10 rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, hsl(199 89% 48% / 0.3) 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md animate-fade-in">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-sky-500/20 border border-sky-500/30 mb-4"
              style={{ boxShadow: '0 0 30px hsl(199 89% 48% / 0.2)' }}>
              <Shield size={28} className="text-sky-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">{APP_NAME}</h1>
            <p className="text-gray-500 text-sm mt-1">نظام إدارة القروض المتكامل</p>
          </div>

          {/* Card */}
          <div className="card-bg rounded-2xl p-8 glow-blue border border-sky-500/10">
            {/* Tabs */}
            <div className="flex rounded-xl overflow-hidden border border-border mb-6">
              <button
                onClick={() => setMode('login')}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  mode === 'login' ? 'bg-sky-500/20 text-sky-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                <LogIn size={14} />
                تسجيل الدخول
              </button>
              <button
                onClick={() => setMode('register')}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  mode === 'register' ? 'bg-sky-500/20 text-sky-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                <UserPlus size={14} />
                حساب جديد
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-gray-400 text-sm mb-1.5">الاسم الكامل *</label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="أدخل الاسم الكامل"
                    className="input-field"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-gray-400 text-sm mb-1.5">البريد الإلكتروني *</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="example@email.com"
                  className="input-field"
                  dir="ltr"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1.5">كلمة المرور *</label>
                <div className="relative">
                  <input
                    name="password"
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="input-field pl-10"
                    dir="ltr"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : mode === 'login' ? (
                  <>
                    <LogIn size={16} />
                    تسجيل الدخول
                  </>
                ) : (
                  <>
                    <UserPlus size={16} />
                    إنشاء الحساب
                  </>
                )}
              </button>
            </form>

            {mode === 'login' && (
              <div className="mt-4 p-3 rounded-lg bg-sky-500/5 border border-sky-500/15">
                <p className="text-gray-500 text-xs text-center">
                  بيانات المدير: <span className="text-sky-400" dir="ltr">admin@tawasulnet.com</span> / <span className="text-sky-400">admin123</span>
                </p>
              </div>
            )}
          </div>

          {/* Footer info */}
          <p className="text-center text-gray-600 text-xs mt-6">
            {OWNER_NAME} — <span dir="ltr">{CONTACT_PHONE}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
