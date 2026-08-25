// End-to-end smoke check for the agent dev proxy (POST /api/agent/chat).
// Like scripts/atlas-route-probe.mjs, it trusts only real requests: it spawns
// its own `vite` dev server on a dedicated port, exercises the proxy, then
// kills the server. Usage:
//   node scripts/agent-proxy-check.mjs [port]
//     - Without DASHSCOPE_API_KEY → expect 503 {"status":"unavailable"}.
//     - With DASHSCOPE_API_KEY=<sk-…> in the calling environment → expect a
//       real qwen-plus chat completion whose content parses as JSON and whose
//       body carries the upstream `model` field.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const PORT = process.argv[2] ?? "5199";
const root = fileURLToPath(new URL("..", import.meta.url));
const apiKey = process.env.DASHSCOPE_API_KEY ?? "";
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

try {
  await waitForServer();
  const res = await fetch(`${base}/api/agent/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "system", content: "Respond only with a JSON object." },
        { role: "user", content: 'Reply with {"ok": true}.' },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      seed: 20260908,
    }),
  });
  const text = await res.text();
  console.log(`status=${res.status}  keyConfigured=${!!apiKey}`);
  console.log(text.length > 600 ? `${text.slice(0, 600)}…` : text);

  if (!apiKey) {
    if (res.status === 503) {
      const json = JSON.parse(text);
      console.log(
        json.status === "unavailable"
          ? "OK: no-key 503 unavailable path confirmed"
          : "WARN: 503 body did not carry status=unavailable",
      );
    } else {
      console.log(`WARN: expected 503 without a key, got ${res.status} (a key may sit in .env.local)`);
    }
  } else if (res.status === 200) {
    const json = JSON.parse(text);
    const content = json.choices?.[0]?.message?.content;
    const parsed = typeof content === "string" ? JSON.parse(content) : null;
    console.log(
      parsed && typeof json.model === "string"
        ? `OK: real response from ${json.model}, content is valid JSON`
        : "WARN: response shape did not match the expected chat completion",
    );
  } else {
    console.log(`WARN: unexpected status ${res.status}`);
  }
} catch (e) {
  console.log(`ERROR: ${e.message}`);
  process.exitCode = 1;
} finally {
  child.kill();
}
