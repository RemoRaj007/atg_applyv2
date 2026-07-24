import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useSession } from '../../hooks/useSession';
import { jobApi } from '../../api/jobApi';
import { paymentApi } from '../../api/paymentApi';
import { applicationApi } from '../../api/applicationApi';
import { jobFormApi, type JobFormColumn } from '../../api/jobFormApi';
import type { Job } from '../../types/job.types';
import type { Application } from '../../types/application.types';
import Button from '../../components/ui/AtgButton';
import ReusableTable from '../../components/ui/AtgReusableTable';
import getIconComponent from '../../components/ui/AtgIconMapper';
import FitBadge from '../../components/ui/FitBadge';
import StatusBadge from '../../components/ui/StatusBadge';

export default function CompanyDashboard() {
  const { t } = useTranslation();
  const { user } = useSession();
  const company = user?.company;

  const [activeTab, setActiveTab] = useState<'jobs' | 'applications'>('jobs');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Job Posting Modal States
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [deadline, setDeadline] = useState('');
  const [submittingJob, setSubmittingJob] = useState(false);

  // Payment Modal States
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [activeJobForPayment, setActiveJobForPayment] = useState<Job | null>(null);
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  // Form Builder Modal States
  const [formBuilderOpen, setFormBuilderOpen] = useState(false);
  const [activeJobForForm, setActiveJobForForm] = useState<Job | null>(null);
  const [formFields, setFormFields] = useState<Partial<JobFormColumn>[]>([]);
  const [savingForm, setSavingForm] = useState(false);

  // Application details modal
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  const fetchCompanyData = async () => {
    if (!company || company.status !== 'approved') {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [jobsList, appsList] = await Promise.all([
        jobApi.list(),
        applicationApi.list(),
      ]);
      setJobs(jobsList);
      setApplications(appsList);
    } catch (err: any) {
      setError(err.message || 'Failed to load company records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyData();
  }, [company]);

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmittingJob(true);
    try {
      const payload: any = {
        title,
        location: location.trim() || undefined,
        source: 'company_portal',
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
      };
      
      const newJob = await jobApi.create(payload);
      setPostModalOpen(false);
      
      // Clear job post inputs
      setTitle('');
      setLocation('');
      setDeadline('');
      
      // Trigger simulated payment flow
      setActiveJobForPayment(newJob);
      setCardHolder(user?.name || '');
      setCardNumber('4111 2222 3333 4444');
      setCardExpiry('12/29');
      setCardCvv('123');
      setPaymentModalOpen(true);
      
      fetchCompanyData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit draft job');
    } finally {
      setSubmittingJob(false);
    }
  };

  const handleSimulatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJobForPayment) return;

    setProcessingPayment(true);
    try {
      // Simulate flat-rate $99 job post payment
      await paymentApi.create({
        jobId: activeJobForPayment.id,
        amount: 99.00,
        pkg: 'Trial', // default placeholder
        paid: true,
        status: 'completed',
        method: 'card',
      });
      
      setPaymentModalOpen(false);
      setActiveJobForPayment(null);
      toast.success('Payment of $99.00 completed successfully! Your job post has been queued for Administrator approval.');
      fetchCompanyData();
    } catch (err: any) {
      toast.error(err.message || 'Payment simulation failed');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleManualPayTrigger = (job: Job) => {
    setActiveJobForPayment(job);
    setCardHolder(user?.name || '');
    setCardNumber('4111 2222 3333 4444');
    setCardExpiry('12/29');
    setCardCvv('123');
    setPaymentModalOpen(true);
  };

  // Form Builder Handlers
  const openFormBuilder = async (job: Job) => {
    setActiveJobForForm(job);
    try {
      const cols = await jobFormApi.getColumns(job.id);
      setFormFields(cols.map(c => ({
        id: c.id,
        label: c.label,
        name: c.name,
        inputType: c.inputType,
        isRequired: c.isRequired,
      })));
    } catch (err) {
      setFormFields([]);
    }
    setFormBuilderOpen(true);
  };

  const addFormField = () => {
    setFormFields(prev => [
      ...prev,
      { label: '', name: '', inputType: 'text', isRequired: false },
    ]);
  };

  const removeFormField = (index: number) => {
    setFormFields(prev => prev.filter((_, i) => i !== index));
  };

  const updateFormField = (index: number, key: string, val: any) => {
    setFormFields(prev => prev.map((f, i) => {
      if (i !== index) return f;
      const updated = { ...f, [key]: val };
      if (key === 'label') {
        updated.name = val.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      }
      return updated;
    }));
  };

  const handleSaveFormColumns = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJobForForm) return;

    setSavingForm(true);
    try {
      // Validate
      const invalid = formFields.some(f => !f.label?.trim());
      if (invalid) {
        toast.error('All custom questions must have a label');
        setSavingForm(false);
        return;
      }

      await jobFormApi.saveColumns(activeJobForForm.id, formFields);
      toast.success('Custom job form saved successfully! Operators will be prompted to fill these inputs when processing candidates.');
      setFormBuilderOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save custom columns');
    } finally {
      setSavingForm(false);
    }
  };

  // Metrics calculations
  const approvedJobs = jobs.filter((j) => j.status === 'approved').length;
  const pendingPaymentJobs = jobs.filter((j) => j.status === 'pending_payment').length;
  const pendingApprovalJobs = jobs.filter((j) => j.status === 'pending').length;
  const totalApplications = applications.length;

  const jobColumns = [
    {
      key: 'title',
      label: 'Job Posting',
      render: (j: Job) => (
        <div>
          <p className="font-bold text-gray-808">{j.title}</p>
          <p className="text-xs text-gray-400">{j.location || 'Remote'}</p>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Listing Status',
      render: (j: Job) => (
        <span 
          className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
            j.status === 'approved' 
              ? 'bg-emerald-50 text-emerald-700' 
              : j.status === 'rejected'
              ? 'bg-red-50 text-red-700'
              : j.status === 'pending_payment'
              ? 'bg-gray-50 text-gray-700'
              : 'bg-amber-50 text-amber-700 animate-pulse'
          }`}
        >
          {(j.status || 'approved').replace('_', ' ').toUpperCase()}
        </span>
      ),
    },
    {
      key: 'form',
      label: 'Custom Questionnaire',
      render: (j: Job) => (
        <button
          onClick={() => openFormBuilder(j)}
          className="px-2.5 py-1 text-xs font-bold bg-gray-100 border border-gray-150 text-gray-900 hover:bg-gray-200 rounded-xl transition"
        >
          Customize Form
        </button>
      ),
    },
    {
      key: 'payment',
      label: 'Fee Status',
      render: (j: Job) => (
        <div className="flex items-center space-x-3">
          <span className="text-sm font-semibold text-gray-700">$99.00</span>
          {j.status === 'pending_payment' && (
            <button
              onClick={() => handleManualPayTrigger(j)}
              className="px-2.5 py-1 text-xs font-bold bg-brand-650 hover:bg-brand-700 text-white rounded-lg transition shadow-sm"
            >
              Pay Now
            </button>
          )}
        </div>
      ),
    },
  ];

  const appColumns = [
    {
      key: 'user.name',
      label: 'Candidate Details',
      render: (app: Application) => (
        <div>
          <p className="font-bold text-gray-808">{app.user.name}</p>
          <p className="text-xs text-gray-400">{app.user.email}</p>
        </div>
      ),
    },
    {
      key: 'job.title',
      label: 'Target Job Post',
      render: (app: Application) => (
        <p className="font-semibold text-gray-700 text-xs">{app.job?.title || '—'}</p>
      ),
    },
    {
      key: 'fitScore',
      label: 'Fit Rating',
      render: (app: Application) => (
        app.fitScore != null ? <FitBadge score={app.fitScore} /> : <span className="text-xs text-gray-450">—</span>
      ),
    },
    {
      key: 'status',
      label: 'Approval Status',
      render: (app: Application) => <StatusBadge status={app.status} />,
    },
    {
      key: 'actions',
      label: 'Operator File Details',
      render: (app: Application) => (
        <button
          onClick={() => setSelectedApp(app)}
          className="px-2.5 py-1 text-xs font-bold bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 rounded-xl transition"
        >
          View Form Values
        </button>
      ),
    },
  ];

  if (!company) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-gray-150 shadow-sm animate-fadeIn">
        <h2 className="text-xl font-bold text-gray-800">No Company Profile Registered</h2>
        <p className="text-gray-500 mt-2">Your profile is not associated with an approved business profile. Register your company first.</p>
      </div>
    );
  }

  // Pending / Rejected Status Layout
  if (company.status === 'pending' || company.status === 'rejected') {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="bg-white p-8 rounded-3xl border border-gray-150 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-serif font-extrabold text-gray-900">{company.name}</h1>
            <p className="text-gray-500 mt-1">{company.description || 'No business description provided'}</p>
          </div>
          <div className="px-4 py-2 bg-amber-50 border border-amber-100 rounded-2xl flex items-center space-x-2 text-amber-850 self-start md:self-center font-bold text-sm">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
            <span>Registration Status: {company.status.toUpperCase()}</span>
          </div>
        </div>

        <div className="p-8 border border-amber-100 bg-amber-50 rounded-2xl text-center shadow-sm">
          <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-4">
            {getIconComponent({ iconName: 'alert', iconSize: 28, iconColor: '#B45309' })}
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            {company.status === 'pending' ? 'Verification Review Pending' : 'Registration Declined'}
          </h2>
          <p className="text-sm text-gray-600 max-w-md mx-auto mt-2.5">
            {company.status === 'pending'
              ? 'Our operations staff are validating your corporate credentials. You will unlock job creation and form customisation tools once approved.'
              : 'Your registration details could not be verified. Please contact corporate support.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Profile */}
      <div className="bg-white p-8 rounded-3xl border border-gray-150 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold text-emerald-755 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full uppercase tracking-wider">
            {t('nav.dashboardHub')} — Verified Partner
          </span>
          <h1 className="text-3xl font-serif font-extrabold text-gray-900 mt-2.5">{company.name}</h1>
          <p className="text-gray-500 mt-1">{company.description || 'Corporate Recruiting Workspace.'}</p>
        </div>
        <Button 
          variant="primary" 
          onClick={() => setPostModalOpen(true)}
          className="py-3 px-5 rounded-xl text-sm font-semibold flex items-center space-x-1.5 shadow-sm"
        >
          {getIconComponent({ iconName: 'AddNew', iconSize: 16, iconColor: '#FFFFFF' })}
          <span>Post Job Listing</span>
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Live Postings</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              {getIconComponent({ iconName: 'approve', iconSize: 16, iconColor: '#047857' })}
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-4">{approvedJobs}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Pending Approval</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              {getIconComponent({ iconName: 'alert', iconSize: 16, iconColor: '#B45309' })}
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-4">{pendingApprovalJobs}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Total Applicants</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-brand-700 flex items-center justify-center">
              {getIconComponent({ iconName: 'users', iconSize: 16, iconColor: '#1E40AF' })}
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-4">{totalApplications}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Draft Invoices</span>
            <div className="w-8 h-8 rounded-lg bg-gray-50 text-gray-700 flex items-center justify-center">
              {getIconComponent({ iconName: 'payments', iconSize: 16, iconColor: '#7C3AED' })}
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-4">{pendingPaymentJobs}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1.5 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('jobs')}
          className={`pb-3 text-sm font-bold border-b-2 transition ${
            activeTab === 'jobs' ? 'border-brand-650 text-brand-900' : 'border-transparent text-gray-400 hover:text-gray-605'
          }`}
        >
          Active Job Listings
        </button>
        <button
          onClick={() => setActiveTab('applications')}
          className={`pb-3 text-sm font-bold border-b-2 transition ${
            activeTab === 'applications' ? 'border-brand-650 text-brand-900' : 'border-transparent text-gray-400 hover:text-gray-605'
          }`}
        >
          Candidate Applications ({totalApplications})
        </button>
      </div>

      {/* Table view */}
      <div className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden">
        {loading && <p className="p-8 text-sm text-gray-500">Loading catalog...</p>}
        {error && <p className="p-8 text-sm text-red-600 bg-red-50">{error}</p>}

        {!loading && !error && activeTab === 'jobs' && (
          <ReusableTable
            columns={jobColumns}
            data={jobs}
            searchPlaceholder="Search job listings..."
            searchKeys={['title', 'location', 'status']}
            itemsPerPage={5}
            emptyMessage="No job posts submitted. Click 'Post Job Listing' to get started."
          />
        )}

        {!loading && !error && activeTab === 'applications' && (
          <ReusableTable
            columns={appColumns}
            data={applications}
            searchPlaceholder="Search candidates by name, email, or job title..."
            searchKeys={['user.name', 'user.email', 'job.title']}
            itemsPerPage={5}
            emptyMessage="No applications have been requested or processed for your job listings."
          />
        )}
      </div>

      {/* Post Job Modal */}
      {postModalOpen && (
        <div className="fixed inset-0 bg-gray-600/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl max-w-xl w-full animate-fadeIn">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/55">
              <h2 className="text-lg font-serif font-extrabold text-gray-900">Post a Job</h2>
              <button 
                onClick={() => setPostModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-xl transition"
              >
                {getIconComponent({ iconName: 'Cancel', iconSize: 18, iconColor: '#6B7280' })}
              </button>
            </div>

            <form onSubmit={handlePostJob} className="p-8 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Job Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Senior Product Designer"
                  className="w-full px-4 py-2.5 border border-gray-250 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. London / Remote"
                  className="w-full px-4 py-2.5 border border-gray-250 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Application Deadline (Optional)</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-250 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm transition-all bg-white"
                />
              </div>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-gray-900 text-xs">
                <p className="font-bold">Posting Fee: $99.00</p>
                <p className="mt-1 opacity-80">All company job posts require a flat-rate processing fee. Your listing will save as a draft, and you will proceed to the payment step.</p>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end space-x-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setPostModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-bold border-gray-200 text-gray-600 hover:bg-gray-55"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="primary" 
                  disabled={submittingJob}
                  className="px-5 py-2.5 rounded-xl font-bold shadow-sm"
                >
                  {submittingJob ? 'Submitting...' : 'Proceed to Payment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Simulated Checkout Modal */}
      {paymentModalOpen && activeJobForPayment && (
        <div className="fixed inset-0 bg-gray-600/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl max-w-md w-full animate-fadeIn">
            <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/55">
              <h2 className="text-base font-bold text-gray-900">Secure Corporate Checkout</h2>
              <button 
                onClick={() => {
                  setPaymentModalOpen(false);
                  setActiveJobForPayment(null);
                }}
                className="text-gray-400 hover:text-gray-650 hover:bg-gray-100 p-1.5 rounded-xl transition"
              >
                {getIconComponent({ iconName: 'Cancel', iconSize: 18, iconColor: '#6B7280' })}
              </button>
            </div>

            <form onSubmit={handleSimulatePayment} className="p-6 space-y-4">
              <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Service</span>
                  <span className="text-xs font-bold text-gray-800">Job Posting Fee</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-gray-500">Position</span>
                  <span className="text-xs text-gray-800 truncate max-w-[200px]">{activeJobForPayment.title}</span>
                </div>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-250/50">
                  <span className="text-sm font-bold text-gray-800">Amount Due</span>
                  <span className="text-base font-serif font-extrabold text-brand-850">$99.00</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Cardholder Name</label>
                <input
                  type="text"
                  required
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Card Number</label>
                <input
                  type="text"
                  required
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Expiration</label>
                  <input
                    type="text"
                    required
                    placeholder="MM/YY"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">CVV</label>
                  <input
                    type="password"
                    required
                    maxLength={3}
                    placeholder="123"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-sm bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={processingPayment}
                className="w-full py-3 bg-brand-650 hover:bg-brand-700 text-white font-bold rounded-xl transition shadow-sm disabled:opacity-60 disabled:pointer-events-none text-sm flex justify-center items-center gap-1.5"
              >
                {processingPayment ? 'Processing secure payment...' : 'Complete simulated payment of $99.00'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Form Customizer Modal */}
      {formBuilderOpen && activeJobForForm && (
        <div className="fixed inset-0 bg-gray-600/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl max-w-xl w-full max-h-[85vh] overflow-y-auto animate-fadeIn">
            <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/55">
              <div>
                <h2 className="text-base font-bold text-gray-900">Custom Form Fields</h2>
                <p className="text-xs text-gray-400 mt-0.5">Define candidate screening questions for: <span className="font-semibold text-gray-700">{activeJobForForm.title}</span></p>
              </div>
              <button 
                onClick={() => setFormBuilderOpen(false)}
                className="text-gray-400 hover:text-gray-650 hover:bg-gray-100 p-1.5 rounded-xl transition"
              >
                {getIconComponent({ iconName: 'Cancel', iconSize: 18, iconColor: '#6B7280' })}
              </button>
            </div>

            <form onSubmit={handleSaveFormColumns} className="p-8 space-y-5">
              <div className="space-y-4">
                {formFields.length === 0 ? (
                  <p className="text-xs text-gray-450 italic py-4 text-center">No custom fields defined. Operators will only verify default user profile fields.</p>
                ) : (
                  formFields.map((field, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-2xl border border-gray-150 space-y-3 relative">
                      <button
                        type="button"
                        onClick={() => removeFormField(index)}
                        className="absolute top-4 right-4 text-red-500 hover:bg-red-50 p-1 rounded"
                        title="Remove Question"
                      >
                        {getIconComponent({ iconName: 'Delete', iconSize: 14, iconColor: '#EF4444' })}
                      </button>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-8">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-450 uppercase mb-1">Question Label</label>
                          <input
                            type="text"
                            required
                            value={field.label}
                            onChange={(e) => updateFormField(index, 'label', e.target.value)}
                            placeholder="e.g. Expected Salary"
                            className="w-full px-3 py-1.5 border border-gray-250 rounded-xl focus:ring-1 focus:ring-brand-500 outline-none text-xs bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-450 uppercase mb-1">Input Field Type</label>
                          <select
                            value={field.inputType}
                            onChange={(e: any) => updateFormField(index, 'inputType', e.target.value)}
                            className="w-full px-3 py-1.5 border border-gray-250 rounded-xl focus:ring-1 focus:ring-brand-500 outline-none text-xs bg-white"
                          >
                            <option value="text">Text Input</option>
                            <option value="number">Number Input</option>
                            <option value="file">File Attachment</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`required_${index}`}
                          checked={field.isRequired}
                          onChange={(e) => updateFormField(index, 'isRequired', e.target.checked)}
                          className="w-3.5 h-3.5 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                        />
                        <label htmlFor={`required_${index}`} className="text-xs font-semibold text-gray-600">Required answer</label>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={addFormField}
                  className="px-3 py-1.5 text-xs font-bold text-brand-700 bg-brand-50 border border-brand-100 hover:bg-brand-100 rounded-xl transition flex items-center space-x-1"
                >
                  {getIconComponent({ iconName: 'AddNew', iconSize: 12, iconColor: '#1E40AF' })}
                  <span>Add Question</span>
                </button>

                <div className="flex space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setFormBuilderOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold border-gray-200 text-gray-600 hover:bg-gray-55"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    variant="primary" 
                    disabled={savingForm}
                    className="px-4 py-2 rounded-xl text-xs font-bold shadow-sm"
                  >
                    {savingForm ? 'Saving...' : 'Save Questionnaire'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Candidate Form Answers details view Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-gray-600/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl max-w-md w-full animate-fadeIn">
            <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/55">
              <h2 className="text-base font-bold text-gray-900">Operator File Details</h2>
              <button 
                onClick={() => setSelectedApp(null)}
                className="text-gray-400 hover:text-gray-650 hover:bg-gray-100 p-1.5 rounded-xl transition"
              >
                {getIconComponent({ iconName: 'Cancel', iconSize: 18, iconColor: '#6B7280' })}
              </button>
            </div>

            <div className="p-8 space-y-5">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-xs space-y-1">
                <p><span className="font-bold text-gray-500 font-serif">Candidate:</span> {selectedApp.user.name}</p>
                <p><span className="font-bold text-gray-500 font-serif">Fit Rating:</span> {selectedApp.fitScore ?? 0}%</p>
                <p><span className="font-bold text-gray-500 font-serif">Application Status:</span> {selectedApp.status.toUpperCase()}</p>
              </div>

              {selectedApp.reason && (
                <div>
                  <span className="text-xs font-bold text-gray-450 block uppercase mb-1">Operator Screening Notes</span>
                  <p className="text-xs text-gray-600 bg-gray-50 border border-gray-100 p-3 rounded-xl leading-relaxed">
                    {selectedApp.reason}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <span className="text-xs font-bold text-gray-450 block uppercase">Questionnaire Responses</span>
                
                {(!selectedApp.formValues || selectedApp.formValues.length === 0) ? (
                  <p className="text-xs text-gray-400 italic">No custom fields filled yet or required for this job.</p>
                ) : (
                  <div className="space-y-3.5">
                    {selectedApp.formValues.map((fv: any) => (
                      <div key={fv.id} className="text-xs border-b border-gray-100 pb-2">
                        <span className="font-bold text-gray-700 block">{fv.column?.label}</span>
                        {fv.column?.inputType === 'file' ? (
                          <a 
                            href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${fv.value}`} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-gray-800 underline font-semibold hover:text-black inline-block mt-1"
                          >
                            View Uploaded File
                          </a>
                        ) : (
                          <span className="text-gray-600 block mt-0.5">{fv.value}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <Button 
                  onClick={() => setSelectedApp(null)}
                  className="px-5 py-2.5 rounded-xl font-bold"
                >
                  Close File
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
