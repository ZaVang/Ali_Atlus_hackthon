// Judge / recording preflight for the Connection Integrity demo.
//
// The default run builds the credential-free mock bundle, serves that exact
// dist/ directory through a tiny static probe, and checks the artifact's
// declared mode, provenance, critical journey copy, static/API boundary and
// credential hygiene. The recording mode adds the 180-second script and
// bilingual score-alignment checks. A public URL is optional locally; when it
// is supplied, the same static manifest and API boundary are probed remotely.
//
// Usage:
//   npm run judge-preflight
//   npm run recording-preflight
//   npm run recording-preflight -- --public-url https://owned.example --require-public-url
//   node scripts/judge-preflight.mjs --simulate missing-ui-label

import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { parseEnvFile } from "../server/logic.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(root, "dist");

export const REQUIRED_UI_LABELS = [
  ["product promise", "Sellable"],
  ["main snapshot provenance", "ATRIP Sandbox offer snapshot"],
  ["flight fixture provenance", "Demo fixtures"],
  ["agent fixture provenance", "Demo agent fixture"],
  ["ticket protection disclosure", "Ticket protection not confirmed"],
  ["consent disclosure", "Traveller consent required"],
  ["simulated event disclosure", "Simulated operational event"],
  ["delay replay entry", "Run scenario"],
  ["self-transfer disclosure", "self-transfer"],
  ["policy trace entry", "Policy entry"],
  ["agent trace entry", "How this judgment was made"],
  ["honest no-policy disclosure", "No configured connection policy exists for this route"],
  ["honest unavailable banner", "no recommendation is generated until live provider data is available"],
  ["audit trail disclosure", "Persisted in this browser"],
  ["probability boundary", "not a historical missed-connection probability"],
  ["booking boundary", "No booking is created"],
];

const MAIN_FLOW_LABELS = [
  "Connection Integrity Agent",
  "PVG → KUL → SIN",
  "Ask agent which itinerary to choose",
  "Use recommended itinerary",
  "Airline: intervene after an event",
  "Simulated operational event",
  "Traveller consent required",
];

const SECRET_NAME_PATTERNS = [
  /x-atlas-client-secret/i,
  /Authorization[\s:="'`]{1,24}Bearer/i,
];

const DOC_FILES = [
  "README.md",
  "README.zh-CN.md",
  "docs/JUDGE_PREFLIGHT.md",
  "docs/DEMO_VIDEO_SCRIPT.md",
  "docs/DEMO_VIDEO_EVIDENCE.md",
  "docs/DEMO_WALKTHROUGH.zh-CN.md",
  "docs/CONNECTION_INTEGRITY_DEMO.md",
  "docs/SCOPE_AND_LIMITATIONS.md",
  "docs/ALIBABA_CLOUD_DEPLOYMENT.md",
];

function result(status, name, detail = "") {
  return { status, name, detail };
}

export function parseShotDurations(markdown) {
  return [...String(markdown).matchAll(/^\|\s*(\d+)\s*\|\s*(\d+)s\s*\|/gim)].map((match) => ({
    number: Number(match[1]),
    seconds: Number(match[2]),
  }));
}

function textFilesUnder(directory) {
  if (!existsSync(directory)) return [];
  const files = [];
  const visit = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) visit(fullPath);
      else files.push({ path: relative(root, fullPath), text: readFileSync(fullPath, "utf8") });
    }
  };
  visit(directory);
  return files;
}

