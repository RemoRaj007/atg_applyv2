import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The whole suite runs against tests/helpers/prismaMock.js, whose Proxy answers
// for *any* model name so a service can be tested without programming every
// call it makes. That convenience hides one class of bug completely: a module
// calling `prisma.somethingThatIsNotInTheSchema.findMany()` passes every test
// and answers 500 in production — which is exactly how the university and
// document application routers shipped against tables that never existed.
//
// So check the real schema instead of the mock: every model the source refers
// to must be declared in prisma/schema.prisma.

const here = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(here, "../..");

const schema = fs.readFileSync(path.join(backendRoot, "prisma/schema.prisma"), "utf8");

const declaredModels = new Set(
  [...schema.matchAll(/^model\s+(\w+)\s*\{/gm)].map(([, name]) => name)
);

// Prisma exposes a model as its name with a lowercased first character:
// `model UniversityApplication` → `prisma.universityApplication`.
const accessorFor = (model) => model.charAt(0).toLowerCase() + model.slice(1);
const declaredAccessors = new Set([...declaredModels].map(accessorFor));

// Client-level members that are not models.
const NON_MODEL_MEMBERS = new Set([
  "$connect",
  "$disconnect",
  "$transaction",
  "$queryRaw",
  "$queryRawUnsafe",
  "$executeRaw",
  "$executeRawUnsafe",
  "$extends",
  "$on",
]);

const sourceFiles = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return sourceFiles(full);
      return entry.isFile() && entry.name.endsWith(".js") ? [full] : [];
    });

const scanned = ["modules", "scripts", "utils", "config", "middlewares"]
  .map((d) => path.join(backendRoot, d))
  .filter((d) => fs.existsSync(d))
  .flatMap(sourceFiles);

const usages = new Map(); // accessor -> Set of relative file paths

for (const file of scanned) {
  const contents = fs.readFileSync(file, "utf8");
  for (const [, accessor] of contents.matchAll(/\bprisma\.([A-Za-z$][\w$]*)/g)) {
    if (NON_MODEL_MEMBERS.has(accessor)) continue;
    if (!usages.has(accessor)) usages.set(accessor, new Set());
    usages.get(accessor).add(path.relative(backendRoot, file));
  }
}

describe("Prisma schema covers every model the code uses", () => {
  it("finds model access to check (guards against the scan silently matching nothing)", () => {
    expect(usages.size).toBeGreaterThan(5);
  });

  it("declares every model referenced as prisma.<model>", () => {
    const missing = [...usages]
      .filter(([accessor]) => !declaredAccessors.has(accessor))
      .map(([accessor, files]) => `prisma.${accessor} (${[...files].join(", ")})`);

    expect(missing).toEqual([]);
  });
});
