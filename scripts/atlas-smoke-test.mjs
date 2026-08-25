// Atlas Sandbox smoke test: verifies credentials and search.do connectivity.
// Usage: node scripts/atlas-smoke-test.mjs [FROM] [TO] [YYYYMMDD]
// Example: node scripts/atlas-smoke-test.mjs PVG SEA 20260910
import { readFileSync } from "node:fs";

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !line.trimStart().startsWith("#")) env[m[1]] = m[2];
}

const baseUrl = env.ATLAS_BASE_URL || "https://sandbox.atriptech.com";
const [fromCity, toCity, fromDate] = [process.argv[2] || "PVG", process.argv[3] || "SEA", process.argv[4] || "20260910"];

const body = {
  tripType: "1",
  requestId: `smoke-${Date.now()}`,
  adultNum: 1,
  childNum: 0,
  infantNum: 0,
  fromCity,
  toCity,
  fromDate,
  currency: "USD",
  includeMultipleFareFamily: false,
};

const res = await fetch(`${baseUrl}/search.do`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Accept: "*/*",
    "Accept-Encoding": "gzip",
    "x-atlas-client-id": env.ATLAS_CLIENT_ID,
    "x-atlas-client-secret": env.ATLAS_CLIENT_SECRET,
  },
  body: JSON.stringify(body),
});

const encoding = res.headers.get("content-encoding");
const text = await res.text();
console.log("HTTP", res.status, "| content-type:", res.headers.get("content-type"), "| encoding:", encoding);

let json;
try {
  json = JSON.parse(text);
} catch {
  console.log("Non-JSON body (first 800 chars):", text.slice(0, 800));
  process.exit(1);
}

console.log("status:", json.status, "| msg:", json.msg ?? json.message);
const data = json.data ?? {};
const keys = Object.keys(data);
console.log("data keys:", keys.join(", ") || "(empty)");
const offers = data.offerList ?? data.offers ?? data.routeList ?? null;
if (Array.isArray(offers)) {
  console.log("offers:", offers.length);
  for (const o of offers.slice(0, 3)) {
    console.log(JSON.stringify(o).slice(0, 400));
  }
} else {
  console.log(JSON.stringify(json).slice(0, 1200));
}
