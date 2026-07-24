import { useState, useEffect } from 'react';
import { CheckCircle2, Upload, AlertCircle } from 'lucide-react';
import { useSession } from '../../hooks/useSession';
import { paymentApi } from '../../api/paymentApi';
import { paymentOptionApi } from '../../api/paymentOptionApi';
import Button from '../../components/ui/AtgButton';

interface PackageItem {
  name: string;
  price: number;
  apps: number;
  features: string[];
}

const defaultPackages: PackageItem[] = [
  { name: 'Basic Pack', price: 10.00, apps: 5, features: ['5 extra tailored applications', 'Standard support', 'Valid indefinitely'] },
  { name: 'Standard Pack', price: 25.00, apps: 15, features: ['15 extra tailored applications', 'Priority operator matching', 'Valid indefinitely'] },
  { name: 'Professional Pack', price: 70.00, apps: 50, features: ['50 extra tailored applications', 'Dedicated account manager', 'Priority processing', 'Valid indefinitely'] },
];

export default function CandidateUpgrade() {
  const { user } = useSession();
  const [pkgList, setPkgList] = useState<PackageItem[]>(defaultPackages);
  const [loadingPkgs, setLoadingPkgs] = useState(true);
  const [selectedPkg, setSelectedPkg] = useState<PackageItem | null>(null);
  const [method, setMethod] = useState('Bank Transfer');
  const [ref, setRef] = useState('');
  const [details, setDetails] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    paymentOptionApi
      .list()
      .then((opts) => {
        if (opts && opts.length > 0) {
          const formatted: PackageItem[] = opts.map((opt) => {
            let parsedFeats: string[] = [];
            if (typeof opt.features === 'string') {
              try {
                parsedFeats = JSON.parse(opt.features);
              } catch {
                parsedFeats = [opt.features];
              }
            } else if (Array.isArray(opt.features)) {
              parsedFeats = opt.features;
            }
            return {
              name: opt.name,
              price: opt.price,
              apps: opt.appsCount,
              features: parsedFeats,
            };
          });
          setPkgList(formatted);
        }
      })
      .catch(() => {
        // Fallback to defaultPackages on error
      })
      .finally(() => setLoadingPkgs(false));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpgradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg) return;
    if (!file) {
      setError('Please upload your payment slip or receipt.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('pkg', selectedPkg.name);
      formData.append('amount', selectedPkg.price.toString());
      formData.append('method', method);
      formData.append('ref', ref || `ref_${Date.now()}`);
      formData.append('appsCount', selectedPkg.apps.toString());
      formData.append('details', details);
      formData.append('slip', file);

      await paymentApi.create(formData);
      setMessage(`Payment request for ${selectedPkg.name} submitted successfully! An operator will verify your slip shortly.`);
      setSelectedPkg(null);
      setFile(null);
      setRef('');
      setDetails('');
    } catch (err: any) {
      setError(err.message || 'Failed to submit payment receipt.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fadeIn max-w-5xl mx-auto">
      <div className="mb-8 text-center md:text-left">
        <h1 className="text-3xl font-serif font-bold text-gray-800 flex items-center justify-center md:justify-start gap-2">

          Subscription Packages
        </h1>
        <p className="text-sm text-gray-500 mt-2">
          Choose a plan to increase your application quota.
        </p>
      </div>

      {/* Free Trial Status Card */}
      {user && (() => {
        const used = user.appsUsed ?? 0;
        const total = user.appsTotal ?? 2;
        const remaining = total - used;
        const pct = Math.min((used / total) * 100, 100);
        const isTrial = total <= 2;
        let barColor = '#10b981';
        let bgClass = 'bg-emerald-950/60 border-emerald-700/60';
        let textMain = 'text-emerald-200';
        let textSub = 'text-emerald-400';
        if (remaining <= 1 && remaining > 0) { barColor = '#f59e0b'; bgClass = 'bg-amber-950/60 border-amber-700/60'; textMain = 'text-amber-200'; textSub = 'text-amber-400'; }
        if (remaining <= 0) { barColor = '#ef4444'; bgClass = 'bg-rose-950/60 border-rose-800/60'; textMain = 'text-rose-200'; textSub = 'text-rose-400'; }
        return (
          <div className={`mb-8 rounded-2xl border p-5 ${bgClass} backdrop-blur-sm`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <p className={`text-sm font-bold ${textMain} mb-0.5`}>
                  {isTrial ? '🎁 Free Trial Status' : '📦 Application Quota'}
                </p>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl font-black text-white">{used} / {total}</span>
                  <span className={`text-xs font-semibold ${textSub}`}>applications used</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-800/80 overflow-hidden mb-2">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                </div>
                {isTrial && remaining > 0 && (
                  <p className={`text-xs ${textSub}`}>
                    You have <strong className={textMain}>{remaining} free application{remaining !== 1 ? 's' : ''}</strong> remaining. Upgrade for unlimited access.
                  </p>
                )}
                {remaining <= 0 && (
                  <p className={`text-xs font-bold ${textSub}`}>
                    All application slots used. Select a plan below to continue applying.
                  </p>
                )}
                {!isTrial && remaining > 0 && (
                  <p className={`text-xs ${textSub}`}>
                    <strong className={textMain}>{remaining}</strong> application slot{remaining !== 1 ? 's' : ''} remaining in your current plan.
                  </p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Current Package</p>
                <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800/80 border border-slate-700/60 text-slate-200">
                  {user.pkg || 'Trial'}
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {message && (
        <div className="p-4 mb-6 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="p-4 mb-6 text-sm text-rose-800 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-2.5">
          <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {loadingPkgs ? (
        <div className="p-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          Loading subscription packages...
        </div>
      ) : !selectedPkg ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pkgList.map((pkg) => (
            <div key={pkg.name} className="bg-slate-800/80 rounded-3xl border border-slate-700/60 shadow-xl hover:border-slate-600/80 transition-all p-6 flex flex-col justify-between h-full backdrop-blur-sm text-slate-100">
              <div>
                <p className="font-serif font-bold text-xl text-white">{pkg.name}</p>
                <div className="flex items-baseline mt-3">
                  <span className="text-4xl font-extrabold text-white">${pkg.price.toFixed(2)}</span>
                  <span className="text-sm font-medium text-slate-400 ml-1">/ one-time</span>
                </div>
                <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-950/80 text-blue-400 border border-blue-800/60">
                  +{pkg.apps} Applications
                </div>
                <ul className="space-y-3 mt-6">
                  {pkg.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <Button
                variant="primary"
                className="w-full mt-8 py-3 rounded-2xl font-semibold shadow-md bg-blue-600 hover:bg-blue-500 cursor-pointer"
                onClick={() => setSelectedPkg(pkg)}
              >
                Choose Plan
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl p-8 max-w-xl mx-auto text-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-serif font-bold text-white">Checkout</h2>
            <Button variant="outline" className="text-xs px-3 py-1.5 border-slate-700 hover:bg-slate-800 text-slate-300" onClick={() => setSelectedPkg(null)}>
              Change Plan
            </Button>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 mb-6 flex justify-between items-center">
            <div>
              <p className="text-sm font-semibold text-white">{selectedPkg.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">+{selectedPkg.apps} apps added to quota</p>
            </div>
            <p className="text-xl font-extrabold text-blue-400">${selectedPkg.price.toFixed(2)}</p>
          </div>

          <form onSubmit={handleUpgradeSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Payment Method</label>
              <select
                className="w-full bg-slate-800/70 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Online Deposit">Online Deposit</option>
                <option value="Card Payment Slip">Card Payment Receipt</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Reference Number / Transaction ID</label>
              <input
                type="text"
                placeholder="e.g. TXN987654321"
                required
                className="w-full bg-slate-800/70 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={ref}
                onChange={(e) => setRef(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Payment Details / Notes</label>
              <textarea
                placeholder="Enter deposit date, bank branch, or card holder info..."
                rows={3}
                className="w-full bg-slate-800/70 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Upload Payment Receipt (Image/PDF)</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-700/80 border-dashed rounded-2xl bg-slate-800/50 hover:bg-slate-800 transition-all cursor-pointer relative">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  required
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleFileChange}
                />
                <div className="space-y-1 text-center pointer-events-none">
                  <Upload className="mx-auto h-8 w-8 text-gray-400" />
                  <div className="flex text-sm text-gray-600 justify-center">
                    <span className="relative rounded-md font-medium text-brand-600 hover:text-brand-500">
                      {file ? file.name : 'Upload a slip file'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">PNG, JPG, PDF up to 10MB</p>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
              className="w-full py-3 rounded-2xl font-semibold mt-4 shadow"
            >
              {submitting ? 'Submitting Details...' : 'Submit Payment slip'}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
