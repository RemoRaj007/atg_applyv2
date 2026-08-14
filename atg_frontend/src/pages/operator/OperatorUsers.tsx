import { useCallback, useEffect, useState } from 'react';
import { userApi } from '../../api/userApi';
import { requestApi } from '../../api/requestApi';
import type { User } from '../../types/user.types';
import RoleBadge from '../../components/ui/RoleBadge';
import Button from '../../components/ui/AtgButton';
import ReusableTable from '../../components/ui/AtgReusableTable';
import getIconComponent from '../../components/ui/AtgIconMapper';

import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { pdf } from '@react-pdf/renderer';
import { ProfilePDF } from '../../components/pdf/ProfilePDF';
import toast from 'react-hot-toast';
import { userProfileApi } from '../../api/userProfileApi';
import type { FullUserProfile } from '../../api/userProfileApi';
import { Download, X, FileText, Clock, TrendingUp, Users } from 'lucide-react';
import { getFileUrl } from '../../utils/fileUrl';

// ─── Experience Calculator Helpers ──────────────────────────────────────────
function calcMonths(startDate: string, endDate?: string, isCurrent?: boolean): number {
  if (!startDate) return 0;
  const start = new Date(startDate);
  const end = (isCurrent || !endDate) ? new Date() : new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  return Math.max(0, months);
}

