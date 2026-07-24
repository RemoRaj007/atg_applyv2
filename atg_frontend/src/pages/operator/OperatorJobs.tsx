import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { jobApi } from '../../api/jobApi';
import { jobRoleApi, type JobRole } from '../../api/jobRoleApi';
import { skillApi, type Skill } from '../../api/skillApi';
import type { Job } from '../../types/job.types';
import Button from '../../components/ui/AtgButton';
import ReusableTable from '../../components/ui/AtgReusableTable';
import getIconComponent from '../../components/ui/AtgIconMapper';
import ViewModal from '../../components/ui/ViewModal';

function FormSingleSelect({ 
  label, 
  options, 
  value, 
  onChange 
}: { 
  label: string; 
  options: string[]; 
  value: string; 
  onChange: (val: string) => void; 
}) {
  const [otherText, setOtherText] = useState('');
  const [showOther, setShowOther] = useState(false);

  const handleSelect = (val: string) => {
    if (val === 'Other') {
      setShowOther(true);
      onChange('');
    } else {
      setShowOther(false);
      onChange(val);
    }
  };

  const handleAddOther = () => {
    if (otherText.trim()) {
      onChange(otherText.trim());
      setOtherText('');
      setShowOther(false);
    }
  };

  // If value is not in options and not empty, it's a custom value
  const isCustomValue = value && !options.includes(value);

  return (
    <div className="mb-4">
      <label className="text-sm font-semibold text-gray-700 block mb-1.5">{label}</label>

      {/* Show the selected custom value as a pill if it's not in the default options */}
      {isCustomValue && !showOther && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium border border-blue-100">
            {value}
            <button type="button" onClick={() => onChange('')} className="text-blue-400 hover:text-blue-900">&times;</button>
          </span>
        </div>
      )}

      <select 
        value={isCustomValue || showOther ? (showOther ? 'Other' : '') : value}
        onChange={(e) => handleSelect(e.target.value)}
        className="w-full px-2 py-2 border border-gray-250 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      >
        <option value="" disabled>Select {label.toLowerCase()}...</option>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
        <option value="Other">Other (Specify...)</option>
      </select>
      
      {showOther && (
        <div className="flex gap-2 mt-2">
          <input 
            type="text" 
            value={otherText} 
            onChange={(e) => setOtherText(e.target.value)}
            placeholder="Specify..."
            className="flex-1 px-2 py-1.5 border border-gray-250 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <button type="button" onClick={handleAddOther} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">Add</button>
          <button type="button" onClick={() => {setShowOther(false); setOtherText('');}} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors">Cancel</button>
        </div>
      )}
    </div>
  );
}

import FormMultiSelect from '../../components/ui/FormMultiSelect';

