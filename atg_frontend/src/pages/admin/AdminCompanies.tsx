import { useEffect, useState } from 'react';

import toast from 'react-hot-toast';
import { companyApi, type Company } from '../../api/companyApi';
import { validateEmail, safeExternalUrl } from '../../utils/validation';
import Button from '../../components/ui/AtgButton';
import ReusableTable from '../../components/ui/AtgReusableTable';
import getIconComponent from '../../components/ui/AtgIconMapper';
import ViewModal from '../../components/ui/ViewModal';

export default function AdminCompanies() {

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // CRUD modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');

  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Deactivate confirmation states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);

  // View modal state
  const [viewCompany, setViewCompany] = useState<Company | null>(null);

  const fetchCompanies = () => {
    setLoading(true);
    companyApi
      .list()
      .then(setCompanies)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedCompany(null);
    setName('');
    setEmail('');
    setWebsite('');
    setDescription('');
    setStatus('pending');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (company: Company) => {
    setModalMode('edit');
    setSelectedCompany(company);
    setName(company.name);
    setEmail(company.email);
    setWebsite(company.website || '');
    setDescription(company.description || '');
    setStatus(company.status);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    const emailCheck = validateEmail(email);
    if (!emailCheck.isValid) {
      setFormError(emailCheck.message);
      toast.error(emailCheck.message);
      setSaving(false);
      return;
    }

    try {
      const payload = { name, email, website, description, status };
      if (modalMode === 'create') {
        await companyApi.create(payload);
        toast.success('Company created successfully');
      } else if (modalMode === 'edit' && selectedCompany) {
        await companyApi.update(selectedCompany.id, payload);
        toast.success('Company updated successfully');
      }
      setIsModalOpen(false);
      fetchCompanies();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save company details');
      toast.error(err.message || 'Failed to save company details');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: number, nextStatus: 'approved' | 'rejected') => {
    try {
      await companyApi.approve(id, nextStatus);
      toast.success(`Company status updated to ${nextStatus}`);
      fetchCompanies();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update company status');
    }
  };

  const openDeleteConfirm = (company: Company) => {
    setCompanyToDelete(company);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!companyToDelete) return;
    try {
      await companyApi.remove(companyToDelete.id);
      setDeleteConfirmOpen(false);
      setCompanyToDelete(null);
      toast.success('Company deleted successfully');
      fetchCompanies();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete company');
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Company Profile',
      render: (c: Company) => {
        // Rows predating the Joi scheme check can still hold a javascript: URL;
        // show those as text rather than as a clickable link.
        const website = safeExternalUrl(c.website);
        return (
          <div>
            <p className="font-bold text-gray-800">{c.name}</p>
            {website ? (
              <a
                href={website}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-brand-600 hover:underline"
              >
                {c.website}
              </a>
            ) : (
              c.website && <span className="text-xs text-gray-500">{c.website}</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'email',
      label: 'Contact Email',
    },
    {
      key: 'status',
      label: 'Approval Status',
      render: (c: Company) => (
        <span
          className={`text-xs font-bold px-3 py-1 rounded-full ${c.status === 'approved'
              ? 'bg-emerald-50 text-emerald-700'
              : c.status === 'rejected'
                ? 'bg-red-50 text-red-700'
                : 'bg-amber-50 text-amber-700 animate-pulse'
            }`}
        >
          {c.status.toUpperCase()}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions / Approvals',
      render: (c: Company) => (
        <div className="flex items-center gap-1.5">
          {c.status === 'pending' && (
            <div className="flex items-center gap-1.5 border-r pr-2 mr-1" style={{ borderColor: '#e4e6ef' }}>
              <button
                onClick={() => handleStatusChange(c.id, 'approved')}
                className="px-2.5 py-1 text-xs font-bold text-white rounded-lg transition shadow-sm"
                style={{ background: '#059669' }}
              >
                Approve
              </button>
              <button
                onClick={() => handleStatusChange(c.id, 'rejected')}
                className="px-2.5 py-1 text-xs font-bold rounded-lg transition"
                style={{ background: '#f3f4f6', color: '#374151' }}
              >
                Reject
              </button>
            </div>
          )}
          <button
            onClick={() => setViewCompany(c)}
            className="p-2 rounded-lg transition-all text-slate-300 hover:text-white hover:bg-slate-800"
            title="View Company"
          >
            {getIconComponent({ iconName: 'View', iconSize: 15, iconColor: '#94a3b8' })}
          </button>
          <button
            onClick={() => openEditModal(c)}
            className="p-2 rounded-lg transition-all text-blue-400 hover:text-blue-300 hover:bg-blue-600/20"
            title="Edit Company Details"
          >
            {getIconComponent({ iconName: 'Edit', iconSize: 15, iconColor: '#60a5fa' })}
          </button>
          <button
            onClick={() => openDeleteConfirm(c)}
            className="p-2 rounded-lg transition-all text-rose-400 hover:text-rose-300 hover:bg-rose-600/20"
            title="Deactivate Company"
          >
            {getIconComponent({ iconName: 'Delete', iconSize: 15, iconColor: '#f87171' })}
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden animate-fadeIn relative">
        <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/55 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-extrabold text-gray-900">Company Registry</h1>
            <p className="text-sm text-gray-500 mt-1">Manage partner companies, approve registrations, and view profiles.</p>
          </div>
          <Button
            variant="primary"
            onClick={openCreateModal}
            className="py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center space-x-1.5 shadow-sm"
          >
            {getIconComponent({ iconName: 'AddNew', iconSize: 16, iconColor: '#FFFFFF' })}
            <span>Register Company</span>
          </Button>
        </div>

        {loading && <p className="p-8 text-sm text-gray-500">Loading company catalog...</p>}
        {error && <p className="p-8 text-sm text-red-600 bg-red-50 border-b border-red-100">{error}</p>}

        {!loading && !error && (
          <ReusableTable
            columns={columns}
            data={companies}
            searchPlaceholder="Search companies by name, email, or status..."
            searchKeys={['name', 'email', 'status']}
            itemsPerPage={8}
            emptyMessage="No companies registered in system."
          />
        )}
      </div>

      {/* Company Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl max-w-xl w-full animate-fadeIn">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/55">
              <h2 className="text-lg font-serif font-extrabold text-gray-900">
                {modalMode === 'create' ? 'Register Company Profile' : 'Edit Company Details'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-xl transition"
              >
                {getIconComponent({ iconName: 'Cancel', iconSize: 18, iconColor: '#6B7280' })}
              </button>
            </div>

            <form onSubmit={handleSave} className="p-8 space-y-5">
              {formError && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
                  {formError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Company Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Acme Corporation"
                    className="w-full px-4 py-2.5 border border-gray-250 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Contact Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="recruitment@company.com"
                    className="w-full px-4 py-2.5 border border-gray-250 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Website URL (Optional)</label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://company.com"
                    className="w-full px-4 py-2.5 border border-gray-250 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Description (Optional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell us about the company..."
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-250 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all resize-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Approval Status</label>
                  <select
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-250 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all bg-white"
                  >
                    <option value="pending">Pending Review</option>
                    <option value="approved">Approved / Active</option>
                    <option value="rejected">Rejected / Disabled</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-bold border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl font-bold shadow-sm"
                >
                  {saving ? 'Saving...' : 'Save Company'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && companyToDelete && (
        <div className="fixed inset-0 bg-gray-600/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl max-w-md w-full p-6 text-center animate-fadeIn">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
              {getIconComponent({ iconName: 'Delete', iconSize: 24, iconColor: '#DC2626' })}
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Soft Delete Company</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to deactivate <span className="font-semibold text-gray-800">{companyToDelete.name}</span>?
              Its associated job posts will remain in historical logs but it will be hidden from registries.
            </p>
            <div className="flex justify-center space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setCompanyToDelete(null);
                }}
                className="px-5 py-2 rounded-xl text-sm font-semibold border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleDelete}
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white border-red-600 shadow-sm"
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Company Modal */}
      <ViewModal
        isOpen={!!viewCompany}
        onClose={() => setViewCompany(null)}
        title={viewCompany?.name || ''}
        subtitle={viewCompany?.email}
        fields={[
          { label: 'Company Name', value: viewCompany?.name },
          { label: 'Email', value: viewCompany?.email },
          { label: 'Website', value: viewCompany?.website || '—' },
          { label: 'Status', value: viewCompany?.status },
          { label: 'Description', value: viewCompany?.description || '—' },
        ]}
        actions={[
          {
            label: 'Edit',
            variant: 'primary',
            onClick: () => { setViewCompany(null); openEditModal(viewCompany!); },
          },
        ]}
      />

    </>
  );
}
