# Judge scorecard and final audit

This is a conservative, evidence-weighted audit for the requested 30 / 30 / 20 / 20 rubric. It is a preparation tool, not an official judge decision. A document existing is never treated as proof that a live capability, deployment, recording, or Qoder artifact exists.

Status meanings:

- `TRACKED_REPRODUCIBLE`: reproducible by a local command or tracked source-level regression check.
- `LOCAL_PRESENT_IGNORED`: exists only locally/ignored and is not clone-reproducible or provenance proof.
- `HUMAN_EXTERNAL`: a reviewer must inspect an external experience, provenance, or run.
- `WAIVED`: intentionally outside the current product contract; it must not be presented as an implemented feature.

The single machine-readable source for statuses and dimension allocations is [`JUDGE_EVIDENCE.json`](JUDGE_EVIDENCE.json). `npm run score` derives its reported dimension totals from that file, runs the local gates, and never prints secret values.

## Current conservative score

| Criterion | Max | Current | Evidence posture | Main deduction |
|---|---:|---:|---|---|
| Innovation | 30 | 25 | Local product/code evidence plus human impact judgment | One verified policy and no measured pilot outcome |
| Feasibility | 30 | 21 | Local mock/runtime/security evidence plus [secret-free live smoke evidence](LIVE_SMOKE_EVIDENCE.md) | No authorized flight-status or servicing execution |
| Qoder | 20 | 12 | Reproducible code gates; Qoder provenance remains external | Qoder session/Quest/Canvas export is not attached |
| Demo | 20 | 15 | Deterministic local flow, mock build, visible result-first hierarchy, and browser walkthrough contract | Video recording is excluded from this sprint; public deployment is intentionally waived for this demo-only scope |
| **Total** | **100** | **73** | **Tracked local gates and recorded read-only live smoke; human/external items remain open** | **22 points remain to the 95 target** |

## Innovation — 25 / 30

| Acceptance that a judge can verify | Evidence location | Current | Deduction / dependency |
|---|---|---:|---|
| The product addresses a specific two-sided problem: pre-purchase connection choice and post-event airline intervention. The UI must show both sides without promising a protected ticket. | `src/components/ConnectionIntegrityDemo.tsx`, `src/App.tsx`, `docs/CONNECTION_INTEGRITY_DEMO.md` | 8 / 8 — `TRACKED_REPRODUCIBLE` | No external dependency for the code path; human should still judge clarity. |
| The LLM only parses/explains; ranking, source filtering, consent, and the simulated action remain deterministic and fail closed. | `server/logic.mjs`, `src/providers/bailian-agent.ts`, `src/domain/itinerary-rules.ts`, `tests/server-audit.test.mjs` | 8 / 8 — `TRACKED_REPRODUCIBLE` | Regression checks cover unsafe source, confirmed-protection, tool-plan, Atlas-route, malformed JSON, and body-limit counterexamples. |
| Policy thresholds are sourced and configurable, and an unrelated KUL carrier cannot borrow the AirAsia policy. | `src/domain/connection-policies.mjs`, `src/components/ItineraryLab.tsx`, `tests/connection-policy.test.mjs` | 5 / 7 — `TRACKED_REPRODUCIBLE` | Two points remain: only one verified policy entry is shipped; broader policy coverage needs independently sourced entries and review. |
| The concept is materially novel and creates measurable traveller/airline value. | Product contract and demo flow are inputs, not outcome proof. | 4 / 7 — `HUMAN_EXTERNAL` | No pilot, avoided-misconnect measurement, airline data, or user study is included. Human judge validation is required. |

The deliberate absence of a calibrated missed-connection probability is `WAIVED`, not a hidden capability. The current evidence cannot support an honest probability claim.

## Feasibility — 21 / 30

| Acceptance that a judge can verify | Evidence location | Current | Deduction / dependency |
|---|---|---:|---|
| A reviewer can run the product with zero credentials in mock mode and see labelled fixtures, deterministic scenario replay, and no invented live offers. | `scripts/build-mock.mjs`, `src/providers/mock-atlas.ts`, `src/providers/mock-agent.ts`, `npm run build:mock` | 8 / 8 — `TRACKED_REPRODUCIBLE` | Local-only acceptance is complete. |
| The live flight search path is a narrow Atlas Sandbox `search.do` adapter with structured segment mapping and server-side credentials. | `src/providers/sandbox-atlas.ts`, `server/logic.mjs`, `vite.config.ts`, `docs/ATLAS_INTEGRATION.md`, `docs/LIVE_SMOKE_EVIDENCE.md` | 8 / 8 — `TRACKED_REPRODUCIBLE` | The evidence is read-only and does not prove booking or servicing. |
| The exposed server boundary is bounded, source-safe, endpoint-allowlisted, and fail-closed under missing credentials or malformed input. | `server/logic.mjs`, `tests/server-audit.test.mjs`, `npm run smoke:server` | 5 / 6 — `TRACKED_REPRODUCIBLE` | Local hardening passes; public deployment is waived for this local demo. |
| Real flight status can trigger a real Atlas verify/book/payment/servicing recovery action. | No implementation in `src/` or `server/`; only search is enabled. | 0 / 8 — `HUMAN_EXTERNAL` | Requires an authorized status source, Atlas permissions/schemas, consent policy, and a sandbox or production execution proof. Never infer this from the adapter or documentation. |