export default function OperatorJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [dbJobRoles, setDbJobRoles] = useState<JobRole[]>([]);
  const [dbSkills, setDbSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [source, setSource] = useState('LinkedIn');
  const [deadline, setDeadline] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [fitReason, setFitReason] = useState('');
  const [description, setDescription] = useState('');
  
  // Job Requirements
  const [jobExperience, setJobExperience] = useState<string>('');
  const [jobLocation, setJobLocation] = useState<string>('');
  const [jobRoleId, setJobRoleId] = useState<number | null>(null);
  const [jobSkills, setJobSkills] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);

  // View modal state
  const [viewJob, setViewJob] = useState<Job | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [jobsRes, rolesRes, skillsRes] = await Promise.all([
        jobApi.list(),
        jobRoleApi.list(),
        skillApi.list()
      ]);
      setJobs(jobsRes);
      // Only keep active/approved roles and skills in the dropdowns
      setDbJobRoles(rolesRes.jobRoles.filter(r => r.status === 'active'));
      setDbSkills(skillsRes.skills.filter(s => s.status === 'active'));
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
    setSelectedJob(null);
    setTitle('');
    setCompany('');
    setLocation('');
    setSource('LinkedIn');
    setDeadline('');
    setJobUrl('');
    setFitReason('');
    setDescription('');
    setJobExperience('');
    setJobLocation('');
    setJobRoleId(null);
    setJobSkills([]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (job: Job) => {
    setModalMode('edit');
    setSelectedJob(job);
    setTitle(job.title);
    setCompany(job.company);
    setLocation(job.location || '');
    setSource(job.source || 'LinkedIn');
    setDeadline(job.deadline ? new Date(job.deadline).toISOString().split('T')[0] : '');
    setJobUrl(job.jobUrl || '');
    setFitReason(job.fitReason || '');
    setDescription(job.description || '');
    setJobExperience(job.experience || '');
    setJobLocation(job.locationType || '');
    setJobRoleId(job.jobRoleId || null);
    setJobSkills(job.skills?.map(s => s.skill?.name).filter(Boolean) as string[] || []);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    if (!title.trim() || !company.trim()) {
      setFormError('Title and company are required');
      setSaving(false);
      return;
    }

    try {
      const payload: any = {
        title,
        company,
        location: location.trim() || undefined,
        source: source.trim() || undefined,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
        jobUrl,
        fitReason,
        description: description.trim() || undefined,
        jobRoleId,
        jobRequirements: {
          experience: jobExperience,
          locationType: jobLocation,
          skills: jobSkills
        }
      };

      if (modalMode === 'create') {
        await jobApi.create(payload);
      } else if (modalMode === 'edit' && selectedJob) {
        await jobApi.update(selectedJob.id, payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save job post');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (id: number, status: 'approved' | 'rejected') => {
    try {
      await jobApi.approve(id, status);
      toast.success(`Job ${status} successfully`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to change job approval status');
    }
  };

  const openDeleteConfirm = (job: Job) => {
    setJobToDelete(job);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!jobToDelete) return;
    try {
      await jobApi.remove(jobToDelete.id);
      setDeleteConfirmOpen(false);
      setJobToDelete(null);
      toast.success('Job listing deleted successfully');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to soft delete job listing');
    }
  };

  const columns = [
    {
      key: 'title',
      label: 'Job Details',
      render: (j: Job) => (
        <div>
          <p className="font-bold text-slate-100">{j.title}</p>
          <p className="text-xs text-slate-400">{j.company} · {j.location || 'Remote'}</p>
        </div>
      ),
    },
    {
      key: 'source',
      label: 'Channel',
      render: (j: Job) => (
        <span className="text-xs font-semibold text-slate-300 bg-slate-800/80 border border-slate-700/80 px-2.5 py-1 rounded-lg">
          {j.source?.toUpperCase() || 'LINKEDIN'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (j: Job) => (
        <span 
          className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
            j.status === 'approved' 
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
              : j.status === 'rejected'
              ? 'bg-red-500/20 text-red-400 border-red-500/30'
              : j.status === 'pending_payment'
              ? 'bg-slate-800 text-slate-400 border-slate-700 font-semibold'
              : 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse'
          }`}
        >
          {(j.status || 'approved').replace('_', ' ').toUpperCase()}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions / Approvals',
      render: (j: Job) => (
        <div className="flex items-center gap-1.5">
          {j.status === 'pending' && (
            <div className="flex items-center gap-1.5 border-r border-slate-800 pr-2 mr-1">
              <button
                onClick={() => handleApprove(j.id, 'approved')}
                className="px-2.5 py-1 text-xs font-bold text-white rounded-lg transition shadow-sm bg-emerald-600 hover:bg-emerald-500"
              >
                Approve
              </button>
              <button
                onClick={() => handleApprove(j.id, 'rejected')}
                className="px-2.5 py-1 text-xs font-bold rounded-lg transition bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Reject
              </button>
            </div>
          )}
          <button
            onClick={() => setViewJob(j)}
            className="p-2 rounded-lg transition-all text-slate-300 hover:text-white hover:bg-slate-800"
            title="View Job"
          >
            {getIconComponent({ iconName: 'View', iconSize: 15, iconColor: '#94a3b8' })}
          </button>
          <button
            onClick={() => openEditModal(j)}
            className="p-2 rounded-lg transition-all text-blue-400 hover:text-blue-300 hover:bg-blue-600/20"
            title="Edit Job Details"
          >
            {getIconComponent({ iconName: 'Edit', iconSize: 15, iconColor: '#60a5fa' })}
          </button>
          <button
            onClick={() => openDeleteConfirm(j)}
            className="p-2 rounded-lg transition-all text-rose-400 hover:text-rose-300 hover:bg-rose-600/20"
            title="Soft Delete Job"
          >
            {getIconComponent({ iconName: 'Delete', iconSize: 15, iconColor: '#f87171' })}
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden animate-fadeIn relative">
      <div className="px-8 py-6 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100">Job Catalog Management</h1>
          <p className="text-sm text-slate-400 mt-1">Review recruiter job posts, approve submissions, and maintain current job listings.</p>
        </div>
        <Button 
          variant="primary" 
          onClick={openCreateModal}
          className="py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center space-x-1.5 shadow-sm"
        >
          {getIconComponent({ iconName: 'AddNew', iconSize: 16, iconColor: '#FFFFFF' })}
          <span>Create Job Post</span>
        </Button>
      </div>

      {loading && <p className="p-8 text-sm text-slate-400">Loading listings...</p>}
      {error && <p className="p-8 text-sm text-red-400 bg-red-950/40 border-b border-red-800/60">{error}</p>}

      {!loading && !error && (
        <ReusableTable
          columns={columns}
          data={jobs}
          searchPlaceholder="Search jobs by title, company, channel or status..."
          searchKeys={['title', 'company', 'source', 'status']}
          itemsPerPage={8}
          emptyMessage="No job posts registered in catalog."
        />
      )}

      </div>

      {/* Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl border border-slate-800 text-slate-100 shadow-2xl max-w-4xl w-full animate-fadeIn">
            <div className="px-8 py-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/60 rounded-t-3xl">
              <h2 className="text-lg font-extrabold text-slate-100">
                {modalMode === 'create' ? 'Add job recommendation' : 'Edit job recommendation'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white hover:bg-slate-700 p-1.5 rounded-xl transition"
              >
                {getIconComponent({ iconName: 'Cancel', iconSize: 18, iconColor: '#94a3b8' })}
              </button>
            </div>

            <form onSubmit={handleSave} className="p-8">
              {formError && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 mb-5">
                  {formError}
                </div>
              )}

              <div className="flex flex-col md:flex-row gap-8">
                {/* Left Column */}
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Company</label>
                      <input
                        type="text"
                        required
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="e.g. MAS Holdings"
                        className="w-full px-4 py-2.5 border border-gray-250 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Job title</label>
                      <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Senior UX Designer"
                        className="w-full px-4 py-2.5 border border-gray-250 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Location</label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Colombo, LK"
                        className="w-full px-4 py-2.5 border border-gray-250 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Source</label>
                      <select
                        value={source}
                        onChange={(e) => setSource(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-250 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all bg-white"
                      >
                        <option value="LinkedIn">LinkedIn</option>
                        <option value="Indeed">Indeed</option>
                        <option value="Company site">Company site</option>
                        <option value="Niche board">Niche board</option>
                        <option value="Referral">Referral</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Job URL</label>
                      <input
                        type="url"
                        value={jobUrl}
                        onChange={(e) => setJobUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-4 py-2.5 border border-gray-250 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Deadline</label>
                      <input
                        type="date"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-250 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Fit reason (shown to user)</label>
                    <textarea
                      value={fitReason}
                      onChange={(e) => setFitReason(e.target.value)}
                      placeholder="Why this is a good match..."
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-250 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all bg-white resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Job Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe the responsibilities, requirements, and benefits..."
                      rows={4}
                      className="w-full px-4 py-2.5 border border-gray-250 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all bg-white resize-y"
                    />
                  </div>
                </div>

                {/* Right Column - Job Requirements */}
                <div className="w-full md:w-80 bg-white border border-gray-150 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-base font-bold text-gray-900 mb-1">Job requirements</h3>
                  <p className="text-xs text-gray-500 mb-6">
                    Define the core requirements for this job to help compute fit scores later.
                  </p>

                  <div className="space-y-4">
                    <FormSingleSelect
                      label="Job Role"
                      options={dbJobRoles.map(r => r.name)}
                      value={dbJobRoles.find(r => r.id === jobRoleId)?.name || ''}
                      onChange={async (val) => {
                        const existingRole = dbJobRoles.find(r => r.name === val);
                        if (existingRole) {
                          setJobRoleId(existingRole.id);
                        } else if (val) {
                          // Create new pending job role
                          try {
                            const newRole = await jobRoleApi.create({ name: val });
                            setDbJobRoles(prev => [...prev, newRole.jobRole]);
                            setJobRoleId(newRole.jobRole.id);
                          } catch (e) {
                            toast.error('Failed to add custom job role');
                          }
                        } else {
                          setJobRoleId(null);
                        }
                        // Reset skills when job role changes
                        setJobSkills([]);
                      }}
                    />
                    
                    <FormSingleSelect
                      label="Experience Required"
                      options={['Entry Level', '1-3 years', '3-5 years', '5+ years']}
                      value={jobExperience}
                      onChange={setJobExperience}
                    />

                    <FormSingleSelect
                      label="Location Type"
                      options={['Onsite', 'Remote', 'Hybrid']}
                      value={jobLocation}
                      onChange={setJobLocation}
                    />

                    <FormMultiSelect
                      label="Key Skills"
                      options={dbSkills
                        .filter(s => {
                          if (!jobRoleId) return true;
                          const role = dbJobRoles.find(r => r.id === jobRoleId);
                          return role?.jobRoleSkills?.some(jrs => jrs.skillId === s.id) ?? false;
                        })
                        .map(s => s.name)}
                      values={jobSkills}
                      onChange={setJobSkills}
                      onCustomAdd={async (val) => {
                        try {
                          const newSkill = await skillApi.create({ name: val, category: 'it' } as any);
                          setDbSkills(prev => [...prev, newSkill.skill]);
                          // Note: For custom skills added here, they won't automatically be linked to the jobRole globally
                          // because that requires updating the jobRole. The user can do that in JobRoleManagement.
                        } catch (e) {
                          // fail silently or show toast, but we already added it locally in FormMultiSelect to the values
                        }
                      }}
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={saving}
                    className="w-full mt-6 py-2.5 rounded-xl font-bold shadow-sm text-white transition-all bg-blue-600 hover:bg-blue-700"
                  >
                    {saving ? 'Saving...' : (modalMode === 'create' ? 'Add job recommendation' : 'Save changes')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && jobToDelete && (
        <div className="fixed inset-0 bg-gray-600/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl max-w-md w-full p-6 text-center animate-fadeIn">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
              {getIconComponent({ iconName: 'Delete', iconSize: 24, iconColor: '#DC2626' })}
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Soft Delete Job Listing</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to deactivate <span className="font-semibold text-gray-800">{jobToDelete.title}</span> at <span className="font-semibold text-gray-800">{jobToDelete.company}</span>? 
              It will be hidden from candidate catalogs immediately.
            </p>
            <div className="flex justify-center space-x-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setJobToDelete(null);
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

      {/* View Job Modal */}
      <ViewModal
        isOpen={!!viewJob}
        onClose={() => setViewJob(null)}
        title={viewJob?.title || ''}
        subtitle={viewJob ? `${viewJob.company} · ${viewJob.location || 'Remote'}` : undefined}
        fields={[
          { label: 'Job Title', value: viewJob?.title },
          { label: 'Company', value: viewJob?.company },
          { label: 'Location', value: viewJob?.location || 'Remote' },
          { label: 'Source', value: viewJob?.source?.toUpperCase() || 'LINKEDIN' },
          { label: 'Status', value: viewJob?.status },
          { label: 'Deadline', value: viewJob?.deadline ? new Date(viewJob.deadline).toLocaleDateString() : '—' },
        ]}
        actions={[
          {
            label: 'Edit',
            variant: 'primary',
            onClick: () => { setViewJob(null); openEditModal(viewJob!); },
          },
        ]}
      />
    
    </>
  );
}
