// Smoke check for the standalone Node service (server/index.mjs).
//
// Default (offline) mode validates response SHAPES only, with zero external
// calls: the spawned services get blank/fake credentials via process.env
// (which loadServiceEnv places above .env / .env.local), forcing the
// fail-closed 503/405/400 paths.
//
//   npm run smoke:server            offline shape validation
//   npm run smoke:server -- --live  real calls using .env.local credentials
//
// --live exercises all three endpoints against Atlas Sandbox / the LLM /
// Tavily and expects the same 200 shapes the Vite dev smoke produces.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const LIVE = process.argv.includes("--live");
const PORT = "8802";
const base = `http://localhost:${PORT}`;
let failures = 0;

function report(name, ok, detail = "") {
  console.log(`${ok ? "  ok" : "FAIL"}  ${name}${ok || !detail ? "" : ` — ${detail}`}`);
  if (!ok) failures += 1;
}

function spawnService(envOverrides) {
  const child = spawn(process.execPath, [`${root}server/index.mjs`], {
    cwd: root,
    env: { ...process.env, PORT, ...envOverrides },
    stdio: "ignore",
  });
  process.on("exit", () => child.kill());
  return child;
}

async function waitForServer(timeoutMs = 15_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await fetch(base, { signal: AbortSignal.timeout(1_000) });
      if (res.status < 500 || res.status === 503) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`standalone service did not come up on port ${PORT}`);
}

async function post(path, body) {
  return fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(LIVE ? 300_000 : 10_000),
  });
}

// Blank credentials: process.env wins over .env.local inside loadServiceEnv,
// so the service sees empty strings and answers fail-closed 503s.
const BLANK_CREDENTIALS = {
  ATLAS_BASE_URL: "",
  ATLAS_CLIENT_ID: "",
  ATLAS_CLIENT_SECRET: "",
  LLM_API_KEY: "",
  DASHSCOPE_API_KEY: "",
  TAVILY_API_KEY: "",
};

// The same KUL demo payload the Vite smoke uses (src/data/connection-integrity.ts).
const RESEARCH_PAYLOAD = {
  connection: {
    origin: "PVG",
    connectionAirport: "KUL",
    destination: "SIN",
    flightNumbers: ["D73331", "AK727"],
    scheduledConnectionMinutes: 115,
    price: 133.91,
    currency: "USD",
    minimumConnectionMinutes: 60,
    flyThruVerified: false,
    evidence: [
      "ATRIP Sandbox offer: routing, flight numbers, schedule and fare returned; no verified single-PNR / Fly-Thru flag",
      "AirAsia Fly-Thru policy: KLIA Terminal 2 published connection window 60 minutes to 18 hours for eligible itineraries",
    ],
    alternative: { flightNumbers: ["D73331", "AK707"], scheduledConnectionMinutes: 185, price: 148.1, currency: "USD" },
  },
};

async function offlinePhaseA() {
  console.log("Phase A: fail-closed shapes with blank credentials…");
  const child = spawnService(BLANK_CREDENTIALS);
  try {
    await waitForServer();

    let res = await fetch(`${base}/api/agent/chat`, { method: "GET" });
    report("GET /api/agent/chat → 405 + Allow: POST", res.status === 405 && res.headers.get("allow") === "POST", `status=${res.status}`);

    res = await post("/api/agent/chat", { messages: [{ role: "user", content: "hi" }] });
    let json = await res.json();
    report("POST /api/agent/chat → 503 unavailable without LLM key", res.status === 503 && json.status === "unavailable", `status=${res.status}`);

    res = await fetch(`${base}/api/agent/connection-research`, { method: "GET" });
    report("GET /api/agent/connection-research → 405", res.status === 405, `status=${res.status}`);

    res = await post("/api/agent/connection-research", RESEARCH_PAYLOAD);
    json = await res.json();
    report("POST /api/agent/connection-research → 503 unavailable without keys", res.status === 503 && json.status === "unavailable", `status=${res.status}`);

    res = await post("/api/atlas/search.do", { tripType: "1" });
    json = await res.json();
    report("POST /api/atlas/search.do → 503 unavailable without Atlas credentials", res.status === 503 && json.status === "unavailable", `status=${res.status}`);

    res = await fetch(`${base}/api/atlas/search.do`);
    report("GET /api/atlas/search.do → 405", res.status === 405 && res.headers.get("allow") === "POST", `status=${res.status}`);

    res = await post("/api/atlas/verify.do", { routingIdentifier: "not-sent-to-atlas" });
    json = await res.json();
    report("POST /api/atlas/verify.do → 404 unavailable while schema is unverified", res.status === 404 && json.status === "unavailable", `status=${res.status}`);

    res = await fetch(`${base}/api/unknown`);
    report("unknown /api route → 404", res.status === 404, `status=${res.status}`);
  } finally {
    child.kill();
  }
}

