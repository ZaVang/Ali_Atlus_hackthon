# Connection Integrity Agent — current demo contract

This is the authoritative product contract for the current main demo. Earlier Journey Risk Pricing material remains useful background, but does not define the current demo's claims.

## Product promise

**Sellable is not the same as protected.** Before purchase, the agent tells a traveller which of two available itineraries it would choose, based on connection-time fit and researched KUL transfer evidence. It reports ticket protection separately, rather than mistaking an absent PNR/Fly-Thru flag for a claim that the connection time is inadequate. After purchase, an airline can recheck that same connection when an operational event reduces its margin, then prepare a consent-based alternative.

The product deliberately does **not** claim a calibrated misconnection probability, an airport queue forecast, or a real-time flight-status feed.

## Main scenario

An ATRIP Sandbox offer observed on 2026-08-24:

| Option | Routing | KUL connection | Fare | Role |
| --- | --- | ---: | ---: | --- |
| Cheapest | D73331 + AK727, PVG → KUL → SIN | 115 min | $133.91 | Short, cheaper candidate |
| More buffer | D73331 + AK707, PVG → KUL → SIN | 185 min | $148.10 | Longer-buffer candidate |

Evidence shown in the product:

- **ATRIP Sandbox offer:** schedule, flight numbers and fare. It does not expose verified single-PNR, Fly-Thru or baggage-through status in the current search contract.
- **AirAsia public Fly-Thru policy:** at KLIA Terminal 2, eligible Fly-Thru connections use a published 60-minute to 18-hour connection window. The policy applies only to eligible single-booking/Fly-Thru itineraries. Source: <https://support.airasia.com/s/article/Does-AirAsia-provide-stop-over-en?language=km>.

## Traveller decision contract

The product keeps two distinct facts visible. Neither is a calibrated probability of catching a flight.

| Output | Deterministic / transparent rule | Meaning |
| --- | --- | --- |
| `Connection fit: insufficient` | Remaining time is below the published 60-minute Fly-Thru minimum | The planned connection no longer meets the public time rule. |
| `Connection fit: tight` | Meets 60 minutes, but leaves less than 90 additional planning minutes | Workable on the stated schedule, but the longer-buffer option materially improves resilience. |
| `Connection fit: likely comfortable` | Meets 60 minutes and leaves at least 90 additional planning minutes, unless route-specific research contradicts it | A transparent planning judgment, not an OTP-derived guarantee. |
| `Ticket protection: confirmed / not confirmed` | Confirmed only when the supplied offer proves eligible single-booking / Fly-Thru protection | A separate booking-contract fact. An absent ATRIP flag must not downgrade time fit. |

The 90-minute planning buffer is deliberately visible in the UI. It is a product heuristic for this demo, not a historical calibration claim. The LLM searches public official and community evidence for KUL terminal and transfer context, compares the two supplied times and fares, then returns one recommendation. Evidence search is bounded at two rounds: when the first round finds no relevant official source, the agent reformulates the official query and searches exactly once more; the round count and the retry query are disclosed in the UI. If no official evidence is found after both rounds, the run fails closed instead of assessing (a disclosed fallback policy input may substitute only where explicitly labelled as such). It may not invent a baggage-through flag, PNR, MCT, probability or airline commitment.

## Configurable evidence-threshold framework

The 60 + 90 pair is **not** a universal constant: it is the published AirAsia KUL policy's parameters, carried as one registered policy entry to demonstrate the mechanism. The framework is a per-airline/airport configurable evidence-threshold registry (`src/domain/connection-policies.mjs`, shared verbatim by the bundled UI and the standalone Node service). Every consumer resolves the applicable entry for the itinerary instead of carrying magic numbers:

- The time-fit rubric (`src/domain/rubric.ts`) takes the published minimum and planning buffer as parameters.
- The Itinerary Lab screening floor, pairing cap and ranking rules (`src/domain/itinerary-rules.ts`) take the resolved policy object.
- The server-side evidence search (`server/logic.mjs`) takes the official-domain gate, the fallback query templates and the disclosed policy input from the same entry; the planning rubric in both prompts is rendered from it.

Adding a policy for a new airline/airport means registering one entry — no rule code changes. Entry shape (abridged from `connection-policies.d.mts`):

