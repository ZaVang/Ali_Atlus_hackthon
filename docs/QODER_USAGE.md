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
| 08-25 | Agent mode + **Subagent** | Judge-perspective self-scoring → three high-leverage improvements; had Qoder generate the automated acceptance gate `npm run verify` (33 assertions); dispatched a CodeReview subagent for an adversarial audit (56/100, 13 deductions), then fixed them point by point and re-verified fully green |

## Qoder capabilities used, with evidence

- **Quest mode**: both major phases (project kickoff, pivot) ran as Quests; each produced a plan file, after which the session entered "execute only, do not edit the plan" mode.
- **Contract-first**: the product contract `docs/CONNECTION_INTEGRITY_DEMO.md` was drafted and revised inside sessions; UI copy, provider boundaries and acceptance checks are all derived from it.
- **Canvas reports**: Quest phases delivered 4 Canvas visual reports (narrative research, agent-injection design, weather extension, demo completion).
- **Repo Wiki**: a Qoder-generated wiki was used to build global understanding quickly (the pre-pivot edition is superseded, see `.gitignore`).
- **Browser verification**: 88 screenshots verifying every panel's wording and behaviour (see `verify-screenshots/`), later upgraded to "I watch it myself and give feedback".
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
| 88 browser-verification screenshots | `verify-screenshots/` |
| Acceptance gate with 33 assertions | `scripts/verify-acceptance.mjs` (`npm run verify`) |
| Product contract | `docs/CONNECTION_INTEGRITY_DEMO.md` |
| Judge walkthrough script | `docs/DEMO_WALKTHROUGH.zh-CN.md` |
| Archived exploration (pre-pivot docs) | `docs/legacy/` |