async function offlinePhaseB() {
  console.log("Phase B: input validation shape (fake keys; validation runs before any network call)…");
  const child = spawnService({ ...BLANK_CREDENTIALS, LLM_API_KEY: "offline-fake", TAVILY_API_KEY: "offline-fake" });
  try {
    await waitForServer();
    let res = await post("/api/agent/connection-research", { connection: { connectionAirport: "toolong", flightNumbers: [] } });
    let json = await res.json();
    report("invalid research input → 400 error", res.status === 400 && json.status === "error", `status=${res.status}`);

    res = await post("/api/agent/connection-research", {});
    json = await res.json();
    report("empty research input → 400 error", res.status === 400 && json.status === "error", `status=${res.status}`);
  } finally {
    child.kill();
  }
}

async function livePhase() {
  console.log("Phase live: real calls using .env.local credentials (can take a few minutes)…");
  const child = spawnService({});
  try {
    await waitForServer();

    let res = await post("/api/atlas/search.do", {
      tripType: "1",
      requestId: `server-smoke-${Date.now()}`,
      adultNum: 1,
      childNum: 0,
      infantNum: 0,
      fromCity: "PVG",
      toCity: "KUL",
      fromDate: "20260910",
      currency: "USD",
      includeMultipleFareFamily: false,
    });
    report("POST /api/atlas/search.do → upstream answered (credentials injected server-side)", res.status !== 503 && res.status < 500, `status=${res.status}`);

    res = await post("/api/agent/chat", { messages: [{ role: "system", content: "You are a harmless smoke-test assistant." }, { role: "user", content: 'Reply with exactly: OK' }], temperature: 0 });
    const chatText = res.status === 200 ? "" : (await res.text()).slice(0, 300);
    report("POST /api/agent/chat → 200 from upstream", res.status === 200, `status=${res.status}${chatText ? ` body=${chatText}` : ""}`);

    res = await post("/api/agent/connection-research", RESEARCH_PAYLOAD);
    const text = await res.text();
    if (res.status !== 200) {
      report("POST /api/agent/connection-research → 200 brief", false, `status=${res.status}: ${text.slice(0, 300)}`);
      return;
    }
    const body = JSON.parse(text);
    let brief = null;
    try { brief = JSON.parse(typeof body.content === "string" ? body.content : ""); } catch { /* checked below */ }
    const officialCount = Array.isArray(body.sources) ? body.sources.filter((s) => s?.tier === "official").length : 0;
    const validBrief =
      brief
      && ["comfortable", "tight", "insufficient"].includes(brief.connectionFit)
      && ["confirmed", "not-confirmed"].includes(brief.protectionStatus)
      && ["selected", "alternative"].includes(brief.recommendedOption)
      && typeof brief.recommendationSummary === "string"
      && typeof brief.rationale === "string";
    console.log(`model=${body.model}  attempts=${body.attempts}  sources=${Array.isArray(body.sources) ? body.sources.length : 0} (official: ${officialCount})  connectionFit=${brief?.connectionFit}  recommendedOption=${brief?.recommendedOption}`);
    report("POST /api/agent/connection-research → whitelist-valid brief with official source", Boolean(validBrief && officialCount > 0 && (body.attempts === 1 || body.attempts === 2)));
  } finally {
    child.kill();
  }
}

try {
  if (LIVE) {
    await livePhase();
  } else {
    await offlinePhaseA();
    await offlinePhaseB();
  }
} catch (error) {
  console.log(`ERROR: ${error.message}`);
  failures += 1;
}

console.log(failures === 0 ? "\nserver smoke: all checks passed" : `\nserver smoke: ${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