```ts
export interface ConnectionPolicy {
  id: string;
  label: string;
  connectionAirports: string[];   // matching: IATA airports this policy applies to
  flightPrefixes: string[];       // matching: carrier prefixes for disclosed-fallback eligibility
  publishedMinimumMinutes: number;
  planningBufferMinutes: number;
  maxConnectionMinutes: number;
  policySource: { description: string; url?: string; illustrative?: boolean };
  officialDomains: string[];      // official-tier evidence domain whitelist
  queryTemplates: { official: string; community: string; retry: string };
  disclosedFallback: { title: string; url: string; summary: string } | null;
}
```

Scope, honestly stated:

- The registry currently ships **one sourced entry** (`kul-airasia-flythru`, 60 + 90, sourced from the AirAsia Fly-Thru article above) and **one illustrative template entry** (`pvg-illustrative-template`) whose `policySource.illustrative` flag states it is not a verified published policy. It exists to prove the mechanism extends beyond KUL; its numbers must be replaced with sourced parameters before anyone relies on them.
- When no entry matches the itinerary, the product takes an explicit **no-policy path**: the Lab keeps time-compatible pairs but discloses that no policy parameters are configured and refuses to rank them against borrowed numbers; the evidence search uses generic, assumption-free query templates with no domain gate, and fails closed if no official source is found. It never silently reuses another airport's 60 + 90.
- The registry does not make this product globally covered. Coverage is exactly the registered entries, and every disclosed parameter points at its `policySource`.

## Live itinerary chooser

`Try an itinerary` is the live ATRIP exercise surface. It performs two point-to-point searches, retains every provider-returned pair that has usable timetable fields and clears the **screening floor of the resolved connection policy** (60 minutes for the KUL entry; routes with no configured policy keep only time-compatible pairs and disclose the gap), then ranks the compatible pairs. The floor is derived from the registered policy entry but is not asserted to be an MCT for an independently assembled self-transfer. Because the two legs are separate ATRIP searches, every resulting pair is labelled **independent self-transfer** and `Ticket protection not confirmed`; it is never represented as a single ATRIP itinerary, a feasible self-transfer guarantee, or a protected connection.

The traveller may choose `Comfortable connection`, `Lowest total fare`, or `Earliest arrival`, or enter free text. The LLM maps the text to one of those displayed priorities. Ranking itself is deterministic and auditable from the returned schedule, fare and visible connection-fit rule. `Comfortable connection` aims for the resolved policy's comfort target — 150 minutes under the KUL entry (60-minute public minimum plus 90-minute planning buffer) — rather than maximizing airport waiting time.

## Two-sided demo

### Traveller: before purchase

1. Show the two ATRIP-derived options.
2. Ask the Connection Integrity Agent to compare them, using one official and one community research query for KUL / AirAsia transfer context.
3. Show a decision first: 115 minutes is `tight` (55 minutes above the public minimum); 185 minutes is `likely comfortable` (125 minutes above it). The agent recommends the 185-minute choice when its $14.19 premium is acceptable.
4. Separately show `Ticket protection: not confirmed`, because ATRIP did not return a single-PNR / Fly-Thru / baggage-through flag. This is a disclosure, not a false claim that 185 minutes is inadequate.

### Airline: after an operational event

1. The traveller explicitly carries the Agent-recommended itinerary into the airline watch. If they skip this, the page labels the 115-minute route as a default demo itinerary.
2. Inject a clearly labelled **simulated inbound delay of 60 minutes**.
3. For the 115-minute route, remaining margin becomes 55 minutes, below the published 60-minute rule; the policy returns **Connection fit: insufficient**.
4. The agent prepares the alternate routing as a proposal.
5. Recording an offer is a demo action; the traveller must still review and accept it.

## Acceptance checks

- Every displayed fare and flight schedule carries ATRIP provenance.
- Every public connection rule has a visible source link.
- No screen shows an uncalibrated probability. Time fit and ticket protection are always presented separately.
- Every agent recommendation names the selected or alternative itinerary and states the schedule / fare trade-off.
- The live chooser never ranks or auto-selects a pair below the resolved policy's screening floor (60 minutes under the KUL entry), discloses which registered policy entry drives its thresholds, and labels every assembled pair as an independent self-transfer.
- LLM output is labelled `Agent-generated · <model>` only after a live provider succeeds; otherwise it is labelled `Demo agent fixture`.
- The delay is labelled simulated until an authorized real-time flight-status source is integrated.
- The app builds with `npm run build`, and `npm run verify` re-checks the scenario numbers, the registered KUL policy's 60+90 rubric, the policy registry assertions, every disclosure label and the no-probability rule against the built bundle.