## Qoder — 12 / 20

| Acceptance that a judge can verify | Evidence location | Current | Deduction / dependency |
|---|---|---:|---|
| The implementation shows an agentic workflow with a product contract, bounded tool use, adversarial checks, and a reproducible handoff. | `docs/QODER_USAGE.md`, `docs/QODER_USAGE.zh-CN.md`, source history and task records outside this checkout | 4 / 7 — `HUMAN_EXTERNAL` | The repository can point to the workflow, but a judge must inspect the actual Qoder history/export. |
| Qoder output materially shaped the governed implementation rather than merely generating prose. | `server/logic.mjs`, `src/providers/bailian-agent.ts`, `scripts/verify-acceptance.mjs` | 4 / 5 — `HUMAN_EXTERNAL` | Code is inspectable; external Qoder provenance is not independently verifiable from this checkout. |
| A reviewer can reproduce the acceptance path without Qoder or secrets. | `package.json`, `scripts/run-tests.mjs`, `scripts/verify-acceptance.mjs`, `scripts/final-audit.mjs` | 4 / 4 — `TRACKED_REPRODUCIBLE` | `npm test`, `npm run build`, `npm run verify`, and `npm run smoke:server` are local gates. |
| Qoder session/Quest/Canvas provenance is attached and reconciled with the shipped product. | Product visuals are tracked under `verify-screenshots/current/`; Qoder history remains external. | 0 / 4 — `HUMAN_EXTERNAL` | Tracked screenshots demonstrate the product but do not prove Qoder session provenance; attach an external export for human review. |

## Demo — 15 / 20

| Acceptance that a judge can verify | Evidence location | Current | Deduction / dependency |
|---|---|---:|---|
| The two-sided demo is deterministic, labels simulation, records consent/proposal events, and does not silently execute a booking. | `src/components/ConnectionIntegrityDemo.tsx`, `docs/CONNECTION_INTEGRITY_DEMO.md` | 8 / 8 — `TRACKED_REPRODUCIBLE` | Local source and acceptance checks cover the flow. |
| A zero-credential mock build and its visual evidence are reproducible and clearly separate mock, snapshot, and live labels. | `scripts/build-mock.mjs`, `src/data/fixtures.ts`, `verify-screenshots/current/`, `npm run build:mock` | 7 / 7 — `TRACKED_REPRODUCIBLE` | The static build intentionally has no `/api`; the tracked visual bundle is indexed separately from Qoder provenance. |
| A stable public entry is deployed with a health check and a known expiry/ownership state. | `docs/ALIBABA_CLOUD_DEPLOYMENT.md` | WAIVED | The user explicitly scoped this as a local/demo submission with no deployment permission; no public URL is claimed. |
| Formal video recording and replay. | `docs/DEMO_VIDEO_SCRIPT.md` | `WAIVED` | Video is explicitly excluded from this sprint and has no score effect. |

## 95-point gap closure

These are the concrete next gates, not assumptions:

1. `+8` — obtain an authorized flight-status source and Atlas verify/book/payment/servicing permission; run a consented sandbox recovery path and attach the terminal evidence.
2. `+5` — attach Qoder session/export evidence and current-product screenshots, then have a human reconcile each screenshot's provider/source label with the live run.
3. `+3` — attach an outcome/novelty validation artifact (route coverage, response shape, or pilot metric). The fresh smoke is already recorded; only the human outcome/novelty judgment remains. This does not authorize inventing a probability.

Public deployment is intentionally waived for the local/demo submission and is not part of the remaining score gap.

Until those items are completed, the project is locally auditable but not “95-point ready.”

## Chinese audit summary / 中文审计结论

当前保守基线为 **73/100**，距离 95 分目标 **22 分**。公网部署与视频按本 Sprint 标记为 `WAIVED`；当前产品视觉素材已作为 `TRACKED_REPRODUCIBLE` 交付，但真实 Atlas 航班动态/履约和 Qoder session/Quest/Canvas provenance 仍保持 `HUMAN_EXTERNAL`。
