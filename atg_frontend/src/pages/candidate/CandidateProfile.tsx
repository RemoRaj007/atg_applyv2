import React, { useState, useEffect, useRef } from 'react';
import { useSession } from '../../hooks/useSession';
import { userProfileApi } from '../../api/userProfileApi';
import { userApi } from '../../api/userApi';
import type { FullUserProfile, UserProfile, UserPhone, UserAddress, UserAcademicQualification, UserLanguage, UserDocument, UserExperience, UserReference } from '../../api/userProfileApi';
import { User, Phone, Book, Award, FileText, CheckCircle2, Upload, Trash2, ChevronRight, ChevronLeft, MapPin, Mail, Pencil, X, Download, Briefcase, Clock, Users, TrendingUp, Calendar, BarChart2, Timer, Lock, Loader2 } from 'lucide-react';
import Button from '../../components/ui/AtgButton';
import BackButton from '../../components/ui/BackButton';
import toast from 'react-hot-toast';

import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { pdf } from '@react-pdf/renderer';
import { ProfilePDF } from '../../components/pdf/ProfilePDF';
import SkillMultiSelect from '../../components/ui/SkillMultiSelect';
import { jobRoleApi, type JobRole } from '../../api/jobRoleApi';
import FormMultiSelect from '../../components/ui/FormMultiSelect';
import PhoneInput from '../../components/ui/PhoneInput';
import { getFileUrl, getFileUrlFresh } from '../../utils/fileUrl';

// ─── Experience Time Calculator Helpers ─────────────────────────────────────

/**
 * Returns total months between two dates (or today if `isCurrent`).
 */
function calcMonths(startDate: string, endDate?: string, isCurrent?: boolean): number {
  if (!startDate) return 0;
  const start = new Date(startDate);
  const end = (isCurrent || !endDate) ? new Date() : new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  return Math.max(0, months);
}

/**
 * Formats total months as "X yr Y mo" (or shorter variants).
 */
function formatDuration(totalMonths: number): string {
  if (totalMonths <= 0) return '< 1 mo';
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} yr${years > 1 ? 's' : ''}`);
  if (months > 0) parts.push(`${months} mo`);
  return parts.join(' ') || '< 1 mo';
}

interface ExperienceSummary {
  totalMonths: number;
  byRole: { exp: UserExperience; months: number }[];
  currentJobs: number;
}

function calcExperienceSummary(experiences: UserExperience[]): ExperienceSummary {
  const byRole = experiences.map(exp => ({
    exp,
    months: calcMonths(exp.startDate, exp.endDate, exp.isCurrent),
  }));
  // Deduplicate overlapping periods: simple sum (standard CV approach)
  const totalMonths = byRole.reduce((sum, r) => sum + r.months, 0);
  const currentJobs = experiences.filter(e => e.isCurrent).length;
  return { totalMonths, byRole, currentJobs };
}

// ─── Experience Summary Card Component ──────────────────────────────────────

function ExperienceSummaryCard({ experiences }: { experiences: UserExperience[] }) {
  if (experiences.length === 0) return null;

  const summary = calcExperienceSummary(experiences);
  const maxMonths = Math.max(...summary.byRole.map(r => r.months), 1);

  const roleColors = [
    '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
    '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-white mb-6 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5 relative">
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
          <Timer className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-blue-200">Experience Calculator</p>
          <p className="text-sm font-semibold text-white/90">Auto-calculated from your entries</p>
        </div>
      </div>

      {/* Total Banner */}
      <div className="bg-white/15 backdrop-blur-sm rounded-xl p-5 mb-5 border border-white/20 relative">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-blue-200 font-semibold uppercase tracking-wider mb-1">Total Experience</p>
            <p className="text-4xl font-black text-white leading-none">
              {formatDuration(summary.totalMonths)}
            </p>
            <p className="text-sm text-blue-200 mt-1">
              across {experiences.length} role{experiences.length > 1 ? 's' : ''}
              {summary.currentJobs > 0 && <span className="ml-2 bg-green-400/30 text-green-200 text-xs font-semibold px-2 py-0.5 rounded-full border border-green-400/40">{summary.currentJobs} current</span>}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-white/80">{Math.floor(summary.totalMonths / 12)}</div>
            <div className="text-xs text-blue-200 font-semibold">years</div>
            <div className="text-2xl font-bold text-white/60 mt-1">{summary.totalMonths % 12}</div>
            <div className="text-xs text-blue-200 font-semibold">months</div>
          </div>
        </div>
      </div>

      {/* Per-Role Breakdown */}
      <div className="relative">
        <p className="text-xs font-bold text-blue-200 uppercase tracking-wider mb-3 flex items-center gap-2">
          <BarChart2 className="w-3.5 h-3.5" /> Role Breakdown
        </p>
        <div className="space-y-3">
          {summary.byRole.map((row, idx) => {
            const pct = maxMonths > 0 ? Math.max(4, Math.round((row.months / maxMonths) * 100)) : 4;
            const color = roleColors[idx % roleColors.length];
            return (
              <div key={row.exp.id}>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-xs font-semibold text-white truncate">{row.exp.jobTitle}</span>
                    {row.exp.isCurrent && (
                      <span className="shrink-0 text-[10px] font-bold bg-green-400/25 text-green-200 px-1.5 py-0.5 rounded-full border border-green-400/30">NOW</span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-blue-200 shrink-0 ml-2">{formatDuration(row.months)}</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.85 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-3 mt-5 border-t border-white/15 pt-5">
        <div className="text-center">
          <p className="text-2xl font-black text-white">{experiences.length}</p>
          <p className="text-[10px] text-blue-200 uppercase font-bold">Roles</p>
        </div>
        <div className="text-center border-x border-white/15">
          <p className="text-2xl font-black text-white">{Math.floor(summary.totalMonths / 12)}</p>
          <p className="text-[10px] text-blue-200 uppercase font-bold">Years</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-black text-white">{summary.totalMonths % 12}</p>
          <p className="text-[10px] text-blue-200 uppercase font-bold">Months</p>
        </div>
      </div>
    </div>
  );
}

// ─── Duration Badge helper ────────────────────────────────────────────────────
function DurationBadge({ startDate, endDate, isCurrent }: { startDate: string; endDate?: string; isCurrent: boolean }) {
  const months = calcMonths(startDate, endDate, isCurrent);
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${
      isCurrent
        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
        : 'bg-indigo-950/60 text-indigo-300 border-indigo-800/60'
    }`}>
      <Clock className="w-3 h-3" />
      {formatDuration(months)}
    </span>
  );
}

