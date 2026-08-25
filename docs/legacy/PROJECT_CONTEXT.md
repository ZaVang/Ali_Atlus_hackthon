# Product context

## The proposition: Journey Risk Pricing

OTP (on-time performance) tells the industry how often flights are late. It cannot price one specific itinerary — and it only ever prices one kind of failure, after the fact.

A journey can fail for many reasons beyond a missed connection: a storm that swells delay variance, an airspace closure that forces rerouting, a payload limit that offloads passengers. Today none of these risks carries a price before departure — the industry only holds post-hoc statistics and statutory compensation tables.

We are building the next industry capability: **Journey Risk Pricing** — price every disruption risk of an itinerary before it settles, and quote what it costs to protect it, right now.

One thesis, one sentence: **“Risk gets cheaper the earlier it's seen.”**

**Connection Confidence** is not the product — it is the first priced metric of the product: the headline indicator of the *connection* risk domain. The engine is built to price more domains; the demo prices three (below).

## The pricing engine, in four financial ideas

The engine borrows the vocabulary of risk pricing in finance, applied to air travel disruption:

1. **Underwriting — risk domains.** An itinerary is decomposed into priced risk domains. Priced in this demo: **C1 connection fragility** (the five transfer steps), **C2 weather variance** (storm forecasts amplify uncertainty), **C5/C6 airspace closure & payload restriction** (the volunteer case). Roadmap: C3 airline-controllable ops, C4 ATC capacity, C7 oversales, C8 sudden events.
2. **Expected-loss pricing.** Analogous to credit risk's `PD × LGD`: expected disruption cost = `P(disruption) × (rebooking + hotel + meals + service labour + goodwill)`. A misconnect is the dominant settlement form in the demo, so the working instance is the expected misconnect cost.
3. **Mark-to-market repricing.** Every new piece of evidence reprices the itinerary: a storm forecast cuts confidence from 92% to 34%, and the protection quote moves with it. Risk is a live price, not a booking-time snapshot.
4. **Risk-transfer economics.** The demo prices the intervention decision: expected disruption cost vs airline-funded proactive protection cost. The volunteer incentive ladder is a market-clearing quote for flexibility — the airline buying its way out of risk at the smallest price. A traveller-paid protection product would require licensed underwriting and is out of scope (see PROJECT_INTRODUCTION.md §8).

## The industry gap (research findings)

No pre-departure capability prices both dimensions at once: itinerary fragility and protection cost. Everything that exists today covers one side only (all figures are research estimates, attributed below):

- **IATA MCT** — a binary gate that decides whether a ticket can be sold. Static; assumes both flights operate on time.
- **OTP** — a post-hoc, flight-level statistic.
- **EU261 / DOT rules** — post-hoc statutory compensation unit prices (€250–600 per passenger).
- **Airline OCC models** — airlines already run expected misconnect-cost models internally; they are invisible to travellers. Reference point (EUROCONTROL estimate): one cancelled 180-seat narrow-body costs roughly €12,400 in passenger care and compensation alone.
- **Hopper** — the closest precedent. It charges a premium before travel, but outputs an opaque price, not the risk itself.
- **Travel insurance** — most policies list tight connections as an exclusion. The industry knows this risk exists and declines to price it.

Scale: flight disruption costs airlines roughly **$25B–35B per year, about 5% of revenue** (research estimate).

The pitch line:

> “OTP tells you how punctual the past was. EU261 tells you what a failure costs. MCT tells you whether a ticket can be sold. Only journey risk pricing tells you how fragile this itinerary is today — and the spot price of protecting it.”

## Field evidence — the founding story (source of every requirement)

The two cases below are the founder's own, first-hand experiences (anonymized). They are not two stories — they are **two observations of the same proposition, one from each side**. Every requirement, fixture number, and demo beat in this project traces back to them. When a design decision is ambiguous, resolve it by asking what would have helped in these two moments.

### Observation 1 — what late pricing costs (risk settled without ever being priced)

A traveller accepted an airline-recommended 100-minute international-to-domestic connection at Seattle. Airline support on both ends said the itinerary was fine. Actual immigration processing took close to two hours, the connection was missed, and the traveller waited about 15 hours for the next morning flight with no hotel coverage.

