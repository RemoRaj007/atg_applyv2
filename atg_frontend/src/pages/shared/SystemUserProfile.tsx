import { useState, useRef } from 'react';
import { useSession } from '../../hooks/useSession';
import { userApi } from '../../api/userApi';
import { User, Mail, Shield, Save, Camera, Globe, MapPin, Building, FileText, Lock, Loader2 } from 'lucide-react';
import Button from '../../components/ui/AtgButton';
import toast from 'react-hot-toast';
import PhoneInput from '../../components/ui/PhoneInput';
import PasswordStrengthMeter from '../../components/ui/PasswordStrengthMeter';
import { validatePasswordStrength } from '../../utils/validation';
import { getFileUrl } from '../../utils/fileUrl';

export default function SystemUserProfile() {
  const { user, setUser } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [country, setCountry] = useState(user?.country || '');
  const [city, setCity] = useState(user?.city || '');
  const [profilePhoto, setProfilePhoto] = useState(user?.profilePhoto || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Password Modal states
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isOldPasswordVerified, setIsOldPasswordVerified] = useState(false);
  const [verifyingOldPassword, setVerifyingOldPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  if (!user) return <div className="p-8 text-center text-gray-500">Loading profile...</div>;

  const getProfilePhotoUrl = getFileUrl;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const url = await userApi.uploadProfilePhoto(file);
      setProfilePhoto(url);
      toast.success('Photo uploaded successfully. Save changes to make it permanent.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        name,
        phone,
        country,
        city,
        profilePhoto,
        bio,
        department,
      };

      const updated = await userApi.updateSelf(user.id, payload);
      setUser(updated);
      toast.success('Profile updated successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

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
    const pwdRes = validatePasswordStrength(newPassword);
    if (!pwdRes.isValid) {
      toast.error(pwdRes.message);
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

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full space-y-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-8 -mt-8 opacity-50 blur-lg"></div>
          
          {/* Avatar Upload Container */}
          <div className="relative group cursor-pointer" onClick={triggerFileInput}>
            <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-lg bg-blue-100 text-blue-600 flex items-center justify-center relative">
              {profilePhoto ? (
                <img 
                  src={getProfilePhotoUrl(profilePhoto)} 
                  alt={name} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <User className="w-14 h-14" />
              )}
              
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white">
                <Camera className="w-6 h-6 mb-1" />
                <span className="text-[10px] font-medium">Change Photo</span>
              </div>

              {/* Uploading Spinner */}
              {uploadingPhoto && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              )}
            </div>
            
            <button 
              type="button" 
              className="absolute bottom-1 right-1 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-md transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                triggerFileInput();
              }}
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handlePhotoUpload} 
            />
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center gap-3 justify-center md:justify-start">
              <h1 className="text-3xl font-bold text-gray-900">{user.name}</h1>
              {department && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                  <Building className="w-3 h-3" /> {department}
                </span>
              )}
            </div>

            <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-3 text-sm text-gray-500">
              <span className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-lg">
                <Mail className="w-4 h-4 text-gray-400" /> {user.email}
              </span>
              <span className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-lg capitalize">
                <Shield className="w-4 h-4 text-gray-400" /> {user.role}
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100 px-8 py-5">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              System User Profile Details
            </h2>
            <p className="text-sm text-gray-500 mt-1">Keep your professional system profile information accurate and up-to-date.</p>
          </div>

          <div className="p-8 space-y-8">
            {/* Section 1: Basic Information */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col">
                  <label className="text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-gray-400" /> Full Name
                  </label>
                  <input 
                    type="text" 
                    className="border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-gray-400" /> Department / Team
                  </label>
                  <input 
                    type="text" 
                    className="border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    value={department} 
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Operations, IT Administration"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Contact & Location */}
            <div className="pt-6 border-t border-gray-100">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Contact & Location</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col">
                  <PhoneInput
                    value={phone}
                    onChange={setPhone}
                    label="Phone Number"
                    placeholder="e.g. 771234567"
                    darkBg={false}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-gray-400" /> Country
                  </label>
                  <input 
                    type="text" 
                    className="border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    value={country} 
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="e.g. United States"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-gray-400" /> City
                  </label>
                  <input 
                    type="text" 
                    className="border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    value={city} 
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. San Francisco"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Professional Biography */}
            <div className="pt-6 border-t border-gray-100">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Professional Biography</h3>
              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-gray-400" /> About Me / Bio
                </label>
                <textarea 
                  className="border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all min-h-[100px]"
                  value={bio} 
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Share a brief summary of your role, experiences, or department details..."
                />
              </div>
            </div>

            {/* Section 4: Security & Credentials */}
            <div className="pt-6 border-t border-gray-100">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Account Security</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col">
                  <label className="text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
                  <input 
                    type="email" 
                    className="border border-gray-200 rounded-xl p-3 bg-gray-50 text-gray-400 cursor-not-allowed outline-none"
                    value={user.email} 
                    disabled
                  />
                  <span className="text-[10px] text-gray-400 mt-1">Managed by system administrator</span>
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-semibold text-gray-700 mb-1.5">System Role</label>
                  <input 
                    type="text" 
                    className="border border-gray-200 rounded-xl p-3 bg-gray-50 text-gray-400 cursor-not-allowed capitalize outline-none"
                    value={user.role} 
                    disabled
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-200 hover:border-blue-500 hover:text-blue-600 transition-all font-semibold text-gray-700 bg-white shadow-sm outline-none"
                  >
                    <Lock className="w-4 h-4 text-gray-400" /> Change Password
                  </button>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-6 border-t border-gray-100 flex justify-end">
              <Button onClick={handleSave} disabled={saving} className="min-w-[160px] py-3 rounded-xl shadow-md bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all">
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Save className="w-4 h-4" /> Save Changes
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Change Password Modal */}
        {isPasswordModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
                    placeholder={isOldPasswordVerified ? "Min 8 characters with upper, lower, number, special char" : "Verify old password first"}
                  />
                  <PasswordStrengthMeter password={newPassword} darkBg={false} />
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
    </div>
  );
}
