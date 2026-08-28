# Iteration 2 Generator Status

## Result: PASSED

All five Iteration 2 tasks are complete. Source/test/documentation gates passed in the generator run, and the primary agent independently completed the required real-browser 390px validation.

## Completed

1. Deterministic result and Receipt are independent and primary. Agent evidence is a closed native disclosure named `Agent evidence for <baseline flights> · scheduled <minutes>`, so fit/confidence/rationale/Why/next-action retain the baseline identity.
2. Agent evidence cache uses `v6` plus exact `deterministic-choice-baseline-evidence-v6` semantics. v5 is removed/ignored without free-text migration; TTL and whitelist validation remain required.
3. CTA/loading/empty/error/mock and judge-facing materials say the Agent checks/explains evidence and deterministic comparison chooses. Preflight rejects old ownership CTA text.
4. Score gaps are read from `JUDGE_EVIDENCE.json`; waived video is displayed as `WAIVED` with zero scored-gap effect and no `+N` line.
5. PolicyPill has isolated copy/source elements and a readable standalone mobile source link without `overflow-x:hidden` or global nowrap changes.

## Generator acceptance evidence

| Command | Actual result |
|---|---|
| `npm.cmd test` | PASS — 62 tests, 0 failed. |
| `npm.cmd run build` | PASS — TypeScript + Vite production build. |
| `npm.cmd run build:mock` | PASS — static credential-free mock bundle. |
| `npm.cmd run verify` | PASS — 95 passed, 0 failed. |
| `npm.cmd run smoke:server` | PASS — fail-closed routes/input validation. |
| `npm.cmd run judge-preflight` | PASS — 61 PASS, 0 FAIL, 2 WAIVED. |
| `npm.cmd run score` | PASS for local gates — derived score remains honest at 73/100; video is WAIVED with zero gap effect. |
| `git diff --check` | PASS — no whitespace errors; only CRLF warnings. |

## Primary-agent independent browser evidence

- At 390px, all four required states had `clientWidth=375` and `scrollWidth=375`: initial, shortest evidence, buffered replay complete, and Lab results.
- A same-browser reload with pre-change v5 data displayed only the new evidence-only result. Shortest summary: `Agent evidence for D73331 + AK727 · scheduled 115 min`; buffered/replay summary: `Agent evidence for D73331 + AK707 · scheduled 185 min`.
- Lab source link was `Read policy source`, with `linkWidth=101`, `linkScrollWidth=101`, and `linkHeight=17`; it was not broken character-by-character.
- Portable evidence: `verify-screenshots/current/current-11-final-desktop-main.png` through `current-14-itinerary-policy-mobile.png`, plus `figma-product-audit-board.png`.

No source, test, or additional document was changed after receiving the parent browser verdict.
