// Unit-test runner (npm run test). The logic under test is TypeScript, so it
// is first compiled to ESM in .test-build (node:test cannot import TS
// directly), then executed with node's built-in test runner. No network is
// touched: only pure screening/ranking/rubric/whitelist/policy logic is
// exercised. The compiled output stays ESM because itinerary-rules imports
// the plain-ESM connection policy registry (connection-policies.mjs), which
// CommonJS cannot require.
import { spawnSync } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const outDir = ".test-build";

rmSync(join(root, outDir), { recursive: true, force: true });

// CLI file arguments intentionally bypass tsconfig.json; the flags below
// produce ESM modules that tests can import.
const tsc = spawnSync(
  process.execPath,
  [
    join(root, "node_modules/typescript/bin/tsc"),
    "src/domain/rubric.ts",
    "src/domain/itinerary-rules.ts",
    "src/domain/agent-trace.ts",
    "src/domain/connection-resilience.ts",
    "src/domain/connection-research-cache.ts",
    "src/providers/bailian-agent.ts",
    "src/providers/sandbox-atlas.ts",
    "src/providers/mock-atlas.ts",
    "--outDir", outDir,
    "--module", "esnext",
    "--moduleResolution", "node",
    "--target", "es2022",
    "--lib", "es2022,dom",
    "--strict",
    "--esModuleInterop",
    "--skipLibCheck",
  ],
  { cwd: root, encoding: "utf8" },
);
if (tsc.status !== 0) {
  console.error("test compile failed:\n" + (tsc.stdout + tsc.stderr).trim());
  rmSync(join(root, outDir), { recursive: true, force: true });
  process.exit(1);
}

// tsc does not rewrite extensionless relative imports; ESM resolution needs
// the explicit ".js" suffix in the compiled output.
const bailianOut = join(root, outDir, "providers", "bailian-agent.js");
writeFileSync(bailianOut, readFileSync(bailianOut, "utf8").replace(/from "\.\/sandbox-atlas"/g, 'from "./sandbox-atlas.js"'));

const mockAtlasOut = join(root, outDir, "providers", "mock-atlas.js");
writeFileSync(mockAtlasOut, readFileSync(mockAtlasOut, "utf8").replace(/from "\.\.\/data\/fixtures"/g, 'from "../data/fixtures.js"'));

// The compiled itinerary-rules.js imports the plain-ESM policy registry by
// relative path; place the exact source module next to it.
writeFileSync(
  join(root, outDir, "domain", "connection-policies.mjs"),
  readFileSync(join(root, "src/domain/connection-policies.mjs"), "utf8"),
);

// The repo root package.json already has "type": "module"; make it explicit
// inside .test-build too so the compiled .js files are treated as ESM.
writeFileSync(join(root, outDir, "package.json"), JSON.stringify({ type: "module" }));

const run = spawnSync(
  process.execPath,
  ["--test", "tests/rubric.test.mjs", "tests/itinerary-rules.test.mjs", "tests/agent-trace.test.mjs", "tests/connection-resilience.test.mjs", "tests/connection-research-cache.test.mjs", "tests/whitelist.test.mjs", "tests/connection-policy.test.mjs", "tests/sandbox-atlas.test.mjs", "tests/preflight.test.mjs", "tests/server-audit.test.mjs"],
  { cwd: root, stdio: "inherit" },
);

rmSync(join(root, outDir), { recursive: true, force: true });
process.exit(run.status ?? 1);
