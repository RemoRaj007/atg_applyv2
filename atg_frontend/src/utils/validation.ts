export interface PasswordValidationResult {
  isValid: boolean;
  score: number; // 0 to 5
  checks: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  message: string;
}

/**
 * Validates Email format strictly (RFC 5322 pattern compliant).
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || !email.trim()) {
    return { isValid: false, message: 'Email address is required' };
  }

  const emailClean = email.trim();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(emailClean)) {
    return { isValid: false, message: 'Please enter a valid email address (e.g., user@example.com)' };
  }

  return { isValid: true, message: '' };
}

/**
 * Validates Password strength:
 * 1. At least 8 characters
 * 2. At least 1 uppercase letter (A-Z)
 * 3. At least 1 lowercase letter (a-z)
 * 4. At least 1 number (0-9)
 * 5. At least 1 special character (!@#$%^&* etc.)
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;
  const isValid = score === 5;

  let message = 'Strong password';
  if (!checks.length) message = 'Password must be at least 8 characters long';
  else if (!checks.uppercase) message = 'Password must contain at least 1 uppercase letter (A-Z)';
  else if (!checks.lowercase) message = 'Password must contain at least 1 lowercase letter (a-z)';
  else if (!checks.number) message = 'Password must contain at least 1 number (0-9)';
  else if (!checks.special) message = 'Password must contain at least 1 special character (!@#$%^&*)';

  return { isValid, score, checks, message };
}

/**
 * Common Country Codes List for Phone Input Selector
 */
export interface CountryCodeOption {
  code: string;
  country: string;
  dialCode: string;
  flag: string;
}

