# Hackathon Product Audit — Iteration 1

Date: 2026-08-28
Reviewer: primary agent acting as an independent hackathon judge
Scope: Innovation 30 / Feasibility 30 / Qoder 20 / Demo 20. The requested video-recording requirement is excluded, but the on-screen demo experience is scored.

## Executive Summary

**Evidence-weighted baseline: 80 / 100.** The project is unusually honest and technically disciplined for a hackathon prototype: the Atlas/search boundary is narrow, mock provenance is explicit, consent is auditable, and all offline gates pass. The score is held back by product storytelling, not basic engineering. The interface buries the core value below a large trace, the recommended 185-minute option is explained with the selected option's 115-minute number, and the strongest measurable outcome is absent from the product: **$14.19 buys 70 more connection minutes; after the +60-minute replay, the recommended option retains 125 minutes while the cheaper option would retain 55 and breach the published 60-minute floor.**

The idea is differentiated when framed as **connection continuity**: choose an evidence-backed buffer before purchase, carry that exact choice into operations, and keep every intervention consent-gated. It looks much less innovative when framed as another flight comparator plus an Agent trace. The next implementation should make the continuity outcome—not the governance explanation—the visible aha moment.

## Official Four-Dimension Score

| Criterion | Max | Baseline | Judge rationale |
| --- | ---: | ---: | --- |
| Innovation | 30 | 24 | Strong two-sided continuity and governed-agent idea, but value is described more than demonstrated; one policy entry and no visible outcome comparison limit novelty proof. |
| Feasibility | 30 | 26 | Mock flow, tests, build, live read-only search evidence, server hardening, and consent boundary are credible. Real flight status/servicing is simulated and must stay disclosed, but the prototype does not need to fake production servicing to be feasible. |
| Qoder | 20 | 16 | `.qoder/repowiki`, bilingual Qoder usage docs, agent-created gates, and commit history show substantive use. The evidence is scattered and the scorecard incorrectly says screenshots are blocked even though current screenshots exist; a judge-facing evidence index is missing. |
| Demo | 20 | 14 | The full flow runs, but the first action and results are below a large trace, the primary recommendation has a 115-vs-185 narrative mismatch, the airline outcome is not summarized as an avoided threshold breach, and mobile has horizontal overflow. |
| **Total** | **100** | **80** | **15 points are needed for the 95 target.** |

## Captured Flow Evidence

Accepted final screenshots are tracked under `verify-screenshots/current/`; the editable audit board is linked from `docs/SUBMISSION_ASSETS.md`.

1. **Start / value proposition — needs work.** The problem is honest and specific, but the first viewport is mostly narrative and a seven-stage trace. The traveller decision is below the fold.
2. **Agent recommendation — critical defect.** The UI recommends `D73331 + AK707` (185-minute connection) but the rationale and `Why` line say 115 minutes. This is internally explainable as the selected option's baseline, but it is not labelled that way and reads as a wrong result.
3. **Traveller consent to airline watch — healthy mechanics, weak payoff.** Consent, provenance, and the selected itinerary carry over correctly. The key business/outcome comparison is still missing.
4. **Scenario result — healthy deterministic replay, weak intervention story.** The selected 185-minute option leaves 125 minutes after +60 and remains above the floor. The product calls this an intervention but records only a notice; it never states the stronger prevention result that the 115-minute option would have fallen to 55.
5. **Itinerary Lab entry — healthy.** Search fields, mock labels, and self-transfer disclosure are clear.
6. **Itinerary Lab results — needs hierarchy work.** Search completes correctly, but the full Agent trace appears before preferences/results, so the action does not reveal its result in the current viewport.
7. **Result cards — healthy data, noisy evidence.** The ranking and caveats are readable; `routingIdentifier: not returned by provider` is honest but visually overemphasized for a judge demo.
8. **Mobile — functional but not release-ready.** The layout stacks, but long policy pills and content can create horizontal overflow; the long trace makes the core action many screens away.

## Phase 1: Product and Functional Experience

### Strengths