// --- Subcomponents ---

const InputField = ({ label, value, onChange, type = "text", required = false }: any) => (
  <div className="flex flex-col">
    <label className="text-sm font-semibold text-slate-300 mb-1">{label} {required && <span className="text-rose-400">*</span>}</label>
    <input 
      type={type} 
      className="border border-slate-700/80 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm bg-slate-800/70 text-white placeholder-slate-500"
      value={value || ''} 
      onChange={onChange}
    />
  </div>
);

const SelectField = ({ label, value, onChange, options, required = false }: any) => (
  <div className="flex flex-col">
    <label className="text-sm font-semibold text-slate-300 mb-1">{label} {required && <span className="text-rose-400">*</span>}</label>
    <select 
      className="border border-slate-700/80 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm bg-slate-800/70 text-white"
      value={value || ''} 
      onChange={onChange}
    >
      <option value="" className="bg-slate-900 text-slate-400">Select...</option>
      {options.map((o: any) => {
        const val = typeof o === 'string' ? o : o.value;
        const disp = typeof o === 'string' ? o : (o.native && o.native !== o.label ? `${o.native} (${o.label})` : o.label);
        return <option key={val} value={val} className="bg-slate-900 text-white">{disp}</option>;
      })}
    </select>
  </div>
);

const ToggleSwitch = ({ label, checked, onChange }: any) => (
  <div className="flex items-center justify-between border border-slate-700/80 rounded-lg p-4 shadow-sm bg-slate-800/80 text-white">
    <span className="text-sm text-slate-200 font-medium">{label}</span>
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" className="sr-only peer" checked={checked} onChange={onChange} />
      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-400 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
    </label>
  </div>
);

