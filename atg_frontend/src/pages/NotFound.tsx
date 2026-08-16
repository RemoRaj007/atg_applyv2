import { Link } from 'react-router-dom';
import { useSession } from '../hooks/useSession';

// Unknown URLs used to redirect to the dashboard (or /login when signed out),
// which is indistinguishable from being signed out — a mistyped or dead link
// looked like a session problem, and there was no signal that the page simply
// does not exist.
export default function NotFound() {
  const { isAuthenticated, user } = useSession();
  const home = isAuthenticated && user ? `/${user.role}` : '/';

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="max-w-md w-full text-center">
        <p className="text-7xl font-semibold text-[#F05A28] mb-2">404</p>
        <h1 className="text-2xl font-semibold text-[#1D1D1F] mb-3">Page not found</h1>
        <p className="text-[#6E6E73] mb-8">
          The page you're looking for doesn't exist, or it may have moved.
        </p>
        <Link
          to={home}
          className="inline-block min-h-11 px-6 py-3 rounded-lg bg-[#0066CC] text-white font-medium hover:bg-[#0055AA] transition-colors"
        >
          {isAuthenticated ? 'Back to dashboard' : 'Back to home'}
        </Link>
      </div>
    </div>
  );
}