The risk already existed in the data. Nobody surfaced it, nobody priced it. It settled at the most expensive possible moment: the model prices the realized misconnect at roughly **$340** of expected cost, versus about **$80** for an early intervention (fixture anchors).

### Observation 2 — what early pricing looks like (risk priced in advance and bought out of the market)

On the return journey, an airspace closure forced rerouting, and rerouting created payload and fuel limits. The same airline behaved in the exact opposite way toward its own problem: it quantified the risk in advance, set a **minimum incentive ladder of $200 / $500 / $900** for volunteers to take alternative routings, and resolved the problem at the smallest possible cost. The real-world ceiling case in that program was a **$2,000 voucher**.

### The weld

Airlines have long known how to price their own problems in advance. They just never apply the same method to the traveller's problems — and they only ever price their own operational risks, never the traveller's connection or weather exposure. **We close that asymmetry: one pricing engine, every risk domain, both sides of the counter.**

Fixture anchors derived from these cases: roughly 120-minute immigration processing under arrival-bank peaks at SEA, a nominally legal 100-minute connection that fails in practice, the $200/$500/$900 incentive ladder with a high-value voucher as the ceiling. The leading explainable risk factor is the arrival bank: how many wide-body international arrivals land in the same window.

Requirement traceability:

- Observation 1 drives the passenger flow: confidence assessment with explainable factors and uncertainty (the “some say fast, some say slow” problem), early intervention before departure, and a protected recovery with explicit consent.
- Observation 2 drives the airline flow: proactive risk identification, targeted volunteer solicitation with an incentive ladder, and recovery capacity planning — done transparently instead of an opaque gate announcement.

## Scenario taxonomy and product boundaries

Classified by delay-minute share, using US BTS and European CODA figures. The two systems agree where they overlap: cascading delays 41–46%, airline-controllable causes 25–35% (research estimates). Eight categories; the first four cover about 96.5% of delay minutes. The table doubles as the engine's risk-domain register — each class is a risk domain the pricing engine can underwrite:

| Class | Risk domain (scenario) | Delay-minute share | Pricing status |
| --- | --- | --- | --- |
| C1 | Cascading delays & tight-connection misconnects | ~41–46% | Priced in demo (Observation 1). Demo core. |
| C2 | Extreme weather | ~12% | Priced in demo: confidence variance amplifies around a storm forecast (92% → 34%), the mark-to-market flagship case. |
| C3 | Airline-controllable operations: maintenance, crew, IT, scheduling | ~25–35% | Roadmap domain. Reference events: CrowdStrike outage 2024 (5,117 cancellations in one day), Southwest Christmas 2022 (16,700 cancellations). |
| C4 | ATC & airport capacity | ~9% | Roadmap domain. |
| C5 | Airspace closures & rerouting | low frequency, high severity | Priced in demo as the causal lead-in to C6 (the trigger behind Observation 2). (Eurocontrol reference: HEL–NRT rerouting added up to +286 minutes.) |
| C6 | Payload restrictions & offloads | long tail | Priced in demo (the mechanism of Observation 2: the volunteer incentive ladder). Demo core. |
| C7 | Denied boarding / oversales | ~1% | Roadmap domain. |
| C8 | Security & sudden events | <1% | Roadmap domain. |

**Demo scope this cycle — priced domains: C1 + C6 (existing capabilities, real stories) plus C2 (the variance-amplification repricing demo). C5 appears as the causal lead-in to C6. C3, C4, C7, and C8 are roadmap domains.**

Data constraint: the Atlas Sandbox holds Asia-Pacific inventory only, no North America. The Seattle story therefore runs on clearly-labelled fixtures; the live Atlas track runs on Asia-Pacific routes (PVG → SIN / NRT and similar).

## Core principle: two-sided cost balance

The product must protect both sides at once: travellers need stability on long-haul international itineraries, and airlines cannot absorb unlimited rebooking, voucher, or compensation costs. The balance is achieved through shared risk-pricing economics:

1. **One pricing engine, two translations.** The same journey risk-pricing model is shown to the traveller as confidence with uncertainty, and to the airline as expected disruption cost — instantiated in the demo as the expected misconnect cost: `P(misconnect) × (rebooking + hotel + meals + service labour + goodwill)`.
2. **Intervention threshold.** Proactive intervention is suggested only when expected disruption cost exceeds proactive intervention cost. Each intervention keeps its cost comparison in the audit trail.
3. **Cost ladder.** Interventions escalate from the cheapest sufficient level:
   - L0 risk disclosure — free, always provided;
   - L1 voluntary same-day rebooking at no fare difference;
   - L2 targeted volunteer incentive, escalating in steps;
   - L3 protected rebooking with hotel commitment;
   - L4 reactive misconnect handling — most expensive, avoided where possible.