function readText(relativePath) {
  const fullPath = join(root, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function parseArgs(argv) {
  const args = {
    mode: "judge",
    publicUrl: process.env.PUBLIC_DEMO_URL?.trim() || "",
    requirePublicUrl: false,
    skipBuild: false,
    simulate: "",
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--mode") args.mode = argv[++index] ?? args.mode;
    else if (value.startsWith("--mode=")) args.mode = value.slice("--mode=".length);
    else if (value === "--public-url") args.publicUrl = argv[++index] ?? "";
    else if (value.startsWith("--public-url=")) args.publicUrl = value.slice("--public-url=".length);
    else if (value === "--require-public-url") args.requirePublicUrl = true;
    else if (value === "--skip-build") args.skipBuild = true;
    else if (value === "--simulate") args.simulate = argv[++index] ?? "";
    else if (value.startsWith("--simulate=")) args.simulate = value.slice("--simulate=".length);
  }
  return args;
}

function credentialValues() {
  const fileEnv = {
    ...parseEnvFile(join(root, ".env")),
    ...parseEnvFile(join(root, ".env.local")),
  };
  const values = [];
  for (const key of ["ATLAS_CLIENT_SECRET", "ATLAS_CLIENT_ID", "LLM_API_KEY", "DASHSCOPE_API_KEY", "TAVILY_API_KEY"]) {
    const value = String(process.env[key] ?? fileEnv[key] ?? "").trim();
    if (value.length >= 8) values.push({ key, value });
  }
  return values;
}

export function evaluateMockArtifact({ bundle = "", files = [], manifest = null } = {}) {
  const checks = [];
  const add = (name, ok, detail = "") => checks.push(result(ok ? "PASS" : "FAIL", name, detail));
  const artifactFiles = files.length > 0 ? files : [{ path: "dist/assets/index.js", text: bundle }];

  for (const [name, label] of REQUIRED_UI_LABELS) {
    add(`UI copy: ${name}`, bundle.includes(label), `missing: ${label}`);
  }

  add(
    "mock manifest declares mock providers",
    manifest?.buildMode === "mock" && manifest?.providers?.flight === "mock" && manifest?.providers?.agent === "mock",
    "expected buildMode=mock and Flight/Agent providers=mock",
  );
  add(
    "mock manifest declares static hosting without API",
    manifest?.hosting?.kind === "static" && manifest?.hosting?.api === "not-served",
    "expected hosting.kind=static and hosting.api=not-served",
  );
  add(
    "mock manifest declares credentials excluded",
    manifest?.credentials === "not-included",
    "expected credentials=not-included",
  );
  add(
    "provider provenance is visible in the artifact",
    bundle.includes("Demo fixtures") && bundle.includes("Demo agent fixture") && bundle.includes("ATRIP Sandbox offer snapshot"),
    "flight, agent and snapshot provenance labels must all ship",
  );
  add(
    "main flow labels are reachable from the shipped bundle",
    MAIN_FLOW_LABELS.every((label) => bundle.includes(label)),
    "the main traveller → consent → airline replay labels must remain reachable",
  );

  const nameHits = [];
  for (const file of artifactFiles) {
    for (const pattern of SECRET_NAME_PATTERNS) {
      if (pattern.test(file.text)) nameHits.push(`${file.path}:${pattern}`);
    }
  }
  add(
    "no credential names or authorization headers enter dist",
    nameHits.length === 0,
    nameHits.length > 0 ? nameHits.join(", ") : "no server credential names found",
  );

  const leakedValues = credentialValues().filter(({ value }) => artifactFiles.some((file) => file.text.includes(value)));
  add(
    "configured credential values do not enter dist",
    leakedValues.length === 0,
    leakedValues.length > 0 ? leakedValues.map(({ key }) => key).join(", ") : "configured secret values not found",
  );
  return checks;
}

function loadMockArtifact() {
  const indexPath = join(distDir, "index.html");
  const manifestPath = join(distDir, "mock-build-manifest.json");
  if (!existsSync(indexPath)) return { html: "", bundle: "", files: [], manifest: null };
  const files = textFilesUnder(distDir);
  const html = readFileSync(indexPath, "utf8");
  const bundle = files.filter(({ path }) => path.endsWith(".js")).map(({ text }) => text).join("\n");
  let manifest = null;
  try {
    manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : null;
  } catch {
    manifest = null;
  }
  return { html, bundle, files, manifest };
}

function safeStaticPath(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath.split("?")[0]);
  } catch {
    return null;
  }
  const relativePath = decoded.replace(/^[/\\]+/, "") || "index.html";
  const candidate = resolve(distDir, relativePath);
  const distRoot = resolve(distDir);
  if (candidate !== distRoot && !candidate.startsWith(`${distRoot}${sep}`)) return null;
  return candidate;
}

async function withStaticProbe(callback) {
  const server = createServer((request, response) => {
    const urlPath = request.url ?? "/";
    if (urlPath.split("?")[0].startsWith("/api/")) {
      response.statusCode = 404;
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ status: "error", msg: "Static mock build does not serve /api" }));
      return;
    }
    const filePath = safeStaticPath(urlPath);
    if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
      response.statusCode = 404;
      response.end("Not found");
      return;
    }
    const contentType = {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".svg": "image/svg+xml",
    }[extname(filePath).toLowerCase()] ?? "application/octet-stream";
    response.statusCode = 200;
    response.setHeader("Content-Type", contentType);
    response.end(readFileSync(filePath));
  });
  await new Promise((resolveServer) => server.listen(0, "127.0.0.1", resolveServer));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
  try {
    return await callback(baseUrl);
  } finally {
    await new Promise((resolveServer) => server.close(resolveServer));
  }
}

