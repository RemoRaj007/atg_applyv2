import jwt from "jsonwebtoken";
import { prisma } from "./prismaMock.js";

// config/db.js reuses `globalThis.__atgPrisma` when it is already set (its
// serverless warm-start cache). Seeding it before anything requires the module
// hands every service the mock client, which works for the app's CommonJS
// `require` graph where vi.mock does not reach.
globalThis.__atgPrisma = prisma;

// Loaded lazily so the client above is installed first.
export const loadApp = async () => (await import("../../app.js")).default;

export const tokenFor = (user) =>
  jwt.sign(
    {
      id: user.id,
      email: user.email ?? `user${user.id}@example.com`,
      role: user.role,
      companyId: user.companyId ?? null,
    },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

export const authHeader = (user) => ({ Authorization: `Bearer ${tokenFor(user)}` });

export const ADMIN = { id: 1, role: "admin" };
export const OPERATOR = { id: 2, role: "operator" };
export const OPERATOR_2 = { id: 3, role: "operator" };
export const CANDIDATE = { id: 4, role: "candidate" };
export const CANDIDATE_2 = { id: 5, role: "candidate" };
export const COMPANY = { id: 6, role: "company", companyId: 11 };
export const VISITOR = { id: 7, role: "visitor" };
