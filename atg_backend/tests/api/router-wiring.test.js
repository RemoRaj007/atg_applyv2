import { describe, it, expect } from "vitest";
import { readdirSync, statSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

import { loadApp } from "../helpers/app.js";

const require = createRequire(import.meta.url);
const MODULES_DIR = join(import.meta.dirname, "../../modules");

// Every router app.js mounts is required at module load. A bad require in any
// one of them — a path that does not resolve, a named import of a default
// export — throws while Express is still being built, so the export never
// completes and *every* endpoint dies with it, login included. That is not a
// subtle failure, but it is an invisible one: nothing distinguishes it from the
// database being down, and it took the whole API out in production once.
//
// Requiring each router on its own turns "the API is down" into a failure that
// names the file.
const routerFiles = () => {
  const found = [];
  for (const entry of readdirSync(MODULES_DIR)) {
    const dir = join(MODULES_DIR, entry);
    if (!statSync(dir).isDirectory()) continue;
    for (const file of readdirSync(dir)) {
      // Both spellings are in use: `*.routes.js` and `*.route.js`.
      if (/\.routes?\.js$/.test(file)) found.push(join(dir, file));
    }
  }
  return found;
};

describe("router wiring", () => {
  const files = routerFiles();

  it("finds the routers to check", () => {
    expect(files.length).toBeGreaterThan(15);
  });

  it.each(files)("%s loads and exports a router", (file) => {
    const router = require(file);
    // An Express router is a function with a `stack`; a module that exported
    // nothing useful would still "load", and that is worth catching too.
    expect(typeof router).toBe("function");
    expect(Array.isArray(router.stack)).toBe(true);
  });

  it("builds the app with every router mounted", async () => {
    const app = await loadApp();
    expect(typeof app).toBe("function");
  });

  // Loading a router proves it is valid, not that it is reachable. app.js
  // required documentApplicationRoutes and universityApplicationRoutes and then
  // never called app.use on either, so twelve endpoints answered 404 while the
  // frontend called them in earnest — a whole feature dead, with nothing in the
  // suite to notice. A require with no matching mount is always a mistake.
  it("mounts every router it requires", () => {
    const source = readFileSync(join(import.meta.dirname, "../../app.js"), "utf8");

    const required = [...source.matchAll(/const\s+(\w+)\s*=\s*require\("\.\/modules\/[^"]+"\)/g)].map(
      (m) => m[1]
    );
    expect(required.length).toBeGreaterThan(10);

    const unmounted = required.filter(
      (name) => !new RegExp(`app\\.use\\([^)]*\\b${name}\\b`).test(source)
    );
    expect(unmounted).toEqual([]);
  });
});
