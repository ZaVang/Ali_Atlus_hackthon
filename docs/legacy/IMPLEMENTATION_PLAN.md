# Implementation plan — handoff contract

Project: **Journey Risk Pricing & Recovery Agent** — prices the disruption risk of an entire journey (connection fragility first, then weather and operational exposure) before it settles, and turns that price into consent-based protection and recovery on both sides of the counter. The narrative framing lives in [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) ("The proposition: Journey Risk Pricing").

Status: ready for implementation. Deadline: 30 August 2026, 23:59 SGT. Deliverable: 3-minute recorded demo video (English UI, Chinese subtitle narration).

## 0. Read first

**The founding story is the source of every requirement.** Before making any design decision, read “Field evidence — the founding story” in [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md). The founder missed a 100-minute Seattle connection that airline support declared fine, waited 15 hours with no hotel, and later watched the same airline proactively buy volunteers with a large voucher when *it* had an operational problem. When a decision is ambiguous, ask: “would this have helped in those two moments?”

Authoritative documents, in priority order:

1. This plan (how to build, milestones, acceptance).
2. [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) (what and why, two-sided balance principle).
3. [ATLAS_INTEGRATION.md](../ATLAS_INTEGRATION.md) (integration facts, provenance labels, safe failure).
4. [README.md](../../README.md) (constraints and definition of done).

## 1. What we are building

A single Vite + React + TypeScript web app with two linked decision views plus a separate user-testable itinerary lab:

- **Traveller flow** — a 5-step guided wizard: itinerary & timeline → confidence assessment with explainable factors → priority selection → ranked recovery options → explicit approval → result + audit trail.
- **Airline operations view** — a 2-panel decision-support board: risky-connection board with cost comparison, and recovery capacity + targeted volunteer solicitation with an incentive ladder.
- **Try an itinerary lab** — search origin → connection → destination flight legs, choose returned quotes, supply/confirm timetable fields, and run a clearly labelled connection-risk scenario. It is separate from the fixed Seattle reviewer story.

Both views read from the same risk-pricing model (the connection-confidence engine is its first priced risk domain). No action ever happens without explicit traveller approval. Every step writes to the audit trail.

Demo data runs on two tracks:

- **Seattle track**: labelled fixtures (Sandbox has no North America inventory). Never present fixture data as Atlas data.
- **Live track**: PVG→SIN search against the real Atlas Sandbox through the dev proxy. Labelled “Atlas flight data”.

## 2. Already done (do not redo — extend it)

| Item | Where | State |
| --- | --- | --- |
| Project scaffold, build passes | `package.json`, `vite.config.ts`, `tsconfig.json` | verified |
| Credential-safe dev proxy (`/api/atlas/*` injects secrets server-side) | `vite.config.ts` | verified live |
| Domain types + 4 provider interfaces | `src/domain/types.ts` | done |
| `MockAtlasFlightProvider` + fixtures | `src/providers/mock-atlas.ts`, `src/data/fixtures.ts` | done |
| `SandboxAtlasFlightProvider` (search.do mapping) | `src/providers/sandbox-atlas.ts` | verified live (14 real PVG→SIN offers rendered) |
| Confidence model (factor sum + variance + normal CDF) | `src/providers/risk.ts` | verified (182±17 min vs 100 min window → high risk) |
| Two-sided recovery ranking (priority-driven) | `src/providers/recovery.ts` | done |
| In-memory audit provider | `src/providers/audit.ts` | done, needs UI |
| Utility scripts (smoke test, route probe, proxy check) | `scripts/` | keep for debugging |

Known TODOs already in code: segment parsing from `routingIdentifier` is best-effort (marked TODO in `sandbox-atlas.ts`); `order.do`/`pay.do` not wired (booking stays simulated — correct per constraints).

## 3. Locked decisions (do not relitigate)

