// Environment the app reads at require time. Deliberately set before any module
// under test is imported so token signing, cookie flags, and CORS all behave
// like a real (non-production) deployment instead of throwing on missing config.
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-access-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
process.env.JWT_ACCESS_EXPIRES_IN = "15m";
process.env.JWT_REFRESH_EXPIRES_IN = "7d";
process.env.FRONTEND_URL = "https://app.example.com";
process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/testdb";

// Nothing in the suite may reach a real SMTP server or Supabase bucket.
delete process.env.EMAIL_HOST;
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
delete process.env.VERCEL;
