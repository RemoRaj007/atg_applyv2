import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { User } from '../../types/user.types';
import { navLinksForRole } from './navConfig';
import getIconComponent from '../ui/AtgIconMapper';
import AtgWordmark from '../ui/AtgWordmark';

interface SidebarProps {
  user: User;
  onLogout: () => void;
}

export default function Sidebar({ user, onLogout }: SidebarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const links = navLinksForRole(user.role);

  const handleLogout = async () => {
    await onLogout();
    navigate('/login');
  };

  return (
    // 280px, not the previous 256px, and 16px labels rather than 14px. The
    // navigator has to carry a 20-chapter profile journey, and the old scale
    // made it something to squint at rather than scan.
    <aside className="w-[280px] flex-shrink-0 flex flex-col justify-between select-none bg-white text-[#1D1D1F] border-r border-[#D2D2D7]">
      <div>
        <div className="flex items-center px-6 py-6 border-b border-[#D2D2D7]">
          <AtgWordmark size="md" />
        </div>

        {/* Role chip */}
        <div className="px-6 pt-5 pb-3">
          <span className="inline-block text-xs font-medium uppercase tracking-wide px-2.5 py-1 rounded-md bg-[#F5F5F7] text-[#6E6E73] border border-[#D2D2D7]">
            {user.role}
          </span>
        </div>

        <nav className="px-3 pb-4 space-y-0.5">
          {links.map((link) => {
            const isActive = location.pathname === link.to;
            const labelText = link.i18nKey ? t(link.i18nKey, { defaultValue: link.label }) : link.label;
            return (
              <Link
                key={link.to}
                to={link.to}
                aria-current={isActive ? 'page' : undefined}
                // min-h-11 keeps the row at the 44px touch target the mobile
                // drawer needs, and gives the desktop list room to breathe.
                className={`flex items-center gap-3 min-h-11 px-4 py-2.5 rounded-lg text-base transition-colors ${
                  isActive
                    ? 'bg-[#F5F5F7] text-[#1D1D1F] font-semibold border-l-4 border-[#F05A28] pl-3'
                    : 'text-[#1D1D1F] hover:bg-[#F5F5F7] border-l-4 border-transparent'
                }`}
              >
                {getIconComponent({
                  iconName: link.icon,
                  iconColor: isActive ? '#F05A28' : '#6E6E73',
                  className: 'h-5 w-5 flex-shrink-0',
                })}
                <span className="truncate">{labelText}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-[#D2D2D7]">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 min-h-11 px-4 py-2.5 rounded-lg text-base font-medium text-[#D70015] border border-[#D2D2D7] hover:bg-[#F5F5F7] transition-colors cursor-pointer"
        >
          <LogOut size={16} />
          {t('nav.logout', { defaultValue: 'Logout' })}
        </button>
      </div>
    </aside>
  );
}