async function probeStaticArtifact(artifact) {
  const checks = [];
  const add = (name, ok, detail = "") => checks.push(result(ok ? "PASS" : "FAIL", name, detail));
  if (!artifact.html || !artifact.bundle) {
    add("static probe has an index and JavaScript asset", false, "dist/index.html or dist/assets/*.js is missing");
    return checks;
  }
  const scriptMatch = artifact.html.match(/<script[^>]+src=["']([^"']+\.js)["']/i);
  add("index references a JavaScript entry asset", Boolean(scriptMatch), "no module script found in dist/index.html");
  if (!scriptMatch) return checks;

  try {
    await withStaticProbe(async (baseUrl) => {
      const home = await fetch(`${baseUrl}/`, { signal: AbortSignal.timeout(5_000) });
      const homeText = await home.text();
      add("static HTTP probe serves the app shell", home.status === 200 && /<script/i.test(homeText), `status=${home.status}`);

      const assetUrl = scriptMatch[1].startsWith("/") ? scriptMatch[1] : `/${scriptMatch[1]}`;
      const asset = await fetch(`${baseUrl}${assetUrl}`, { signal: AbortSignal.timeout(5_000) });
      const assetText = await asset.text();
      add("static HTTP probe serves the referenced JavaScript", asset.status === 200 && assetText.length > 1_000, `status=${asset.status}`);

      const manifest = await fetch(`${baseUrl}/mock-build-manifest.json`, { signal: AbortSignal.timeout(5_000) });
      add("static HTTP probe serves the mock manifest", manifest.status === 200, `status=${manifest.status}`);

      const api = await fetch(`${baseUrl}/api/agent/chat`, { signal: AbortSignal.timeout(5_000) });
      const apiText = await api.text();
      add(
        "static HTTP probe has no API route",
        api.status === 404,
        `status=${api.status}; static mock must not expose /api/agent/chat`,
      );
      add("static API response explicitly says static mock", apiText.includes("does not serve /api"), "missing static hosting boundary message");
    });
  } catch (error) {
    add("static HTTP probe completes", false, error instanceof Error ? error.message : String(error));
  }
  return checks;
}

async function probePublicUrl(publicUrl) {
  const checks = [];
  const add = (name, ok, detail = "") => checks.push(result(ok ? "PASS" : "FAIL", name, detail));
  let url;
  try {
    url = new URL(publicUrl);
    if (!/^https?:$/.test(url.protocol)) throw new Error("URL must use http or https");
    if (/temporary|claim-deployment|example\.com|your[-_ ]?domain/i.test(publicUrl)) throw new Error("URL looks temporary or placeholder");
  } catch (error) {
    add("configured public URL is stable-looking", false, error instanceof Error ? error.message : String(error));
    return checks;
  }
  const base = url.toString().replace(/\/$/, "");
  try {
    const home = await fetch(`${base}/`, { signal: AbortSignal.timeout(15_000) });
    const homeText = await home.text();
    add("configured public URL serves the app shell", home.status >= 200 && home.status < 300 && /<script/i.test(homeText), `status=${home.status}`);

    const manifest = await fetch(`${base}/mock-build-manifest.json`, { signal: AbortSignal.timeout(15_000) });
    let manifestJson = null;
    try { manifestJson = await manifest.json(); } catch { /* reported below */ }
    add(
      "configured public URL serves a mock manifest",
      manifest.status === 200 && manifestJson?.buildMode === "mock" && manifestJson?.hosting?.api === "not-served",
      `status=${manifest.status}`,
    );

    const api = await fetch(`${base}/api/agent/chat`, { signal: AbortSignal.timeout(15_000) });
    const apiText = await api.text();
    const contentType = api.headers.get("content-type") ?? "";
    const hasLiveJsonApi = api.status >= 200 && api.status < 300 && /application\/json/i.test(contentType);
    add(
      "configured public URL does not expose a false mock API",
      !hasLiveJsonApi && (api.status === 404 || !/application\/json/i.test(contentType)),
      `status=${api.status}; content-type=${contentType || "unknown"}; body=${apiText.slice(0, 80)}`,
    );
  } catch (error) {
    add("configured public URL is reachable", false, error instanceof Error ? error.message : String(error));
  }
  return checks;
}

