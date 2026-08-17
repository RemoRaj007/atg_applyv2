import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Bell, ChevronDown, LogOut, User, Briefcase, GraduationCap, FileText, CreditCard, Shield, LifeBuoy, Link2 } from 'lucide-react';
import { useSession } from '../../hooks/useSession';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications';
import { useTranslation } from 'react-i18next';
import AtgWordmark from '../ui/AtgWordmark';
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
    <header className="bg-white border-b border-[#D2D2D7] h-20 sticky top-0 z-50 flex items-center text-[#1D1D1F]">
      <div className="w-full max-w-[1800px] mx-auto px-6 md:px-12 lg:px-16 flex items-center justify-between">
        {/* Left: Logo */}
        <div className="flex items-center gap-4">
          <Link to="/candidate" className="flex items-center gap-3 group">
            <div>
              <AtgWordmark size="md" withTagline />
            </div>
          </Link>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3 md:gap-4">
          {/* Applications Left Count Pill Box */}
          <div className="hidden sm:flex items-center gap-4 bg-[#F5F5F7] border border-[#D2D2D7] rounded-xl py-1.5 px-4">
            <div className="text-left">
              <p className="text-[10px] text-[#6E6E73] font-medium uppercase tracking-wide leading-none">{t('nav.applicationsLeft')}</p>
              <p className="text-xl font-semibold text-[#1D1D1F] leading-none mt-1">{remaining ?? 100}</p>
            </div>
            <Link
              to="/candidate/upgrade"
              className="bg-[#0066CC] hover:bg-[#0055AA] text-white text-xs font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              {t('nav.buyMore')}
            </Link>
          </div>

          {/* Language Selector */}
          <LanguageSelector />

          {/* Notification Icon */}
          <Link
            to="/candidate/notifications"
            className="w-10 h-10 bg-white hover:bg-[#F5F5F7] border border-[#D2D2D7] rounded-full text-[#6E6E73] hover:text-[#1D1D1F] transition-colors relative flex items-center justify-center"
            title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-[#D70015] text-white text-[10px] font-semibold rounded-full border-2 border-white flex items-center justify-center">
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
                  className="h-10 w-10 rounded-full object-cover border border-[#D2D2D7]"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-[#F05A28] text-white flex items-center justify-center font-semibold text-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
            </button>

            {/* Chevron Circular Trigger */}
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-8 h-8 rounded-full bg-white hover:bg-[#F5F5F7] border border-[#D2D2D7] flex items-center justify-center text-[#6E6E73] transition-colors"
            >
              <ChevronDown size={14} className={`transition-transform duration-250 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-12 w-64 bg-white border border-[#D2D2D7] rounded-xl shadow-lg py-2 z-50 origin-top-right animate-fadeIn">
                <div className="px-4 py-3 border-b border-[#D2D2D7] mb-1">
                  <p className="text-sm font-semibold text-[#1D1D1F] truncate">{user.name}</p>
                  <p className="text-[10px] font-medium text-[#6E6E73] uppercase mt-0.5">{user.pkg || 'Free'} Package</p>
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
                            ? 'bg-[#F5F5F7] text-[#1D1D1F] border-l-4 border-[#F05A28] pl-3'
                            : 'text-[#1D1D1F] hover:bg-[#F5F5F7] border-l-4 border-transparent'
                        }`}
                      >
                        <Icon size={16} className={isActive ? 'text-[#F05A28]' : 'text-[#6E6E73]'} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>

                <div className="border-t border-[#D2D2D7] mt-2 pt-2 px-3">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-[#D70015] border border-[#D2D2D7] hover:bg-[#F5F5F7] transition-colors"
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
