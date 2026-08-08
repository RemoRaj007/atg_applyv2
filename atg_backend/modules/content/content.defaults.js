// The shipped defaults for every editable string in the app.
//
// These are the source of truth until an admin overrides a row, and they are
// also the fallback when the database is empty or unreachable — the marketing
// site must never render blank because a query failed. `seedDefaults()` inserts
// any key that does not exist yet, so adding an entry here makes it appear in
// the admin editor on the next boot without a migration.

const SETTINGS = [
  // Branding
  { key: "site.name", value: "ATG Apply", label: "Site name", group: "branding", isPublic: true, sortOrder: 10 },
  { key: "site.tagline", value: "Your applications, handled.", label: "Tagline", group: "branding", isPublic: true, sortOrder: 20 },
  { key: "site.logoUrl", value: "", label: "Logo URL", valueType: "url", group: "branding", isPublic: true, sortOrder: 30,
    description: "Leave blank to use the bundled logo." },
  { key: "site.primaryColor", value: "#2563eb", label: "Primary colour", valueType: "color", group: "branding", isPublic: true, sortOrder: 40 },

  // Contact
  { key: "contact.email", value: "hello@atgconcordia.com", label: "Public contact email", valueType: "email", group: "contact", isPublic: true, sortOrder: 10 },
  { key: "contact.phone", value: "", label: "Public phone number", group: "contact", isPublic: true, sortOrder: 20 },
  { key: "contact.address", value: "Colombo, Sri Lanka", label: "Address", group: "contact", isPublic: true, sortOrder: 30 },
  { key: "contact.supportHours", value: "Mon–Fri, 9am–6pm", label: "Support hours", group: "contact", isPublic: true, sortOrder: 40 },

  // Social
  { key: "social.linkedin", value: "", label: "LinkedIn URL", valueType: "url", group: "social", isPublic: true, sortOrder: 10 },
  { key: "social.facebook", value: "", label: "Facebook URL", valueType: "url", group: "social", isPublic: true, sortOrder: 20 },
  { key: "social.instagram", value: "", label: "Instagram URL", valueType: "url", group: "social", isPublic: true, sortOrder: 30 },
  { key: "social.x", value: "", label: "X / Twitter URL", valueType: "url", group: "social", isPublic: true, sortOrder: 40 },

  // Operational limits. Kept private: they describe how the platform is tuned.
  { key: "limits.trialApplications", value: "3", label: "Applications on the Trial plan", valueType: "number", group: "limits", sortOrder: 10 },
  { key: "limits.operatorCapacity", value: "10", label: "Default operator capacity", valueType: "number", group: "limits", sortOrder: 20 },
  { key: "limits.maxUploadMb", value: "10", label: "Maximum upload size (MB)", valueType: "number", group: "limits", sortOrder: 30,
    description: "Display only — the enforced limit lives in upload.middleware.js." },

  // Feature toggles
  { key: "features.registrationOpen", value: "true", label: "Allow new sign-ups", valueType: "boolean", group: "general", isPublic: true, sortOrder: 10 },
  { key: "features.socialLogin", value: "true", label: "Show social sign-in buttons", valueType: "boolean", group: "general", isPublic: true, sortOrder: 20 },
  { key: "features.maintenanceBanner", value: "", label: "Maintenance banner text", valueType: "longtext", group: "general", isPublic: true, sortOrder: 30,
    description: "Shown site-wide when not empty. Clear it to hide the banner." },
];

