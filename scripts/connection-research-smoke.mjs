// End-to-end smoke check for the connection-research dev proxy
// (POST /api/agent/connection-research). Like scripts/agent-proxy-check.mjs,
// it trusts only real requests: it spawns its own `vite` dev server on a
// dedicated port, posts the demo KUL connection payload, then kills the
// server. Usage:
//   npm run smoke:research            (or: node scripts/connection-research-smoke.mjs [port])
//     - Without LLM_API_KEY/TAVILY_API_KEY → expect 503 {"status":"unavailable"}.
//     - With credentials configured in .env.local → expect 200 with a
//       structured brief whose fields pass the same whitelist the client
//       enforces, plus at least one official source.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const PORT = process.argv[2] ?? "5198";
const root = fileURLToPath(new URL("..", import.meta.url));
const base = `http://localhost:${PORT}`;

const child = spawn(
  process.execPath,
  [`${root}node_modules/vite/bin/vite.js`, "--port", PORT, "--strictPort"],
  { cwd: root, env: process.env, stdio: "ignore" },
);
process.on("exit", () => child.kill());

async function waitForServer(timeoutMs = 30_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await fetch(base);
      if (res.status < 500) return;
    } catch {
      // server not up yet
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`dev server did not come up on port ${PORT}`);
}

// The same KUL demo case the traveller view sends (src/data/connection-integrity.ts).
const payload = {
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
    alternative: {
      flightNumbers: ["D73331", "AK707"],
      scheduledConnectionMinutes: 185,
      price: 148.1,
      currency: "USD",
    },
  },
};

try {
  await waitForServer();
  console.log("POST /api/agent/connection-research (live research can take a few minutes)…");
  const res = await fetch(`${base}/api/agent/connection-research`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(300_000),
  });
  const text = await res.text();
  console.log(`status=${res.status}`);

  if (res.status === 503) {
    const json = JSON.parse(text);
    console.log(
      json.status === "unavailable"
        ? `OK: unconfigured 503 path confirmed (${json.msg})`
        : "WARN: 503 body did not carry status=unavailable",
    );
  } else if (res.status === 200) {
    const body = JSON.parse(text);
    const content = typeof body.content === "string" ? body.content : "";
    let brief = null;
    try {
      brief = JSON.parse(content);
    } catch {
      // handled below
    }
    const fit = brief?.connectionFit;
    const officialCount = Array.isArray(body.sources) ? body.sources.filter((s) => s?.tier === "official").length : 0;
    const validBrief =
      brief
      && (fit === "comfortable" || fit === "tight" || fit === "insufficient")
      && (brief.protectionStatus === "confirmed" || brief.protectionStatus === "not-confirmed")
      && typeof brief.recommendationSummary === "string"
      && typeof brief.rationale === "string";
    console.log(`model=${body.model}  attempts=${body.attempts}  sources=${Array.isArray(body.sources) ? body.sources.length : 0} (official: ${officialCount})`);
    console.log(
      validBrief && officialCount > 0
        ? `OK: structured evidence brief received (connectionFit=${fit}; deterministic comparison owns the candidate)`
        : "FAIL: 200 response but the brief failed the whitelist shape check",
    );
    if (!(validBrief && officialCount > 0)) process.exitCode = 1;
  } else {
    console.log(`WARN: endpoint returned ${res.status}: ${text.slice(0, 400)}`);
    process.exitCode = 1;
  }
} catch (e) {
  console.log(`ERROR: ${e.message}`);
  process.exitCode = 1;
} finally {
  child.kill();
}
