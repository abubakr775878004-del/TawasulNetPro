import { Home, AlertCircle } from 'lucide-react';

interface NotFoundProps {
  onNavigate?: (page: string) => void;
}

const NotFound = ({ onNavigate }: NotFoundProps) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
      <div className="text-center animate-fade-in">
        <div className="w-20 h-20 rounded-2xl bg-red-500/15 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          <AlertCircle size={36} className="text-red-400" />
        </div>
        <h1 className="text-6xl font-bold text-white mb-3">404</h1>
        <p className="text-gray-400 text-lg mb-6">الصفحة غير موجودة</p>
        <button
          onClick={() => onNavigate?.('dashboard')}
          className="btn-primary flex items-center gap-2 mx-auto"
        >
          <Home size={16} />
          العودة للرئيسية
        </button>
      </div>
    </div>
  );
};

export default NotFound;
