# Journey Risk Pricing & Recovery Agent — Project Introduction

**English** | [简体中文](./PROJECT_INTRODUCTION.zh-CN.md)

*Reviewer-facing introduction for the Alibaba Cloud x Atlas Agentic AI Hackathon submission. For setup, commands, and the engineering layout, see the [README](../README.md).*

## 1. The problem — and the field evidence behind it

OTP tells the industry how often flights are late. It cannot price **one specific itinerary** — and disruption is far broader than a missed connection. A storm can swell delay variance, an airspace closure can force rerouting, a payload limit can offload passengers. None of these risks carries a price before departure; the industry only holds post-hoc statistics and statutory compensation tables.

The sharpest instance is the connection itself: an international connection can be nominally legal — it satisfies the published minimum connection time — and still fail in practice, because immigration, baggage reclaim, re-check, security, and terminal transfers consume the buffer. The passenger discovers this only after missing the connection, at the most expensive possible moment.

This project was founded on two first-hand observations of the same proposition, one from each side of the counter (anonymized; full account in [PROJECT_CONTEXT.md — Field evidence](PROJECT_CONTEXT.md)):

- **Observation 1 — what late pricing costs.** A traveller accepted an airline-recommended **100-minute** international-to-domestic connection at Seattle. Support on both ends said it was fine. Immigration took close to two hours; the connection was missed; the traveller waited **~15 hours** with no hotel. A risk nobody ever priced — settled after the fact at roughly **$340** of expected cost, versus about **$80** for an early intervention.
- **Observation 2 — what early pricing looks like.** On the return journey, an airspace closure forced rerouting. The same airline behaved in the exact opposite way toward its *own* problem: it quantified the risk in advance and bought volunteers with an escalating **$200 / $500 / $900** incentive ladder (field ceiling case: a $2,000 voucher), resolving the problem at the smallest possible cost.

**The weld:** airlines have long known how to price their own problems in advance. They just never apply the same method to the traveller's problems — and only ever price their own operational risks, never the traveller's connection or weather exposure. This product closes that asymmetry: **one pricing engine, every risk domain, both sides of the counter.** One thesis: **“Risk gets cheaper the earlier it's seen.”**

## 2. The solution — one pricing engine, two translations

**Journey Risk Pricing** decomposes an itinerary into priced risk domains and quotes the cost of protection before disruption settles. In this demo the engine prices three domains: **C1 connection fragility**, **C2 weather variance**, and **C5/C6 airspace closure & payload restriction**. **Connection Confidence** — the per-itinerary probability of making the connection, computed from explainable factors with an explicit uncertainty band — is the headline metric of the first domain, not the whole product.

The engine speaks the vocabulary of risk pricing in finance:

| Financial idea | Aviation translation | Where the demo shows it |
| --- | --- | --- |
| Underwriting (risk domains) | The itinerary decomposed into priced disruption risks: connection, weather, operational | T2 factor waterfall, C2 panel, ops volunteer panel |
| Expected-loss pricing (`PD × LGD`) | Expected disruption cost = `P(disruption) × (rebooking + hotel + meals + service labour + goodwill)` | Ops cost comparison: $340 expected vs $80 proactive |
| Mark-to-market | New evidence reprices the itinerary live: a storm forecast cuts confidence 92% → 34% and moves the protection quote | C2 repricing panel |
| Risk-transfer economics | Expected disruption cost vs airline-funded proactive protection cost ($340 vs $80); volunteer ladder = a market-clearing quote for flexibility | T2 cost-pair callout, O2 incentive ladder |

The same model is translated differently for each side:

- To the **traveller**: a confidence score, the drivers behind it, and consent-based protection and recovery options.
- To the **airline**: an expected disruption cost — instantiated as the expected misconnect cost, `P(misconnect) × (rebooking + hotel + meals + service labour + goodwill)` — compared against the cost of acting early.

The balance is enforced by four mechanisms, all visible in the demo:

1. **Intervention threshold.** Proactive intervention is suggested only when expected disruption cost exceeds proactive cost; the comparison sits in the audit trail ($340 vs $80 in the demo).
2. **Cost ladder L0–L4.** Interventions escalate from the cheapest sufficient level: L0 risk disclosure (free, always) → L1 voluntary same-day rebooking → L2 targeted volunteer incentive → L3 protected rebooking with hotel commitment → L4 reactive misconnect handling (most expensive, avoided).
3. **Two-sided ranking.** Recovery options are ordered by the traveller's chosen priority (arrival time, overnight avoidance, cost), with airline marginal cost (emptier flights are cheaper to fill) surfaced as a visible second dimension — the trade-off is shown, not hidden.
4. **Airline-funded proactive protection.** The demo prices the *decision to intervene*, not a traveller-paid product: proactive protection is funded by the airline because it is cheaper than the misconnect it avoids. No traveller premium is sold; what a priced protection product would require is stated in §8.