- A concrete traveller pain is connected to an airline-side operational flow instead of ending at recommendation.
- Mock, snapshot, live, deterministic, user, and unavailable provenance are consistently distinguished.
- The consent gate and local audit trail are real product mechanics, not README-only claims.
- The zero-credential demo, live read-only evidence, and fail-closed server boundary create a credible implementation story.

### Critical Product Problems

1. **Recommendation arithmetic is contextually wrong on screen.** A judge sees “Choose AK707” followed by “The schedule leaves 115 minutes,” although AK707 has 185 minutes. Fix by presenting a deterministic comparison with both candidates and binding every displayed number to its labelled candidate.
2. **The aha moment is buried.** The product already has a compelling, non-probabilistic outcome: +$14.19 → +70 minutes; after +60 delay: 125 minutes vs 55; one remains above the published 60-minute floor. This should be the central product proof before governance detail.
3. **The Agent trace precedes the user's job.** It explains implementation before the user has seen a decision. Make it a compact, expandable evidence panel after the primary decision/result, while preserving all provenance detail.
4. **“Intervene” overpromises what the selected scenario does.** The buffered itinerary does not need a recovery offer; the product records a notice. Reframe this as a proactive prevention outcome and a consent-gated watch, or explicitly show the cheaper-option counterfactual. Do not invent a recovery flight.
5. **The scorecard is internally inconsistent.** Its summary scores do not match later section headings, and it calls current screenshots blocked while the files are present. This undermines the very auditability the product claims.

## Phase 2: Innovation and Product Imagination

### What is genuinely innovative

- **Continuity across phases:** the same itinerary moves from pre-purchase choice to operational watch.
- **Governed Agent contract:** the LLM can interpret and explain, while deterministic rules own ranking, safety gates, and consent.
- **Honest uncertainty as a feature:** sellability, time fit, and ticket protection are separated rather than collapsed into a fake risk score.

### What currently looks ordinary

- Two flight cards plus a recommendation resembles a conventional flight comparator.
- A long Agent trace can read as hackathon theatre unless it follows a visible user outcome.
- One policy entry limits proof that the framework generalizes, although the architecture is extensible.

### Product direction for this iteration

Turn the product into a **Connection Resilience Receipt**:

- Price of resilience: `$14.19`
- Buffer purchased: `+70 min`
- Simulated event: `+60 min inbound delay`
- Recommended option after event: `125 min remaining`
- Cheaper counterfactual after event: `55 min remaining`
- Honest outcome: `published floor breach avoided in the deterministic replay`; no claim of probability, protection, or real-world causal success.

This is a judge-legible outcome and a reusable product object. It can be carried into the audit trail without adding unsupported external integrations.

## Phase 3: Feasibility and Implementation Reasonableness

### Confirmed

- `npm run score` passes build:mock, tests, production build, acceptance verification, server smoke, judge preflight, and recording preflight.
- `npm run judge-preflight` reports 56 PASS / 0 FAIL / 2 WAIVED.
- The current checkout is clean and `main` is 9 commits ahead of `origin/main` at audit start.
- The browser flow was replayed end to end in current mock mode.

### Risks

- The main flow lets the Agent return `recommendedOption`, while product copy says deterministic ranking owns ranking. The implementation and claim should be reconciled: deterministic code should own the final choice or the copy must state that the Agent recommends within a validated two-option set.
- The trace is a status ledger, but its prominence creates a product architecture problem: implementation observability is treated as the primary surface.
- Local-storage audit events prove demo continuity on one browser, not production durability or identity. Keep that boundary explicit.
- No live flight-status or servicing path exists. This is acceptable for the prototype only if the demo's value is prevention/decision support and simulated operational rehearsal, not real recovery execution.

## Phase 4: Demo and Accessibility

### Demo

- Opening statement is strong but too explanatory; the first screen needs a measurable promise and a visible action.
- Search and recommendation results should be brought into view immediately after the action.
- The airline replay needs one clear outcome card instead of requiring the judge to mentally compare several numbers across screens.
- The two routes (Seattle origin story vs PVG–KUL–SIN demo) are honestly separated, but this distinction consumes prime screen space. Compress it into one disclosure line.

### Accessibility risks visible in this audit

