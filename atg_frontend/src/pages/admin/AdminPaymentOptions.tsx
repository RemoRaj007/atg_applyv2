import { useEffect, useState } from 'react';

import toast from 'react-hot-toast';
import { paymentOptionApi } from '../../api/paymentOptionApi';
import type { PaymentOption } from '../../types/paymentOption.types';
import Button from '../../components/ui/AtgButton';
import ReusableTable from '../../components/ui/AtgReusableTable';
import { Plus, Edit2, Trash2, CheckCircle2, Star, AlertCircle } from 'lucide-react';

export default function AdminPaymentOptions() {

  const [options, setOptions] = useState<PaymentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedOption, setSelectedOption] = useState<PaymentOption | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [currency, setCurrency] = useState('USD');
  const [appsCount, setAppsCount] = useState<number | ''>('');
  const [featuresInput, setFeaturesInput] = useState('');
  const [description, setDescription] = useState('');
  const [isPopular, setIsPopular] = useState(false);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete modal state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [optionToDelete, setOptionToDelete] = useState<PaymentOption | null>(null);

  const fetchOptions = async () => {
    setLoading(true);
    try {
      const data = await paymentOptionApi.list();
      setOptions(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load payment options');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedOption(null);
    setName('');
    setPrice('');
    setCurrency('USD');
    setAppsCount('');
    setFeaturesInput('');
    setDescription('');
    setIsPopular(false);
    setStatus('active');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (opt: PaymentOption) => {
    setModalMode('edit');
    setSelectedOption(opt);
    setName(opt.name);
    setPrice(opt.price);
    setCurrency(opt.currency || 'USD');
    setAppsCount(opt.appsCount);
    let featStr = '';
    if (typeof opt.features === 'string') {
      try {
        const parsed = JSON.parse(opt.features);
        featStr = Array.isArray(parsed) ? parsed.join('\n') : opt.features;
      } catch {
        featStr = opt.features;
      }
    } else if (Array.isArray(opt.features)) {
      featStr = opt.features.join('\n');
    }
    setFeaturesInput(featStr);
    setDescription(opt.description || '');
    setIsPopular(opt.isPopular);
    setStatus(opt.status);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Option name is required');
      return;
    }
    if (price === '' || isNaN(Number(price))) {
      setFormError('Valid price is required');
      return;
    }
    if (appsCount === '' || isNaN(Number(appsCount))) {
      setFormError('Valid application count is required');
      return;
    }

    const featuresArray = featuresInput
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean);

    setSaving(true);
    setFormError(null);

    const payload = {
      name: name.trim(),
      price: Number(price),
      currency: currency.trim() || 'USD',
      appsCount: Number(appsCount),
      features: featuresArray,
      description: description.trim() || undefined,
      isPopular,
      status,
    };

    try {
      if (modalMode === 'create') {
        const created = await paymentOptionApi.create(payload);
        setOptions((prev) => [...prev, created]);
      } else if (selectedOption) {
        const updated = await paymentOptionApi.update(selectedOption.id, payload);
        setOptions((prev) => prev.map((o) => (o.id === selectedOption.id ? updated : o)));
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save payment option');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (opt: PaymentOption) => {
    const nextStatus = opt.status === 'active' ? 'inactive' : 'active';
    try {
      const updated = await paymentOptionApi.update(opt.id, { status: nextStatus });
      setOptions((prev) => prev.map((o) => (o.id === opt.id ? updated : o)));
      toast.success(`Payment option status changed to ${nextStatus}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle status');
    }
  };

  const handleDelete = async () => {
    if (!optionToDelete) return;
    try {
      await paymentOptionApi.remove(optionToDelete.id);
      setOptions((prev) => prev.filter((o) => o.id !== optionToDelete.id));
      setDeleteConfirmOpen(false);
      setOptionToDelete(null);
      toast.success('Payment option deleted successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete payment option');
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Package Name',
      render: (opt: PaymentOption) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-800 dark:text-white text-base">{opt.name}</span>
            {opt.isPopular && (
              <span className="bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-500" /> Most Popular
              </span>
            )}
          </div>
          {opt.description && <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{opt.description}</p>}
        </div>
      ),
    },
    {
      key: 'price',
      label: 'Price & Currency',
      render: (opt: PaymentOption) => (
        <span className="font-extrabold text-brand-600 dark:text-blue-400 text-lg">
          {opt.currency || 'USD'} ${opt.price.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'appsCount',
      label: 'Quota Boost',
      render: (opt: PaymentOption) => (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
          +{opt.appsCount} Applications
        </span>
      ),
    },
    {
      key: 'features',
      label: 'Features List',
      render: (opt: PaymentOption) => {
        let featList: string[] = [];
        if (typeof opt.features === 'string') {
          try {
            featList = JSON.parse(opt.features);
          } catch {
            featList = [opt.features];
          }
        } else if (Array.isArray(opt.features)) {
          featList = opt.features;
        }

        return (
          <ul className="space-y-1 text-xs text-gray-600 dark:text-slate-300 max-w-xs">
            {featList.slice(0, 3).map((f, i) => (
              <li key={i} className="flex items-center gap-1.5 truncate">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                <span>{f}</span>
              </li>
            ))}
            {featList.length > 3 && (
              <li className="text-[11px] text-gray-400 italic">+{featList.length - 3} more...</li>
            )}
          </ul>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (opt: PaymentOption) => (
        <button
          onClick={() => handleToggleStatus(opt)}
          className={`cursor-pointer text-xs px-3 py-1 rounded-full font-semibold border transition-all ${opt.status === 'active'
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
            : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
            }`}
        >
          {opt.status === 'active' ? 'Active' : 'Inactive'}
        </button>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (opt: PaymentOption) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => openEditModal(opt)}
            className="py-1.5 px-3 text-xs rounded-xl border-slate-700 hover:bg-slate-800 text-slate-200 flex items-center gap-1"
          >
            <Edit2 className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setOptionToDelete(opt);
              setDeleteConfirmOpen(true);
            }}
            className="py-1.5 px-3 text-xs rounded-xl bg-rose-600/20 text-rose-400 hover:bg-rose-600/40 border border-rose-500/30 flex items-center gap-1"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden animate-fadeIn text-white">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-800 bg-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">

              <h1 className="text-2xl font-bold text-white tracking-tight">Payment Options & Packages</h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Configure subscription packages and pricing tiers for candidates.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={openCreateModal}
            className="py-2.5 px-5 rounded-2xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Package Option
          </Button>
        </div>

        {loading && <p className="p-8 text-sm text-slate-400 animate-pulse">Loading payment options...</p>}
        {error && <p className="p-8 text-sm text-rose-400">{error}</p>}

        {!loading && !error && (
          <ReusableTable
            columns={columns}
            data={options}
            searchPlaceholder="Search packages by name or currency..."
            searchKeys={['name', 'currency']}
            itemsPerPage={6}
            emptyMessage="No payment packages configured yet."
          />
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl text-white">
            <h2 className="text-xl font-bold text-white mb-1">
              {modalMode === 'create' ? 'Add Payment Package' : 'Edit Payment Package'}
            </h2>
            <p className="text-xs text-slate-400 mb-5">
              Configure package details, pricing, and quota increments.
            </p>

            {formError && (
              <div className="p-3 mb-4 text-xs text-rose-300 bg-rose-950/50 border border-rose-800/60 rounded-xl flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Package Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Starter Pack, Professional Pack"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="25.00"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={price}
                    onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Currency
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="USD"
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Application Quota Added (+Apps)
                </label>
                <input
                  type="number"
                  required
                  placeholder="15"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={appsCount}
                  onChange={(e) => setAppsCount(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Features (One per line)
                </label>
                <textarea
                  rows={3}
                  placeholder="15 extra tailored applications&#10;Priority operator matching&#10;Valid indefinitely"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={featuresInput}
                  onChange={(e) => setFeaturesInput(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Description / Subtitle
                </label>
                <input
                  type="text"
                  placeholder="e.g. Best choice for active jobseekers"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPopular}
                    onChange={(e) => setIsPopular(e.target.checked)}
                    className="h-4 w-4 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-blue-500"
                  />
                  Highlight as "Most Popular"
                </label>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Status:</span>
                  <select
                    className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1 text-xs text-white"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs rounded-xl border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow"
                >
                  {saving ? 'Saving...' : modalMode === 'create' ? 'Create Option' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && optionToDelete && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-white">
            <h3 className="text-lg font-bold text-white mb-2">Delete Payment Option?</h3>
            <p className="text-xs text-slate-400 mb-6">
              Are you sure you want to remove <span className="font-bold text-white">{optionToDelete.name}</span>? Existing payments will not be impacted.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-4 py-2 text-xs rounded-xl border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
