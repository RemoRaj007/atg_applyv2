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
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="max-w-md w-full text-center">
        <p className="text-7xl font-black text-action-500 mb-2">404</p>
        <h1 className="text-2xl font-bold text-white mb-3">Page not found</h1>
        <p className="text-slate-400 mb-8">
          The page you're looking for doesn't exist, or it may have moved.
        </p>
        <Link
          to={home}
          className="inline-block px-6 py-3 rounded-xl bg-action-500 text-white font-semibold hover:bg-action-600 transition"
        >
          {isAuthenticated ? 'Back to dashboard' : 'Back to home'}
        </Link>
      </div>
    </div>
  );
}
