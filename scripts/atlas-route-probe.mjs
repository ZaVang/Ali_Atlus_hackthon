// Probe Atlas Sandbox route coverage: reports offer count per route.
// Usage: node scripts/atlas-route-probe.mjs
import { readFileSync } from "node:fs";

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !line.trimStart().startsWith("#")) env[m[1]] = m[2];
}

const baseUrl = env.ATLAS_BASE_URL || "https://sandbox.atriptech.com";
const date = process.argv[2] || "20260910";
const routes = [
  ["PVG", "SEA"], ["PVG", "SIN"], ["SIN", "PVG"], ["SHA", "SIN"],
  ["PVG", "NRT"], ["PVG", "HKG"], ["HKG", "SIN"], ["BKK", "SIN"],
  ["SIN", "SYD"], ["KUL", "SIN"], ["SIN", "KUL"], ["SIN", "HKG"],
];

for (const [fromCity, toCity] of routes) {
  const body = {
    tripType: "1", requestId: `probe-${fromCity}${toCity}-${Date.now()}`,
    adultNum: 1, childNum: 0, infantNum: 0,
    fromCity, toCity, fromDate: date, currency: "USD", includeMultipleFareFamily: false,
  };
  try {
    const res = await fetch(`${baseUrl}/search.do`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json", Accept: "*/*",
        "x-atlas-client-id": env.ATLAS_CLIENT_ID,
        "x-atlas-client-secret": env.ATLAS_CLIENT_SECRET,
      },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    const routings = json.routings ?? [];
    const cheapest = routings.length ? Math.min(...routings.map((r) => r.adultPrice ?? Infinity)) : null;
    console.log(`${fromCity}->${toCity}  status=${json.status}  offers=${routings.length}${cheapest ? `  cheapest=$${cheapest.toFixed(2)}` : ""}`);
  } catch (e) {
    console.log(`${fromCity}->${toCity}  ERROR ${e.message}`);
  }
  await new Promise((r) => setTimeout(r, 200)); // stay well under 10 QPS
}