function documentationChecks(mode) {
  const checks = [];
  const add = (name, ok, detail = "") => checks.push(result(ok ? "PASS" : "FAIL", name, detail));
  const docs = Object.fromEntries(DOC_FILES.map((file) => [file, readText(file)]));
  for (const file of DOC_FILES) add(`documentation exists: ${file}`, docs[file].length > 0, "file missing or empty");
  add(
    "container deployment contract is present",
    existsSync(join(root, "Dockerfile")) && existsSync(join(root, ".dockerignore")) && docs["docs/ALIBABA_CLOUD_DEPLOYMENT.md"].includes("/health"),
    "Dockerfile, secret exclusion and health contract must exist before external deployment",
  );

  const publicDocs = Object.entries(docs).filter(([file]) => !file.includes("legacy"));
  const staleUrlHits = publicDocs.filter(([, text]) => /temporary-prompt|claim-deployment/i.test(text)).map(([file]) => file);
  add("no temporary hosted URL is presented as a release entry", staleUrlHits.length === 0, staleUrlHits.join(", "));
  add(
    "static/API boundary is documented in both languages",
    /static build (?:alone does not serve|intentionally serves no) [`/]?\/api/i.test(docs["README.md"])
      && /纯静态构建(?:本身|按设计)不提供 [`/]?\/api/.test(docs["README.zh-CN.md"]),
    "README and README.zh-CN.md must say that static mock hosting has no /api",
  );
  add(
    "submission-time stable entry and preflight are documented",
    docs["docs/JUDGE_PREFLIGHT.md"].includes("PUBLIC_DEMO_URL") && docs["README.md"].includes("recording-preflight"),
    "the public URL must be replaceable and verified, not hard-coded",
  );

  const english = docs["docs/DEMO_VIDEO_SCRIPT.md"];
  const chinese = docs["docs/DEMO_WALKTHROUGH.zh-CN.md"];
  const bilingualAnchors = [
    ["Seattle pain origin", /Seattle/i.test(english) && /Seattle/.test(chinese)],
    ["PVG-KUL-SIN case distinction", /PVG\s*[→>-]\s*KUL\s*[→>-]\s*SIN/.test(english) && /PVG\s*[→>-]\s*KUL\s*[→>-]\s*SIN/.test(chinese)],
    ["Atlas provenance", /ATRIP|Atlas/i.test(english) && /ATRIP|Atlas/.test(chinese)],
    ["Agent trace", /Agent trace|How this judgment was made/i.test(english) && /Agent trace|Agent 轨迹|判断依据/.test(chinese)],
    ["consent gate", /consent/i.test(english) && /同意/.test(chinese)],
    ["delay replay", /delay replay|scenario replay|simulated inbound delay|replays a scripted event|inbound delay/i.test(english) && /延误|场景回放/.test(chinese)],
    ["Qoder evidence", /Qoder/i.test(english) && /Qoder/.test(chinese)],
    ["boundary disclosure", /booking|rebooking|static|mock|snapshot|unavailable/i.test(english) && /预订|改签|静态|mock|snapshot|unavailable/.test(chinese)],
  ];
  for (const [name, ok] of bilingualAnchors) add(`bilingual demo anchor: ${name}`, ok, "English and Chinese materials must carry the same judge-critical fact");

  const shotDurations = parseShotDurations(english);
  if (mode === "recording") {
    const total = shotDurations.reduce((sum, shot) => sum + shot.seconds, 0);
    const firstAct = shotDurations.slice(0, 2).reduce((sum, shot) => sum + shot.seconds, 0);
    const numbers = shotDurations.map((shot) => shot.number);
    add("recording script has 12 numbered shots", shotDurations.length === 12 && numbers.join(",") === "1,2,3,4,5,6,7,8,9,10,11,12", `found ${shotDurations.length} shots`);
    add("recording script totals exactly 180 seconds", total === 180, `total=${total}s`);
    add("recording script gives the opening exactly 15 seconds", firstAct === 15, `opening=${firstAct}s`);
  } else {
    add("3-minute script is available for judge review", shotDurations.length === 12 && shotDurations.reduce((sum, shot) => sum + shot.seconds, 0) === 180, "run recording-preflight for detailed timing output");
  }

  const scoreDoc = docs["docs/JUDGE_PREFLIGHT.md"];
  const scoreAnchors = [
    ["Innovation 30", /Innovation[\s\S]{0,40}30/i.test(scoreDoc) && /创新[\s\S]{0,40}30/.test(scoreDoc)],
    ["Feasibility 30", /Feasibility[\s\S]{0,40}30/i.test(scoreDoc) && /可行性[\s\S]{0,40}30/.test(scoreDoc)],
    ["Qoder 20", /Qoder[\s\S]{0,40}20/i.test(scoreDoc)],
    ["Demo 20", /Demo[\s\S]{0,40}20/i.test(scoreDoc) && /演示[\s\S]{0,40}20/.test(scoreDoc)],
  ];
  for (const [name, ok] of scoreAnchors) add(`official score dimension documented: ${name}`, ok, "expected 30 / 30 / 20 / 20 alignment");
  return checks;
}

