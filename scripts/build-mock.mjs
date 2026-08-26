// One-command mock production build (Windows PowerShell compatible).
//
// Forces VITE_FLIGHT_PROVIDER=mock and VITE_AGENT_PROVIDER=mock as process
// environment variables, which take precedence over any .env* file values,
// then runs the same type-check + production build as `npm run build`.
// The resulting dist/ is a fully static, credential-free mock demo bundle.
//
// Usage: npm run build:mock
import { spawnSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const env = {
  ...process.env,
  VITE_FLIGHT_PROVIDER: "mock",
  VITE_AGENT_PROVIDER: "mock",
};

function run(relativeBinPath, args) {
  const bin = join(root, "node_modules", ...relativeBinPath);
  if (!existsSync(bin)) {
    console.error(`[build:mock] missing ${bin}; run "npm install" first.`);
    process.exit(1);
  }
  const result = spawnSync(process.execPath, [bin, ...args], {
    cwd: root,
    env,
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("[build:mock] VITE_FLIGHT_PROVIDER=mock VITE_AGENT_PROVIDER=mock");
run(["typescript", "bin", "tsc"], []);
run(["vite", "bin", "vite.js"], ["build"]);
writeFileSync(
  join(root, "dist", "mock-build-manifest.json"),
  `${JSON.stringify({
    schemaVersion: 1,
    buildMode: "mock",
    providers: { flight: "mock", agent: "mock" },
    hosting: { kind: "static", api: "not-served" },
    credentials: "not-included",
    generatedBy: "npm run build:mock",
  }, null, 2)}\n`,
);
console.log("[build:mock] done: dist/ is a static mock bundle (no /api, no credentials).");
