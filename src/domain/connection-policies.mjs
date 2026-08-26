// Connection policy registry: the configurable evidence-threshold framework.
//
// The 60 + 90 numbers used by the KUL demo are NOT scattered magic values:
// they are one registered entry (kul-airasia-flythru) sourced from AirAsia's
// published Fly-Thru policy. Every consumer — the 60+90 rubric
// (src/domain/rubric.ts), the Itinerary Lab screening/ranking rules
// (src/domain/itinerary-rules.ts) and the server-side evidence search
// (server/logic.mjs: official-domain gate, fallback query templates,
// disclosed policy fallback) — resolves the applicable policy from this
// registry for the supplied itinerary.
//
// When no registered policy matches, consumers take the explicit no-policy
// path: they disclose that no policy parameters are configured for the route
// instead of silently reusing another airport's numbers or failing quietly.
//
// This file is plain ESM JavaScript on purpose: the Vite-bundled UI
// (TypeScript, types via connection-policies.d.mts) and the standalone Node
// service (server/logic.mjs) import this exact module, so the registry can
// never drift between dev and deployed behaviour.

export const CONNECTION_POLICIES = [
  {
    id: "kul-airasia-flythru",
    label: "AirAsia Fly-Thru · KLIA Terminal 2",
    // Matching: the connection airport keys the policy; the carrier prefixes
    // identify itineraries eligible for the Fly-Thru disclosed fallback.
    connectionAirports: ["KUL"],
    flightPrefixes: ["D7", "AK"],
    publishedMinimumMinutes: 60,
    planningBufferMinutes: 90,
    maxConnectionMinutes: 18 * 60,
    policySource: {
      description: "AirAsia Fly-Thru published connection window at KLIA Terminal 2: 60 minutes to 18 hours for eligible single-booking / Fly-Thru itineraries",
      url: "https://support.airasia.com/s/article/Does-AirAsia-provide-stop-over-en?language=km",
    },
    officialDomains: ["airasia.com"],
    queryTemplates: {
      official: "AirAsia Fly-Thru {airport} Terminal 2 {flights} minimum connection time",
      community: "{airport} Terminal 2 AirAsia international transfer time Fly-Thru passenger experience",
      retry: "AirAsia {airport} Fly-Thru connecting flight policy transit transfer minimum time support",
    },
    // Durable, explicit product input used only when live search returns no
    // relevant official page; always labelled `disclosed: true` downstream.
    disclosedFallback: {
      title: "AirAsia Fly-Thru connection policy (disclosed fallback input)",
      url: "https://support.airasia.com/s/article/Does-AirAsia-provide-stop-over-en?language=km",
      summary: "Published KLIA Terminal 2 Fly-Thru connection window: 60 minutes to 18 hours for eligible single-booking / Fly-Thru itineraries. This is a disclosed product policy input used because the live search returned no relevant official page; it is not a live research hit.",
    },
  },
  {
    // Illustrative template entry proving the registry extends beyond KUL.
    // Its numbers are NOT a verified published policy; policySource says so.
    // Replace with real, sourced parameters before trusting it for anything.
    id: "pvg-illustrative-template",
    label: "PVG template entry (illustrative)",
    connectionAirports: ["PVG"],
    flightPrefixes: [],
    publishedMinimumMinutes: 120,
    planningBufferMinutes: 90,
    maxConnectionMinutes: 18 * 60,
    policySource: {
      description: "Illustrative template entry demonstrating the registry mechanism; not a verified published policy — replace with sourced parameters before relying on it",
      illustrative: true,
    },
    officialDomains: [],
    queryTemplates: {
      official: "{airport} airport official minimum connection time transfer policy {flights}",
      community: "{airport} airport transfer experience minimum connection time {flights}",
      retry: "{airport} airport connecting flight transfer minimum time official policy",
    },
    disclosedFallback: null,
  },
];

// Fallback query shapes used on the explicit no-policy path: they carry no
// airline assumptions and no domain gate, and the brief discloses that no
// policy parameters were configured.
export const GENERIC_QUERY_TEMPLATES = {
  official: "{airport} airport official minimum connection time transfer policy {flights}",
  community: "{airport} airport transfer time passenger experience {flights}",
  retry: "{airport} airport connecting flight transfer minimum time official policy",
};

export const NO_POLICY_DISCLOSURE = "No configured connection policy exists for this route; no published minimum or planning buffer is applied.";

/**
 * Resolve the applicable verified policy for an itinerary. Airport match
 * weighs more than carrier prefix match; the highest-scoring entry wins.
 * Illustrative registry templates are intentionally excluded from runtime
 * decisions until their source and parameters are verified. Returns null when
 * nothing operational matches — callers must take the explicit no-policy path.
 */
export function resolveConnectionPolicy({ connectionAirport = "", flightNumbers = [] } = {}) {
  const airport = String(connectionAirport).toUpperCase();
  const flights = Array.isArray(flightNumbers) ? flightNumbers.map((item) => String(item).toUpperCase()) : [];
  let best = null;
  let bestScore = 0;
  for (const policy of CONNECTION_POLICIES) {
    if (policy.policySource?.illustrative === true) continue;
    let score = 0;
    if (policy.connectionAirports.includes(airport)) score += 2;
    if (policy.flightPrefixes.length > 0 && flights.some((flight) => policy.flightPrefixes.some((prefix) => flight.startsWith(prefix)))) score += 1;
    if (score > bestScore) {
      best = policy;
      bestScore = score;
    }
  }
  return best;
}

/** Render a query template: {airport} and {flights} are the only variables. */
export function renderQueryTemplate(template, { airport, flights }) {
  return template.replaceAll("{airport}", airport).replaceAll("{flights}", flights.join(" "));
}
