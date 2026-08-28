# How I built this project with Qoder

简体中文版：[我如何用 Qoder 构建这个项目](QODER_USAGE.zh-CN.md)

> This is not marketing copy; it is a **usage record with an evidence index**. Every claim below has a traceable trace in the repository or in Qoder session history (see "Evidence index" at the end).

## One-line summary

The entire project — reading the hackathon brief, shaping the narrative, researching Atlas, writing the code, rehearsing the judge walkthrough, and finally the adversarial audit plus acceptance gate — was built across **4 Qoder sessions** (2 of them in Quest mode). I owned product judgement and hard constraints; Qoder owned research, implementation, self-review, and the gate.

## Development timeline

| Date | Session type | What happened |
|---|---|---|
| 08-17 | **Quest mode** | Read the project docs before touching anything; derived goals backwards from "what must the 3-minute demo show"; completed the Atlas integration study (ATRIP REST API vs Skill CLI); configured Sandbox credentials and smoke-tested them; I wrote my real Seattle missed-connection story into the plan as the origin of every requirement |
| 08-19 | Agent mode | Implemented the first demonstrable demo from the plan; I played the "judge who knows nothing" while Qoder explained each panel screen by screen; narrative convergence (OTP insight, risk-pricing exploration); designed and injected the LLM layer (`AgentProvider` as a peer of the four existing providers, credentials injected via server-side proxy); added bilingual READMEs |
| 08-24 | **Quest mode** | Second pivot: from "connection integrity" narrative toward "risk pricing"; the Quest produced a plan, then executed it strictly (editing the plan file was explicitly forbidden); stage results delivered as Canvas visual reports; wrote the judge walkthrough script; pasted an external audit (62/100) into the session and reconciled it point by point |
| 08-25 | Agent mode + **Subagent** | Judge-perspective self-scoring → three high-leverage improvements; had Qoder generate the automated acceptance gate `npm run verify` (44 assertions); dispatched a CodeReview subagent for an adversarial audit (56/100, 13 deductions), then fixed them point by point and re-verified fully green |

## Qoder capabilities used, with evidence

- **Quest mode**: both major phases (project kickoff, pivot) ran as Quests; each produced a plan file, after which the session entered "execute only, do not edit the plan" mode.
- **Contract-first**: the product contract `docs/CONNECTION_INTEGRITY_DEMO.md` was drafted and revised inside sessions; UI copy, provider boundaries and acceptance checks are all derived from it.
- **Canvas reports**: Quest phases delivered 4 Canvas visual reports (narrative research, agent-injection design, weather extension, demo completion).
- **Repo Wiki**: a Qoder-generated wiki was used to build global understanding quickly (the pre-pivot edition is superseded, see `.gitignore`).
- **Browser verification**: 88 pre-pivot screenshots remain ignored legacy exploration evidence. The curated final product bundle under `verify-screenshots/current/` is now tracked and clone-reproducible, but it demonstrates product state—not Qoder session/Quest/Canvas provenance. Later verification upgraded to "I watch it myself and give feedback".
- **Memory system**: hard-won lessons were persisted as long-term memories — e.g. "async provider results writing shared React state need a generation guard against stale overwrites", "Vite middleware reading non-VITE_ variables needs explicit loadEnv", "LLM role boundary: speak and judge, never execute" — and were directly reused in later sessions.
- **Subagent adversarial audit**: before the deadline an independent CodeReview subagent audited the whole repository as a hostile judge; all 13 deductions were reconciled, 11 fixed, and the lessons were encoded into gate regexes to prevent regressions.

## Division of labour: I decide, Qoder executes and pushes back

This project was not one-shot generated; it is a clear collaboration chain:

**I provided**: the real pain point (a 15-hour stranding in Seattle), narrative direction, hard constraints, and final acceptance (by watching it myself).

**Qoder provided**: domain research (Fly-Thru policy, OTP concept, ATLAS API), all implementation, self-audit, and the automated gate.

Concrete moments:

- **Origin of requirements**: I told the Seattle missed-connection story in the session and insisted "the docs must record my real experience — it is the starting point of all requirements". It became chapter one of the plan and ultimately the foundation of the product narrative.
- **I vetoed, Qoder corrected**: an external audit suggested labelling the airline's `$80` proactive-intervention cost as a "protection premium". I added a hard constraint: "do not call it a premium — that turns a missing price into an invented paid product". Qoder rephrased it honestly as "Airline-funded proactive cost".
- **I pasted the external audit (62/100) verbatim** into the session; Qoder verified every point against live code before fixing, rather than accepting the list blindly.
- **I explicitly requested an adversarial audit**: in the final round I said "dispatch a subagent to do an adversarial audit and score the project as a judge" — it returned 56/100 with 13 deductions; the subsequent fixes included physically deleting all legacy code and upgrading the gate from string checks to behavioural assertions.

