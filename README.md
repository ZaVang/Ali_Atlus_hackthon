# Connection Integrity Agent

[简体中文](./README.zh-CN.md)

An Alibaba Cloud × Atlas Agentic AI Hackathon prototype for one concrete traveller problem: choosing a connection before purchase, then protecting that same selected connection when an operational event threatens it.

> A flight can be sellable without being protected.

## How the agent is governed

The differentiator is not that this demo uses an LLM, but how the LLM is constrained:

- **The agent speaks; it never executes.** The LLM parses traveller preferences, retrieves public transfer evidence and writes structured comparisons. Ranking, the time-fit rubric, the consent gate and every airline action stay in the deterministic engine.
- **Whitelist-validated output.** Every agent response is validated field by field; anything outside the allowed enums or the supplied offer ids is rejected. On failure the product shows no verdict rather than an invented one.
- **Evidence-gated research.** No assessment exists without at least one relevant official source, and only sources that actually contain a transfer/process claim reach the traveller.
- **Secrets never reach the browser.** Atlas, LLM and Tavily credentials live only in the server-side shared module (`server/`), mounted by the Vite dev middleware or the standalone Node service.

## Configurable evidence thresholds, not hard-coded heuristics

The demo's 60 + 90 pair is the published AirAsia KUL Fly-Thru policy's parameters, carried as one entry in a per-airline/airport configurable evidence-threshold registry (`src/domain/connection-policies.mjs`, shared verbatim by the UI bundle and the Node service). The rubric, the Lab's screening/ranking rules and the server evidence search (official-domain gate, fallback query templates, disclosed policy input) all resolve the applicable entry per itinerary; adding a new airline/airport policy means registering one entry, not editing rules. Key fields:

```ts
interface ConnectionPolicy {
  connectionAirports: string[];        // matching condition (airport)
  flightPrefixes: string[];            // matching condition (carrier)
  publishedMinimumMinutes: number;     // e.g. 60 (KUL/AirAsia, sourced)
  planningBufferMinutes: number;       // e.g. 90 (visible planning heuristic)
  policySource: { description: string; url?: string; illustrative?: boolean };
  officialDomains: string[];           // official-evidence domain whitelist
  queryTemplates: { official: string; community: string; retry: string };
  disclosedFallback: { title: string; url: string; summary: string } | null;
}
```

Scope, honestly stated: the registry currently ships one sourced entry (`kul-airasia-flythru`) plus one explicitly `illustrative` template entry proving extensibility; its numbers are not a verified policy and are excluded from runtime resolution. Routes with no verified matching entry take an explicit no-policy path — the UI discloses that no policy parameters are configured and the research uses generic queries with no domain gate, failing closed rather than borrowing another airport's numbers.

## What the current product does

1. **Compare a proven demo case.** Two ATRIP-observed PVG → KUL → SIN options are compared on planned connection time, fare and researched public transfer evidence.
2. **Search a traveller's route.** `Try an itinerary` searches two ATRIP legs when Sandbox credentials are configured, builds every returned pair that clears the resolved policy's screening floor (60 min under the KUL entry), and labels each as an independent self-transfer combination — never a confirmed through-ticket.
3. **Understand a traveller's preference.** The traveller can select lowest fare, earliest arrival or more connection buffer, or describe it in free text. The live Agent maps the text to one visible preference; deterministic ranking then recommends from the displayed facts.
4. **Keep time fit separate from ticket protection.** `Likely comfortable / Tight / Insufficient` is a transparent planning rubric driven by the resolved policy entry — under the registered KUL/AirAsia entry: public 60-minute minimum plus a 90-minute planning buffer. `Ticket protection not confirmed` is a separate disclosure, never a disguised claim that the time is inadequate.
5. **Follow one consented itinerary into operations.** After the traveller confirms the recommendation, the airline watch simulates an inbound delay against that selected itinerary. No booking or servicing action is real.

The authoritative product contract is [docs/CONNECTION_INTEGRITY_DEMO.md](docs/CONNECTION_INTEGRITY_DEMO.md).

## Data and AI boundaries

| Layer | What is real | What is not claimed |
| --- | --- | --- |
| ATRIP Sandbox | Search responses, fares, routing identifiers and any timetable fields returned at query time | Global inventory, a confirmed single PNR, baggage-through or a protected connection |
| Main PVG → KUL → SIN view | An ATRIP-observed offer snapshot, clearly labelled as a snapshot | A real-time repricing or booking result |
| Tavily + LLM | Public-rule and transfer-process research, structured preference parsing, source-backed comparison | Historical missed-connection probability, private chain-of-thought or airline liability |
| Time-fit rubric | The resolved policy entry's parameters — 60-minute public minimum + 90-minute visible planning buffer under the registered KUL/AirAsia entry; unconfigured routes disclose the gap | Calibrated OTP, queue forecast, or a universal rule for every airport |
| Airline action | Consent-required demo proposal | A real booking, void, rebooking or payment |

Only sources that contain a transfer/process claim are shown to the traveller. A live assessment requires at least one relevant official source; otherwise no assessment is presented.

## How this was built with Qoder

