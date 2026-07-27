import { Phone, Shield } from 'lucide-react';
import { OWNER_NAME, CONTACT_PHONE, APP_NAME } from '@/constants';

const Footer = () => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 h-12 flex items-center justify-between px-6 border-t border-border/50"
      style={{ background: 'hsl(0 0% 6%)', backdropFilter: 'blur(10px)' }}>
      <div className="flex items-center gap-2 text-gray-500 text-xs">
        <Shield size={12} className="text-sky-500" />
        <span>{APP_NAME} &copy; {new Date().getFullYear()}</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-gray-400 text-xs">
          <span className="text-gray-500">المالك:</span>
          <span className="text-white font-medium">{OWNER_NAME}</span>
        </div>
        <div className="w-px h-4 bg-border" />
        <a
          href={`tel:${CONTACT_PHONE}`}
          className="flex items-center gap-1.5 text-sky-400 text-xs hover:text-sky-300 transition-colors"
        >
          <Phone size={12} />
          <span dir="ltr">{CONTACT_PHONE}</span>
        </a>
      </div>
    </footer>
  );
};

export default Footer;
