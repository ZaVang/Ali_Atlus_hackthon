# Judge scorecard and final audit

This is a conservative, evidence-weighted audit for the requested 30 / 30 / 20 / 20 rubric. It is a preparation tool, not an official judge decision. A document existing is never treated as proof that a live capability, deployment, recording, or Qoder artifact exists.

Status meanings:

- `PASS [automated]`: reproducible by a local command or a source-level regression check.
- `HUMAN`: code or a script is present, but a reviewer must inspect the experience, provenance, or external run.
- `BLOCKED`: the score cannot be raised without an external system, permission, deployment, or artifact that is not in this checkout.
- `WAIVED`: intentionally outside the current product contract; it must not be presented as an implemented feature.

Run the local part with `npm run score`. It runs the mock build, tests, production build, acceptance gate, and offline server smoke. The report is designed to run without credentials and never prints secret values.

## Current conservative score

| Criterion | Max | Current | Evidence posture | Main deduction |
|---|---:|---:|---|---|
| Innovation | 30 | 25 | Local product/code evidence plus human impact judgment | One verified policy and no measured pilot outcome |
| Feasibility | 30 | 21 | Local mock/runtime/security evidence plus [secret-free live smoke evidence](LIVE_SMOKE_EVIDENCE.md) | No authorized flight-status or servicing execution |
| Qoder | 20 | 12 | Reproducible code gates; Qoder provenance remains external | Current Qoder/session screenshots are not in this checkout |
| Demo | 20 | 13 | Deterministic local flow and mock build; recording not supplied | No durable public deployment or formal recording |
| **Total** | **100** | **71** | **Local gates and recorded read-only live smoke PASS; human/external items remain open** | **24 points remain to the 95 target** |

## Innovation — 25 / 30

| Acceptance that a judge can verify | Evidence location | Current | Deduction / dependency |
|---|---|---:|---|
| The product addresses a specific two-sided problem: pre-purchase connection choice and post-event airline intervention. The UI must show both sides without promising a protected ticket. | `src/components/ConnectionIntegrityDemo.tsx`, `src/App.tsx`, `docs/CONNECTION_INTEGRITY_DEMO.md` | 8 / 8 — `PASS [automated]` | No external dependency for the code path; human should still judge clarity. |
| The LLM only parses/explains; ranking, source filtering, consent, and the simulated action remain deterministic and fail closed. | `server/logic.mjs`, `src/providers/bailian-agent.ts`, `src/domain/itinerary-rules.ts`, `tests/server-audit.test.mjs` | 8 / 8 — `PASS [automated]` | Regression checks cover unsafe source, confirmed-protection, tool-plan, Atlas-route, malformed JSON, and body-limit counterexamples. |
| Policy thresholds are sourced and configurable, and an unrelated KUL carrier cannot borrow the AirAsia policy. | `src/domain/connection-policies.mjs`, `src/components/ItineraryLab.tsx`, `tests/connection-policy.test.mjs` | 5 / 7 — `PASS [automated]` | Two points remain: only one verified policy entry is shipped; broader policy coverage needs independently sourced entries and review. |
| The concept is materially novel and creates measurable traveller/airline value. | Product contract and demo flow are inputs, not outcome proof. | 4 / 7 — `HUMAN` | No pilot, avoided-misconnect measurement, airline data, or user study is included. Human judge validation is required. |

The deliberate absence of a calibrated missed-connection probability is `WAIVED`, not a hidden capability. The current evidence cannot support an honest probability claim.

## Feasibility — 20 / 30

| Acceptance that a judge can verify | Evidence location | Current | Deduction / dependency |
|---|---|---:|---|
| A reviewer can run the product with zero credentials in mock mode and see labelled fixtures, deterministic scenario replay, and no invented live offers. | `scripts/build-mock.mjs`, `src/providers/mock-atlas.ts`, `src/providers/mock-agent.ts`, `npm run build:mock` | 8 / 8 — `PASS [automated]` | Local-only acceptance is complete. |
| The live flight search path is a narrow Atlas Sandbox `search.do` adapter with structured segment mapping and server-side credentials. | `src/providers/sandbox-atlas.ts`, `server/logic.mjs`, `vite.config.ts`, `docs/ATLAS_INTEGRATION.md`, `docs/LIVE_SMOKE_EVIDENCE.md` | 8 / 8 — `PASS [recorded live evidence]` | The evidence is read-only and does not prove booking or servicing. |
| The exposed server boundary is bounded, source-safe, endpoint-allowlisted, and fail-closed under missing credentials or malformed input. | `server/logic.mjs`, `tests/server-audit.test.mjs`, `npm run smoke:server` | 5 / 6 — `PASS [automated]` | Local hardening passes; a public deployment health/security check is still external. |
| Real flight status can trigger a real Atlas verify/book/payment/servicing recovery action. | No implementation in `src/` or `server/`; only search is enabled. | 0 / 8 — `BLOCKED` | Requires an authorized status source, Atlas permissions/schemas, consent policy, and a sandbox or production execution proof. Never infer this from the adapter or documentation. |

