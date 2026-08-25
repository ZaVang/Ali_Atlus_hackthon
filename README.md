# Connection Integrity Agent

[简体中文](./README.zh-CN.md)

An Alibaba Cloud × Atlas Agentic AI Hackathon prototype for one concrete traveller problem: choosing a connection before purchase, then protecting that same selected connection when an operational event threatens it.

> A flight can be sellable without being protected.

## How the agent is governed

The differentiator is not that this demo uses an LLM, but how the LLM is constrained:

- **The agent speaks; it never executes.** The LLM parses traveller preferences, retrieves public transfer evidence and writes structured comparisons. Ranking, the time-fit rubric, the consent gate and every airline action stay in the deterministic engine.
- **Whitelist-validated output.** Every agent response is validated field by field; anything outside the allowed enums or the supplied offer ids is rejected. On failure the product shows no verdict rather than an invented one.
- **Evidence-gated research.** No assessment exists without at least one relevant official source, and only sources that actually contain a transfer/process claim reach the traveller.
- **Secrets never reach the browser.** Atlas, LLM and Tavily credentials live only in the server-side Vite proxies.

## What the current product does

1. **Compare a proven demo case.** Two ATRIP-observed PVG → KUL → SIN options are compared on planned connection time, fare and researched public transfer evidence.
2. **Search a traveller's route.** `Try an itinerary` searches two ATRIP legs when Sandbox credentials are configured, builds every returned pair that clears the public 60-minute floor, and labels each as an independent self-transfer combination — never a confirmed through-ticket.
3. **Understand a traveller's preference.** The traveller can select lowest fare, earliest arrival or more connection buffer, or describe it in free text. The live Agent maps the text to one visible preference; deterministic ranking then recommends from the displayed facts.
4. **Keep time fit separate from ticket protection.** `Likely comfortable / Tight / Insufficient` is a transparent planning rubric: public 60-minute minimum plus a 90-minute planning buffer. `Ticket protection not confirmed` is a separate disclosure, never a disguised claim that the time is inadequate.
5. **Follow one consented itinerary into operations.** After the traveller confirms the recommendation, the airline watch simulates an inbound delay against that selected itinerary. No booking or servicing action is real.

The authoritative product contract is [docs/CONNECTION_INTEGRITY_DEMO.md](docs/CONNECTION_INTEGRITY_DEMO.md).

## Data and AI boundaries

| Layer | What is real | What is not claimed |
| --- | --- | --- |
| ATRIP Sandbox | Search responses, fares, routing identifiers and any timetable fields returned at query time | Global inventory, a confirmed single PNR, baggage-through or a protected connection |
| Main PVG → KUL → SIN view | An ATRIP-observed offer snapshot, clearly labelled as a snapshot | A real-time repricing or booking result |
| Tavily + LLM | Public-rule and transfer-process research, structured preference parsing, source-backed comparison | Historical missed-connection probability, private chain-of-thought or airline liability |
| Time-fit rubric | 60-minute public minimum + 90-minute visible planning buffer | Calibrated OTP or queue forecast |
| Airline action | Consent-required demo proposal | A real booking, void, rebooking or payment |

Only sources that contain a transfer/process claim are shown to the traveller. A live assessment requires at least one relevant official source; otherwise no assessment is presented.

## How this was built with Qoder

The project was developed end-to-end through Qoder's agentic workflow. A full usage record with an evidence index (sessions, Quest plans, Canvas reports, memories, adversarial audits) lives in [docs/QODER_USAGE.md](docs/QODER_USAGE.md) ([中文](docs/QODER_USAGE.zh-CN.md)).

- **Contract-first iteration.** The product contract (`docs/CONNECTION_INTEGRITY_DEMO.md`) was drafted and revised in agent sessions; UI copy, provider boundaries and acceptance checks were all derived from it.
- **Adversarial review loop.** Before each milestone an independent judge-style audit pass reviewed the whole repository (code and docs); every finding was reconciled against live code before being fixed.
- **Agent-generated acceptance gate.** `npm run verify` was produced from the contract's acceptance checks, so each change re-verifies scenario numbers, the 60+90 rubric, every disclosure label and the no-probability rule.
- **Provider-level engineering.** The server-side proxies, whitelist validation and fail-closed degradation paths were implemented and refactored through agent-driven edits with `tsc` as the regression gate.

## Run locally

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Use `VITE_FLIGHT_PROVIDER=atlas-sandbox` plus `ATLAS_BASE_URL`, `ATLAS_CLIENT_ID` and `ATLAS_CLIENT_SECRET` for live ATRIP Sandbox search. Without them, the page uses explicitly labelled mock results.

For the live Agent, configure `VITE_AGENT_PROVIDER=deepseek`, `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL` and `TAVILY_API_KEY` in `.env.local`. Secrets remain server-side in the Vite proxies and must never be committed.

```powershell
npm run build
```

`npm run verify` runs the acceptance gate: a type-checked production build plus automated checks that the shipped bundle honours the contract's acceptance criteria (scenario numbers, the visible 60+90 rubric, every disclosure label, and the absence of any uncalibrated probability claim).

## Legacy background

Earlier Seattle / Journey Risk Pricing material is archived under [docs/legacy/](docs/legacy/). It documents the founder's original experience and discarded exploration. It is not the current product contract and must not be used to claim probabilities, pricing, or production servicing in this demo.
