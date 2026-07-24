import { Briefcase } from 'lucide-react';
import { useSession } from '../../hooks/useSession';

export default function VisitorDashboard() {
  const { user } = useSession();

  return (
    <div className="flex items-center justify-center min-h-[60vh] animate-fadeIn">
      <div className="bg-white p-10 rounded-3xl border border-gray-150 shadow-sm max-w-lg text-center">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-brand-50 text-brand-700 mb-4">
          <Briefcase className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-serif font-extrabold text-gray-800">Hi, {user?.name}</h1>
        <p className="text-gray-500 mt-3">
          You're browsing ATG Apply as a visitor. Choose a package to unlock the full job-application concierge
          experience.
        </p>
      </div>
    </div>
  );
}