The project was developed end-to-end through Qoder's agentic workflow. A full usage record with an evidence index (sessions, Quest plans, Canvas reports, memories, adversarial audits) lives in [docs/QODER_USAGE.md](docs/QODER_USAGE.md) ([中文](docs/QODER_USAGE.zh-CN.md)).

- **Contract-first iteration.** The product contract (`docs/CONNECTION_INTEGRITY_DEMO.md`) was drafted and revised in agent sessions; UI copy, provider boundaries and acceptance checks were all derived from it.
- **Adversarial review loop.** Before each milestone an independent judge-style audit pass reviewed the whole repository (code and docs); every finding was reconciled against live code before being fixed.
- **Agent-generated acceptance gate.** `npm run verify` was produced from the contract's acceptance checks, so each change re-verifies scenario numbers, the registered KUL policy's 60+90 rubric, the policy registry assertions, every disclosure label and the no-probability rule.
- **Provider-level engineering.** The server-side service (`server/`), whitelist validation and fail-closed degradation paths were implemented and refactored through agent-driven edits with `tsc` as the regression gate.

## Demo entry and submission-time hosting

No temporary or anonymous hosted URL is committed. The canonical judge entry is the reproducible **mock** build; a public URL is a submission-time value that must be owned, replaceable and checked before it is shared.

- **Local judge entry:** run `npm run build:mock`, then serve `dist/` with `npm run preview -- --host 127.0.0.1 --port 4173`. The bundle includes `mock-build-manifest.json`, which declares `Flight: mock`, `Agent: mock`, static hosting and `api: not-served`.
- **Stable public entry:** after deploying only that `dist/` to an owned static host, set `PUBLIC_DEMO_URL` locally and run `npm run recording-preflight -- --public-url $env:PUBLIC_DEMO_URL --require-public-url`. The URL is intentionally not stored in this repository.
- **What mock mode covers:** the complete governance surface with no credentials — the PVG → KUL → SIN deterministic recommendation and Connection Resilience Receipt (labelled ATRIP snapshot fixtures), Agent evidence/explanation (labelled demo fixture), the Itinerary Lab (mock fixtures, honest empty-result degradation, policy-entry disclosure for the registered KUL/AirAsia 60 + 90 entry and the explicit no-policy path), and the airline-side delay scenario replay (deterministic, labelled simulation). It does not include live Tavily/LLM research or live flight status.
- **Live mode:** run `npm run dev` locally with credentials in `.env.local`, or run `npm run build` plus `npm run server` on an owned server. A static build intentionally serves no `/api`; booking, payment, rebooking and cloud deployment are not claimed complete.
- **Preflight:** `npm run judge-preflight` checks the mock artifact and boundaries; `npm run recording-preflight` additionally checks the 180-second script, the 15-second opening, bilingual demo anchors and the four official score dimensions. See [Judge and recording preflight](docs/JUDGE_PREFLIGHT.md).
- **Submission assets:** the tracked screenshots, visual demo artifact, Figma audit board, evidence reports and explicit exclusions are indexed in [Submission assets](docs/SUBMISSION_ASSETS.md).

`npm run build:mock` is a one-command, Windows-PowerShell-safe wrapper (`scripts/build-mock.mjs`) that forces `VITE_FLIGHT_PROVIDER=mock` and `VITE_AGENT_PROVIDER=mock` as process environment variables (overriding any `.env.local` values), runs the type check plus production build, writes the static-hosting manifest, and outputs a credential-free `dist/` (no secret carries a `VITE_` prefix, so none can be bundled).

## Run locally

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Use `VITE_FLIGHT_PROVIDER=atlas-sandbox` plus `ATLAS_BASE_URL`, `ATLAS_CLIENT_ID` and `ATLAS_CLIENT_SECRET` for live ATRIP Sandbox search. Without them, the page uses explicitly labelled mock results.

For the live Agent, configure `VITE_AGENT_PROVIDER=deepseek`, `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL` and `TAVILY_API_KEY` in `.env.local`. Secrets remain server-side (Vite dev middleware or the standalone Node service) and must never be committed.

```powershell
npm run build
```

The server-side logic for `/api/atlas`, `/api/agent/chat` and `/api/agent/connection-research` lives in `server/` (`server/logic.mjs`). In dev mode the Vite dev server mounts those exact handlers as middlewares; for deployment, run `npm run server` — a dependency-free Node HTTP service (port 8787, configurable via `PORT`) that serves the three endpoints and, once `npm run build` has produced `dist/`, the built UI from the same process. A static build alone does not serve `/api`. Booking, payment and servicing remain out of scope.

`npm run verify` runs the acceptance gate: a type-checked production build, numeric unit tests for the rubric boundaries (under the registered KUL policy's 60+90), the screening/ranking rules, the policy registry and the brief whitelist, plus automated checks that the shipped bundle honours the contract's acceptance criteria (scenario numbers, the visible rubric disclosure, every disclosure label, and the absence of any uncalibrated probability claim). `live`, `mock`, `snapshot` and `unavailable` are separate states; a green mock gate does not prove a live provider or public deployment.

## Legacy background

Earlier Seattle / Journey Risk Pricing material is archived under [docs/legacy/](docs/legacy/). It documents the founder's original experience and discarded exploration. It is not the current product contract and must not be used to claim probabilities, pricing, or production servicing in this demo.
