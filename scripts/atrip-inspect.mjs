// One-off inspection: dump the full ATRIP search.do response shape for the
// contract scenario, decode one routingIdentifier, and list every field the
// routing object actually carries. Not part of the shipped gate.
import { readFileSync, writeFileSync } from "node:fs";

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !line.trimStart().startsWith("#")) env[m[1]] = m[2];
}

const [fromCity, toCity, fromDate] = [process.argv[2] || "PVG", process.argv[3] || "KUL", process.argv[4] || "20260909"];

const res = await fetch(`${env.ATLAS_BASE_URL || "https://sandbox.atriptech.com"}/search.do`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Accept: "*/*",
    "Accept-Encoding": "gzip",
    "x-atlas-client-id": env.ATLAS_CLIENT_ID,
    "x-atlas-client-secret": env.ATLAS_CLIENT_SECRET,
  },
  body: JSON.stringify({
    tripType: "1",
    requestId: `inspect-${Date.now()}`,
    adultNum: 1,
    childNum: 0,
    infantNum: 0,
    fromCity,
    toCity,
    fromDate,
    currency: "USD",
    includeMultipleFareFamily: false,
  }),
});

const json = await res.json();
writeFileSync(new URL("../atrip-sample.json", import.meta.url), JSON.stringify(json, null, 2));
console.log("HTTP", res.status, "| status:", json.status, "| routings:", json.routings?.length ?? 0);
console.log("top-level keys:", Object.keys(json).join(", "));

const r = json.routings?.[0];
if (r) {
  console.log("\nfirst routing keys:", Object.keys(r).join(", "));
  for (const [k, v] of Object.entries(r)) {
    if (k === "routingIdentifier" || k === "fid") continue;
    const preview = typeof v === "object" ? JSON.stringify(v).slice(0, 200) : String(v);
    console.log(`  ${k}: ${preview}`);
  }
  const payload = r.routingIdentifier.split(".")[0];
  const decoded = Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  console.log("\ndecoded routingIdentifier:\n" + decoded);
}
