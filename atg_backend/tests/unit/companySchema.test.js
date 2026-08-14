import { describe, it, expect } from "vitest";

const { createCompanySchema, updateCompanySchema, approveCompanySchema } = await import(
  "../../modules/companies/company.schema.js"
);

describe("company.schema", () => {
  describe("createCompanySchema", () => {
    it("accepts an http(s) website", () => {
      const { error, value } = createCompanySchema.validate({
        name: "Acme",
        email: "hr@acme.com",
        website: "https://acme.com",
      });
      expect(error).toBeUndefined();
      expect(value.website).toBe("https://acme.com");
    });

    it("accepts an omitted or empty website", () => {
      expect(createCompanySchema.validate({ name: "Acme", email: "hr@acme.com" }).error).toBeUndefined();
      expect(
        createCompanySchema.validate({ name: "Acme", email: "hr@acme.com", website: "" }).error
      ).toBeUndefined();
    });

    // The stored-XSS this schema exists to stop: an admin table renders
    // Company.website into an href, so the value must never carry a scheme
    // that executes.
    it.each([
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      "  javascript:alert(1)  ",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)",
      "file:///etc/passwd",
    ])("rejects %s as a website", (website) => {
      const { error } = createCompanySchema.validate({
        name: "Acme",
        email: "hr@acme.com",
        website,
      });
      expect(error).toBeDefined();
    });

    it("requires name and email", () => {
      expect(createCompanySchema.validate({ email: "hr@acme.com" }).error).toBeDefined();
      expect(createCompanySchema.validate({ name: "Acme" }).error).toBeDefined();
      expect(createCompanySchema.validate({ name: "Acme", email: "not-an-email" }).error).toBeDefined();
    });

    it("strips unknown keys so status cannot be self-assigned", () => {
      const { value } = createCompanySchema.validate(
        { name: "Acme", email: "hr@acme.com", status: "approved", d_status: "active" },
        { stripUnknown: true }
      );
      expect(value.status).toBeUndefined();
      expect(value.d_status).toBeUndefined();
    });
  });

  describe("updateCompanySchema", () => {
    it("allows a partial update but not an empty one", () => {
      expect(updateCompanySchema.validate({ name: "Acme Ltd" }).error).toBeUndefined();
      expect(updateCompanySchema.validate({}).error).toBeDefined();
    });

    it("rejects a javascript: website on update too", () => {
      expect(updateCompanySchema.validate({ website: "javascript:alert(1)" }).error).toBeDefined();
    });
  });

  describe("approveCompanySchema", () => {
    it("accepts only the known statuses", () => {
      for (const status of ["pending", "approved", "rejected"]) {
        expect(approveCompanySchema.validate({ status }).error).toBeUndefined();
      }
      expect(approveCompanySchema.validate({ status: "anything-at-all" }).error).toBeDefined();
      expect(approveCompanySchema.validate({}).error).toBeDefined();
    });
  });
});
