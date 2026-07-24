import { Routes, Route, Navigate } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import ProtectedRoute from './AtgProtectedRoute';
import Layout from '../components/layout/AtgLayout';
import LandingPage from '../pages/LandingPage';
import HowItWorksPage from '../pages/HowItWorksPage';
import PricingPage from '../pages/PricingPage';
import PrivacyPolicyPage from '../pages/PrivacyPolicyPage';
import TermsOfServicePage from '../pages/TermsOfServicePage';
import Login from '../pages/AtgLogin';
import Register from '../pages/Register';
import ForgotPassword from '../pages/AtgForgotPassword';
import ResetPassword from '../pages/ResetPassword';
import AdminDashboard from '../pages/dashboards/AtgAdminDashboard';
import OperatorDashboard from '../pages/dashboards/OperatorDashboard';
import CandidateDashboard from '../pages/dashboards/CandidateDashboard';
import VisitorDashboard from '../pages/dashboards/VisitorDashboard';
import CandidateJobs from '../pages/candidate/CandidateJobs';
import CandidateDocuments from '../pages/candidate/CandidateDocuments';
import CandidateApplications from '../pages/candidate/CandidateApplications';
import CandidateScholarships from '../pages/candidate/CandidateScholarships';
import CandidatePayments from '../pages/candidate/CandidatePayments';
import CandidateUpgrade from '../pages/candidate/CandidateUpgrade';
import CandidateProfile from '../pages/candidate/CandidateProfile';
import SystemUserProfile from '../pages/shared/SystemUserProfile';
import CandidateSupport from '../pages/candidate/CandidateSupport';
import AdminRoles from '../pages/admin/AdminRoles';
import AdminProfileColumns from '../pages/admin/AdminProfileColumns';
import AdminApprovals from '../pages/admin/AdminApprovals';
import OperatorUsers from '../pages/operator/OperatorUsers';
import OperatorAddJob from '../pages/operator/OperatorAddJob';
import OperatorJobs from '../pages/operator/OperatorJobs';
import OperatorApplications from '../pages/operator/OperatorApplications';
import OperatorScholarships from '../pages/operator/OperatorScholarships';
import OperatorPayments from '../pages/operator/OperatorPayments';
import OperatorTeamCapacity from '../pages/operator/OperatorTeamCapacity';
import OperatorExport from '../pages/operator/OperatorExport';
import AdminCompanies from '../pages/admin/AdminCompanies';
import SkillManagement from '../pages/operator/SkillManagement';
import JobRoleManagement from '../pages/operator/JobRoleManagement';
import CompanyDashboard from '../pages/dashboards/CompanyDashboard';
import NotificationsPage from '../pages/shared/NotificationsPage';
import AnonymousJobDiscovery from '../pages/candidate/AnonymousJobDiscovery';
import AnonymousJobDiscoveryAdmin from '../pages/operator/AnonymousJobDiscoveryAdmin';
import AdminPaymentOptions from '../pages/admin/AdminPaymentOptions';
import CandidateJobLinksPage from '../pages/candidate/CandidateJobLinksPage';
import OperatorJobLinksPage from '../pages/operator/OperatorJobLinksPage';

export default function AppRoutes() {
  const { user, isAuthenticated, isLoading } = useSession();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-action-500"></div>
      </div>
    );
  }

  const homeForUser = isAuthenticated && user ? `/${user.role}` : '/login';

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to={homeForUser} replace /> : <Login />}
      />

      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to={homeForUser} replace /> : <Register />}
      />

      <Route
        path="/forgot-password"
        element={isAuthenticated ? <Navigate to={homeForUser} replace /> : <ForgotPassword />}
      />

      <Route
        path="/reset-password"
        element={isAuthenticated ? <Navigate to={homeForUser} replace /> : <ResetPassword />}
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="companies" element={<AdminCompanies />} />
        <Route path="jobs" element={<OperatorJobs />} />
        <Route path="roles" element={<AdminRoles />} />
        <Route path="approvals" element={<AdminApprovals />} />
        <Route path="profile-columns" element={<AdminProfileColumns />} />
        <Route path="skills" element={<SkillManagement />} />
        <Route path="job-roles" element={<JobRoleManagement />} />
        <Route path="payment-options" element={<AdminPaymentOptions />} />
        <Route path="team-capacity" element={<OperatorTeamCapacity />} />
        <Route path="reports" element={<OperatorExport />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile" element={<SystemUserProfile />} />
      </Route>

      <Route
        path="/operator"
        element={
          <ProtectedRoute allowedRoles={['operator']}>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<OperatorDashboard />} />
        <Route path="users" element={<OperatorUsers />} />
        <Route path="jobs" element={<OperatorJobs />} />
        <Route path="jobs/new" element={<OperatorAddJob />} />
        <Route path="applications" element={<OperatorApplications />} />
        <Route path="job-links" element={<OperatorJobLinksPage />} />
        <Route path="booked-applications" element={<OperatorApplications onlyBooked={true} />} />
        <Route path="scholarships" element={<OperatorScholarships />} />
        <Route path="payments" element={<OperatorPayments />} />
        <Route path="skills" element={<SkillManagement />} />
        <Route path="job-roles" element={<JobRoleManagement />} />
        <Route path="team-capacity" element={<OperatorTeamCapacity />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="reports" element={<OperatorExport />} />
        <Route path="anonymous-discovery" element={<AnonymousJobDiscoveryAdmin />} />
        <Route path="profile" element={<SystemUserProfile />} />
      </Route>

      <Route
        path="/company"
        element={
          <ProtectedRoute allowedRoles={['company']}>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<CompanyDashboard />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile" element={<SystemUserProfile />} />
      </Route>


      <Route
        path="/candidate"
        element={
          <ProtectedRoute allowedRoles={['candidate']}>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<CandidateDashboard />} />
        <Route path="jobs" element={<CandidateJobs />} />
        <Route path="job-links" element={<CandidateJobLinksPage />} />
        <Route path="applications" element={<CandidateApplications />} />
        <Route path="scholarships" element={<CandidateScholarships />} />
        <Route path="docs" element={<CandidateDocuments />} />
        <Route path="payments" element={<CandidatePayments />} />
        <Route path="upgrade" element={<CandidateUpgrade />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="support" element={<CandidateSupport />} />
        <Route path="anonymous-discovery" element={<AnonymousJobDiscovery />} />
        <Route path="profile" element={<CandidateProfile />} />
      </Route>

      <Route
        path="/visitor"
        element={
          <ProtectedRoute allowedRoles={['visitor']}>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<VisitorDashboard />} />
      </Route>

      <Route path="/" element={isAuthenticated ? <Navigate to={homeForUser} replace /> : <LandingPage />} />
      <Route path="/how-it-works" element={<HowItWorksPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsOfServicePage />} />
      
      <Route path="*" element={<Navigate to={homeForUser} replace />} />
    </Routes>
  );
}
