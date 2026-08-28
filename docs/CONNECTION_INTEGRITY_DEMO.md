# Connection Integrity Agent — current demo contract

This is the authoritative product contract for the current main demo. Earlier Journey Risk Pricing material remains useful background, but does not define the current demo's claims.

## Product promise

**Sellable is not the same as protected.** Before purchase, a deterministic comparison binds the chosen itinerary to its schedule, fare, and published policy floor; the Agent supplies evidence and explanation only. It reports ticket protection separately, rather than mistaking an absent PNR/Fly-Thru flag for a claim that the connection time is inadequate. After purchase, the product replays that same comparison against a simulated operational event and can prepare a consent-based proposal.

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

The 90-minute planning buffer is deliberately visible in the UI. It is a product heuristic for this demo, not a historical calibration claim. The LLM searches public official and community evidence for KUL terminal and transfer context, then returns explanation and evidence only; it does not own the candidate. The deterministic comparison produces one named recommendation and its receipt. Evidence search is bounded at two rounds: when the first round finds no relevant official source, the agent reformulates the official query and searches exactly once more; the round count and the retry query are disclosed in the UI. If no official evidence is found after both rounds, the run fails closed instead of assessing (a disclosed fallback policy input may substitute only where explicitly labelled as such). It may not invent a baggage-through flag, PNR, MCT, probability or airline commitment.

## Live itinerary chooser

`Try an itinerary` is the live ATRIP exercise surface. It performs two point-to-point searches, retains every provider-returned pair that has usable timetable fields and clears the **screening floor of the resolved connection policy** (60 minutes for the KUL entry; routes with no configured policy keep only time-compatible pairs and disclose the gap), then ranks the compatible pairs. The floor is derived from the registered policy entry but is not asserted to be an MCT for an independently assembled self-transfer. Because the two legs are separate ATRIP searches, every resulting pair is labelled **independent self-transfer** and `Ticket protection not confirmed`; it is never represented as a single ATRIP itinerary, a feasible self-transfer guarantee, or a protected connection.

After a pair is selected, the Lab can perform a non-destructive freshness recheck for both legs. In live mode it repeats `search.do` and marks a leg `verified` only when numeric `status == 0` and the exact `routingIdentifier` reappears; `not-found`, malformed, unknown, or unavailable responses remain non-verified. Mock mode reports `snapshot`. This does not call `verify.do`, confirm a PNR/Fly-Thru, lock a fare, book, pay, or service a ticket.

The traveller may choose `Comfortable connection`, `Lowest total fare`, or `Earliest arrival`, or enter free text. The LLM maps the text to one of those displayed priorities. Ranking itself is deterministic and auditable from the returned schedule, fare and visible connection-fit rule. `Comfortable connection` aims for the 150-minute target (60-minute public minimum plus 90-minute planning buffer), rather than maximizing airport waiting time.

## Two-sided demo

### Traveller: before purchase

1. Show the two ATRIP-derived options.
2. Ask the Connection Integrity Agent to compare them, using one official and one community research query for KUL / AirAsia transfer context.
3. Show the deterministic decision first: `D73331 + AK707` is the 185-minute recommendation. Its Connection Resilience Receipt binds the $14.19 premium and +70-minute buffer to those flights; in a +60-minute deterministic replay/counterfactual it leaves 125 minutes while `D73331 + AK727` leaves 55 against the 60-minute published floor.
4. Separately show `Ticket protection: not confirmed`, because ATRIP did not return a single-PNR / Fly-Thru / baggage-through flag. This is a disclosure, not a false claim that 185 minutes is inadequate.

### Airline: after an operational event

1. The traveller explicitly carries the deterministic result into the airline watch. The Agent has checked and explained baseline evidence only. If they skip this, the page labels the 115-minute route as a default demo itinerary.
2. Inject a clearly labelled **simulated inbound delay of 60 minutes**.
3. For the 115-minute route, remaining margin becomes 55 minutes, below the published 60-minute rule; the policy returns **Connection fit: insufficient**.
4. The deterministic replay prepares the alternate routing as a consent-gated proposal; it does not claim a completed recovery.
5. Recording an offer is a demo action; the traveller must still review and accept it.

## Acceptance checks

- Every displayed fare and flight schedule carries ATRIP provenance.
- Every public connection rule has a visible source link.
- No screen shows an uncalibrated probability. Time fit and ticket protection are always presented separately.
- Every Agent evidence panel names its baseline itinerary and scheduled minutes; the deterministic Receipt separately names the final candidate and schedule / fare trade-off.
- The live chooser never ranks or auto-selects a pair below the disclosed 60-minute screening floor, and labels every assembled pair as an independent self-transfer.
- LLM output is labelled `Agent-generated · <model>` only after a live provider succeeds; otherwise it is labelled `Demo agent fixture`.
- The delay is labelled simulated until an authorized real-time flight-status source is integrated.
- The app builds with `npm run build`, and `npm run verify` re-checks the scenario numbers, the 60+90 rubric, every disclosure label and the no-probability rule against the built bundle.
