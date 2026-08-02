const ApiError = require("./ApiError");

/**
 * Validates Email format strictly.
 */
function isValidEmail(email) {
  if (!email || typeof email !== "string") return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
}

/**
 * Validates Password strength:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 */
function validatePasswordStrength(password) {
  if (!password || typeof password !== "string") {
    return { isValid: false, message: "Password is required" };
  }
  if (password.length < 8) {
    return { isValid: false, message: "Password must be at least 8 characters long" };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: "Password must contain at least one uppercase letter (A-Z)" };
  }
  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: "Password must contain at least one lowercase letter (a-z)" };
  }
  if (!/[0-9]/.test(password)) {
    return { isValid: false, message: "Password must contain at least one number (0-9)" };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { isValid: false, message: "Password must contain at least one special character (!@#$%^&* etc.)" };
  }
  return { isValid: true, message: "Password is strong" };
}

/**
 * Validates Phone numbers (with optional country code).
 */
function isValidPhone(phone) {
  if (!phone) return true; // optional unless specified
  const phoneClean = String(phone).replace(/[\s\-\(\)]/g, "");
  // 7–15 digits, optionally prefixed with a country code. The leading digit is
  // allowed to be 0 so numbers written in national format ("0771234567", the
  // way they are printed everywhere in Sri Lanka) are accepted — the frontend's
  // validatePhone only checks the digit count, so rejecting them here made the
  // form pass client-side and then fail with a 400 from the API.
  const phoneRegex = /^\+?\d{7,15}$/;
  return phoneRegex.test(phoneClean);
}

/**
 * Validates NIC (National Identity Card) with mandatory country check.
 */
function validateNIC(nic, country) {
  if (!nic || !nic.trim()) return { isValid: true };
  if (!country || !country.trim()) {
    return { isValid: false, message: "Country must be selected when providing a National Identity Card (NIC)" };
  }

  const c = country.trim().toLowerCase();
  const cleanNic = nic.trim();

  if (c.includes("sri lanka") || c === "lk" || c === "sl") {
    // Old NIC: 9 digits + V/X, New NIC: 12 digits
    const oldSriLankaRegex = /^\d{9}[vVxX]$/;
    const newSriLankaRegex = /^\d{12}$/;
    if (!oldSriLankaRegex.test(cleanNic) && !newSriLankaRegex.test(cleanNic)) {
      return {
        isValid: false,
        message: "Invalid Sri Lankan NIC format. Must be 9 digits followed by 'V'/'X' (e.g., 123456789V) or 12 digits (e.g., 199012345678)."
      };
    }
  } else if (c.includes("india") || c === "in") {
    // Aadhaar (12 digits) or PAN (5 letters, 4 digits, 1 letter)
    const aadhaarRegex = /^\d{12}$/;
    const panRegex = /^[A-Z]{5}\d{4}[A-Z]{1}$/i;
    if (!aadhaarRegex.test(cleanNic) && !panRegex.test(cleanNic)) {
      return {
        isValid: false,
        message: "Invalid Indian NIC/Identity format. Must be a 12-digit Aadhaar number or 10-character PAN."
      };
    }
  } else if (c.includes("united kingdom") || c.includes("uk") || c.includes("britain")) {
    // NINO format
    const ninoRegex = /^[A-CEGHJ-PR-TW-Z]{1}[A-CEGHJ-NPR-TW-Z]{1}\d{6}[A-D]{1}$/i;
    if (!ninoRegex.test(cleanNic)) {
      return {
        isValid: false,
        message: "Invalid UK National Insurance Number (NINO) format."
      };
    }
  } else if (c.includes("united states") || c.includes("usa") || c.includes("us")) {
    // SSN format: 9 digits with optional dashes
    const ssnRegex = /^\d{3}-?\d{2}-?\d{4}$/;
    if (!ssnRegex.test(cleanNic)) {
      return {
        isValid: false,
        message: "Invalid US SSN/Identity format. Must be 9 digits (XXX-XX-XXXX)."
      };
    }
  } else {
    // Generic national ID: alphanumeric, 6 to 20 chars
    const genericRegex = /^[a-zA-Z0-9\-]{6,20}$/;
    if (!genericRegex.test(cleanNic)) {
      return {
        isValid: false,
        message: "Invalid National Identity Card (NIC) format. Must be 6-20 alphanumeric characters."
      };
    }
  }

  return { isValid: true };
}

/**
 * Express middleware to validate backend registration requests.
 */
function validateRegistrationPayload(req, res, next) {
  const { email, password, phone, country } = req.body;

  if (!isValidEmail(email)) {
    return next(ApiError.badRequest("Invalid email address format (e.g. user@example.com)"));
  }

  const pwdCheck = validatePasswordStrength(password);
  if (!pwdCheck.isValid) {
    return next(ApiError.badRequest(pwdCheck.message));
  }

  if (phone && !isValidPhone(phone)) {
    return next(ApiError.badRequest("Invalid phone number format"));
  }

  next();
}

module.exports = {
  isValidEmail,
  validatePasswordStrength,
  isValidPhone,
  validateNIC,
  validateRegistrationPayload,
};