4. **Two-sided ranking.** Recovery options are ordered by the traveller's chosen priority (arrival time, overnight avoidance), with airline marginal cost (lower load factor is cheaper) surfaced as a visible second dimension, so the trade-off is shown instead of hidden.
5. **Airline-funded proactive protection.** Baseline transparency is free, and proactive protection in the demo is funded by the airline because it is cheaper than the misconnect it avoids. No traveller premium is sold; a priced protection bundle (priority rebooking commitment, hotel, lounge, meal coverage) would need its own payer, coverage terms, refunds, and licensed underwriting — explicitly out of scope (see PROJECT_INTRODUCTION.md §8).

## Primary user and user job

**Primary user:** an international traveller whose itinerary carries priced disruption risk — a tight connection today; weather and operational exposure on the roadmap.

**Job:** see what the journey's risks are worth right now, and choose protection or recovery before the cost of disruption becomes unavoidable.

**Secondary user:** an airline or OTA operations agent who needs an explainable, consent-aware way to price and protect likely disruptions.

## Primary workflow

```text
Itinerary + traveller priorities
        |
        v
Risk assessment (connection domain priced first)
  - inbound flight timing
  - international arrival steps
  - baggage / security / walking estimates
  - onward-flight availability
        |
        v
Explain the priced risk and its uncertainty
        |
        v
Search & rank recovery choices
        |
        v
Traveller confirms an action
        |
        v
Service via Atlas Sandbox or explicit simulation
        |
        v
Audit trail
```

## Demo narrative

The deliverable is a 3-minute recorded video with an English UI and Chinese subtitle narration. The opening hook uses the anonymized SEA case above.

The demo runs on two data tracks:

- **Seattle story track (labelled fixtures).** The Atlas Sandbox holds no North America inventory, so the Shanghai → Seattle → US domestic story runs on clearly-labelled fixture data while exercising the full workflow.
- **Live Atlas track.** A PVG → SIN search demonstrates real Atlas Sandbox integration with live offers and identifiers inside the recovery flow.

Story beats:

1. The Agent marks the 100-minute Seattle connection as high risk. The leading factor is the arrival bank: several wide-body international arrivals land in the same window, pushing the expected immigration wait beyond the available buffer.
2. The traveller selects a priority such as “earliest arrival” or “avoid overnight stay”.
3. The Agent ranks recovery options by the traveller's chosen priority, surfacing airline marginal cost as a visible second dimension, and distinguishing Atlas flight data from estimated transfer data.
4. The traveller explicitly approves a recommended recovery plan.
5. The app shows a completed simulated or Sandbox-backed action and a concise audit log.
6. The airline view updates: the connection is protected, and the expected-cost-versus-proactive-cost comparison is visible.
7. Variance amplification (C2): a storm forecast cuts the same connection's confidence from 92% to 34% — the same model now prices protection before the storm lands, not after.

## Non-goals for the MVP

- A generic travel-planning chatbot.
- Real payment capture or real passenger ticket changes without confirmed Sandbox support.
- Guaranteeing an immigration, security, or airline-service outcome.
- Live airport wait-time coverage for every airport.
- Automated airline ticket pricing and full revenue management.

## Airline operations view (mainline)

The airline operations view is part of the core demo, not an optional extension, but it must never delay the passenger-facing flow. It remains decision support only: it must not automatically issue compensation or incentives, alter fares, or discriminate between travellers.

Contents:

- **Risk board:** upcoming connections priced by the same risk-pricing model, with the drivers behind each score.
- **Recovery capacity:** candidate recovery flights ranked by load factor, so low-marginal-cost capacity surfaces first.
- **Voluntary re-accommodation:** targeted volunteer solicitation with a simulated escalating incentive ladder, modelled on the real gate-announcement case.
- **Cost comparison widget:** expected disruption cost versus proactive intervention cost for each flagged connection.

Every airline-initiated suggestion still requires explicit passenger approval in the passenger flow before any action is taken.