export const COUNTRY_CODES: CountryCodeOption[] = [
  { code: 'LK', country: 'Sri Lanka', dialCode: '+94', flag: '🇱🇰' },
  { code: 'US', country: 'United States', dialCode: '+1', flag: '🇺🇸' },
  { code: 'GB', country: 'United Kingdom', dialCode: '+44', flag: '🇬🇧' },
  { code: 'IN', country: 'India', dialCode: '+91', flag: '🇮🇳' },
  { code: 'AU', country: 'Australia', dialCode: '+61', flag: '🇦🇺' },
  { code: 'CA', country: 'Canada', dialCode: '+1', flag: '🇨🇦' },
  { code: 'DE', country: 'Germany', dialCode: '+49', flag: '🇩🇪' },
  { code: 'FR', country: 'France', dialCode: '+33', flag: '🇫🇷' },
  { code: 'JP', country: 'Japan', dialCode: '+81', flag: '🇯🇵' },
  { code: 'AE', country: 'United Arab Emirates', dialCode: '+971', flag: '🇦🇪' },
  { code: 'SG', country: 'Singapore', dialCode: '+65', flag: '🇸🇬' },
  { code: 'NZ', country: 'New Zealand', dialCode: '+64', flag: '🇳🇿' },
  { code: 'MY', country: 'Malaysia', dialCode: '+60', flag: '🇲🇾' },
  { code: 'KR', country: 'South Korea', dialCode: '+82', flag: '🇰🇷' },
  { code: 'CN', country: 'China', dialCode: '+86', flag: '🇨🇳' },
  { code: 'SA', country: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦' },
  { code: 'QA', country: 'Qatar', dialCode: '+974', flag: '🇶🇦' },
  { code: 'KW', country: 'Kuwait', dialCode: '+965', flag: '🇰🇼' },
  { code: 'IT', country: 'Italy', dialCode: '+39', flag: '🇮🇹' },
  { code: 'ES', country: 'Spain', dialCode: '+34', flag: '🇪🇸' },
  { code: 'NL', country: 'Netherlands', dialCode: '+31', flag: '🇳🇱' },
  { code: 'SE', country: 'Sweden', dialCode: '+46', flag: '🇸🇪' },
  { code: 'CH', country: 'Switzerland', dialCode: '+41', flag: '🇨🇭' },
];

/**
 * Validates Phone number format given country dial code & digits.
 */
export function validatePhone(phoneNumber: string, _dialCode: string = '+94'): ValidationResult {
  if (!phoneNumber || !phoneNumber.trim()) {
    return { isValid: true, message: '' }; // Optional unless filled
  }

  const cleanNum = phoneNumber.replace(/[\s\-\(\)]/g, '');
  const digitsOnly = cleanNum.replace(/\D/g, '');

  if (digitsOnly.length < 7 || digitsOnly.length > 15) {
    return {
      isValid: false,
      message: `Phone number must be between 7 and 15 digits (current: ${digitsOnly.length} digits)`
    };
  }

  return { isValid: true, message: '' };
}

/**
 * Validates NIC (National Identity Card) with MANDATORY Country Selection.
 */
export function validateNIC(nic: string, countryNameOrCode: string): ValidationResult {
  const cleanNic = (nic || '').trim();

  if (!cleanNic) {
    return { isValid: true, message: '' }; // empty field is OK unless marked required by caller
  }

  if (!countryNameOrCode || !countryNameOrCode.trim()) {
    return {
      isValid: false,
      message: 'Country must be selected to validate your National Identity Card (NIC).'
    };
  }

  const c = countryNameOrCode.trim().toLowerCase();

  // Sri Lanka validation
  if (c.includes('sri lanka') || c === 'lk' || c === 'sl') {
    const oldFormat = /^\d{9}[vVxX]$/;
    const newFormat = /^\d{12}$/;
    if (!oldFormat.test(cleanNic) && !newFormat.test(cleanNic)) {
      return {
        isValid: false,
        message: 'Invalid Sri Lankan NIC. Must be 9 digits + "V"/"X" (e.g. 123456789V) or 12 digits (e.g. 199012345678).'
      };
    }
  }
  // India validation
  else if (c.includes('india') || c === 'in') {
    const aadhaar = /^\d{12}$/;
    const pan = /^[A-Z]{5}\d{4}[A-Z]{1}$/i;
    if (!aadhaar.test(cleanNic) && !pan.test(cleanNic)) {
      return {
        isValid: false,
        message: 'Invalid Indian Identity format. Must be a 12-digit Aadhaar number or 10-character PAN.'
      };
    }
  }
  // UK validation
  else if (c.includes('united kingdom') || c.includes('uk') || c.includes('britain')) {
    const nino = /^[A-CEGHJ-PR-TW-Z]{1}[A-CEGHJ-NPR-TW-Z]{1}\d{6}[A-D]{1}$/i;
    if (!nino.test(cleanNic)) {
      return {
        isValid: false,
        message: 'Invalid UK National Insurance Number (NINO) format.'
      };
    }
  }
  // USA validation
  else if (c.includes('united states') || c.includes('usa') || c.includes('us')) {
    const ssn = /^\d{3}-?\d{2}-?\d{4}$/;
    if (!ssn.test(cleanNic)) {
      return {
        isValid: false,
        message: 'Invalid US Social Security / Identity format (XXX-XX-XXXX).'
      };
    }
  }
  // Generic validation
  else {
    const generic = /^[a-zA-Z0-9\-]{6,20}$/;
    if (!generic.test(cleanNic)) {
      return {
        isValid: false,
        message: 'Invalid NIC format. Must be 6-20 alphanumeric characters.'
      };
    }
  }

  return { isValid: true, message: '' };
}

/**
 * Returns a URL that is safe to put in an href, or null if it is not.
 *
 * Values like `javascript:alert(1)` reach the admin tables straight from the
 * Company.website column, and a bare {@link href} on such a string executes in
 * the admin's session on click. Only http/https survive; callers must render
 * plain text when this returns null rather than falling back to the raw value.
 *
 * A bare `example.com` (no scheme) is treated as https, since that is how the
 * value is usually typed into the company form.
 */
export function safeExternalUrl(url: string | null | undefined): string | null {
  if (!url || !url.trim()) return null;

  const candidate = url.trim();
  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(candidate)
    ? candidate
    : `https://${candidate}`;

  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.href;
  } catch {
    return null;
  }
}