- Tech stack: Vite + React + TS, no component library, plain CSS (single `src/styles.css` + CSS variables).
- Atlas integration: ATRIP REST API via the dev proxy. Credentials only in `.env.local`, never imported into `src/`.
- Provider switch: `VITE_FLIGHT_PROVIDER` (`mock` | `atlas-sandbox`). Current local value: `atlas-sandbox`.
- Rebooking action = book recovery offer + simulated void of the original ticket; label “Demo simulation” until Sandbox servicing is verified.
- Risk factor provenance: immigration/baggage/re-check/security/walking are “Estimated transfer process”; confidence score is “Agent estimate”; offers are “Atlas flight data” or “Demo fixtures”; action results are “Sandbox action” or “Demo simulation”.
- Airline view is decision support only: no automatic compensation, no fare alteration, no traveller discrimination.
- Language: English UI copy; Chinese subtitles are added to the video later, not built into the app.

## 4. Locked decision: traveller ↔ ops linkage

Decision: **lightweight drill-down over a shared demo session.**

- One React context `DemoSessionProvider` (`src/state/session.tsx`) holds: itinerary, assessment, selected priority, ranked options, approved option, action result, audit trail, and a `protectedConnectionIds` set.
- The ops board’s “view traveller story” action switches the view to the traveller flow for that connection (drill-down).
- When the traveller approves and the action completes, `protectedConnectionIds` updates; the ops board row flips to “Protected” and the cost-comparison widget shows the avoided cost. This is the closing loop of the demo.
- No router library; a single `view` state field (`traveller` | `ops`) in the session.

Rationale: tells the full two-sided story in 180 seconds with minimal engineering; both views stay independent components, so one failing never blocks the other during recording.

## 5. Screen inventory

### Traveller flow (wizard, left step rail + content)

| # | Screen | Shows | Interaction | Audit event |
| --- | --- | --- | --- | --- |
| T1 | Itinerary & timeline | PVG→SEA→DEN card, segment times, 100-min connection highlighted, “Demo fixtures” badge | “Assess connection” button | `input` |
| T2 | Assessment | Confidence % + risk level badge; waterfall of the 5 factors with ranges and provenance pills; arrival-bank callout (“3 wide-bodies landed 09:00–09:40”); uncertainty band; summary sentence | “See recovery options” | `evidence` |
| T3 | Priority | 3 selectable cards: Earliest arrival / Avoid overnight / Lowest cost | select one | `input` |
| T4 | Recovery options | Ranked cards: flight, departure, wait, extra cost, confidence, ladder level (L1/L3), airline marginal cost pill; live-track panel with real PVG→SIN offers labelled “Atlas flight data”; top pick highlighted as recommendation | “Choose & review” | `recommendation` |
| T5 | Approve → Result → Audit | Change summary (old vs new), explicit checkbox + “Approve rebooking” button; after execution: result banner with label; full audit timeline | approve → execute | `consent`, `action`, `result` |

Hard rules: the approve button is disabled until the checkbox is ticked; nothing executes before consent; audit timeline renders every recorded entry with its provenance label.

### Airline operations view

| # | Panel | Shows | Interaction |
| --- | --- | --- | --- |
| O1 | Risk board — priced connections | Table: flight pair, date, connection min, confidence, risk badge, expected misconnect cost, proactive cost, status (Flagged / Protected / Offer sent); cost-comparison widget for the selected row (bar: $340 expected vs $80 proactive) | row select; “view traveller story” drill-down (T1) |
| O2 | Recovery capacity & volunteers | SEA→DEN candidates ranked by load factor (lowest first) with marginal-cost labels; volunteer campaign card: SEA→ICN→PVG quota 12, incentive ladder rungs $200/$500/$900, projected acceptance per rung, “Send targeted offer” (simulated, writes audit, flips O1 row to “Offer sent”) | send offer (simulated) |

## 6. Fixture datasets

Traveller fixtures exist in `src/data/fixtures.ts` (itinerary, 5 factors, 3 recovery options, PVG→SIN mock offers). Add `src/data/ops-fixtures.ts`:

- `flaggedConnections`: 5 rows. Row 1 = the Seattle story (confidence from the risk provider; expected cost $340 vs proactive $80; status Flagged). Rows 2–5 = additional APAC international connections (e.g. SIN→SYD 95 min, HKG→SIN 75 min, PVG→NRT 90 min, BKK→SIN 85 min) with precomputed confidence values and costs; one row pre-set to “Protected” to show state variety.
- `recoveryCapacity`: reuse `seaDenRecoveryOptions` enriched with load-factor bars.
- `volunteerCampaign`: SEA→ICN→PVG, quota 12, reason string “Payload restriction after airspace closure”, ladder `[{incentive:200, projectedAccept:3},{500,7},{900,12}]`, ceiling note “field case ceiling: $2,000 voucher”.

