import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { scholarshipApi } from '../../api/scholarshipApi';
import type { Scholarship } from '../../types/scholarship.types';
import Button from '../../components/ui/AtgButton';
import ReusableTable from '../../components/ui/AtgReusableTable';

export default function OperatorScholarships() {
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedScholarship, setSelectedScholarship] = useState<Scholarship | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [provider, setProvider] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [scholarshipToDelete, setScholarshipToDelete] = useState<Scholarship | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await scholarshipApi.list();
      setScholarships(res);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedScholarship(null);
    setTitle('');
    setProvider('');
    setAmount('');
    setDeadline('');
    setDescription('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (s: Scholarship) => {
    setModalMode('edit');
    setSelectedScholarship(s);
    setTitle(s.title);
    setProvider(s.provider);
    setAmount(s.amount != null ? s.amount : '');
    setDeadline(s.deadline ? new Date(s.deadline).toISOString().split('T')[0] : '');
    setDescription(s.description || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    if (!title.trim() || !provider.trim()) {
      setFormError('Title and provider are required');
      setSaving(false);
      return;
    }

    const payload = {
      title: title.trim(),
      provider: provider.trim(),
      amount: amount !== '' ? Number(amount) : undefined,
      deadline: deadline || undefined,
      description: description.trim() || undefined,
    };

    try {
      if (modalMode === 'create') {
        await scholarshipApi.create(payload);
      } else if (selectedScholarship) {
        await scholarshipApi.update(selectedScholarship.id, payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save scholarship');
    } finally {
      setSaving(false);
    }
  };

  const triggerDelete = (s: Scholarship) => {
    setScholarshipToDelete(s);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!scholarshipToDelete) return;
    try {
      await scholarshipApi.delete(scholarshipToDelete.id);
      setDeleteConfirmOpen(false);
      setScholarshipToDelete(null);
      toast.success('Scholarship deleted successfully');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete scholarship');
    }
  };

  const columns = [
    {
      key: 'title',
      label: 'Title',
      render: (s: Scholarship) => (
        <div>
          <p className="font-semibold text-gray-800">{s.title}</p>
          <p className="text-xs text-gray-500">{s.provider}</p>
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (s: Scholarship) => (s.amount != null ? `$${s.amount.toLocaleString()}` : '—'),
    },
    {
      key: 'deadline',
      label: 'Deadline',
      render: (s: Scholarship) => (s.deadline ? new Date(s.deadline).toLocaleDateString() : '—'),
    },
    {
      key: 'description',
      label: 'Description',
      render: (s: Scholarship) => (
        <p className="text-xs text-gray-600 truncate max-w-xs">{s.description || '—'}</p>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (s: Scholarship) => (
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openEditModal(s)}>
            Edit
          </Button>
          <Button variant="danger" onClick={() => triggerDelete(s)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fadeIn">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-serif font-bold text-gray-800">Scholarships Catalog</h1>
          <p className="text-sm text-gray-500 mt-1">Manage, add, and update scholarship posts available for candidates.</p>
        </div>
        <Button variant="primary" onClick={openCreateModal}>
          + Add Scholarship
        </Button>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-500">Loading catalog...</p>
      ) : (
        <ReusableTable data={scholarships} columns={columns} searchKeys={['title', 'provider', 'description']} searchPlaceholder="Search scholarships..." />
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl max-w-lg w-full p-6 animate-fadeIn">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {modalMode === 'create' ? 'Add New Scholarship' : 'Edit Scholarship'}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Title *</label>
                <input
                  required
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 text-sm bg-white"
                  placeholder="e.g. STEM Excellence Grant"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Provider *</label>
                <input
                  required
                  type="text"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 text-sm bg-white"
                  placeholder="e.g. Google Org"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Amount ($)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 text-sm bg-white"
                    placeholder="e.g. 5000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Deadline</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 text-sm bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 text-sm bg-white"
                  placeholder="Details about eligibility, criteria, and benefits..."
                />
              </div>

              {formError && <p className="text-xs text-red-600">{formError}</p>}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Scholarship'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-gray-600/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl max-w-lg w-full p-6 animate-fadeIn">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Delete Scholarship</h2>
            <p className="text-sm text-gray-550 mb-6">
              Are you sure you want to delete the scholarship "{scholarshipToDelete?.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDelete}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
