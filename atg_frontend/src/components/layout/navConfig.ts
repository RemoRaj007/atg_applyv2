import type { User } from '../../types/user.types';
import type { NavLink } from '../../types/nav.types';

export const navLinksForRole = (role: User['role']): NavLink[] => {
  const dashboard: NavLink = { label: 'Dashboard Hub', to: `/${role}`, icon: 'dashboard', i18nKey: 'nav.dashboardHub' };

  switch (role) {
    case 'candidate':
      return [
        dashboard,
        { label: 'Recommended Jobs', to: '/candidate/jobs', icon: 'briefcase', i18nKey: 'nav.recommendedJobs' },
        { label: 'Job Link Requests', to: '/candidate/job-links', icon: 'applications', i18nKey: 'nav.jobLinkRequests' },
        { label: 'Applications', to: '/candidate/applications', icon: 'applications', i18nKey: 'nav.myApplications' },
        { label: 'Scholarships', to: '/candidate/scholarships', icon: 'scholarship', i18nKey: 'nav.scholarships' },
        { label: 'Payments', to: '/candidate/payments', icon: 'payments', i18nKey: 'nav.payments' },
        { label: 'Upgrade', to: '/candidate/upgrade', icon: 'upgrade', i18nKey: 'nav.upgrade' },
        { label: 'Notifications', to: '/candidate/notifications', icon: 'bell', i18nKey: 'nav.notifications' },
        { label: 'Profile', to: '/candidate/profile', icon: 'profile', i18nKey: 'nav.myProfile' },
      ];
    case 'operator':
      return [
        dashboard,
        { label: 'Candidates', to: '/operator/users', icon: 'users', i18nKey: 'nav.candidates' },
        { label: 'Jobs Catalog', to: '/operator/jobs', icon: 'briefcase', i18nKey: 'nav.jobsCatalog' },
        { label: 'Scholarships Catalog', to: '/operator/scholarships', icon: 'scholarship', i18nKey: 'nav.scholarshipsCatalog' },
        { label: 'Job Link Desk', to: '/operator/job-links', icon: 'applications', i18nKey: 'nav.jobLinkDesk' },
        { label: 'Applications Hub', to: '/operator/applications', icon: 'applications', i18nKey: 'nav.applicationsHub' },
        { label: 'My Applications', to: '/operator/booked-applications', icon: 'applications', i18nKey: 'nav.myBookedApps' },
        { label: 'Payments', to: '/operator/payments', icon: 'payments', i18nKey: 'nav.payments' },
        { label: 'Reports', to: '/operator/reports', icon: 'export', i18nKey: 'nav.reports' },
        { label: 'Skills Catalog', to: '/operator/skills', icon: 'documents', i18nKey: 'nav.skillsCatalog' },
        { label: 'Job Roles Catalog', to: '/operator/job-roles', icon: 'briefcase', i18nKey: 'nav.jobRolesCatalog' },
        { label: 'Notifications', to: '/operator/notifications', icon: 'bell', i18nKey: 'nav.notifications' },
        { label: 'Profile', to: '/operator/profile', icon: 'profile', i18nKey: 'nav.myProfile' },
      ];
    case 'admin':
      // Ordered people → work → catalog → configuration → oversight, so the
      // day-to-day entries sit above the ones touched once a month.
      return [
        dashboard,
        { label: 'User Management', to: '/admin/roles', icon: 'shield', i18nKey: 'nav.userManagement' },
        { label: 'Candidates', to: '/admin/candidates', icon: 'users', i18nKey: 'nav.candidates' },
        { label: 'Companies', to: '/admin/companies', icon: 'briefcase', i18nKey: 'nav.companies' },
        { label: 'Applications Hub', to: '/admin/applications', icon: 'applications', i18nKey: 'nav.applicationsHub' },
        { label: 'Job Link Desk', to: '/admin/job-links', icon: 'applications', i18nKey: 'nav.jobLinkDesk' },
        { label: 'Payments', to: '/admin/payments', icon: 'payments', i18nKey: 'nav.payments' },
        { label: 'Jobs Catalog', to: '/admin/jobs', icon: 'briefcase', i18nKey: 'nav.jobsCatalog' },
        { label: 'Scholarships Catalog', to: '/admin/scholarships', icon: 'scholarship', i18nKey: 'nav.scholarshipsCatalog' },
        { label: 'Skills Catalog', to: '/admin/skills', icon: 'documents', i18nKey: 'nav.skillsCatalog' },
        { label: 'Job Roles Catalog', to: '/admin/job-roles', icon: 'briefcase', i18nKey: 'nav.jobRolesCatalog' },
        { label: 'Job Profile Schema', to: '/admin/profile-columns', icon: 'documents', i18nKey: 'nav.profileSchema' },
        { label: 'Payment Options', to: '/admin/payment-options', icon: 'payments', i18nKey: 'nav.paymentOptions' },
        { label: 'Site Content', to: '/admin/site-content', icon: 'documents', i18nKey: 'nav.siteContent' },
        { label: 'Site Settings', to: '/admin/site-settings', icon: 'shield', i18nKey: 'nav.siteSettings' },
        { label: 'Email Templates', to: '/admin/email-templates', icon: 'bell', i18nKey: 'nav.emailTemplates' },
        { label: 'Change Approvals', to: '/admin/approvals', icon: 'shield', i18nKey: 'nav.changeApprovals' },
        { label: 'Team Capacity', to: '/admin/team-capacity', icon: 'team-capacity', i18nKey: 'nav.teamCapacity' },
        { label: 'Job Discovery', to: '/admin/anonymous-discovery', icon: 'briefcase', i18nKey: 'nav.jobDiscovery' },
        { label: 'Reports', to: '/admin/reports', icon: 'export', i18nKey: 'nav.reports' },
        { label: 'System Logs', to: '/admin/logs', icon: 'shield', i18nKey: 'nav.systemLogs' },
        { label: 'Notifications', to: '/admin/notifications', icon: 'bell', i18nKey: 'nav.notifications' },
        { label: 'Profile', to: '/admin/profile', icon: 'profile', i18nKey: 'nav.myProfile' },
      ];
    case 'company':
      return [
        dashboard,
        { label: 'Notifications', to: '/company/notifications', icon: 'bell', i18nKey: 'nav.notifications' },
        { label: 'Profile', to: '/company/profile', icon: 'profile', i18nKey: 'nav.myProfile' },
      ];
    default:
      return [dashboard];
  }
};
