import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './AtgSidebar';
import Header from './Header';
import CandidateHeader from './CandidateHeader';
import Footer from './AtgFooter';
import BackButton from '../ui/BackButton';
import { useSession } from '../../hooks/useSession';

export default function Layout() {
  const { user, logout } = useSession();
  const location = useLocation();

  if (!user) return null;

  if (user.role === 'candidate') {
    const isDashboardRoot = location.pathname === '/candidate' || location.pathname === '/candidate/';
    const isProfilePage = location.pathname.includes('/profile');
    return (
      <div className="min-h-screen flex flex-col bg-[#0f172a] text-slate-100">
        <CandidateHeader />

        {/* Content Area */}
        <div className="flex-1 flex flex-col justify-between overflow-y-auto">
          <main className="w-full flex-1">
            {isDashboardRoot || isProfilePage ? (
              <Outlet />
            ) : (
              <div className="max-w-7xl mx-auto px-6 md:px-12 py-8">
                <div className="mb-6">
                  <BackButton label="Back to Dashboard" to="/candidate" />
                </div>
                <Outlet />
              </div>
            )}
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  const isRoleRoot = location.pathname === `/${user.role}` || location.pathname === `/${user.role}/`;

  // Layout for operator, company, admin, visitor, etc. with candidate color theme
  return (
    <div className="flex min-h-screen bg-[#0f172a] text-slate-100 font-sans">
      <Sidebar user={user} onLogout={logout} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header title={`${user.role} workspace`} />
        <div className="flex-1 flex flex-col justify-between overflow-y-auto">
          <main className="p-8 flex-1">
            {!isRoleRoot && (
              <div className="mb-6">
                <BackButton label="Back" to={`/${user.role}`} />
              </div>
            )}
            <Outlet />
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}