## 3. Why agentic — the perception–translation layer, and what the agent may never do

Risk pricing is a chain: heterogeneous, unstructured evidence must become structured risk factors, factors must become a price, and the price must become an action both sides consent to.

```text
unstructured evidence          structured risk factors            price & action
(MET advisories, NOTAMs,  -->  (arrival bank, storm factor,   -->  (confidence, disruption
 airspace notices, airport      expected minutes ± variance,        cost, priority-led recovery,
 process reports,                every item provenance-tagged)      consent gate, audit)
 contradictory traveller
 anecdotes)
        ↑                              ↑                                   ↑
   agent perception            deterministic pricing             agent expression +
   (read, extract,             engine (no natural                engine execution
    provenance-tag)             language, fully auditable)
```

Disruption evidence arrives as text and human reports, not clean features. The agent is the layer that reads it and turns it into priced inputs; the engine prices; the agent then explains the price and negotiates the action. One boundary never moves: **the agent understands and expresses; the deterministic engine ranks, executes, and owns consent.**

**Why not reuse airline revenue management (RM)?** RM prices *demand* risk to maximize airline revenue, on private booking-curve data, with no traveller-facing explanation or consent. Our problem is pricing *disruption* risk for both sides of the counter. RM is not a substitute — it is the precedent: it proves airlines can run a risk-pricing machine; we extend the discipline to the risk RM ignores, and consume RM's outputs (load factor, fares) as inputs.

**Why not a pure data-driven ML model?** (1) Itinerary-level disruption outcomes are not available as labelled data — OTP is flight-level and post-hoc. (2) A price that asks a traveller to pay and an airline to act must be explainable factor by factor and auditable; a black box cannot carry consent. (3) Prediction is not the scarce resource — translation is. Turning a probability into an understood price and a consented action requires language, reasoning, and negotiation: exactly what the LLM is for.

Where the chain is visible in the demo:

- **C2 — perception, end to end.** The panel shows the full evidence chain: the raw MET advisory → the agent's interpretation → the structured storm factor (expected minutes, heavy-tailed range, provenance) → the engine reprices the itinerary from 92% to 34%.
- **T2/T4 — factors and rationales.** Every risk factor carries a provenance label (including *Agent estimate*), and `AgentProvider.explainOptions` generates per-option justifications constrained to the structured fields the model was given — it cannot invent flights, times, or prices.
- **T3 — negotiation.** The traveller types “I just want to get there tonight, no hotel”; `AgentProvider.parsePreference` returns one of three structured priorities, and the recovery list visibly re-ranks.

Every agent call returns structured JSON, is whitelist-validated, and lands in the audit trail with the model name. Failure degrades to manual buttons and hidden rationale blocks — the demo never breaks.

## 4. Architecture and technical highlights

Five provider interfaces (`src/domain/types.ts`), assembled in `src/providers/index.ts`; components never touch a vendor API directly:

| Provider | Responsibility | Implementations |
| --- | --- | --- |
| `AtlasFlightProvider` | Flight search / booking | `mock-atlas.ts` (fixtures) · `sandbox-atlas.ts` (ATRIP REST) |
| `ConnectionRiskProvider` | Factor-sum confidence model with variance + normal CDF | `risk.ts` |
| `RecoveryProvider` | Priority-driven two-sided ranking | `recovery.ts` |
| `AuditProvider` | Input → evidence → recommendation → consent → action → result | `audit.ts` |
| `AgentProvider` | Preference parsing + rationale/advisory generation | `mock-agent.ts` · OpenAI-compatible live agent |

Highlights:

- **Two credential-safe dev proxies** in `vite.config.ts`: `/api/atlas/*` forwards to the Atlas Sandbox and `/api/agent/chat` forwards to DashScope, each injecting secrets server-side so keys never reach the browser bundle. The agent proxy additionally whitelists the request body and overrides the model server-side.
- **Explicit provenance on every number** — *Atlas flight data*, *Estimated transfer process*, *Agent estimate*, *Agent-generated*, *Sandbox action* / *Demo simulation*. Invented data is never presented as Atlas data.
- **Safe failure.** Missing credentials or an upstream error falls back to labelled fixtures with a visible banner; both the risk and recovery workflows stay fully usable.
- **Closed loop through one session.** `src/state/session.tsx` is the single source of truth and the only audit write gate. When the traveller approves in T5, the ops board's Seattle row flips to **Protected** and shows the avoided cost — the two-sided story closes in one click.