function formatDuration(totalMonths: number): string {
  if (totalMonths <= 0) return '< 1 mo';
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} yr${years > 1 ? 's' : ''}`);
  if (months > 0) parts.push(`${months} mo`);
  return parts.join(' ') || '< 1 mo';
}

function calcExperienceSummary(experiences: any[]) {
  const byRole = experiences.map(exp => ({
    exp,
    months: calcMonths(exp.startDate, exp.endDate, exp.isCurrent),
  }));
  const totalMonths = byRole.reduce((sum, r) => sum + r.months, 0);
  const currentJobs = experiences.filter(e => e.isCurrent).length;
  return { totalMonths, byRole, currentJobs };
}

const PAGE_SIZE = 8;

export default function OperatorUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Paging and search are the server's job now: the list endpoint returns one
  // page at a time, so filtering here would only ever see the current page.
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageMeta, setPageMeta] = useState({ total: 0, page: 1, pageSize: PAGE_SIZE, totalPages: 1 });

  // CRUD Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'operator' | 'candidate' | 'visitor' | 'company'>('candidate');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [pkg, setPkg] = useState('Trial');
  const [appsTotal, setAppsTotal] = useState(10);
  const [capacity, setCapacity] = useState(10);
  const [isLegendary, setIsLegendary] = useState(false);

  // Change request specific states
  const [requestReason, setRequestReason] = useState('');

  // Form Error/Saving States
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete Confirmation States
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // View Modal State
  const [viewUser, setViewUser] = useState<User | null>(null);
  const [viewProfileValues, setViewProfileValues] = useState<any[]>([]);
  const [fullProfile, setFullProfile] = useState<FullUserProfile | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [viewDoc, setViewDoc] = useState<any>(null);

  useEffect(() => {
    if (viewUser && viewUser.role === 'candidate') {
      import('../../api/profileApi').then(({ profileApi }) => {
        profileApi.getValues(viewUser.id)
          .then(setViewProfileValues)
          .catch(console.error);
      });
      userProfileApi.getProfile(viewUser.id)
        .then(setFullProfile)
        .catch(console.error);
    } else {
      setViewProfileValues([]);
      setFullProfile(null);
    }
  }, [viewUser]);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    setError(null);
    userApi
      .listPaged({ page, pageSize: PAGE_SIZE, role: 'candidate', search: searchQuery || undefined })
      .then((result) => {
        setUsers(result.items);
        setPageMeta(result.pagination);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, searchQuery]);

  useEffect(() => {
    // Debounced so typing in the search box does not fire a request per keystroke.
    const timer = setTimeout(fetchUsers, searchQuery ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchUsers, searchQuery]);

  const handleExportZip = async () => {
    if (!fullProfile) {
      toast.error('Profile data not available for export');
      return;
    }
    setIsExporting(true);
    toast.loading('Generating ZIP Export...', { id: 'zip-operator' });
    try {
      const pdfBlob = await pdf(<ProfilePDF profileData={fullProfile} />).toBlob();
      
      const zip = new JSZip();
      zip.file(`${fullProfile?.profile?.firstName || viewUser?.name || 'Candidate'}_Profile.pdf`, pdfBlob);
      
      if (fullProfile?.documents) {
        for (const doc of fullProfile.documents) {
          try {
            const response = await fetch(`${getFileUrl(doc.fileUrl)}?t=${new Date().getTime()}`);
            const blob = await response.blob();
            const ext = doc.fileUrl.split('.').pop() || 'file';
            const safeName = doc.docType.replace(/[^a-z0-9]/gi, '_');
            zip.file(`documents/${safeName}.${ext}`, blob);
          } catch (e) {
            console.error('Failed to fetch doc', doc.docType);
          }
        }
      }
      
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, `${fullProfile?.profile?.firstName || viewUser?.name || 'Candidate'}_Profile_Export.zip`);
      
      toast.success('Export downloaded successfully!', { id: 'zip-operator' });
    } catch (err: any) {
      console.error('PDF Export Error:', err);
      toast.error(`Failed to export: ${err.message || 'Unknown error'}`, { id: 'zip-operator' });
    } finally {
      setIsExporting(false);
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedUser(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('candidate');
    setPhone('');
    setCountry('');
    setCity('');
    setPkg('Trial');
    setAppsTotal(10);
    setCapacity(10);
    setIsLegendary(false);
    setRequestReason('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setModalMode('edit');
    setSelectedUser(user);
    setName(user.name);
    setEmail(user.email);
    setPassword(''); // blank by default on edit
    setRole(user.role);
    setPhone(user.phone || '');
    setCountry(user.country || '');
    setCity(user.city || '');
    setPkg(user.pkg || 'Trial');
    setAppsTotal(user.appsTotal || 10);
    setCapacity(user.capacity || 10);
    setIsLegendary(user.isLegendary || false);
    setRequestReason('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    // Validations
    if (!name.trim()) {
      setFormError('Name is required');
      setSaving(false);
      return;
    }
    if (modalMode === 'create' && !email.trim()) {
      setFormError('Email is required');
      setSaving(false);
      return;
    }
    if (modalMode === 'create' && (!password || password.length < 8)) {
      setFormError('Password is required and must be at least 8 characters');
      setSaving(false);
      return;
    }

    if (modalMode === 'edit' && !requestReason.trim()) {
      setFormError('A reason for the change request is required');
      setSaving(false);
      return;
    }

    try {
      if (modalMode === 'create') {
        const payload: any = {
          name,
          email,
          password,
          role,
          phone,
          country,
          city,
          isLegendary,
        };
        if (role === 'candidate') {
          payload.pkg = pkg;
          payload.appsTotal = Number(appsTotal);
        } else if (role === 'operator') {
          payload.capacity = Number(capacity);
        }
        await userApi.create(payload);
        setIsModalOpen(false);
        fetchUsers();
      } else if (modalMode === 'edit' && selectedUser) {
        const details: any = {
          name,
          role,
          phone,
          country,
          city,
          isLegendary,
        };
        if (role === 'candidate') {
          details.pkg = pkg;
          details.appsTotal = Number(appsTotal);
        } else if (role === 'operator') {
          details.capacity = Number(capacity);
        }
        
        await requestApi.create({
          type: 'edit_user',
          targetId: selectedUser.id,
          reason: requestReason,
          details,
        });
        setIsModalOpen(false);
        toast.success('Edit request submitted to Admin for approval.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to save user account');
      toast.error(err.message || 'Failed to save user account');
    } finally {
      setSaving(false);
    }
  };

  const openDeleteConfirm = (user: User) => {
    setUserToDelete(user);
    setRequestReason('');
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    if (!requestReason.trim()) {
      toast.error('A justification reason is required to submit a deactivation request.');
      return;
    }
    try {
      await requestApi.create({
        type: 'delete_user',
        targetId: userToDelete.id,
        reason: requestReason,
      });
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
      toast.success('Deactivation request submitted to Admin for approval.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to request soft delete');
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Candidate Details',
      render: (u: User) => (
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-brand-50 text-brand-800 font-bold flex items-center justify-center text-sm shadow-inner">
            {u.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-gray-800">{u.name}</p>
            <p className="text-xs text-gray-400">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'pkg',
      label: 'Package & Usage',
      render: (u: User) => (
        u.role === 'candidate' ? (
          <div className="space-y-1">
            <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">{u.pkg || 'Trial'}</span>
            <p className="text-xs text-gray-500 mt-1">{u.appsUsed || 0}/{u.appsTotal || 10} apps</p>
          </div>
        ) : u.role === 'operator' ? (
          <span className="text-xs text-gray-600 bg-blue-50/50 text-brand-700 px-2 py-0.5 rounded-full font-medium">Capacity: {u.capacity ?? 10} concurrent</span>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        )
      ),
    },
    {
      key: 'role',
      label: 'Role',
      render: (u: User) => <RoleBadge role={u.role} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (u: User) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setViewUser(u)}
            className="p-2 rounded-lg transition-all text-slate-300 hover:text-white hover:bg-slate-800"
            title="View User"
          >
            {getIconComponent({ iconName: 'View', iconSize: 15, iconColor: '#94a3b8' })}
          </button>
          <button
            onClick={() => openEditModal(u)}
            className="p-2 rounded-lg transition-all text-blue-400 hover:text-blue-300 hover:bg-blue-600/20"
            title="Edit User"
          >
            {getIconComponent({ iconName: 'Edit', iconSize: 15, iconColor: '#60a5fa' })}
          </button>
          <button
            onClick={() => openDeleteConfirm(u)}
            className="p-2 rounded-lg transition-all text-rose-400 hover:text-rose-300 hover:bg-rose-600/20"
            title="Soft Delete User"
          >
            {getIconComponent({ iconName: 'Delete', iconSize: 15, iconColor: '#f87171' })}
          </button>
        </div>
      ),
    },
  ];

  if (viewUser) {
    return (
      <div className="animate-fadeIn space-y-6">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setViewUser(null)} 
            className="flex items-center gap-2 text-brand-600 hover:text-brand-800 font-semibold transition-colors bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm"
          >
            &larr; Back to User Directory
          </button>
          <div className="flex gap-2">
            {viewUser.role === 'candidate' && (
              <Button variant="outline" onClick={handleExportZip} disabled={isExporting} className="px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2">
                <Download className="w-4 h-4" />
                {isExporting ? 'Exporting...' : 'Export ZIP'}
              </Button>
            )}
            <Button variant="primary" onClick={() => { setViewUser(null); openEditModal(viewUser); }} className="px-4 py-2 rounded-xl text-sm font-semibold">
              Edit User
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden">
          <div className="px-8 py-8 border-b border-gray-100 bg-gray-50/50 flex items-center gap-4">
             <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-800 font-extrabold flex items-center justify-center text-2xl shadow-inner">
              {viewUser.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
                {viewUser.name} <RoleBadge role={viewUser.role} />
              </h2>
              <p className="text-gray-500 mt-1 font-medium">{viewUser.email}</p>
            </div>
          </div>
          
          <div className="p-8">
            <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">Account Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {[
                { label: 'Phone', value: viewUser.phone || '—' },
                { label: 'Country', value: viewUser.country || '—' },
                { label: 'City', value: viewUser.city || '—' },
                { label: 'Package', value: viewUser?.pkg || '—' },
                { label: 'Apps Used / Total', value: viewUser ? `${viewUser.appsUsed ?? 0} / ${viewUser.appsTotal ?? 0}` : '—' },
                { label: 'Capacity', value: viewUser.capacity != null ? String(viewUser.capacity) : '—' }
              ].map((item, idx) => (
                <div key={idx} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{item.label}</span>
                  <div className="text-sm font-bold text-gray-800">{item.value}</div>
                </div>
              ))}
            </div>

            {viewUser.role === 'candidate' && (
              <>
                <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100 mt-10">Job Profile Specifics</h3>
                {viewProfileValues.length === 0 ? (
                  <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-8 text-center mb-8">
                    <p className="text-gray-500 font-medium text-sm">No job profile data filled yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {viewProfileValues.map((pv, idx) => (
                      <div key={idx} className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm relative pl-16">
                        <div className="absolute left-5 top-5 w-8 h-8 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center font-bold text-sm">
                          {idx + 1}
                        </div>
                        <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                          {pv.column?.label || `Field ${pv.columnId}`}
                        </span>
                        <div className="text-sm font-medium text-gray-800 whitespace-pre-wrap">
                          {pv.column?.inputType === 'file' ? (
                            pv.value ? (
                              <button onClick={() => setViewDoc({ fileUrl: pv.value, docType: pv.column?.label || `Field ${pv.columnId}` })} className="text-brand-600 hover:text-brand-800 underline font-semibold flex items-center gap-1 mt-1">
                                View Attachment
                              </button>
                            ) : <span className="italic text-gray-400">No file uploaded</span>
                          ) : pv.value || <span className="italic text-gray-400">Not provided</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {fullProfile?.addresses && fullProfile.addresses.length > 0 && (
                  <>
                    <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100 mt-10">Addresses</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      {fullProfile.addresses.map((addr) => (
                        <div key={addr.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100 shadow-sm">
                          <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{addr.address} {addr.address2 && `, ${addr.address2}`}</span>
                          <div className="text-sm font-bold text-gray-800">{addr.city}, {addr.state}, {addr.country} - {addr.postalCode}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {fullProfile?.phones && fullProfile.phones.length > 0 && (
                  <>
                    <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100 mt-10">Additional Phones</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      {fullProfile.phones.map((phone) => (
                        <div key={phone.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100 shadow-sm">
                          <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{phone.phoneType}</span>
                          <div className="text-sm font-bold text-gray-800">{phone.phoneNumber}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {fullProfile?.academicQualifications && fullProfile.academicQualifications.length > 0 && (
                  <>
                    <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100 mt-10">Academic Qualifications</h3>
                    <div className="space-y-4 mb-8">
                      {fullProfile.academicQualifications.map((edu) => (
                        <div key={edu.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100 shadow-sm">
                          <div className="text-sm font-bold text-gray-800">{edu.degreeLevel} - {edu.diplomaObtained}</div>
                          <div className="text-xs text-gray-500 mt-1">{edu.mainField} at {edu.university} ({new Date(edu.fromDate).getFullYear()} - {new Date(edu.toDate).getFullYear()})</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {fullProfile?.experiences && fullProfile.experiences.length > 0 && (
                  <>
                    <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100 mt-10 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-indigo-600" /> Work Experience
                    </h3>
                    {(() => {
                      const expSummary = calcExperienceSummary(fullProfile.experiences);
                      return (
                        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-indigo-50/50 border border-indigo-100 rounded-lg max-w-max">
                          <TrendingUp className="w-4 h-4 text-indigo-650" />
                          <span className="text-xs font-semibold text-indigo-700">Total Calculated Experience:</span>
                          <span className="text-xs font-bold text-indigo-800">{formatDuration(expSummary.totalMonths)}</span>
                          <span className="text-xs text-gray-500">({fullProfile.experiences.length} role{fullProfile.experiences.length > 1 ? 's' : ''})</span>
                        </div>
                      );
                    })()}
                    <div className="space-y-6 mb-8">
                      {fullProfile.experiences.map(exp => {
                        const months = calcMonths(exp.startDate, exp.endDate, exp.isCurrent);
                        return (
                          <div key={exp.id} className="border-l-2 pl-4 border-indigo-500 relative bg-gray-50/50 p-4 rounded-r-xl border border-gray-100">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h4 className="font-bold text-gray-900 text-sm">{exp.jobTitle}</h4>
                                <p className="text-xs font-semibold text-gray-600">{exp.employer}{exp.location ? ` • ${exp.location}` : ''}</p>
                              </div>
                              <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                exp.isCurrent 
                                  ? 'bg-green-50 text-green-700 border-green-200' 
                                  : 'bg-purple-50 text-purple-700 border-purple-200'
                              }`}>
                                {formatDuration(months)}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                              {exp.startDate?.substring(0,7)} — {exp.isCurrent ? 'Present' : exp.endDate?.substring(0,7)}
                              {exp.employmentType && ` (${exp.employmentType})`}
                            </p>
                            {exp.responsibilities && <p className="text-xs text-gray-600 mt-2 whitespace-pre-wrap">{exp.responsibilities}</p>}
                            {exp.achievements && <p className="text-xs text-gray-600 mt-1 italic">✦ {exp.achievements}</p>}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {fullProfile?.references && fullProfile.references.length > 0 && (
                  <>
                    <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100 mt-10 flex items-center gap-2">
                      <Users className="w-5 h-5 text-indigo-650" /> References
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                      {fullProfile.references.map(ref => (
                        <div key={ref.id} className="border rounded-xl p-4 text-xs bg-gray-50 border-gray-200 shadow-sm">
                          <p className="font-bold text-gray-800 text-sm">{ref.refName}</p>
                          {ref.position && <p className="text-gray-600 mt-0.5">{ref.position}</p>}
                          {ref.organization && <p className="text-gray-500">{ref.organization}</p>}
                          <p className="italic text-gray-400 mt-1">{ref.relationship}</p>
                          {ref.email && <p className="mt-2 text-gray-600"><strong>Email:</strong> {ref.email}</p>}
                          {ref.phone && <p className="text-gray-600"><strong>Phone:</strong> {ref.phone}</p>}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {fullProfile && (fullProfile.languages?.length > 0 || fullProfile.itSkills?.length > 0 || fullProfile.otherQualifications?.length > 0) && (
                  <>
                    <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100 mt-10">Skills & Languages</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      {fullProfile.languages?.length > 0 && (
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 shadow-sm">
                          <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Languages</span>
                          <ul className="space-y-2.5">
                            {fullProfile.languages.map((lang) => (
                              <li key={lang.id} className="text-sm font-bold text-gray-800 flex justify-between items-center border-b border-gray-200 pb-1.5 last:border-0 last:pb-0">
                                <span>{lang.language}</span>
                                <span className="text-brand-700 text-[10px] font-extrabold tracking-wider uppercase bg-brand-50 border border-brand-100 px-2 py-0.5 rounded-full">{lang.level}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {fullProfile.itSkills?.length > 0 && (
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 shadow-sm">
                          <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">IT Skills</span>
                          <ul className="space-y-2">
                            {fullProfile.itSkills.map((skill) => (
                              <li key={skill.id} className="text-sm font-bold text-gray-700 flex items-start gap-2">
                                <span className="text-brand-500 mt-0.5">•</span> {skill.description}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {fullProfile.otherQualifications?.length > 0 && (
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 shadow-sm">
                          <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Other Qualifications</span>
                          <ul className="space-y-2">
                            {fullProfile.otherQualifications.map((oq) => (
                              <li key={oq.id} className="text-sm font-bold text-gray-700 flex items-start gap-2">
                                <span className="text-brand-500 mt-0.5">•</span> {oq.description}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {fullProfile?.documents && fullProfile.documents.length > 0 && (
                  <>
                    <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100 mt-10">Documents</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                      {fullProfile.documents.map((doc) => (
                        <div key={doc.id} onClick={() => setViewDoc(doc)} className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between hover:border-brand-300 transition-colors cursor-pointer">
                          <div>
                            <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{doc.docType}</span>
                            <div className="text-xs text-gray-400 mt-1 font-medium">{(doc.fileSize / 1024 / 1024).toFixed(2)} MB</div>
                          </div>
                          <span className="mt-4 text-brand-600 hover:text-brand-800 underline font-semibold text-sm flex items-center gap-1">
                            View Document
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {viewDoc && (
          <div className="fixed inset-0 bg-gray-600/50 backdrop-blur-sm z-[100] flex justify-center items-center p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-fadeIn">
              <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                  <FileText className="text-blue-600 w-6 h-6" /> {viewDoc.docType}
                </h3>
                <button onClick={() => setViewDoc(null)} className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 overflow-auto bg-gray-100 p-4 flex justify-center items-center">
                {viewDoc.fileUrl.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                  <img src={getFileUrl(viewDoc.fileUrl)} alt={viewDoc.docType} className="max-w-full max-h-full object-contain shadow-sm rounded-lg" />
                ) : (
                  <iframe src={getFileUrl(viewDoc.fileUrl)} className="w-full h-full border-0 bg-white shadow-sm rounded-lg" title={viewDoc.docType} />
                )}
              </div>
              <div className="p-4 border-t bg-gray-50 flex justify-end">
                <a href={getFileUrl(viewDoc.fileUrl)} target="_blank" rel="noreferrer" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-sm">
                  Open in New Tab
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden animate-fadeIn relative">
      <div className="px-8 py-6 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100">Candidate Directory</h1>
          <p className="text-sm text-slate-400 mt-1">Manage active credentials, system profiles, and access authorization.</p>
        </div>
        <Button 
          variant="primary" 
          onClick={openCreateModal}
          className="py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center space-x-1.5 shadow-sm"
        >
          {getIconComponent({ iconName: 'AddNew', iconSize: 16, iconColor: '#FFFFFF' })}
          <span>Create Account</span>
        </Button>
      </div>
 
      {error && <p className="p-8 text-sm text-red-400 bg-red-950/40 border-b border-red-800/60">{error}</p>}
 
      {!error && (
        <ReusableTable
          columns={columns}
          data={users}
          searchPlaceholder="Search candidates by name, email or package..."
          emptyMessage="No accounts found in catalog."
          server={{
            page: pageMeta.page,
            pageSize: pageMeta.pageSize,
            total: pageMeta.total,
            totalPages: pageMeta.totalPages,
            onPageChange: setPage,
            searchQuery,
            onSearchChange: (query) => {
              // A new query invalidates the current offset.
              setSearchQuery(query);
              setPage(1);
            },
            loading,
          }}
        />
      )}
 
      {/* CRUD Overlay Form Modal */}
      </div>
 
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto animate-fadeIn">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/55">
              <h2 className="text-lg font-serif font-extrabold text-gray-900">
                {modalMode === 'create' ? 'Create Candidate Account' : 'Edit Candidate Profile'}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-250 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    disabled={modalMode === 'edit'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-250 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm disabled:bg-gray-50 disabled:text-gray-400 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                    {modalMode === 'create' ? 'Password' : 'New Password (Optional)'}
                  </label>
                  <input
                    type="password"
                    placeholder={modalMode === 'edit' ? 'Leave blank to keep unchanged' : 'Min 8 characters'}
                    required={modalMode === 'create'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-250 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Account Authorization Role</label>
                  <select
                    value={role}
                    onChange={(e: any) => setRole(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-250 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all bg-white"
                  >
                    <option value="candidate">Candidate</option>
                    <option value="operator">Operator</option>
                    <option value="admin">Admin</option>
                    <option value="visitor">Visitor</option>
                    <option value="company">Company</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Phone (Optional)</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-250 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Country</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-250 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-250 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all"
                  />
                </div>

                {role === 'candidate' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Candidate Subscription Plan</label>
                      <select
                        value={pkg}
                        onChange={(e) => setPkg(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-250 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all bg-white"
                      >
                        <option value="Trial">Trial</option>
                        <option value="Premium">Premium</option>
                        <option value="Professional">Professional</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Application Limit Credits</label>
                      <input
                        type="number"
                        min="0"
                        value={appsTotal}
                        onChange={(e) => setAppsTotal(Number(e.target.value))}
                        className="w-full px-4 py-2.5 border border-gray-250 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all"
                      />
                    </div>
                  </>
                )}


                {role === 'operator' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Staffing Capacity Limit</label>
                    <input
                      type="number"
                      min="0"
                      value={capacity}
                      onChange={(e) => setCapacity(Number(e.target.value))}
                      className="w-full px-4 py-2.5 border border-gray-250 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all"
                    />
                  </div>
                )}
              </div>

              {modalMode === 'edit' && (
                <div className="mt-4">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Justification Reason (Required for Admin Approval)</label>
                  <textarea
                    required
                    value={requestReason}
                    onChange={(e) => setRequestReason(e.target.value)}
                    placeholder="Provide a reason why you need to edit this user's details..."
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-250 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all resize-none bg-white"
                  />
                </div>
              )}

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
                  {saving ? 'Saving...' : 'Save Account'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Soft Confirmation Modal */}
      {deleteConfirmOpen && userToDelete && (
        <div className="fixed inset-0 bg-gray-600/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl max-w-md w-full p-6 text-center animate-fadeIn">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
              {getIconComponent({ iconName: 'Delete', iconSize: 24, iconColor: '#DC2626' })}
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Soft Delete Account</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to deactivate <span className="font-semibold text-gray-800">{userToDelete.name}</span>? 
              This user will no longer be able to log in or operate, but their historical application data will be preserved in the system.
            </p>
            <div className="mb-6 text-left">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Reason for Deactivation Request</label>
              <input
                type="text"
                required
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                placeholder="e.g. Inactive for 6 months"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm bg-white"
              />
            </div>
            <div className="flex justify-center space-x-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setUserToDelete(null);
                }}
                className="px-5 py-2 rounded-xl text-sm font-semibold border-gray-200 text-gray-600 hover:bg-gray-55"
              >
                No, Keep
              </Button>
              <Button 
                variant="primary" 
                onClick={handleDelete}
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white border-red-600 shadow-sm"
              >
                Yes, Deactivate
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View User Full Screen (handled by early return) */}
    
    </>
  );
}
