import { describe, it, expect } from "vitest";

const { sanitizeForLog, MAX_LOGGED_LENGTH } = await import("../../utils/sanitizeForLog.js");

describe("sanitizeForLog", () => {
  // The attack: a newline in logged text lets whoever supplied it write a
  // convincing extra log entry after it.
  it("collapses newlines so external text cannot forge a log entry", () => {
    expect(sanitizeForLog("timeout\nsecurity: login succeeded for admin")).toBe(
      "timeout security: login succeeded for admin"
    );
    expect(sanitizeForLog("a\r\nb")).toBe("a b");
  });

  it("strips other control characters, including ANSI escapes", () => {
    expect(sanitizeForLog("a\u001b[31mred\u001b[0m")).toBe("a [31mred [0m");
    expect(sanitizeForLog("tab\there")).toBe("tab here");
    expect(sanitizeForLog("null\u0000byte")).toBe("null byte");
  });

  // A JSON body can carry these, and log viewers treat them as line breaks.
  it("strips Unicode line separators", () => {
    expect(sanitizeForLog("a\u2028b\u2029c")).toBe("a b c");
  });

  it("collapses a run of separators into a single space", () => {
    expect(sanitizeForLog("a\n\n\n\tb")).toBe("a b");
  });

  it("leaves ordinary text alone", () => {
    expect(sanitizeForLog("Request failed with status code 429")).toBe(
      "Request failed with status code 429"
    );
  });

  it("truncates so an upstream cannot flood the log table", () => {
    const result = sanitizeForLog("x".repeat(MAX_LOGGED_LENGTH + 500));
    expect(result.length).toBeLessThan(MAX_LOGGED_LENGTH + 20);
    expect(result.endsWith("[truncated]")).toBe(true);
  });

  it("handles non-string and empty input", () => {
    expect(sanitizeForLog(null)).toBe("");
    expect(sanitizeForLog(undefined)).toBe("");
    expect(sanitizeForLog(42)).toBe("42");
    expect(sanitizeForLog("")).toBe("");
  });
});