## Qoder — 12 / 20

| Acceptance that a judge can verify | Evidence location | Current | Deduction / dependency |
|---|---|---:|---|
| The implementation shows an agentic workflow with a product contract, bounded tool use, adversarial checks, and a reproducible handoff. | `docs/QODER_USAGE.md`, `docs/QODER_USAGE.zh-CN.md`, source history and task records outside this checkout | 4 / 7 — `HUMAN` | The repository can point to the workflow, but a judge must inspect the actual Qoder history/export. |
| Qoder output materially shaped the governed implementation rather than merely generating prose. | `server/logic.mjs`, `src/providers/bailian-agent.ts`, `scripts/verify-acceptance.mjs` | 4 / 5 — `HUMAN` | Code is inspectable; external Qoder provenance is not independently verifiable from this checkout. |
| A reviewer can reproduce the acceptance path without Qoder or secrets. | `package.json`, `scripts/run-tests.mjs`, `scripts/verify-acceptance.mjs`, `scripts/final-audit.mjs` | 4 / 4 — `PASS [automated]` | `npm test`, `npm run build`, `npm run verify`, and `npm run smoke:server` are local gates. |
| Current-product Qoder screenshots/session artifacts are attached and match the claimed data path. | Expected `verify-screenshots/current/`; no such directory is present in this checkout. | 0 / 4 — `BLOCKED` | Attach Qoder/session export and reviewer screenshots; do not claim the screenshots are present until they are attached and checked. |

## Demo — 13 / 20

| Acceptance that a judge can verify | Evidence location | Current | Deduction / dependency |
|---|---|---:|---|
| The two-sided demo is deterministic, labels simulation, records consent/proposal events, and does not silently execute a booking. | `src/components/ConnectionIntegrityDemo.tsx`, `docs/CONNECTION_INTEGRITY_DEMO.md` | 5 / 5 — `PASS [automated]` | Local source and acceptance checks cover the flow; human replay is still useful. |
| A zero-credential mock build is reproducible and clearly separates mock, snapshot, and live labels. | `scripts/build-mock.mjs`, `src/data/fixtures.ts`, `npm run build:mock` | 4 / 4 — `PASS [automated]` | The static build intentionally has no `/api`; this is disclosed. |
| A stable public entry is deployed with a health check and a known expiry/ownership state. | README temporary-link disclosure; no deployment manifest or health evidence in the checkout. | 0 / 5 — `BLOCKED` | Requires an Alibaba Cloud/public deployment, ownership, and a reviewer-accessible health check. A temporary URL is not durable proof. |
| The formal three-minute recording is captured, replayed, and matches the shipped build and labels. | `docs/DEMO_VIDEO_SCRIPT.md` is a script/material plan, not a video file. | 4 / 6 — `HUMAN` | Human recording and replay are still required; the script alone cannot pass this acceptance. |

## 95-point gap closure

These are the concrete next gates, not assumptions:

1. `+8` — obtain an authorized flight-status source and Atlas verify/book/payment/servicing permission; run a consented sandbox recovery path and attach the terminal evidence.
2. `+5` — deploy the standalone service/UI to the requested Alibaba Cloud/public environment, verify health, expiry/ownership, secret exclusion, and the exact `/api` behavior.
3. `+5` — attach Qoder session/export evidence and current-product screenshots, then have a human reconcile each screenshot's provider/source label with the live run.
4. `+4` — record and replay the exact three-minute script against a freshly built mock/live artifact; mark any unavailable provider explicitly.
5. `+3` — attach a fresh Atlas/research run plus an outcome/novelty validation artifact (route coverage, response shape, or pilot metric). This does not authorize inventing a probability.

Until those items are completed, the project is locally auditable but not “95-point ready.”

## Chinese audit summary / 中文审计结论

当前保守基线为 **71/100**，距离 95 分目标 **24 分**。`npm run score` 把本地可复现门禁和已记录的只读 live smoke 分开计分；真实 Atlas 履约/航班动态、Alibaba Cloud 公网部署、Qoder 截图与正式视频仍分别保留为 `BLOCKED` 或 `HUMAN`，不会因为 README 或脚本存在而伪造通过。