## How this usage echoes the hackathon theme

The hackathon theme is Agentic AI. The way we used Qoder is itself agentic: **plan first, tool execution, memory reuse, independent-agent adversarial audit**. The product itself enforces the same governance philosophy — the LLM only speaks and never executes; ranking, execution and consent stay in the deterministic engine. The build tool and the product are two applications of the same set of principles.

## Evidence index

| Evidence | Location |
|---|---|
| 4 session records (2 Quests: task-2f5, task-e19) | Qoder conversation history |
| 4 Canvas stage reports (narrative research / agent injection / weather extension / demo completion) | Qoder Canvas |
| 88 browser-verification screenshots (legacy exploration evidence, pre-pivot product) | `verify-screenshots/legacy/` |
| Curated current submission visuals (19 PNGs, indexed below) | `verify-screenshots/current/` |
| Acceptance gate with 95 assertions (includes numeric unit tests for rubric boundaries, deterministic receipt/cache ownership, screening/ranking rules, the policy registry and the brief whitelist) | `scripts/verify-acceptance.mjs` (`npm run verify`) |
| Product contract | `docs/CONNECTION_INTEGRITY_DEMO.md` |
| Judge walkthrough script | `docs/DEMO_WALKTHROUGH.zh-CN.md` |
| Archived exploration (pre-pivot docs) | `docs/legacy/` |

### Tracked current-product visual bundle (`verify-screenshots/current/`)

The bundle is committed with the submission. The numbered captures from 1–10 preserve provider/research evidence gathered on 25–26 Aug; the final 11–14 captures and Figma board preview show the post-audit result-first product. Product visuals do not substitute for the external Qoder session/Quest/Canvas export.

| File | What it shows | Data path |
|---|---|---|
| `current-1-header.png` | Top bar with view tabs and the Flight/Agent provider badges | Flight = atlas-sandbox live search |
| `current-2-itinerary-input.png` | `Try an itinerary` search form against the PVG → KUL → SIN case | Flight = atlas-sandbox live search |
| `current-3-assessment.png` | Deterministic Receipt plus named-baseline Agent evidence: time fit and ticket protection apply only to that baseline | Flight = atlas-sandbox live search · Agent = mock |
| `current-4-live-research-fallback.png` | Complete mock-agent conclusion panel (an Agent: mock path example) | Flight = atlas-sandbox live search · Agent = mock |
| `current-4-live-research.png` | `Check transfer evidence with Agent` live evidence-chain result: tiered sources (OFFICIAL×1 + COMMUNITY×2), search-round telemetry (1 round, ~27 s), and a named-baseline verdict; deterministic comparison chooses | Flight = atlas-sandbox live search · Agent = deepseek live |
| `current-5-airline-side.png` | Airline watch side: simulated inbound-delay event and the consent-gated intervention | Flight = atlas-sandbox live search · Agent = mock |
| `current-6-audit-trail.png` | Persisted audit trail: consent and proposal events with timestamps and source labels | Flight = atlas-sandbox live search · Agent = mock |
| `current-7-honest-banner.png` | Honest search-failure banner: no recommendation is generated without live provider data | Flight = atlas-sandbox live search |
| `current-8-policy-pill.png` | Itinerary Lab Policy pill (AirAsia Fly-Thru · KLIA Terminal 2 · 60 min minimum + 90 min buffer · source link) with 68 returned pairs and combination cards | Flight = atlas-sandbox live search · policy resolved from the `connection-policies` registry |
| `current-9-scenario-replay.png` | Airline view Scenario replay timeline (four steps, three done + one active) with the insufficient verdict, the intervention proposal and audit entries sourced "Scenario replay · demo simulation" | Deterministic demo fixture replay (fully simulated) |
| `current-10-hosted-demo.png` | Real first screen of the Vercel-hosted mock build (Flight: mock / Agent: mock badges, hero copy, Policy pill) | Mock static hosted build (no credentials) |
| `current-11-final-desktop-main.png` | Final desktop entry and two named options after the 95-point audit | Mock static build · current final UI |
| `current-12-resilience-receipt-mobile.png` | Final Connection Resilience Receipt, named baseline Agent evidence, and deterministic consent action | Mock static build · deterministic fixture |
| `current-13-airline-replay-mobile.png` | Final 390px airline scenario replay and deterministic result | Mock static build · simulated +60-minute event |
| `current-14-itinerary-policy-mobile.png` | Final 390px Itinerary Lab policy source and transparent ranking | Mock static build · no horizontal overflow |
| `figma-product-audit-board.png` | Exported preview of the editable 95/100 Figma audit board | Human product audit; source link in `docs/SUBMISSION_ASSETS.md` |
