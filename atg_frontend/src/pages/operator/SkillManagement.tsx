import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { skillApi, type Skill } from '../../api/skillApi';
import Button from '../../components/ui/AtgButton';
import ReusableTable from '../../components/ui/AtgReusableTable';
import getIconComponent from '../../components/ui/AtgIconMapper';

export default function SkillManagement() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending'>('all');

  // CRUD modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState('it');
  const [status, setStatus] = useState<'pending' | 'active' | 'rejected'>('active');

  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Deactivate confirmation states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [skillToDelete, setSkillToDelete] = useState<Skill | null>(null);

  const fetchSkills = () => {
    setLoading(true);
    skillApi
      .list()
      .then((res) => setSkills(res.skills))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedSkill(null);
    setName('');
    setCategory('it');
    setStatus('active');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (skill: Skill) => {
    setModalMode('edit');
    setSelectedSkill(skill);
    setName(skill.name);
    setCategory(skill.category || 'it');
    setStatus(skill.status as any);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const data = { name, category, status };
      if (modalMode === 'create') {
        await skillApi.create(data);
      } else if (selectedSkill) {
        await skillApi.update(selectedSkill.id, data);
      }
      setIsModalOpen(false);
      fetchSkills();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save skill');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (skill: Skill) => {
    setSkillToDelete(skill);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!skillToDelete) return;
    try {
      await skillApi.remove(skillToDelete.id);
      setDeleteConfirmOpen(false);
      toast.success('Skill deleted successfully');
      fetchSkills();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete skill');
    }
  };

  const handleUpdateStatus = async (skill: Skill, newStatus: 'active' | 'rejected') => {
    try {
      await skillApi.update(skill.id, { name: skill.name, category: skill.category, status: newStatus });
      toast.success(`Skill status updated to ${newStatus}`);
      fetchSkills();
    } catch (err: any) {
      toast.error(err.message || `Failed to update status`);
    }
  };

  const tableColumns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'category', label: 'Category' },
    {
      key: 'status',
      label: 'Status',
      render: (skill: Skill) => (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${skill.status === 'active' ? 'bg-green-100 text-green-800' :
          skill.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
          {skill.status.toUpperCase()}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (skill: Skill) => (
        <div className="flex items-center gap-2">
          {skill.status === 'pending' && (
            <>
              <button
                onClick={() => handleUpdateStatus(skill, 'active')}
                className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-md transition-colors"
              >
                Approve
              </button>
              <button
                onClick={() => handleUpdateStatus(skill, 'rejected')}
                className="px-3 py-1.5 text-xs font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-md transition-colors"
              >
                Reject
              </button>
            </>
          )}
          <button
            onClick={() => openEditModal(skill)}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
            title="Edit"
          >
            {getIconComponent({ iconName: 'Edit', iconSize: 15 })}
          </button>
          <button
            onClick={() => confirmDelete(skill)}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
            title="Delete"
          >
            {getIconComponent({ iconName: 'Delete', iconSize: 15 })}
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return <div className="p-8 text-sm text-gray-500 animate-pulse">Loading skills database...</div>;
  }

  if (error) {
    return <div className="p-8 text-sm text-red-500 bg-red-50 rounded-lg m-4">{error}</div>;
  }

  return (
    <div className="space-y-6 animate-fadeIn p-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Skill Catalog Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage predefined skills and approve user submissions.</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setFilterStatus('all')}
            variant={filterStatus === 'all' ? 'primary' : 'outline'}
          >
            All Skills
          </Button>
          <Button
            onClick={() => setFilterStatus('pending')}
            variant={filterStatus === 'pending' ? 'primary' : 'outline'}
          >
            Pending Only
          </Button>
          <Button onClick={openCreateModal} className="flex items-center gap-2" variant="primary">
            {getIconComponent({ iconName: 'AddNew', iconSize: 16, iconColor: '#FFFFFF' })}
            Add New Skill
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <ReusableTable
          columns={tableColumns}
          data={filterStatus === 'all' ? skills : skills.filter(s => s.status === 'pending')}
        />
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-slideUp">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                {modalMode === 'create' ? 'Create New Skill' : 'Edit Skill'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleSave} className="space-y-4">
                {formError && (
                  <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Skill Name</label>
                  <input
                    required
                    className="w-full border border-gray-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. React.js"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                  <select
                    className="w-full border border-gray-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="it">IT Skills</option>
                    <option value="language">Language</option>
                    <option value="other">Other Qualifications</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                  <select
                    className="w-full border border-gray-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                  >
                    <option value="active">Active (Approved)</option>
                    <option value="pending">Pending (Awaiting Approval)</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-gray-100">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving} variant="primary">
                    {saving ? 'Saving...' : 'Save Skill'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-slideUp">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Delete Skill?</h2>
              <button onClick={() => setDeleteConfirmOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to delete "{skillToDelete?.name}"? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
                <Button variant="danger" onClick={handleDelete}>Delete</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
