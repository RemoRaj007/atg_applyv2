import { describe, it, expect } from "vitest";

import parseDurationToMs from "../../utils/parseDuration.js";
import sanitizeUser from "../../utils/sanitizeUser.js";
import { toCsv } from "../../utils/csv.js";
import fileUrl from "../../utils/fileUrl.js";
import ApiError from "../../utils/ApiError.js";
import {
  isValidEmail,
  isValidPhone,
  validatePasswordStrength,
  validateNIC,
} from "../../utils/validators.js";

describe("parseDurationToMs", () => {
  it("parses each supported unit", () => {
    expect(parseDurationToMs("30s", 0)).toBe(30_000);
    expect(parseDurationToMs("15m", 0)).toBe(15 * 60_000);
    expect(parseDurationToMs("1h", 0)).toBe(3_600_000);
    expect(parseDurationToMs("7d", 0)).toBe(7 * 86_400_000);
  });

  it("is case- and whitespace-insensitive", () => {
    expect(parseDurationToMs(" 2H ", 0)).toBe(7_200_000);
  });

  it("falls back for anything it cannot parse", () => {
    const fallback = 123;
    for (const input of [undefined, null, "", "abc", "10", "10y", "-5m", "1.5h", {}]) {
      expect(parseDurationToMs(input, fallback)).toBe(fallback);
    }
  });
});

describe("sanitizeUser", () => {
  it("strips every credential-bearing field", () => {
    const safe = sanitizeUser({
      id: 1,
      email: "a@b.com",
      password: "$argon2id$hash",
      resetPasswordToken: "tok",
      resetPasswordExpires: new Date(),
    });
    expect(safe).toEqual({ id: 1, email: "a@b.com" });
    expect(safe).not.toHaveProperty("password");
    expect(safe).not.toHaveProperty("resetPasswordToken");
    expect(safe).not.toHaveProperty("resetPasswordExpires");
  });

  it("passes null/undefined through untouched", () => {
    expect(sanitizeUser(null)).toBeNull();
    expect(sanitizeUser(undefined)).toBeUndefined();
  });
});

describe("toCsv", () => {
  const columns = [
    { label: "ID", value: (r) => r.id },
    { label: "Name", value: (r) => r.name },
  ];

  it("writes a header row plus one line per record", () => {
    expect(toCsv([{ id: 1, name: "Ada" }], columns)).toBe("ID,Name\n1,Ada");
  });

  it("quotes and escapes cells containing commas, quotes, or newlines", () => {
    const csv = toCsv([{ id: 1, name: 'Smith, "Bob"\nJr' }], columns);
    expect(csv).toBe('ID,Name\n1,"Smith, ""Bob""\nJr"');
  });

  it("renders null and undefined as empty cells", () => {
    expect(toCsv([{ id: null, name: undefined }], columns)).toBe("ID,Name\n,");
  });
});

describe("fileUrl", () => {
  it("prefers the absolute URL set by remote storage", () => {
    expect(fileUrl({ url: "https://cdn/x.png", filename: "x.png" })).toBe("https://cdn/x.png");
  });

  it("falls back to the local static mount", () => {
    expect(fileUrl({ filename: "photo-1.png" })).toBe("/uploads/photo-1.png");
  });

  it("returns null when there is no file", () => {
    expect(fileUrl(null)).toBeNull();
    expect(fileUrl({})).toBeNull();
  });
});

describe("ApiError", () => {
  it("carries the right status code for each factory", () => {
    expect(ApiError.badRequest("x").statusCode).toBe(400);
    expect(ApiError.unauthorized().statusCode).toBe(401);
    expect(ApiError.forbidden().statusCode).toBe(403);
    expect(ApiError.notFound().statusCode).toBe(404);
    expect(ApiError.conflict().statusCode).toBe(409);
  });

  it("is a real Error so asyncHandler's catch and Express both handle it", () => {
    expect(ApiError.badRequest("nope")).toBeInstanceOf(Error);
    expect(ApiError.badRequest("nope").message).toBe("nope");
  });
});

describe("isValidEmail", () => {
  it.each(["user@example.com", "first.last+tag@sub.domain.co.uk"])("accepts %s", (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each(["", "user", "user@", "@example.com", "user@example", "user @example.com", "a@b.c"])(
    "rejects %s",
    (email) => {
      expect(isValidEmail(email)).toBe(false);
    }
  );

  it("rejects non-string input rather than throwing", () => {
    expect(isValidEmail(null)).toBe(false);
    expect(isValidEmail(undefined)).toBe(false);
    expect(isValidEmail({})).toBe(false);
  });
});

describe("validatePasswordStrength", () => {
  it("accepts a password meeting every rule", () => {
    expect(validatePasswordStrength("Password123!").isValid).toBe(true);
  });

  it.each([
    ["Sh0rt!", "at least 8"],
    ["password123!", "uppercase"],
    ["PASSWORD123!", "lowercase"],
    ["Passwordddd!", "number"],
    ["Password1234", "special character"],
  ])("rejects %s", (password, expectedFragment) => {
    const result = validatePasswordStrength(password);
    expect(result.isValid).toBe(false);
    expect(result.message.toLowerCase()).toContain(expectedFragment.toLowerCase());
  });

  it("rejects missing/non-string input", () => {
    expect(validatePasswordStrength(undefined).isValid).toBe(false);
    expect(validatePasswordStrength(12345678).isValid).toBe(false);
  });
});

describe("isValidPhone", () => {
  it("accepts international and local formats with separators", () => {
    expect(isValidPhone("+94 77 123 4567")).toBe(true);
    expect(isValidPhone("(077) 123-4567")).toBe(true);
  });

  it("accepts a number written in national format, with the leading zero", () => {
    expect(isValidPhone("0771234567")).toBe(true);
  });

  it("rejects too short, too long, and non-numeric values", () => {
    expect(isValidPhone("12345")).toBe(false);
    expect(isValidPhone("1".repeat(20))).toBe(false);
    expect(isValidPhone("+94-abc-defg")).toBe(false);
  });

  it("treats an absent phone as valid, since the field is optional", () => {
    expect(isValidPhone("")).toBe(true);
    expect(isValidPhone(null)).toBe(true);
  });
});

describe("validateNIC", () => {
  it("skips validation when no NIC is supplied", () => {
    expect(validateNIC("", "Sri Lanka").isValid).toBe(true);
  });

  it("requires a country whenever a NIC is supplied", () => {
    const result = validateNIC("199012345678", "");
    expect(result.isValid).toBe(false);
    expect(result.message).toMatch(/country/i);
  });

  it("validates Sri Lankan old and new formats", () => {
    expect(validateNIC("123456789V", "Sri Lanka").isValid).toBe(true);
    expect(validateNIC("199012345678", "Sri Lanka").isValid).toBe(true);
    expect(validateNIC("12345", "Sri Lanka").isValid).toBe(false);
  });

  it("validates Indian Aadhaar and PAN", () => {
    expect(validateNIC("123456789012", "India").isValid).toBe(true);
    expect(validateNIC("ABCDE1234F", "India").isValid).toBe(true);
    expect(validateNIC("ABC123", "India").isValid).toBe(false);
  });

  it("falls back to a generic alphanumeric rule for other countries", () => {
    expect(validateNIC("AB-123456", "Germany").isValid).toBe(true);
    expect(validateNIC("!!!", "Germany").isValid).toBe(false);
  });
});