## 5. The two-sided demo (3-minute script)

Run entirely in mock mode with zero credentials; the live Atlas panel activates with Sandbox credentials.

| Time | Beat | Screen |
| --- | --- | --- |
| 0:00 | Hook: the anonymized Seattle misconnect — 100 legal minutes, 15 hours lost | — |
| 0:20 | The engine prices the connection domain: high risk, leading factor is the arrival bank (three wide-bodies, 09:00–09:40), uncertainty shown | T1 → T2 |
| 0:50 | Traveller speaks in natural language; agent parses the priority | T3 |
| 1:10 | Recovery options re-rank by the traveller's priority; live PVG→SIN Atlas panel shows real Sandbox offers | T4 |
| 1:50 | Explicit checkbox + approve → labelled result → full audit timeline | T5 |
| 2:20 | Ops view: Seattle row flipped to Protected — expected disruption $340 vs $80 proactive, $260 avoided; the volunteer ladder is the market-clearing quote for flexibility | O1, O2 |
| 2:45 | C2: mark-to-market — the agent interprets the storm advisory into a priced factor and the engine reprices the itinerary 92% → 34%; protection priced before the storm, not after | C2 |

Data tracks: the Seattle story runs on clearly-labelled fixtures (the Atlas Sandbox holds Asia-Pacific inventory only); the live track searches PVG → SIN against the real Sandbox.

## 6. Integration points

- **Atlas (ATRIP REST API)** — the real flight retailing and servicing layer. Verified against the live Sandbox: `search.do` offers with `fid` / `routingIdentifier` / pricing; static `x-atlas-client-id` / `x-atlas-client-secret` auth; 10 QPS rate limit with `retryAfter`. Rebooking is expressed as booking a recovery offer plus a simulated void of the original ticket until a native change capability is confirmed. Contract: [ATLAS_INTEGRATION.md](../ATLAS_INTEGRATION.md).
- **OpenAI-compatible agent provider (DeepSeek or Alibaba Cloud Bailian / DashScope)** — the agent layer behind the dev proxy. Structured JSON output, fixed seed for demo reproducibility, timeouts and graceful degradation. The test lab is a third, standalone surface for user-entered itineraries; it does not change the reviewer-facing two-sided demo.

## 7. Feasibility and the path forward

The economics are the argument: flight disruption costs airlines roughly **$25B–35B per year (~5% of revenue)**, and every intervention in this demo is cheaper than the misconnect it prevents. The build is deliberately minimal — Vite + React + TypeScript, no UI library, no backend beyond two dev proxies — which is exactly what an individual entrant can ship, maintain, and record in one week.

Path forward: real `verify.do`/`order.do`/`pay.do` wiring once Sandbox servicing is confirmed; live airport-process feeds replacing labelled estimates; pricing new risk domains — C3 (airline-controllable ops), C4 (ATC capacity), C7, C8; a traveller-paid protection product only with licensed underwriting behind it (§8). Non-goals stay non-goals: no guaranteed outcomes, no sensitive-data inference, no action without consent.

## 8. Commercial boundaries — what this demo does not decide

This demo is a **decision prototype for early risk intervention** — it detects, explains, and coordinates itinerary risk before disruption happens. It is not a saleable insurance or protection product, and it does not pretend to be one.

- **No traveller premium is sold.** Every intervention in the demo is airline-funded: the `$80` is the airline's *proactive protection cost*, compared against the `$340` *expected disruption cost*. The demo prices the decision to intervene — relabelling the airline's cost as a "premium" would not describe a product, it would invent one.
- **What a traveller-paid protection product would need** — deliberately all out of scope here: a licensed underwriter and a payer, defined coverage and benefits, refund and claim rules, underwriting boundaries, and a fairness review of risk-based pricing.
- **The volunteer ladder is decision support only.** Ops sees a market-clearing quote for flexibility; an offer is sent only by an explicit ops action, and the traveller always decides for themselves.
- **Candidate business models are left open.** Airline-funded proactive rebooking (what the demo shows), OTA-sold delay insurance, and a traveller-paid stability premium have different payers, pricing power, and underwriting liability. The demo is neutral between them: it prices the risk itself, and leaves the commercial form to whoever carries the underwriting liability.

---

*Engineering details, run instructions, and project layout: [README](../../README.md). Product brief and scenario taxonomy: [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md).*