export default function CandidateProfile() {
  const { user, setUser } = useSession();
  
  const [profileData, setProfileData] = useState<FullUserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Password Modal states
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isOldPasswordVerified, setIsOldPasswordVerified] = useState(false);
  const [verifyingOldPassword, setVerifyingOldPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const handleVerifyOldPassword = async () => {
    if (!oldPassword.trim()) {
      toast.error('Please enter your current password');
      return;
    }

    setVerifyingOldPassword(true);
    try {
      const isValid = await userApi.verifyPassword(oldPassword);
      if (isValid) {
        setIsOldPasswordVerified(true);
        toast.success('Current password verified. You can now enter a new password.');
      } else {
        toast.error('Incorrect current password');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to verify current password');
    } finally {
      setVerifyingOldPassword(false);
    }
  };

  const handleChangePassword = async () => {
    if (!isOldPasswordVerified) {
      toast.error('Please verify your current password first');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setUpdatingPassword(true);
    try {
      await userApi.changePassword({ oldPassword, newPassword });
      toast.success('Password updated successfully');
      closePasswordModal();
    } catch (err: any) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const closePasswordModal = () => {
    setIsPasswordModalOpen(false);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setIsOldPasswordVerified(false);
  };
  const [dbJobRoles, setDbJobRoles] = useState<JobRole[]>([]);
  const [selectedJobRoles, setSelectedJobRoles] = useState<number[]>([]);

  // Document Upload State
  const [otherDocType, setOtherDocType] = useState('');
  const [viewDoc, setViewDoc] = useState<UserDocument | null>(null);
  
  // PDF Export State
  const resumeRef = useRef<HTMLDivElement>(null);

  const requiredDocs = [
    { id: 'NIC', label: 'National Identity Card (NIC)' },
    { id: 'Passport', label: 'Passport' },
    { id: 'Certificates', label: 'Academic Certificates' },
  ];

  // Wizard State
  const steps = [
    { id: 'personal', label: 'Personal Information', icon: User },
    { id: 'contact', label: 'Contact Details', icon: Phone },
    { id: 'education', label: 'Education & Languages', icon: Book },
    { id: 'jobroles', label: 'Job Roles', icon: Briefcase },
    { id: 'skills', label: 'Skills & Qualifications', icon: Award },
    { id: 'experiences', label: 'Experiences', icon: Clock },
    { id: 'references', label: 'References', icon: Users },
    { id: 'documents', label: 'Documents', icon: FileText }
  ];
  
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  const fetchProfile = async () => {
    if (user) {
      try {
        const data = await userProfileApi.getProfile(user.id);
        setProfileData(data);
        if (data.userJobRoles) {
          setSelectedJobRoles(data.userJobRoles.map(jr => jr.jobRoleId));
        }
      } catch (e) {
        console.error("Failed to fetch profile", e);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchJobRoles();
  }, [user]);

  const fetchJobRoles = async () => {
    try {
      const res = await jobRoleApi.list();
      setDbJobRoles(res.jobRoles.filter(r => r.status === 'active'));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveJobRoles = async () => {
    try {
      await userProfileApi.updateJobRoles(selectedJobRoles);
      toast.success('Job Roles saved');
      fetchProfile();
    } catch (e) {
      toast.error('Failed to save Job Roles');
    }
  };

  if (!user || loading) return <div className="p-8 text-center text-gray-500 min-h-screen flex items-center justify-center">Loading Profile Dashboard...</div>;

  const currentStep = steps[currentStepIdx];

  const handlePersonalChange = (field: keyof UserProfile, value: any) => {
    setProfileData(prev => prev ? {
      ...prev,
      profile: { ...(prev.profile || {}), [field]: value }
    } : null);
  };

  const savePersonal = async () => {
    if (profileData?.profile) {
      await userProfileApi.updatePersonal(profileData.profile);
    }
  };

  const deleteDocument = async (id: number) => {
    const isProfilePic = profileData?.documents?.find(d => d.id === id)?.docType === 'Profile Picture';
    await userProfileApi.deleteDocument(id);
    if (isProfilePic && user) {
      setUser({ ...user, profilePhoto: undefined });
    }
    fetchProfile();
  };

  const uploadDoc = async (type: string, file: File | null) => {
    if (!file) return;
    const res = await userProfileApi.uploadDocument(type, file);
    if (type === 'Profile Picture' && res?.document?.fileUrl && user) {
      setUser({ ...user, profilePhoto: res.document.fileUrl });
    }
    fetchProfile();
  };


  const submitProfile = () => {
    if (completeness < 100) {
      toast.error("Please complete your profile to 100% before submitting. Ensure you have added personal details, contact info, education, skills, and documents.");
    } else {
      toast.success("Profile submitted successfully! Your application is now ready for review.");
    }
  };

  const downloadPDF = async () => {
    toast.loading('Generating ZIP Export...', { id: 'zip-toast' });
    if (!profileData) {
      toast.error('Profile data not ready', { id: 'zip-toast' });
      return;
    }
    
    try {
      const pdfBlob = await pdf(<ProfilePDF profileData={profileData} />).toBlob();
      
      const zip = new JSZip();
      zip.file(`${profileData?.profile?.firstName || 'Candidate'}_Profile.pdf`, pdfBlob);
      
      if (profileData?.documents) {
        for (const doc of profileData.documents) {
          try {
            const response = await fetch(getFileUrlFresh(doc.fileUrl));
            const blob = await response.blob();
            const ext = doc.fileUrl.split('.').pop();
            const safeName = doc.docType.replace(/[^a-z0-9]/gi, '_');
            zip.file(`documents/${safeName}.${ext}`, blob);
          } catch (e) {
            console.error('Failed to fetch doc', doc.docType);
          }
        }
      }
      
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, `${profileData?.profile?.firstName || 'Candidate'}_Profile_Export.zip`);
      
      toast.success('Export downloaded successfully!', { id: 'zip-toast' });
    } catch (err: any) {
      console.error('PDF Export Error:', err);
      toast.error(`Failed to export: ${err.message || 'Unknown error'}`, { id: 'zip-toast' });
    }
  };

  const calculateCompleteness = () => {
    if (!profileData) return 0;
    let score = 0;
    let total = 7;
    if (profileData.profile?.firstName) score++;
    if (profileData.phones && profileData.phones.length > 0) score++;
    if (profileData.academicQualifications && profileData.academicQualifications.length > 0) score++;
    if ((profileData.itSkills && profileData.itSkills.length > 0) || (profileData.otherQualifications && profileData.otherQualifications.length > 0)) score++;
    if (profileData.documents && profileData.documents.length > 0) score++;
    if (profileData.experiences && profileData.experiences.length > 0) score++;
    if (profileData.references && profileData.references.length > 0) score++;
    return Math.round((score / total) * 100);
  };

  const completeness = calculateCompleteness();

  return (
    <div className="bg-slate-950 min-h-screen w-full flex flex-col text-slate-100">
      
      {/* Top Navigation / Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-8 py-5 flex justify-between items-center sticky top-0 z-30">
        <div className="flex items-center gap-5">
          <BackButton label="Back to Dashboard" to="/candidate" />
          <div>
            <h1 className="text-2xl font-serif font-extrabold text-white">Candidate Profile Creator</h1>
            <p className="text-sm text-slate-400 mt-1">Build your comprehensive profile to stand out to employers.</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Profile Strength</p>
            <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${completeness}%` }}></div>
            </div>
          </div>
          <Button onClick={() => setIsPasswordModalOpen(true)} variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800 shadow-sm">
            <Lock className="w-4 h-4 mr-2 inline" /> Change Password
          </Button>
          <Button onClick={() => { savePersonal(); toast.success('Progress saved'); }} variant="primary" className="bg-blue-600 hover:bg-blue-500 shadow-sm">Save Progress</Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT PANE: Wizard Legends / Steps */}
        <div className="w-64 bg-slate-900 border-r border-slate-800 hidden md:block overflow-y-auto">
          <div className="p-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Steps Legend</h3>
            <ul className="space-y-2">
              {steps.map((step, idx) => {
                const isActive = idx === currentStepIdx;
                const Icon = step.icon;
                return (
                  <li key={step.id}>
                    <button
                      onClick={() => setCurrentStepIdx(idx)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-semibold cursor-pointer ${
                        isActive 
                          ? 'bg-blue-950/80 text-blue-300 shadow-sm border border-blue-800/60' 
                          : 'text-slate-400 hover:bg-slate-800/60 hover:text-white border border-transparent'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                      {step.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* MIDDLE PANE: Active Form Editor */}
        <div className="flex-1 overflow-y-auto bg-slate-950 p-6 lg:p-10">
          <div className="max-w-2xl mx-auto">
            
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                {React.createElement(currentStep.icon, { className: "w-6 h-6 text-blue-400" })}
                {currentStep.label}
              </h2>
              <p className="text-slate-400 text-sm mt-1">Please provide accurate information for your profile.</p>
            </div>

            {/* Step 1: Personal */}
            {currentStep.id === 'personal' && (
              <div className="space-y-6 bg-slate-800/80 p-8 rounded-2xl border border-slate-700/60 shadow-xl animate-fadeIn backdrop-blur-sm">
                <div className="flex flex-col items-center mb-6">
                  <div className="relative w-28 h-28 rounded-full bg-gray-50 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden mb-3 group cursor-pointer hover:border-blue-400 transition-colors">
                    {profileData?.documents?.find(d => d.docType === 'Profile Picture') ? (
                      <img src={getFileUrl(profileData.documents.find(d => d.docType === 'Profile Picture')?.fileUrl)} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-gray-400 group-hover:text-blue-500 transition-colors" />
                    )}
                    <input type="file" id="upload-profile-pic" className="hidden" accept="image/*" onChange={(e) => {
                      uploadDoc('Profile Picture', e.target.files?.[0] || null);
                    }} />
                    <label htmlFor="upload-profile-pic" className="absolute inset-0 cursor-pointer bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      {!profileData?.documents?.find(d => d.docType === 'Profile Picture') && <span className="text-[10px] font-bold text-gray-500 uppercase mt-12">Upload</span>}
                    </label>
                  </div>
                  {profileData?.documents?.find(d => d.docType === 'Profile Picture') && (
                    <button onClick={(e) => { e.preventDefault(); deleteDocument(profileData.documents.find(d => d.docType === 'Profile Picture')!.id); }} className="text-xs text-red-500 font-semibold hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-full transition-colors">Remove Photo</button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputField label="First Name" required value={profileData?.profile?.firstName} onChange={(e: any) => handlePersonalChange('firstName', e.target.value)} />
                  <InputField label="Last Name" required value={profileData?.profile?.lastName} onChange={(e: any) => handlePersonalChange('lastName', e.target.value)} />
                  <SelectField label="Gender" required options={['Male', 'Female', 'Other']} value={profileData?.profile?.gender} onChange={(e: any) => handlePersonalChange('gender', e.target.value)} />
                  <InputField label="Date of Birth" required type="date" value={profileData?.profile?.dob?.substring(0,10)} onChange={(e: any) => handlePersonalChange('dob', new Date(e.target.value).toISOString())} />
                  <SelectField label="Nationality at Birth" required options={['Sri Lanka', 'USA', 'UK', 'India', 'Canada']} value={profileData?.profile?.nationalityAtBirth} onChange={(e: any) => handlePersonalChange('nationalityAtBirth', e.target.value)} />
                  <SelectField label="Current Nationality" required options={['Sri Lanka', 'USA', 'UK', 'India', 'Canada']} value={profileData?.profile?.currentNationality} onChange={(e: any) => handlePersonalChange('currentNationality', e.target.value)} />
                  <SelectField label="Marital Status" options={['Single', 'Married']} value={profileData?.profile?.maritalStatus} onChange={(e: any) => handlePersonalChange('maritalStatus', e.target.value)} />
                  <SelectField
                    label="Correspondence Language"
                    required
                    options={[
                      { value: 'English', label: 'English', native: 'English' },
                      { value: 'Arabic', label: 'Arabic', native: 'العربية' },
                      { value: 'Chinese (Mandarin)', label: 'Chinese (Mandarin)', native: '中文' },
                      { value: 'French', label: 'French', native: 'Français' },
                      { value: 'Russian', label: 'Russian', native: 'Русский' },
                      { value: 'Spanish', label: 'Spanish', native: 'Español' },
                      { value: 'Tamil', label: 'Tamil', native: 'தமிழ்' },
                      { value: 'Sinhala', label: 'Sinhala', native: 'සිංහල' },
                    ]}
                    value={profileData?.profile?.correspondenceLanguage}
                    onChange={(e: any) => handlePersonalChange('correspondenceLanguage', e.target.value)}
                  />
                </div>
                {/* The National Identity Card field that used to sit here is
                    gone. It wrote the identity number into `legalResidency`, so
                    the master profile really was storing national-ID numbers —
                    which the privacy rules forbid outright. Legal residency is
                    a country/status, and that is all this asks for now. If a
                    named application ever needs identity evidence, it is
                    requested just in time, for that application, with the
                    candidate's approval. */}
                <div className="pt-4 border-t border-[#D2D2D7]">
                  <InputField
                    label="Legal residency status"
                    value={profileData?.profile?.legalResidency}
                    onChange={(e: any) => handlePersonalChange('legalResidency', e.target.value)}
                  />
                </div>
                <div className="pt-4 border-t space-y-4">
                  <ToggleSwitch label="Do you consider yourself a person with a disability?" checked={profileData?.profile?.disability || false} onChange={(e: any) => handlePersonalChange('disability', e.target.checked)} />
                </div>
              </div>
            )}

            {/* Step 2: Contact */}
            {currentStep.id === 'contact' && (
              <div className="space-y-8 animate-fadeIn">
                <EntityListSection 
                  title="Phone Numbers" 
                  entities={profileData?.phones || []} 
                  entityType="phones"
                  fetchProfile={fetchProfile}
                  renderItem={(phone: UserPhone) => (
                    <div>
                      <p className="font-semibold text-gray-800">{phone.phoneNumber}</p>
                      <p className="text-xs text-gray-500 uppercase">{phone.phoneType}</p>
                    </div>
                  )}
                  emptyText="No phones added."
                  formFields={[
                    { name: 'phoneType', label: 'Type (e.g. Mobile)', type: 'text' },
                    { name: 'phoneNumber', label: 'Phone Number (with Country Code)', type: 'phone' }
                  ]}
                />
                <EntityListSection 
                  title="Addresses" 
                  entities={profileData?.addresses || []} 
                  entityType="addresses"
                  fetchProfile={fetchProfile}
                  renderItem={(address: UserAddress) => (
                    <div>
                      <p className="font-semibold text-gray-800">{address.address}</p>
                      <p className="text-sm text-gray-600">{address.city}, {address.state}, {address.country} ({address.postalCode})</p>
                    </div>
                  )}
                  emptyText="No addresses added."
                  formFields={[
                    { name: 'address', label: 'Address Line 1', type: 'text' },
                    { name: 'city', label: 'City', type: 'text' },
                    { name: 'postalCode', label: 'Postal Code', type: 'text' },
                    { name: 'state', label: 'State/Province', type: 'text' },
                    { name: 'country', label: 'Country', type: 'text' }
                  ]}
                />
              </div>
            )}

            {/* Step 3: Education */}
            {currentStep.id === 'education' && (
              <div className="space-y-8 animate-fadeIn">
                <EntityListSection 
                  title="Academic Qualifications" 
                  entities={profileData?.academicQualifications || []} 
                  entityType="academic"
                  fetchProfile={fetchProfile}
                  renderItem={(aq: UserAcademicQualification) => (
                    <div>
                      <p className="font-bold text-gray-800">{aq.degreeLevel} in {aq.mainField}</p>
                      <p className="text-sm text-gray-600">{aq.university} • {aq.fromDate?.substring(0,4)} - {aq.toDate?.substring(0,4)}</p>
                    </div>
                  )}
                  emptyText="No academic qualifications added."
                  formFields={[
                    { name: 'degreeLevel', label: 'Degree Level (e.g. BSc)', type: 'text' },
                    { name: 'mainField', label: 'Main Field of Study', type: 'text' },
                    { name: 'university', label: 'University / Institution', type: 'text' },
                    { name: 'diplomaObtained', label: 'Diploma Obtained? (Yes/No)', type: 'text' },
                    { name: 'fromDate', label: 'Start Date', type: 'date' },
                    { name: 'toDate', label: 'End Date', type: 'date' }
                  ]}
                />
                <EntityListSection 
                  title="Languages" 
                  entities={profileData?.languages || []} 
                  entityType="languages"
                  fetchProfile={fetchProfile}
                  renderItem={(l: UserLanguage) => (
                    <div className="flex justify-between items-center w-full">
                      <p className="font-bold text-gray-800">{l.language}</p>
                      <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{l.level}</span>
                    </div>
                  )}
                  emptyText="No languages added."
                  formFields={[
                    { name: 'language', label: 'Language', type: 'text' },
                    { name: 'level', label: 'Proficiency Level', type: 'text' }
                  ]}
                />
              </div>
            )}

            {/* Step 3.5: Job Roles */}
            {currentStep.id === 'jobroles' && (
              <div className="space-y-6 bg-white p-8 rounded-2xl border shadow-sm animate-fadeIn">
                <h3 className="text-lg font-bold text-gray-800 mb-2">Job Roles</h3>
                <p className="text-sm text-gray-500 mb-6">Select the job roles you are seeking.</p>
                <div className="w-full">
                  <FormMultiSelect
                    label="Seeking Job Roles"
                    options={dbJobRoles.map(r => r.name)}
                    values={selectedJobRoles.map(id => dbJobRoles.find(r => r.id === id)?.name).filter(Boolean) as string[]}
                    onChange={(names: string[]) => {
                      const ids = names.map((n: string) => dbJobRoles.find(r => r.name === n)?.id).filter(Boolean) as number[];
                      setSelectedJobRoles(ids);
                    }}
                    onCustomAdd={async (newRole: string) => {
                      // Optionally, let candidate create pending job roles. For now just show error or let operator approve.
                      try {
                        const res = await jobRoleApi.create({ name: newRole });
                        setDbJobRoles([...dbJobRoles, res.jobRole]);
                        setSelectedJobRoles([...selectedJobRoles, res.jobRole.id]);
                        toast.success(`Job role added to pending list`);
                      } catch (e) {
                        toast.error('Failed to add job role');
                      }
                    }}
                  />
                </div>
                <div className="flex justify-end pt-4 border-t mt-6">
                  <Button onClick={handleSaveJobRoles} variant="primary">Save Job Roles</Button>
                </div>
              </div>
            )}

            {/* Step 4: Skills */}
            {currentStep.id === 'skills' && (
              <div className="space-y-8 animate-fadeIn">
                <SkillMultiSelect 
                  userSkills={profileData?.itSkills || []}
                  onUpdate={fetchProfile}
                />
                <SkillMultiSelect 
                  title="Other Qualifications"
                  entityType="other"
                  category="other"
                  userSkills={profileData?.otherQualifications || []}
                  onUpdate={fetchProfile}
                />
              </div>
            )}

            {/* Step 5: Experiences */}
            {currentStep.id === 'experiences' && (
              <div className="space-y-6 animate-fadeIn">

                {/* ── Experience Time Calculator Summary Card ── */}
                <ExperienceSummaryCard experiences={profileData?.experiences || []} />

                <EntityListSection 
                  title="Work Experiences" 
                  entities={profileData?.experiences || []} 
                  entityType="experiences"
                  fetchProfile={fetchProfile}
                  renderItem={(exp: UserExperience) => (
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="font-bold text-gray-800">{exp.jobTitle}</p>
                        <DurationBadge startDate={exp.startDate} endDate={exp.endDate} isCurrent={exp.isCurrent} />
                      </div>
                      <p className="text-sm text-gray-600">{exp.employer}{exp.location ? ` • ${exp.location}` : ''}</p>
                      <p className="text-xs text-gray-400 mt-1 flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {exp.startDate?.substring(0,10)} — {exp.isCurrent ? <span className="text-green-600 font-semibold">Present</span> : exp.endDate?.substring(0,10)}
                        </span>
                        {exp.employmentType && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold">{exp.employmentType}</span>}
                      </p>
                      {exp.responsibilities && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{exp.responsibilities}</p>}
                    </div>
                  )}
                  emptyText="No work experience added yet."
                  formFields={[
                    { name: 'jobTitle', label: 'Job Title / Position', type: 'text' },
                    { name: 'employer', label: 'Employer / Company', type: 'text' },
                    { name: 'location', label: 'Location (City, Country)', type: 'text' },
                    { name: 'employmentType', label: 'Employment Type (Full-time / Part-time / Contract)', type: 'text' },
                    { name: 'startDate', label: 'Start Date', type: 'date' },
                    { name: 'isCurrent', label: 'I currently work here', type: 'checkbox' },
                    { name: 'endDate', label: 'End Date (leave blank if current)', type: 'date' },
                    { name: 'responsibilities', label: 'Key Responsibilities', type: 'textarea' },
                    { name: 'achievements', label: 'Key Achievements', type: 'textarea' },
                  ]}
                />
              </div>
            )}

            {/* Step 6: References */}
            {currentStep.id === 'references' && (
              <div className="space-y-8 animate-fadeIn">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                  <span className="text-amber-600 text-sm">⚠️</span>
                  <p className="text-sm text-amber-800">Only add references with their prior consent. Their contact details will be shared with potential employers.</p>
                </div>
                <EntityListSection 
                  title="Professional References" 
                  entities={profileData?.references || []} 
                  entityType="references"
                  fetchProfile={fetchProfile}
                  renderItem={(ref: UserReference) => (
                    <div>
                      <p className="font-bold text-gray-800">{ref.refName}</p>
                      <p className="text-sm text-gray-600">{ref.position}{ref.organization ? ` at ${ref.organization}` : ''}</p>
                      <p className="text-xs text-gray-500">{ref.relationship}</p>
                      <div className="flex gap-4 mt-1 text-xs text-gray-400">
                        {ref.email && <span>✉ {ref.email}</span>}
                        {ref.phone && <span>📞 {ref.phone}</span>}
                      </div>
                    </div>
                  )}
                  emptyText="No references added yet."
                  formFields={[
                    { name: 'refName', label: 'Full Name', type: 'text' },
                    { name: 'relationship', label: 'Relationship (e.g., Manager, Professor)', type: 'text' },
                    { name: 'position', label: 'Their Job Title', type: 'text' },
                    { name: 'organization', label: 'Organization / Company', type: 'text' },
                    { name: 'email', label: 'Email Address', type: 'email' },
                    { name: 'phone', label: 'Phone Number', type: 'text' },
                  ]}
                />
              </div>
            )}

            {/* Step 7: Documents */}
            {currentStep.id === 'documents' && (
              <div className="space-y-8 animate-fadeIn">
                <section className="bg-white p-8 rounded-2xl shadow-sm border">
                  <h3 className="text-lg font-bold mb-4">Upload Documents</h3>
                  <p className="text-sm text-gray-500 mb-6">Upload your specific required documents below.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {requiredDocs.map(docReq => {
                      const existing = profileData?.documents?.find(d => d.docType === docReq.id);
                      return (
                        <div key={docReq.id} className="border rounded-xl p-5 bg-gray-50/50 flex flex-col">
                          <h4 className="font-bold text-gray-800 mb-3 text-sm">{docReq.label}</h4>
                          {existing ? (
                            <div className="flex justify-between items-center p-3 border rounded-xl bg-white shadow-sm cursor-pointer hover:border-blue-300 transition-all flex-1" onClick={() => setViewDoc(existing)}>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                  <FileText className="w-5 h-5" />
                                </div>
                                <div className="overflow-hidden">
                                  <p className="text-sm font-semibold text-gray-800 truncate" title={existing.docType}>{existing.docType}</p>
                                  <p className="text-xs text-gray-500">{(existing.fileSize / 1024).toFixed(2)} KB</p>
                                </div>
                              </div>
                              <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); deleteDocument(existing.id); }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-2 shrink-0">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-white transition-colors flex-1 flex flex-col justify-center">
                              <input type="file" id={`upload-${docReq.id}`} className="hidden" onChange={(e) => { uploadDoc(docReq.id, e.target.files?.[0] || null); toast.success(`${docReq.id} uploaded`); }} />
                              <label htmlFor={`upload-${docReq.id}`} className="cursor-pointer flex flex-col items-center">
                                <Upload className="w-6 h-6 text-gray-400 mb-2" />
                                <span className="font-semibold text-blue-600 hover:text-blue-800 text-sm">Upload {docReq.id}</span>
                                <span className="text-xs text-gray-500 mt-1">PDF, JPG (Max 5MB)</span>
                              </label>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Other Documents Section */}
                  <div className="border rounded-xl p-6 bg-gray-50/50 mt-8">
                    <h4 className="font-bold text-gray-800 mb-2">Other Relevant Documents</h4>
                    <p className="text-xs text-gray-500 mb-4">Upload any other documents like CV/Resume, recommendation letters, etc.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <InputField label="Specify Document Name" value={otherDocType} onChange={(e: any) => setOtherDocType(e.target.value)} />
                    </div>
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-white transition-colors">
                      <input type="file" id="upload-other" className="hidden" onChange={(e) => {
                        if(!otherDocType.trim()) { toast.error("Please specify a document name first"); return; }
                        uploadDoc(otherDocType, e.target.files?.[0] || null);
                        setOtherDocType('');
                        toast.success('Document uploaded');
                      }} />
                      <label htmlFor="upload-other" className="cursor-pointer flex flex-col items-center">
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="font-semibold text-blue-600 hover:text-blue-800 text-sm">Upload Document</span>
                      </label>
                    </div>

                    {profileData?.documents?.filter(d => !requiredDocs.some(req => req.id === d.docType)).length! > 0 && (
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {profileData?.documents?.filter(d => !requiredDocs.some(req => req.id === d.docType)).map(doc => (
                          <div key={doc.id} className="flex justify-between items-center p-3 border rounded-xl bg-white shadow-sm cursor-pointer hover:border-blue-300 transition-all" onClick={() => setViewDoc(doc)}>
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="overflow-hidden">
                                <p className="text-sm font-semibold text-gray-800 truncate" title={doc.docType}>{doc.docType}</p>
                                <p className="text-xs text-gray-500">{(doc.fileSize / 1024).toFixed(2)} KB</p>
                              </div>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); deleteDocument(doc.id); }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              </div>
            )}

            {/* Wizard Navigation Buttons */}
            <div className="flex justify-between mt-10 pt-6 border-t border-gray-200">
              <Button 
                variant="outline" 
                onClick={() => setCurrentStepIdx(Math.max(0, currentStepIdx - 1))}
                disabled={currentStepIdx === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-2" /> Previous Step
              </Button>
              {currentStepIdx === steps.length - 1 ? (
                <Button variant="primary" onClick={submitProfile}>
                  Submit Final Profile <CheckCircle2 className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  variant="primary" 
                  onClick={() => {
                    savePersonal();
                    setCurrentStepIdx(currentStepIdx + 1);
                  }}
                >
                  Save & Continue <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>

          </div>
        </div>

        {/* RIGHT PANE: Live Preview (Resume Style) */}
        <div className="w-[400px] xl:w-[480px] bg-slate-900 text-slate-100 border-l border-slate-800 hidden lg:flex flex-col relative">
          <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Live Preview
            </h3>
            <Button variant="outline" className="text-slate-300 border-slate-700 hover:bg-slate-800 text-xs py-1.5" onClick={downloadPDF}>
              <Download className="w-3.5 h-3.5 mr-2" /> Export Profile ZIP
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 relative">
            {/* The Resume Card */}
            <div ref={resumeRef} className="rounded-2xl shadow-2xl p-8 min-h-[600px] bg-slate-900 border border-slate-800 text-slate-100 transform transition-all duration-300">
              
              {/* Header */}
              <div className="border-b border-slate-800 pb-6 mb-6 flex gap-6 items-center">
                {profileData?.documents?.find(d => d.docType === 'Profile Picture') && (
                  <div className="w-24 h-24 rounded-full overflow-hidden shrink-0 border-2 border-slate-700">
                    <img src={getFileUrlFresh(profileData.documents.find(d => d.docType === 'Profile Picture')?.fileUrl)} alt="Profile" className="w-full h-full object-cover" crossOrigin="anonymous" />
                  </div>
                )}
                <div>
                  <h1 className="text-3xl font-extrabold capitalize break-all text-slate-100">
                    {profileData?.profile?.firstName || 'Firstname'} {profileData?.profile?.lastName || 'Lastname'}
                  </h1>
                <div className="flex flex-wrap gap-y-2 gap-x-4 mt-3 text-xs font-semibold text-slate-400">
                  {profileData?.profile?.currentNationality && (
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {profileData.profile.currentNationality}</span>
                  )}
                  {profileData?.phones && profileData.phones[0] && (
                    <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {profileData.phones[0].phoneNumber}</span>
                  )}
                  <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {profileData?.email}</span>
                </div>
              </div>
            </div>

            {/* Dynamic Content based on filled fields */}
              
              {/* Personal Details */}
              <div className="mb-6 grid grid-cols-2 gap-4 text-xs text-slate-300">
                {profileData?.profile?.dob && <div><span className="font-bold text-slate-100">Date of Birth:</span> {profileData.profile.dob.split('T')[0]}</div>}
                {profileData?.profile?.gender && <div><span className="font-bold text-slate-100">Gender:</span> {profileData.profile.gender}</div>}
                {profileData?.profile?.maritalStatus && <div><span className="font-bold text-slate-100">Marital Status:</span> {profileData.profile.maritalStatus}</div>}
                {profileData?.profile?.nationalityAtBirth && <div><span className="font-bold text-slate-100">Nationality at Birth:</span> {profileData.profile.nationalityAtBirth}</div>}
                {profileData?.profile?.legalResidency && <div><span className="font-bold text-slate-100">Legal Residency:</span> {profileData.profile.legalResidency}</div>}
              </div>

              {/* Addresses */}
              {profileData?.addresses && profileData.addresses.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-sm font-bold uppercase tracking-widest mb-2 flex items-center gap-2 text-blue-400">
                    <MapPin className="w-4 h-4" /> Addresses
                  </h2>
                  <div className="space-y-2 text-xs text-slate-400">
                    {profileData.addresses.map(addr => (
                      <div key={addr.id}>
                        {addr.address}{addr.address2 ? `, ${addr.address2}` : ''}, {addr.city}, {addr.state}, {addr.postalCode}, {addr.country}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {profileData?.academicQualifications && profileData.academicQualifications.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-sm font-bold uppercase tracking-widest mb-3 flex items-center gap-2 text-blue-400">
                    <Book className="w-4 h-4" /> Education
                  </h2>
                  <div className="space-y-4">
                    {profileData.academicQualifications.map(aq => (
                      <div key={aq.id}>
                        <h3 className="font-bold text-sm text-slate-100">{aq.degreeLevel} in {aq.mainField}</h3>
                        <p className="text-xs mt-0.5 text-slate-400">{aq.university} ({aq.fromDate?.substring(0,4)} - {aq.toDate?.substring(0,4)})</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Job Roles */}
              {profileData?.userJobRoles && profileData.userJobRoles.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-sm font-bold uppercase tracking-widest mb-3 flex items-center gap-2 text-blue-400">
                    <Briefcase className="w-4 h-4" /> Seeking Job Roles
                  </h2>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {profileData.userJobRoles.map(jr => (
                      <span key={jr.id} className="font-semibold bg-slate-800 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-full">
                        {jr.jobRole?.name || 'Unknown'}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Languages */}
              {profileData?.languages && profileData.languages.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-sm font-bold uppercase tracking-widest mb-3 flex items-center gap-2 text-blue-400">
                    <Book className="w-4 h-4" /> Languages
                  </h2>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                    {profileData.languages.map(lang => (
                      <div key={lang.id}><span className="font-bold text-slate-100">{lang.language}:</span> {lang.level}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skills */}
              {profileData?.itSkills && profileData.itSkills.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-sm font-bold uppercase tracking-widest mb-3 flex items-center gap-2 text-blue-400">
                    <Award className="w-4 h-4" /> Skills & Qualifications
                  </h2>
                  <ul className="list-disc list-inside text-xs space-y-1 text-slate-300">
                    {profileData.itSkills.map(s => <li key={s.id}>{s.description}</li>)}
                  </ul>
                </div>
              )}

              {/* Other Qualifications */}
              {profileData?.otherQualifications && profileData.otherQualifications.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-sm font-bold uppercase tracking-widest mb-3 flex items-center gap-2 text-blue-400">
                    <Award className="w-4 h-4" /> Other Qualifications
                  </h2>
                  <ul className="list-disc list-inside text-xs space-y-1 text-slate-300">
                    {profileData.otherQualifications.map(oq => <li key={oq.id}>{oq.description}</li>)}
                  </ul>
                </div>
              )}

              {/* Experiences — with total experience badge */}
              {profileData?.experiences && profileData.experiences.length > 0 && (() => {
                const expSummary = calcExperienceSummary(profileData.experiences);
                return (
                  <div className="mb-6">
                    <h2 className="text-sm font-bold uppercase tracking-widest mb-2 flex items-center gap-2 text-blue-400">
                      <Clock className="w-4 h-4" /> Work Experience
                    </h2>
                    {/* Total Experience Badge in preview */}
                    <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-blue-950/50 border border-blue-800/60">
                      <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-xs font-bold text-blue-300">Total Experience:</span>
                      <span className="text-xs font-black text-blue-200">{formatDuration(expSummary.totalMonths)}</span>
                      <span className="text-xs text-slate-400">across {profileData.experiences.length} role{profileData.experiences.length > 1 ? 's' : ''}</span>
                    </div>
                    <div className="space-y-4">
                      {profileData.experiences.map(exp => {
                        const months = calcMonths(exp.startDate, exp.endDate, exp.isCurrent);
                        return (
                          <div key={exp.id} className="border-l-2 border-blue-500 pl-3">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-bold text-sm text-slate-100">{exp.jobTitle}</h3>
                              <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                exp.isCurrent ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                              }`}>
                                {formatDuration(months)}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-slate-300">{exp.employer}{exp.location ? ` • ${exp.location}` : ''}</p>
                            <p className="text-xs mt-0.5 text-slate-400">
                              {exp.startDate?.substring(0,7)} — {exp.isCurrent ? 'Present' : exp.endDate?.substring(0,7)}
                              {exp.employmentType && ` (${exp.employmentType})`}
                            </p>
                            {exp.responsibilities && <p className="text-xs mt-1 text-slate-400">{exp.responsibilities}</p>}
                            {exp.achievements && <p className="text-xs mt-1 italic text-slate-400">✦ {exp.achievements}</p>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* References */}
              {profileData?.references && profileData.references.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-sm font-bold uppercase tracking-widest mb-3 flex items-center gap-2 text-blue-400">
                    <Users className="w-4 h-4" /> References
                  </h2>
                  <div className="grid grid-cols-2 gap-3">
                    {profileData.references.map(ref => (
                      <div key={ref.id} className="border border-slate-800 bg-slate-800/50 rounded-lg p-3 text-xs">
                        <p className="font-bold text-slate-100">{ref.refName}</p>
                        {ref.position && <p className="text-slate-300">{ref.position}</p>}
                        {ref.organization && <p className="text-slate-400">{ref.organization}</p>}
                        <p className="italic mt-1 text-slate-400">{ref.relationship}</p>
                        {ref.email && <p className="mt-1 text-slate-400">{ref.email}</p>}
                        {ref.phone && <p className="text-slate-400">{ref.phone}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents Preview */}
              {profileData?.documents && profileData.documents.filter(d => d.docType !== 'Profile Picture').length > 0 && (
                <div className="mb-6">
                  <h2 className="text-sm font-bold uppercase tracking-widest mb-3 flex items-center gap-2 text-blue-400">
                    <FileText className="w-4 h-4" /> Attached Files
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {profileData.documents.filter(d => d.docType !== 'Profile Picture').map(d => (
                      <div key={d.id} className="flex items-center gap-2 border border-slate-700 bg-slate-800 hover:bg-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer text-slate-300 transition-colors" onClick={() => setViewDoc(d)}>
                        <FileText className="w-3 h-3 text-blue-400" /> {d.docType}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Placeholder when empty */}
              {completeness < 20 && (
                <div className="text-center mt-20 flex flex-col items-center" style={{ color: '#d1d5db' }}>
                  <User className="w-16 h-16 mb-4" style={{ color: '#e5e7eb' }} />
                  <p className="text-sm font-semibold">Your resume preview will build here</p>
                  <p className="text-xs">as you fill out your profile.</p>
                </div>
              )}

            </div>
          </div>
        </div>

      </div>
      {/* Document View Modal */}
      {viewDoc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
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
              <Button variant="outline" onClick={() => setViewDoc(null)}>Close Preview</Button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Lock className="w-5 h-5 text-blue-500" /> Change Password
              </h3>
              <button
                type="button"
                onClick={closePasswordModal}
                className="text-gray-400 hover:text-gray-600 font-semibold text-lg"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-700 mb-1">Old Password</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    required
                    disabled={isOldPasswordVerified || verifyingOldPassword}
                    className="flex-1 border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                  {!isOldPasswordVerified && (
                    <button
                      type="button"
                      onClick={handleVerifyOldPassword}
                      disabled={verifyingOldPassword}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl px-4 py-3 text-sm transition-colors flex items-center justify-center min-w-[80px]"
                    >
                      {verifyingOldPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
                    </button>
                  )}
                </div>
                {isOldPasswordVerified && (
                  <span className="text-xs text-green-600 mt-1 font-medium flex items-center gap-1">
                    ✓ Password verified
                  </span>
                )}
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  disabled={!isOldPasswordVerified}
                  className="border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={isOldPasswordVerified ? "Min 8 characters" : "Verify old password first"}
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  disabled={!isOldPasswordVerified}
                  className="border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={isOldPasswordVerified ? "Confirm new password" : "Verify old password first"}
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={closePasswordModal}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <Button
                onClick={handleChangePassword}
                disabled={updatingPassword || !isOldPasswordVerified}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl px-5 py-2 text-sm"
              >
                {updatingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// --- Generic Entity List Component ---
function EntityListSection({ title, entities, entityType, fetchProfile, renderItem, emptyText, formFields }: any) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<any>({});

  const handleSave = async () => {
    try {
      if (editingId) {
        await userProfileApi.updateEntity(entityType, editingId, formData);
        toast.success(`${title} updated`);
      } else {
        await userProfileApi.addEntity(entityType, formData);
        toast.success(`${title} added`);
      }
      setAdding(false);
      setEditingId(null);
      setFormData({});
      fetchProfile();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err.message || `Failed to save ${title}`);
    }
  };

  const handleDelete = async (id: number) => {
    await userProfileApi.deleteEntity(entityType, id);
    toast.success(`${title} deleted`);
    fetchProfile();
  };

  const handleEdit = (ent: any) => {
    setFormData(ent);
    setEditingId(ent.id);
    setAdding(true);
  };

  return (
    <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-150">
      <h3 className="text-lg font-bold text-gray-800 mb-4">{title}</h3>
      <div className="space-y-4">
        {entities.map((ent: any) => (
          <div key={ent.id} className="border border-gray-200 rounded-xl p-4 flex justify-between items-center bg-gray-50/50 hover:bg-gray-50 transition-colors">
            <div className="flex-1">
              {renderItem(ent)}
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleEdit(ent)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(ent.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
        {entities.length === 0 && !adding && <p className="text-gray-400 text-sm italic">{emptyText}</p>}
        
        {adding ? (
          <div className="border border-blue-100 bg-blue-50/30 rounded-xl p-6 space-y-4 mt-4 animate-fadeIn">
            <h4 className="text-xs font-bold uppercase text-blue-600 tracking-wider">
              {editingId ? 'Edit Item' : 'Add New Item'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formFields.map((f: any) => (
                f.type === 'textarea' ? (
                  <div key={f.name} className="col-span-1 md:col-span-2 flex flex-col">
                    <label className="text-sm font-semibold text-gray-700 mb-1">{f.label}</label>
                    <textarea 
                      className="border border-gray-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                      value={formData[f.name] || ''} 
                      onChange={(e) => setFormData({...formData, [f.name]: e.target.value})}
                      rows={3}
                    />
                  </div>
                ) : f.type === 'phone' ? (
                  <div key={f.name} className="col-span-1 md:col-span-2">
                    <PhoneInput
                      label={f.label}
                      required
                      darkBg={false}
                      value={formData[f.name] || ''}
                      onChange={(fullNum) => setFormData({ ...formData, [f.name]: fullNum })}
                    />
                  </div>
                ) : f.type === 'checkbox' ? (
                  <div key={f.name} className="col-span-1 md:col-span-2 flex items-center gap-3 border border-gray-200 rounded-lg p-3 bg-white shadow-sm">
                    <input
                      type="checkbox"
                      id={`chk-${f.name}`}
                      className="w-4 h-4 accent-blue-600 cursor-pointer"
                      checked={!!formData[f.name]}
                      onChange={(e) => setFormData({...formData, [f.name]: e.target.checked})}
                    />
                    <label htmlFor={`chk-${f.name}`} className="text-sm font-medium text-gray-700 cursor-pointer select-none">{f.label}</label>
                  </div>
                ) : (
                  <InputField 
                    key={f.name} 
                    label={f.label} 
                    type={f.type} 
                    value={formData[f.name]} 
                    onChange={(e: any) => setFormData({...formData, [f.name]: e.target.value})} 
                  />
                )
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setAdding(false); setEditingId(null); setFormData({}); }}>Cancel</Button>
              <Button onClick={handleSave}>{editingId ? 'Update Item' : 'Save Item'}</Button>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => setAdding(true)}
            className="w-full mt-4 py-3 border-2 border-dashed border-gray-200 text-gray-500 font-semibold text-sm rounded-xl hover:bg-gray-50 hover:text-blue-600 hover:border-blue-200 transition-all"
          >
            + Add New {title}
          </button>
        )}
      </div>
    </section>
  );
}