function buildMock() {
  const child = spawnSync(process.execPath, [join(root, "scripts", "build-mock.mjs")], {
    cwd: root,
    env: { ...process.env, VITE_FLIGHT_PROVIDER: "mock", VITE_AGENT_PROVIDER: "mock" },
    encoding: "utf8",
  });
  return {
    ok: child.status === 0,
    detail: child.status === 0 ? "npm run build:mock completed" : (child.stderr || child.stdout || `exit=${child.status}`).trim().slice(-800),
  };
}

export async function runPreflight({ mode = "judge", skipBuild = false, publicUrl = "", requirePublicUrl = false, simulate = "" } = {}) {
  const checks = [];
  const add = (name, ok, detail = "") => checks.push(result(ok ? "PASS" : "FAIL", name, detail));
  const waive = (name, detail) => checks.push(result("WAIVED", name, detail));

  if (mode !== "judge" && mode !== "recording") add("preflight mode is recognised", false, `unknown mode: ${mode}`);
  if (skipBuild) waive("mock build execution", "--skip-build was supplied; using the existing dist/ artifact");
  else {
    const build = buildMock();
    add("mock build completes", build.ok, build.detail);
  }

  const artifact = loadMockArtifact();
  if (artifact.bundle && artifact.manifest) {
    let bundle = artifact.bundle;
    if (simulate === "missing-ui-label") bundle = bundle.replaceAll("Ticket protection not confirmed", "");
    else if (simulate === "wrong-provenance") bundle = bundle.replaceAll("Demo agent fixture", "Agent-generated");
    else if (simulate) add("simulation name is recognised", false, `unknown simulation: ${simulate}`);
    if (simulate === "missing-ui-label" || simulate === "wrong-provenance") {
      add("deliberate fault was injected into the in-memory artifact", true, simulate);
    }
    checks.push(...evaluateMockArtifact({ ...artifact, bundle }));
    checks.push(...await probeStaticArtifact({ ...artifact, bundle }));
  } else {
    add("mock artifact is available", false, "dist/index.html, a JS asset, and mock-build-manifest.json are required");
  }

  checks.push(...documentationChecks(mode));
  waive("live Atlas / LLM / Tavily route", "mock preflight is intentionally credential-free; run the live smoke checks only with authorised credentials");

  if (publicUrl) checks.push(...await probePublicUrl(publicUrl));
  else if (requirePublicUrl) add("configured public URL is present", false, "pass --public-url or set PUBLIC_DEMO_URL before submission");
  else waive("public stable URL probe", "PUBLIC_DEMO_URL is not configured; local static artifact was checked and the submission URL remains replaceable");

  return checks;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const checks = await runPreflight(args);
  console.log(`\n${args.mode === "recording" ? "Recording" : "Judge"} preflight · mock artifact`);
  for (const check of checks) {
    const detail = check.status === "PASS" ? "" : check.detail ? ` — ${check.detail}` : "";
    console.log(`${check.status.padEnd(7)} ${check.name}${detail}`);
  }
  const counts = checks.reduce((summary, check) => {
    summary[check.status] += 1;
    return summary;
  }, { PASS: 0, FAIL: 0, WAIVED: 0 });
  console.log(`\n${counts.PASS} PASS, ${counts.FAIL} FAIL, ${counts.WAIVED} WAIVED`);
  if (counts.FAIL > 0) process.exitCode = 1;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) main().catch((error) => {
  console.error(`preflight error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
