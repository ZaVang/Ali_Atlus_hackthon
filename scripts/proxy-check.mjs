// Checks the dev-server Atlas proxy end to end (no credentials in this file).
const res = await fetch("http://localhost:5176/api/atlas/search.do", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    tripType: "1",
    requestId: `proxy-check-${Date.now()}`,
    adultNum: 1,
    childNum: 0,
    infantNum: 0,
    fromCity: "PVG",
    toCity: "SIN",
    fromDate: "20260910",
    currency: "USD",
    includeMultipleFareFamily: false,
  }),
});
const json = await res.json();
const routings = json.routings ?? [];
console.log("HTTP", res.status, "| status:", json.status, "| routings:", routings.length);
if (routings[0]) {
  const r = routings[0];
  console.log("sample:", r.currency, (r.adultPrice ?? 0) + (r.adultTax ?? 0), "| fid:", r.fid?.slice(0, 24), "…");
}