const CONTENT = [
  // Landing
  { page: "landing", key: "hero.title", value: "Land the role you deserve", label: "Hero heading", sortOrder: 10 },
  { page: "landing", key: "hero.subtitle", value: "We research, prepare, and submit your applications so you can focus on the interviews.", label: "Hero subheading", valueType: "longtext", sortOrder: 20 },
  { page: "landing", key: "hero.ctaLabel", value: "Get started", label: "Hero button label", sortOrder: 30 },
  { page: "landing", key: "features.title", value: "How we help", label: "Features heading", sortOrder: 40 },
  { page: "landing", key: "features.body", value: "Every application is handled by a real operator, scored for fit, and reviewed before it goes out.", label: "Features body", valueType: "longtext", sortOrder: 50 },
  { page: "landing", key: "cta.title", value: "Ready when you are", label: "Closing heading", sortOrder: 60 },
  { page: "landing", key: "cta.body", value: "Create an account and tell us the roles you want.", label: "Closing body", valueType: "longtext", sortOrder: 70 },

  // Pricing
  { page: "pricing", key: "hero.title", value: "Simple, honest pricing", label: "Heading", sortOrder: 10 },
  { page: "pricing", key: "hero.subtitle", value: "Pay for the applications you need. No subscriptions you have to remember to cancel.", label: "Subheading", valueType: "longtext", sortOrder: 20 },
  { page: "pricing", key: "footnote", value: "Prices are in USD and exclude local taxes where applicable.", label: "Footnote", valueType: "longtext", sortOrder: 30 },

  // How it works
  { page: "how-it-works", key: "hero.title", value: "How ATG Apply works", label: "Heading", sortOrder: 10 },
  { page: "how-it-works", key: "hero.subtitle", value: "Four steps from sign-up to submitted application.", label: "Subheading", valueType: "longtext", sortOrder: 20 },
  { page: "how-it-works", key: "step.1.title", value: "Tell us what you want", label: "Step 1 title", sortOrder: 30 },
  { page: "how-it-works", key: "step.1.body", value: "Complete your profile and pick the roles you are targeting.", label: "Step 1 body", valueType: "longtext", sortOrder: 40 },
  { page: "how-it-works", key: "step.2.title", value: "We assess the fit", label: "Step 2 title", sortOrder: 50 },
  { page: "how-it-works", key: "step.2.body", value: "An operator reviews each posting against your profile and scores it.", label: "Step 2 body", valueType: "longtext", sortOrder: 60 },
  { page: "how-it-works", key: "step.3.title", value: "You approve", label: "Step 3 title", sortOrder: 70 },
  { page: "how-it-works", key: "step.3.body", value: "Nothing is submitted until you have seen the assessment and confirmed.", label: "Step 3 body", valueType: "longtext", sortOrder: 80 },
  { page: "how-it-works", key: "step.4.title", value: "We submit and track", label: "Step 4 title", sortOrder: 90 },
  { page: "how-it-works", key: "step.4.body", value: "We handle the form, keep the proof, and tell you what happens next.", label: "Step 4 body", valueType: "longtext", sortOrder: 100 },

  // Legal. Markdown so the long copy keeps its headings and lists.
  { page: "privacy", key: "body", valueType: "markdown", label: "Privacy policy", sortOrder: 10,
    value: "## Privacy Policy\n\nWe collect only the information needed to prepare and submit applications on your behalf.\n\n### What we collect\n\nYour profile, contact details, qualifications, and the documents you upload.\n\n### How we use it\n\nSolely to assess role fit and complete applications you have approved. We do not sell your data.\n\n### Your rights\n\nContact us to export or delete your account at any time." },
  { page: "terms", key: "body", valueType: "markdown", label: "Terms of service", sortOrder: 10,
    value: "## Terms of Service\n\nBy using ATG Apply you agree to the terms below.\n\n### The service\n\nWe prepare and submit job and scholarship applications on your behalf. We do not guarantee an interview or an offer.\n\n### Your account\n\nYou are responsible for the accuracy of the information you give us and for keeping your credentials secure.\n\n### Payments\n\nApplication credits are consumed when you confirm an application. Credits are non-transferable." },

  // Contact page
  { page: "contact", key: "hero.title", value: "Get in touch", label: "Heading", sortOrder: 10 },
  { page: "contact", key: "hero.subtitle", value: "Questions about your applications, billing, or anything else — we read every message.", label: "Subheading", valueType: "longtext", sortOrder: 20 },
];

// {{placeholders}} each template is allowed to use. The renderer substitutes
// only these, so a template can never pull in an unintended field.
const EMAIL_TEMPLATES = [
  {
    key: "welcome",
    name: "Welcome email",
    description: "Sent once, immediately after registration.",
    subject: "Welcome to {{siteName}}",
    body: "Hi {{name}},\n\nYour account has been created on the {{plan}} plan.\n\nBest regards,\n{{siteName}} Team",
    variables: ["name", "email", "plan", "siteName"],
  },
  {
    key: "password_reset",
    name: "Password reset",
    description: "Sent when someone requests a reset link. Must contain {{resetLink}}.",
    subject: "Reset your {{siteName}} password",
    body: "Hello {{name}},\n\nYou requested a password reset. Open the link below to choose a new password:\n\n{{resetLink}}\n\nThe link expires in one hour. If you did not request this, ignore this email.\n\nBest regards,\n{{siteName}} Team",
    variables: ["name", "email", "resetLink", "siteName"],
  },
  {
    key: "email_verification",
    name: "Verify email address",
    description: "Sent on registration, and again on request from /resend-verification. Must contain {{verifyLink}}.",
    subject: "Verify your {{siteName}} email address",
    body: "Hi {{name}},\n\nPlease verify your email address by clicking the link below:\n\n{{verifyLink}}\n\nThe link expires in 24 hours.\n\nBest regards,\n{{siteName}} Team",
    variables: ["name", "email", "verifyLink", "siteName"],
  },
  {
    key: "password_reset_unknown",
    name: "Password reset — unregistered address",
    description: "Sent when a reset is requested for an address with no account.",
    subject: "Attempted password reset on {{siteName}}",
    body: "Hello,\n\nSomeone requested a password reset for this address, but it is not registered on {{siteName}}.\n\nIf this was not you, you can ignore this email.\n\nBest regards,\n{{siteName}} Team",
    variables: ["email", "siteName"],
  },
  {
    key: "application_status",
    name: "Application status changed",
    description: "Sent to the candidate whenever an application moves state.",
    subject: "[{{siteName}}] Application status updated: {{title}}",
    body: "Hello {{name}},\n\nYour application status for \"{{title}}\" has been updated to: {{status}}.\n\nBest regards,\n{{siteName}} Team",
    variables: ["name", "title", "status", "siteName"],
  },
  {
    key: "notification",
    name: "General notification",
    description: "The email copy of an in-app notification.",
    subject: "[{{siteName}}] {{title}}",
    body: "Hello {{name}},\n\n{{body}}\n\nBest regards,\n{{siteName}} Team",
    variables: ["name", "title", "body", "siteName"],
  },
];

module.exports = { SETTINGS, CONTENT, EMAIL_TEMPLATES };
