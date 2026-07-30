import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Bell, ChevronDown, LogOut, User, Briefcase, GraduationCap, FileText, CreditCard, Shield, LifeBuoy, Link2 } from 'lucide-react';
import { useSession } from '../../hooks/useSession';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';
import { useTranslation } from 'react-i18next';
import atgLogo from '../../assets/atg_apply.png';
import LanguageSelector from '../ui/LanguageSelector';
import { getFileUrl } from '../../utils/fileUrl';

export default function CandidateHeader() {
  const { t } = useTranslation();
  const { user, logout } = useSession();
  const { unreadCount } = useUnreadNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const remaining = (user.appsTotal ?? 0) - (user.appsUsed ?? 0);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = [
    { label: t('nav.myProfile'), to: '/candidate/profile', icon: User },
    { label: t('nav.recommendedJobs'), to: '/candidate/jobs', icon: Briefcase },
    { label: t('nav.jobLinkRequests'), to: '/candidate/job-links', icon: Link2 },
    { label: t('nav.myApplications'), to: '/candidate/applications', icon: FileText },
    { label: t('nav.scholarships'), to: '/candidate/scholarships', icon: GraduationCap },
    { label: t('nav.anonymousJobs'), to: '/candidate/anonymous-discovery', icon: Shield },
    { label: t('nav.payments'), to: '/candidate/payments', icon: CreditCard },
    { label: t('nav.helpSupport'), to: '/candidate/support', icon: LifeBuoy },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 h-20 sticky top-0 z-50 shadow-md flex items-center text-white">
      <div className="w-full max-w-[1800px] mx-auto px-6 md:px-12 lg:px-16 flex items-center justify-between">
        {/* Left: Logo */}
        <div className="flex items-center gap-4">
          <Link to="/candidate" className="flex items-center gap-3 group">
            <img src={atgLogo} alt="ATG Apply Logo" className="h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105" />
            <div>
              <div className="flex items-center">
                <span className="font-black text-2xl text-white tracking-tight">ATG</span>
                <span className="font-extrabold text-2xl text-blue-400 tracking-tight ml-1.5">Apply</span>
              </div>
              <p className="text-[9px] text-slate-400 font-bold tracking-wider uppercase leading-none mt-0.5">
                Your Personal Job Application Team.
              </p>
            </div>
          </Link>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3 md:gap-4">
          {/* Applications Left Count Pill Box */}
          <div className="hidden sm:flex items-center gap-4 bg-slate-800/80 border border-slate-700/60 rounded-2xl py-1.5 px-4 shadow-sm">
            <div className="text-left">
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none">{t('nav.applicationsLeft')}</p>
              <p className="text-xl font-black text-blue-400 leading-none mt-1">{remaining ?? 100}</p>
            </div>
            <Link
              to="/candidate/upgrade"
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-sm transition-all"
            >
              {t('nav.buyMore')}
            </Link>
          </div>

          {/* Language Selector */}
          <LanguageSelector />

          {/* Notification Icon */}
          <Link
            to="/candidate/notifications"
            className="w-10 h-10 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full text-slate-300 hover:text-white transition-all shadow-sm relative flex items-center justify-center"
            title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-slate-900 flex items-center justify-center animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>


          {/* User Profile & Dropdown Chevron */}
          <div className="relative flex items-center gap-2" ref={dropdownRef}>
            {/* Profile Photo */}
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="focus:outline-none hover:opacity-90 transition-opacity"
            >
              {user.profilePhoto ? (
                <img
                  src={getFileUrl(user.profilePhoto)}
                  alt={user.name}
                  className="h-10 w-10 rounded-full object-cover border border-slate-700 shadow-sm"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
            </button>

            {/* Chevron Circular Trigger */}
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-slate-300 transition-all outline-none"
            >
              <ChevronDown size={14} className={`transition-transform duration-250 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-12 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2.5 z-50 transform origin-top-right transition-all animate-fadeIn">
                <div className="px-4 py-3 border-b border-slate-800 mb-1">
                  <p className="text-sm font-bold text-white truncate">{user.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{user.pkg || 'Free'} Package</p>
                </div>

                <div className="max-h-[300px] overflow-y-auto">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.to;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setDropdownOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-blue-600/20 text-blue-400 border-l-4 border-blue-500 pl-3'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white border-l-4 border-transparent'
                        }`}
                      >
                        <Icon size={16} className={isActive ? 'text-blue-400' : 'text-slate-400'} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>

                <div className="border-t border-slate-800 mt-2 pt-2 px-3">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 shadow-md transition-colors duration-150"
                  >
                    <LogOut size={14} />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
