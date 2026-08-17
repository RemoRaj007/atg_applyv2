import { Link } from 'react-router-dom';
import { useSession } from '../../hooks/useSession';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';
import { Bell } from 'lucide-react';


import { useTranslation } from 'react-i18next';
import LanguageSelector from '../ui/LanguageSelector';
import { getFileUrl } from '../../utils/fileUrl';

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const { t } = useTranslation();
  const { user } = useSession();
  const { unreadCount } = useUnreadNotifications();

  return (
    <header
      className="h-14 flex items-center justify-between px-8 bg-white text-[#1D1D1F] border-b border-[#D2D2D7] shadow-md"
    >
      <div className="flex items-center gap-4">
        <h2
          className="text-sm font-semibold capitalize tracking-wide text-[#1D1D1F]"
          style={{ letterSpacing: '0.04em' }}
        >
          {t(`nav.${title}`, { defaultValue: title })}
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <LanguageSelector />
        {user && (
          <Link
            to={`/${user.role}/notifications`}
            className="p-2 rounded-xl transition-all duration-150 text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] outline-none flex items-center justify-center cursor-pointer relative"
            title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>
        )}

        {user && (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold leading-none text-[#1D1D1F]">
                {user.name}
              </p>
              <p className="text-[11px] mt-0.5 capitalize font-medium text-[#6E6E73]">
                {user.role}
              </p>
            </div>
            {user.profilePhoto ? (
              <img
                src={getFileUrl(user.profilePhoto)}
                alt={user.name}
                className="h-9 w-9 rounded-full object-cover border border-[#D2D2D7] shadow-sm"
              />
            ) : (
              <div
                className="h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm select-none bg-blue-600 text-white shadow-sm"
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