- Tabs, buttons, fields, groups, and the trace region have usable semantic labels in the DOM snapshot.
- Mobile reflow stacks major cards, but horizontal overflow was observed around long policy/result content; 320–390 px widths need an explicit no-overflow gate.
- Dense 11–12 px provenance/status text may be difficult to read and should not carry the only explanation of a state.
- Color is not the only state signal: labels such as Complete, Tight, Mock, and Pending are present. Contrast and full keyboard behavior still require automated/manual verification beyond screenshots.

## Prioritized Recommendations

### Critical

- Fix the 115-vs-185 recommendation mismatch and add regression coverage that ties labels, minutes, fare delta, and recommended candidate together.
- Add a Connection Resilience Receipt / counterfactual outcome card to the traveller and completed airline replay surfaces.
- Move or collapse the Agent trace so the user action and outcome precede implementation detail.

### Important

- Reframe the buffered replay as prevention/continuity and explicitly show the cheaper counterfactual; do not call a keep-notice a recovery offer.
- Eliminate mobile horizontal overflow and keep policy/provenance content wrapping within the viewport.
- Reconcile `docs/JUDGE_SCORECARD.md` with actual artifacts and current scores; add a concise Qoder evidence index grounded in `.qoder`, source gates, and commit history.
- Add a judge-focused acceptance script that verifies the resilience receipt values and the narrative contract.

### Nice to have

- Auto-focus or announce newly rendered recommendation/results.
- Reduce low-value raw provider metadata in the main judge path while keeping it available in expandable detail.

## 95-Point Acceptance Target

The next independent evaluation may award at least 95 only if all of the following are true:

1. No displayed candidate/minute/fare narrative contradicts the underlying fixture.
2. The product visibly demonstrates the `$14.19 / +70 min / 125 vs 55 / 60-min floor` outcome without implying probability or real protection.
3. Primary actions and results precede the expanded Agent trace on desktop and mobile.
4. The complete traveller → consent → airline replay path remains deterministic, provenance-labelled, and fail closed.
5. The mobile page has no horizontal overflow at 390 px and all existing automated gates pass.
6. Qoder and score evidence are internally consistent and traceable to real repository artifacts.

## Iteration 2 Reviewer Addendum

Iteration 1 re-score: **87 / 100 (CONTINUE)**. The Receipt, trace hierarchy, and 390px no-overflow checks are real improvements. The next round is deliberately narrow:

- **Critical:** do not present `Deterministic choice: AK707` and an unlabelled `115 minutes` baseline explanation as one recommendation. Label/collapse the Agent evidence by the named baseline candidate, and keep the deterministic receipt/result visually primary.
- **Critical:** invalidate or normalize the pre-change `v5` browser research cache; the current browser replay proved that stale Agent-owned recommendation copy survives the schema change.
- **Important:** rename the CTA and research-ready copy so the Agent checks/explains evidence rather than choosing the final candidate.
- **Important:** remove the already-waived video `+4` from the final-audit gap output and test waiver/gap consistency.
- **Important:** keep the Itinerary Lab policy source link readable at 390 px; no page overflow is allowed, but one-character-per-line wrapping is also unacceptable.

Iteration 2 acceptance requires current-browser screenshots and DOM evidence for the default shortest-start path, the completed buffered replay, the mobile Lab result, and a clean-cache/fresh-run path.

## Final Reviewer Addendum — 95 / 100

Iteration 2 closes every in-scope product blocker. The deterministic recommendation and Receipt now lead the experience; Agent evidence is a named, collapsed baseline review; v5 free-text cache semantics are invalidated; video has zero score effect; and 390px browser evidence proves both no overflow and a readable policy link. Final rubric: **Innovation 29 / Feasibility 29 / Qoder 18 / Demo 19 = 95 / 100.**

Top strengths for the judge:

1. `$14.19` buys `+70 min`; under the deterministic `+60 min` replay the choice leaves `125 min` versus `55 min`, against the published `60 min` floor.
2. The final candidate is deterministic and auditable; the Agent checks/explains evidence but cannot rank, book, or bypass consent.
3. The same named itinerary moves from traveller decision to airline replay with explicit mock/snapshot/live/unavailable provenance and no invented recovery capability.
