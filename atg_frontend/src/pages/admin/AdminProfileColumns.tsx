import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { profileApi, type ProfileColumn } from '../../api/profileApi';
import Button from '../../components/ui/AtgButton';
import ReusableTable from '../../components/ui/AtgReusableTable';
import getIconComponent from '../../components/ui/AtgIconMapper';
import ViewModal from '../../components/ui/ViewModal';
import ConfirmModal from '../../components/ui/ConfirmModal';

export default function AdminProfileColumns() {
  const [columns, setColumns] = useState<ProfileColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedCol, setSelectedCol] = useState<ProfileColumn | null>(null);

  // View modal state
  const [viewColumn, setViewColumn] = useState<ProfileColumn | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [label, setLabel] = useState('');
  const [inputType, setInputType] = useState<'text' | 'number' | 'file'>('text');
  const [isRequired, setIsRequired] = useState(false);
  const [options, setOptions] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchColumns = () => {
    setLoading(true);
    profileApi
      .listColumns()
      .then(setColumns)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchColumns();
  }, []);

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedCol(null);
    setName('');
    setLabel('');
    setInputType('text');
    setIsRequired(false);
    setOptions('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (col: ProfileColumn) => {
    setModalMode('edit');
    setSelectedCol(col);
    setName(col.name);
    setLabel(col.label);
    setInputType(col.inputType);
    setIsRequired(col.isRequired);
    setOptions(col.options || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !label.trim()) {
      setFormError('Identifier name and label are required');
      return;
    }

    // Clean name identifier (alphanumeric and underscore only)
    const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');

    setSaving(true);
    setFormError(null);

    try {
      const payload: Partial<ProfileColumn> = {
        name: cleanName,
        label: label.trim(),
        inputType,
        isRequired,
        options: options.trim() || undefined,
      };

      if (modalMode === 'create') {
        await profileApi.createColumn(payload);
      } else if (modalMode === 'edit' && selectedCol) {
        await profileApi.updateColumn(selectedCol.id, payload);
      }

      setIsModalOpen(false);
      fetchColumns();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save column');
    } finally {
      setSaving(false);
    }
  };

  // Delete confirm state
  const [colToDelete, setColToDelete] = useState<ProfileColumn | null>(null);

  const handleDelete = async () => {
    if (!colToDelete) return;
    try {
      await profileApi.removeColumn(colToDelete.id);
      toast.success('Profile column deleted successfully');
      setColToDelete(null);
      fetchColumns();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete column');
    }
  };

  const tableColumns = [
    {
      key: 'label',
      label: 'Field Label',
      render: (c: ProfileColumn) => (
        <div>
          <p className="font-bold text-gray-800">{c.label}</p>
          <p className="text-xs text-gray-400">Database Key: <code className="bg-gray-100 px-1 py-0.5 rounded">{c.name}</code></p>
        </div>
      ),
    },
    {
      key: 'inputType',
      label: 'Input Type',
      render: (c: ProfileColumn) => (
        <span className="capitalize text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-900 border border-gray-150">
          {c.inputType}
        </span>
      ),
    },
    {
      key: 'isRequired',
      label: 'Requirement',
      render: (c: ProfileColumn) => (
        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${c.isRequired ? 'bg-rose-50 text-rose-700 border border-rose-150' : 'bg-gray-50 text-gray-500 border border-gray-150'}`}>
          {c.isRequired ? 'Required' : 'Optional'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (c: ProfileColumn) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setViewColumn(c)}
            className="p-2 rounded-lg transition-all text-slate-300 hover:text-white hover:bg-slate-800"
            title="View Column"
          >
            {getIconComponent({ iconName: 'View', iconSize: 15, iconColor: '#94a3b8' })}
          </button>
          <button
            onClick={() => openEditModal(c)}
            className="p-2 rounded-lg transition-all text-blue-400 hover:text-blue-300 hover:bg-blue-600/20"
            title="Edit Column"
          >
            {getIconComponent({ iconName: 'Edit', iconSize: 15, iconColor: '#60a5fa' })}
          </button>
          <button
            onClick={() => setColToDelete(c)}
            className="p-2 rounded-lg transition-all text-rose-400 hover:text-rose-300 hover:bg-rose-600/20"
            title="Delete Column"
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
      <div className="px-8 py-6 border-b border-gray-100 bg-gray-55 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Job Profile Schema</h1>
          <p className="text-sm text-gray-500 mt-1">
            Define the fields candidates fill in their <strong>Job Profile</strong> (not their user account). These fields are used by operators to match candidates to jobs.
          </p>
        </div>
        <Button 
          variant="primary" 
          onClick={openCreateModal}
          className="py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center space-x-1.5 shadow-sm"
        >
          {getIconComponent({ iconName: 'AddNew', iconSize: 16, iconColor: '#FFFFFF' })}
          <span>Add Field</span>
        </Button>
      </div>

      {loading && <p className="p-8 text-sm text-gray-500">Loading column catalog...</p>}
      {error && <p className="p-8 text-sm text-red-600 bg-red-50">{error}</p>}

      {!loading && !error && (
        <ReusableTable
          columns={tableColumns}
          data={columns}
          searchPlaceholder="Search columns..."
          searchKeys={['label', 'name', 'inputType']}
          itemsPerPage={10}
          emptyMessage="No dynamic profile columns registered."
        />
      )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl max-w-md w-full animate-fadeIn">
            <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/55">
              <h2 className="text-lg font-extrabold text-gray-900">
                {modalMode === 'create' ? 'Add Job Profile Field' : 'Edit Job Profile Field'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-xl transition"
              >
                {getIconComponent({ iconName: 'Cancel', iconSize: 18, iconColor: '#6B7280' })}
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {formError && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Field Label (Visible to Candidate)</label>
                <input
                  type="text"
                  required
                  value={label}
                  onChange={(e) => {
                    setLabel(e.target.value);
                    if (modalMode === 'create') {
                      setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'));
                    }
                  }}
                  placeholder="e.g. Technical Skills"
                  className="w-full px-4 py-2 border border-gray-250 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Database Identifier (Lowercase, A-Z, 0-9, _)</label>
                <input
                  type="text"
                  required
                  disabled={modalMode === 'edit'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. tech_skills"
                  className="w-full px-4 py-2 border border-gray-250 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm disabled:bg-gray-50 disabled:text-gray-400 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Input Field Type</label>
                <select
                  value={inputType}
                  onChange={(e: any) => setInputType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-250 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm bg-white"
                >
                  <option value="text">Text Box</option>
                  <option value="textarea">Text Area</option>
                  <option value="number">Number Box</option>
                  <option value="file">File Upload / Attachment</option>
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="isRequired"
                  checked={isRequired}
                  onChange={(e) => setIsRequired(e.target.checked)}
                  className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                />
                <label htmlFor="isRequired" className="text-sm font-semibold text-gray-700">Make this field required</label>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end space-x-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold border-gray-200 text-gray-600 hover:bg-gray-55"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="primary" 
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-sm font-semibold shadow-sm"
                >
                  {saving ? 'Saving...' : 'Save Field'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Profile Column Modal */}
      <ViewModal
        isOpen={!!viewColumn}
        onClose={() => setViewColumn(null)}
        title={viewColumn?.label || ''}
        subtitle={`Key: ${viewColumn?.name || ''}`}
        fields={[
          { label: 'Field Label', value: viewColumn?.label },
          { label: 'Database Key', value: viewColumn?.name },
          { label: 'Input Type', value: viewColumn?.inputType },
          { label: 'Required', value: viewColumn?.isRequired ? 'Yes' : 'No' },
          { label: 'Options', value: viewColumn?.options || '—' },
        ]}
        actions={[
          {
            label: 'Edit',
            variant: 'primary',
            onClick: () => { setViewColumn(null); openEditModal(viewColumn!); },
          },
        ]}
      />

      <ConfirmModal
        isOpen={!!colToDelete}
        title="Delete Profile Column"
        message={`Are you sure you want to delete "${colToDelete?.label}"? Existing candidate answers for this column will also be hidden.`}
        confirmText="Delete Column"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setColToDelete(null)}
      />
    </>
  );
}
