import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { User } from '../../types/user.types';
import { navLinksForRole } from './navConfig';
import getIconComponent from '../ui/AtgIconMapper';
import atgLogo from '../../assets/atg_apply.png';

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
    <aside
      className="w-64 flex flex-col justify-between select-none bg-slate-900 text-slate-100 border-r border-slate-800 shadow-xl"
    >
      {/* Logo */}
      <div>
        <div className="flex items-center justify-center px-6 py-6 border-b border-slate-800">
          <div className="bg-blue-600/10 p-2 px-3 rounded-2xl">
            <img src={atgLogo} alt="ATG Apply" className="h-14 w-auto object-contain drop-shadow-md" />
          </div>
        </div>

        {/* Role chip */}
        <div className="px-6 pt-5 pb-3">
          <span
            className="inline-block text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30"
          >
            {user.role}
          </span>
        </div>

        {/* Nav */}
        <nav className="px-3 pb-4 space-y-0.5">
          {links.map((link) => {
            const isActive = location.pathname === link.to;
            const labelText = link.i18nKey ? t(link.i18nKey, { defaultValue: link.label }) : link.label;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 outline-none ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border-l-4 border-blue-500 pl-3 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white border-l-4 border-transparent'
                }`}
              >
                {getIconComponent({
                  iconName: link.icon,
                  iconColor: isActive ? '#60a5fa' : '#94a3b8',
                  className: 'h-4 w-4 flex-shrink-0',
                })}
                <span className="truncate">{labelText}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Logout */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 bg-red-600 text-white hover:bg-red-700 shadow-md cursor-pointer"
        >
          <LogOut size={15} />
          {t('nav.logout', { defaultValue: 'Logout' })}
        </button>
      </div>
    </aside>
  );
}