Live-track enrichment rule: real PVG→SIN offers carry real price/segments (“Atlas flight data”); any derived fields the API does not provide (load factor, wait time) come from fixtures and are labelled “Agent estimate”.

## 7. UI baseline

- Light theme; CSS variables in `:root`. Primary navy `#0f2a43`, accent sky `#2f7fd1`, success `#1f9d61`, warning `#d98a1f`, danger `#c94f3d`; background `#f5f7fa`, cards white, radius 10px, subtle shadows.
- System font stack; tables use tabular numerals for times/prices.
- Badges: risk levels (red/amber/green), provenance pills (neutral grey outline, always visible next to the data they qualify).
- No charts library: waterfall = horizontal bars in CSS; cost comparison = two bars.
- Layout max width 1080px, wizard step rail on the left; ops view is a two-column grid.
- All copy in English; keep sentences short (video subtitle friendliness).

## 8. Engineering red lines

1. Components never call Atlas directly — only through the providers in `src/providers/`.
2. Every displayed number carries its provenance label per the table in ATLAS_INTEGRATION.md.
3. Any state-changing action records an audit entry before and after execution.
4. Sandbox failure → catch `ProviderUnavailableError`, fall back to labelled fixtures, show a “running on fixtures” banner. Never render invented data as Atlas data.
5. No passport/nationality/immigration-status fields anywhere.
6. Keep `npm run build` green; run it after every milestone.

## 9. Milestones and acceptance

Time budget assumes start 18 Aug; keep ≥3 days before the deadline for recording and polish.

### M1 — Passenger flow complete (target: 21 Aug)

Build T1–T5 on the Seattle fixtures in mock mode.

Acceptance:
- The full Seattle story runs with `VITE_FLIGHT_PROVIDER=mock` and zero credentials.
- Factor waterfall shows all 5 factors with ranges and “Estimated transfer process” labels; arrival-bank callout visible.
- Priority selection changes ranking order observably.
- Approve button requires the consent checkbox; execution shows a labelled result.
- Audit timeline shows input → evidence → recommendation → consent → action → result.
- All six README definition-of-done items pass in this mode.

### M2 — Airline view + closed loop + live track (target: 24 Aug)

Build O1–O2, the shared session, drill-down, and wire the live PVG→SIN panel in T4.

Acceptance:
- Ops board shows 5 flagged connections with the cost-comparison widget.
- Drill-down from row 1 reaches T1; after approval, the row flips to “Protected” and the avoided-cost delta is shown.
- Volunteer ladder renders; “send offer” is simulated, labelled, and audited.
- With `atlas-sandbox`, T4 live panel shows real offers labelled “Atlas flight data”; removing credentials falls back to fixtures with a banner.

### M3 — Polish + rehearsal (target: 27 Aug)

UI consistency pass, protection-bundle upsell card (risk-priced, one line under the T2 summary: “Protection bundle available — priced by your confidence score”), empty/loading/error states, README run instructions updated (mock ↔ sandbox switch), full 180-second rehearsal timed.

Acceptance: rehearsal fits 180s ± 10s; no unlabeled data anywhere; build green.

### M4 — Record + submit (target: 29 Aug, buffer 30 Aug)

Record the screen capture, add Chinese subtitle narration, final check against the demo beats in PROJECT_CONTEXT.md, submit.

## 10. Handoff checklist for the implementation team

- [ ] Read the founding story section in PROJECT_CONTEXT.md first.
- [ ] Run `npm install`, `npm run dev`, confirm the scaffold check page shows live PVG→SIN offers (needs `.env.local` credentials) or mock fallback.
- [ ] Work milestone by milestone; verify each acceptance list before moving on.
- [ ] Never commit `.env.local` or any credential; never hardcode them.
- [ ] When a requirement seems missing, trace it to the founding story before inventing scope.
