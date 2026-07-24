import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { jobRoleApi, type JobRole } from '../../api/jobRoleApi';
import { skillApi, type Skill } from '../../api/skillApi';
import FormMultiSelect from '../../components/ui/FormMultiSelect';
import Button from '../../components/ui/AtgButton';
import ReusableTable from '../../components/ui/AtgReusableTable';
import getIconComponent from '../../components/ui/AtgIconMapper';

export default function JobRoleManagement() {
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending'>('all');

  // CRUD modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedJobRole, setSelectedJobRole] = useState<JobRole | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'pending' | 'active' | 'rejected'>('active');

  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Skills
  const [dbSkills, setDbSkills] = useState<Skill[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  // Deactivate confirmation states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [jobRoleToDelete, setJobRoleToDelete] = useState<JobRole | null>(null);

  const fetchJobRoles = () => {
    setLoading(true);
    Promise.all([
      jobRoleApi.list(),
      skillApi.list()
    ])
      .then(([jobRolesRes, skillsRes]) => {
        setJobRoles(jobRolesRes.jobRoles);
        // Only active skills should be in dropdown initially, but pending ones can be selected if they belong to a role.
        setDbSkills(skillsRes.skills.filter(s => s.status === 'active' || s.status === 'pending'));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchJobRoles();
  }, []);

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedJobRole(null);
    setName('');
    setStatus('active');
    setSelectedSkills([]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (jobRole: JobRole) => {
    setModalMode('edit');
    setSelectedJobRole(jobRole);
    setName(jobRole.name);
    setStatus(jobRole.status as any);
    setSelectedSkills(jobRole.jobRoleSkills?.map(jrs => jrs.skill.name) || []);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      // Map selected skill names to IDs
      const skillIds = selectedSkills
        .map(skillName => dbSkills.find(s => s.name === skillName)?.id)
        .filter(id => id !== undefined) as number[];

      const data = { name, status, skills: skillIds };
      if (modalMode === 'create') {
        await jobRoleApi.create(data);
      } else if (selectedJobRole) {
        await jobRoleApi.update(selectedJobRole.id, data);
      }
      setIsModalOpen(false);
      fetchJobRoles();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save job role');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (jobRole: JobRole) => {
    setJobRoleToDelete(jobRole);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!jobRoleToDelete) return;
    try {
      await jobRoleApi.remove(jobRoleToDelete.id);
      setDeleteConfirmOpen(false);
      toast.success('Job role deleted successfully');
      fetchJobRoles();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete job role');
    }
  };

  const handleUpdateStatus = async (jobRole: JobRole, newStatus: 'approved' | 'rejected') => {
    try {
      await jobRoleApi.approve(jobRole.id, newStatus);
      toast.success(`Job role status updated to ${newStatus}`);
      fetchJobRoles();
    } catch (err: any) {
      toast.error(err.message || `Failed to update status`);
    }
  };

  const tableColumns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Role Name' },
    {
      key: 'skills',
      label: 'Skills',
      render: (jobRole: JobRole) => (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {jobRole.jobRoleSkills && jobRole.jobRoleSkills.length > 0 ? (
            jobRole.jobRoleSkills.map(jrs => (
              <span key={jrs.id} className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 rounded border border-blue-100">
                {jrs.skill.name}
              </span>
            ))
          ) : (
            <span className="text-gray-400 text-xs italic">No skills</span>
          )}
        </div>
      )
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (jobRole: JobRole) => (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
          jobRole.status === 'active' ? 'bg-green-100 text-green-800' :
          jobRole.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {jobRole.status.toUpperCase()}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (jobRole: JobRole) => (
        <div className="flex items-center gap-2">
          {jobRole.status === 'pending' && (
            <>
              <button
                onClick={() => handleUpdateStatus(jobRole, 'approved')}
                className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-md transition-colors"
              >
                Approve
              </button>
              <button
                onClick={() => handleUpdateStatus(jobRole, 'rejected')}
                className="px-3 py-1.5 text-xs font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-md transition-colors"
              >
                Reject
              </button>
            </>
          )}
          <button
            onClick={() => openEditModal(jobRole)}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
            title="Edit"
          >
            {getIconComponent({ iconName: 'Edit', iconSize: 15 })}
          </button>
          <button
            onClick={() => confirmDelete(jobRole)}
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
    return <div className="p-8 text-sm text-gray-500 animate-pulse">Loading job roles...</div>;
  }

  if (error) {
    return <div className="p-8 text-sm text-red-500 bg-red-50 rounded-lg m-4">{error}</div>;
  }

  return (
    <div className="space-y-6 animate-fadeIn p-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Job Role Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage predefined job roles and approve user submissions.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setFilterStatus('all')} 
            variant={filterStatus === 'all' ? 'primary' : 'outline'}
          >
            All Roles
          </Button>
          <Button 
            onClick={() => setFilterStatus('pending')} 
            variant={filterStatus === 'pending' ? 'primary' : 'outline'}
          >
            Pending Only
          </Button>
          <Button onClick={openCreateModal} className="flex items-center gap-2" variant="primary">
            {getIconComponent({ iconName: 'AddNew', iconSize: 16, iconColor: '#FFFFFF' })}
            Add New Role
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <ReusableTable
          columns={tableColumns}
          data={filterStatus === 'all' ? jobRoles : jobRoles.filter(r => r.status === 'pending')}
        />
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-slideUp">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                {modalMode === 'create' ? 'Create New Job Role' : 'Edit Job Role'}
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
                <label className="block text-sm font-semibold text-gray-700 mb-1">Role Name</label>
                <input
                  required
                  className="w-full border border-gray-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Software Engineer"
                />
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

              <div>
                <FormMultiSelect
                  label="Associated Skills"
                  options={dbSkills.map(s => s.name)}
                  values={selectedSkills}
                  onChange={setSelectedSkills}
                  onCustomAdd={async (val) => {
                    try {
                      // Create a pending skill
                      const newSkill = await skillApi.create({ name: val, category: 'it' } as any);
                      setDbSkills(prev => [...prev, newSkill.skill]);
                    } catch (e) {
                      // Silently ignore if already exists or error, user will still see it locally in FormMultiSelect
                    }
                  }}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-gray-100">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} variant="primary">
                  {saving ? 'Saving...' : 'Save Role'}
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
              <h2 className="text-xl font-bold text-gray-900">Delete Job Role?</h2>
              <button onClick={() => setDeleteConfirmOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete "{jobRoleToDelete?.name}"? This action cannot be undone.
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
