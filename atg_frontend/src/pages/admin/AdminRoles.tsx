import { useEffect, useState } from 'react';

import toast from 'react-hot-toast';
import { userApi } from '../../api/userApi';
import { validatePasswordStrength, validateEmail } from '../../utils/validation';
import PasswordStrengthMeter from '../../components/ui/PasswordStrengthMeter';
import type { User } from '../../types/user.types';
import RoleBadge from '../../components/ui/RoleBadge';
import Button from '../../components/ui/AtgButton';
import ReusableTable from '../../components/ui/AtgReusableTable';
import getIconComponent from '../../components/ui/AtgIconMapper';
import ViewModal from '../../components/ui/ViewModal';

export default function AdminRoles() {

  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // CRUD Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // View Modal State
  const [viewUser, setViewUser] = useState<User | null>(null);

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

  // Form Error/Saving States
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete Confirmation States
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const fetchUsers = () => {
    setLoading(true);
    userApi
      .list()
      .then(setUsers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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

    try {
      if (modalMode === 'create') {
        const emailCheck = validateEmail(email);
        if (!emailCheck.isValid) {
          setFormError(emailCheck.message);
          toast.error(emailCheck.message);
          setSaving(false);
          return;
        }

        const pwdCheck = validatePasswordStrength(password);
        if (!pwdCheck.isValid) {
          setFormError(pwdCheck.message);
          toast.error(pwdCheck.message);
          setSaving(false);
          return;
        }

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
        toast.success('User account created successfully');
      } else if (modalMode === 'edit' && selectedUser) {
        if (password) {
          const pwdCheck = validatePasswordStrength(password);
          if (!pwdCheck.isValid) {
            setFormError(pwdCheck.message);
            toast.error(pwdCheck.message);
            setSaving(false);
            return;
          }
        }

        const payload: any = {
          name,
          role,
          phone,
          country,
          city,
          isLegendary,
        };
        if (password) {
          payload.password = password;
        }
        if (role === 'candidate') {
          payload.pkg = pkg;
          payload.appsTotal = Number(appsTotal);
        } else if (role === 'operator') {
          payload.capacity = Number(capacity);
        }
        await userApi.update(selectedUser.id, payload);
        toast.success('User account updated successfully');
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save account');
      toast.error(err.message || 'Failed to save account');
    } finally {
      setSaving(false);
    }
  };

  const openDeleteConfirm = (user: User) => {
    setUserToDelete(user);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    try {
      await userApi.remove(userToDelete.id);
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
      toast.success('User soft deleted successfully');
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to soft delete user');
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Account Details',
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
      label: 'Billing & Usage',
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
      label: 'Security Role',
      render: (u: User) => <RoleBadge role={u.role} />,
    },
    {
      key: 'isLegendary',
      label: 'Legendary',
      render: (u: User) => (
        u.isLegendary ? <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full border border-yellow-300">⭐ Legendary</span> : <span className="text-gray-400 text-xs">—</span>
      ),
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

  return (
    <>
      <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden animate-fadeIn relative">
        <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/55 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-extrabold text-gray-900">User Management</h1>
            <p className="text-sm text-gray-500 mt-1">Control system authorization clearances, billing package configurations, and security credentials.</p>
          </div>
          <Button
            variant="primary"
            onClick={openCreateModal}
            className="py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center space-x-1.5 shadow-sm"
          >
            {getIconComponent({ iconName: 'AddNew', iconSize: 16, iconColor: '#FFFFFF' })}
            <span>Register Account</span>
          </Button>
        </div>

        {loading && <p className="p-8 text-sm text-gray-500">Loading access catalog...</p>}
        {error && <p className="p-8 text-sm text-red-600 bg-red-50 border-b border-red-100">{error}</p>}

        {!loading && !error && (
          <ReusableTable
            columns={columns}
            data={users}
            searchPlaceholder="Search accounts by name, email, role or package..."
            searchKeys={['name', 'email', 'role', 'pkg']}
            itemsPerPage={8}
            emptyMessage="No access records found in catalog."
          />
        )}
      </div>

      {/* CRUD Overlay Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto animate-fadeIn">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/55">
              <h2 className="text-lg font-serif font-extrabold text-gray-900">
                {modalMode === 'create' ? 'Create User Account' : 'Edit User Profile'}
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
                  <PasswordStrengthMeter password={password} darkBg={false} />
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

                {role === 'candidate' && (
                  <div className="flex items-center mt-6 col-span-1 md:col-span-2">
                    <input
                      type="checkbox"
                      id="isLegendary"
                      checked={isLegendary}
                      onChange={(e) => setIsLegendary(e.target.checked)}
                      className="w-4 h-4 text-brand-600 bg-gray-100 border-gray-300 rounded focus:ring-brand-500"
                    />
                    <label htmlFor="isLegendary" className="ml-2 text-sm font-bold text-gray-700">
                      Mark as Legendary Candidate ⭐
                    </label>
                  </div>
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

              <div className="pt-4 border-t border-gray-100 flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-bold border-gray-200 text-gray-600 hover:bg-gray-55"
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

      {/* View User Modal */}

      <ViewModal
        isOpen={!!viewUser}
        onClose={() => setViewUser(null)}
        title={viewUser?.name || ''}
        subtitle={viewUser?.email}
        badge={viewUser ? <RoleBadge role={viewUser.role} /> : undefined}
        fields={[
          { label: 'Full Name', value: viewUser?.name },
          { label: 'Email', value: viewUser?.email },
          { label: 'Role', value: viewUser?.role },
          { label: 'Phone', value: viewUser?.phone || '—' },
          { label: 'Country', value: viewUser?.country || '—' },
          { label: 'City', value: viewUser?.city || '—' },
          { label: 'Package', value: viewUser?.pkg || '—' },
          { label: 'Legendary', value: viewUser?.isLegendary ? 'Yes ⭐' : 'No' },
          { label: 'Apps Used / Total', value: viewUser ? `${viewUser.appsUsed ?? 0} / ${viewUser.appsTotal ?? 0}` : '—' },
          { label: 'Capacity', value: viewUser?.capacity != null ? String(viewUser.capacity) : '—' },
        ]}
        actions={[
          {
            label: 'Edit',
            variant: 'primary',
            onClick: () => { setViewUser(null); openEditModal(viewUser!); },
          },
        ]}
      />

    </>
  );
}
