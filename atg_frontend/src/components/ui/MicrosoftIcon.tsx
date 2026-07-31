// Microsoft's four-square logo, in the brand colours specified by their
// identity guidelines for "Sign in with Microsoft" buttons.
const MicrosoftIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path fill="#f25022" d="M1 1h10v10H1z" />
    <path fill="#7fba00" d="M12 1h10v10H12z" />
    <path fill="#00a4ef" d="M1 12h10v10H1z" />
    <path fill="#ffb900" d="M12 12h10v10H12z" />
  </svg>
);

export default MicrosoftIcon;
