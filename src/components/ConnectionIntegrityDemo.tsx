import { useEffect, useRef, useState } from "react";
import type { ConnectionContractBrief, ConnectionFit, ConnectionResearchSource } from "../domain/types";
import { kulConnectionCase } from "../data/connection-integrity";
import { useDemoSession } from "../state/session";
import { isWhitelistedConnectionBrief } from "../providers/bailian-agent";
import { resolveConnectionPolicy } from "../domain/connection-policies.mjs";
import { ProvenancePill, formatDuration, formatMoney } from "./shared";
import AgentTrace from "./AgentTrace";
import {
  applyAgentTraceEvent,
  createAgentTraceState,
  traceSourceForProvider,
  type AgentTraceEventInput,
  type AgentTraceState,
  type AgentTraceSource,
} from "../domain/agent-trace";

type Side = "traveller" | "airline";
type CandidateKey = "shortest" | "buffered";
type Candidate = typeof kulConnectionCase.shortest | typeof kulConnectionCase.buffered;
type AgentContractBrief = ConnectionContractBrief & { model: string };

const CONNECTION_RESEARCH_CACHE_PREFIX = "connection-integrity:research:v5:";
const CONNECTION_RESEARCH_CACHE_TTL_MS = 30 * 60 * 1_000;

interface CachedResearch {
  expiresAt: number;
  brief: AgentContractBrief;
}

function readCachedResearch(key: string): AgentContractBrief | null {
  try {
    const raw = window.localStorage.getItem(`${CONNECTION_RESEARCH_CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const cached = JSON.parse(raw) as Partial<CachedResearch>;
    if (typeof cached.expiresAt !== "number" || cached.expiresAt <= Date.now() || !cached.brief || !isValidBriefShape(cached.brief)) {
      window.localStorage.removeItem(`${CONNECTION_RESEARCH_CACHE_PREFIX}${key}`);
      return null;
    }
    return cached.brief;
  } catch {
    return null;
  }
}

// Cached briefs come from untrusted browser storage: re-apply the exact same
// field-by-field whitelist the live provider enforces (closed enums including
// assessmentConfidence, string explanations, structured source checks) so a
// tampered value can never reach the verdict rendering.
function isValidBriefShape(brief: AgentContractBrief): boolean {
  return isWhitelistedConnectionBrief(brief) && typeof brief.model === "string";
}

// --- Persisted audit trail ---------------------------------------------------
// Traveller consent and airline proposal/offer events are appended to local
// storage with an ISO timestamp and a source label. The trail stays on the
// device; it exists to make the demo's "auditable" claim verifiable.
const AUDIT_TRAIL_KEY = "connection-integrity:audit-trail:v1";
const AUDIT_TRAIL_LIMIT = 50;

interface AuditEvent {
  at: string;
  side: Side;
  event: string;
  detail: string;
  source: string;
}

function readAuditTrail(): AuditEvent[] {
  try {
    const raw = window.localStorage.getItem(AUDIT_TRAIL_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item): AuditEvent[] => {
      if (typeof item !== "object" || item === null) return [];
      const candidate = item as Partial<AuditEvent>;
      return typeof candidate.at === "string"
        && (candidate.side === "traveller" || candidate.side === "airline")
        && typeof candidate.event === "string"
        && typeof candidate.detail === "string"
        && typeof candidate.source === "string"
        ? [{ at: candidate.at, side: candidate.side, event: candidate.event, detail: candidate.detail, source: candidate.source }]
        : [];
    });
  } catch {
    return [];
  }
}

function appendAuditEvent(entry: Omit<AuditEvent, "at">): AuditEvent[] {
  const next = [...readAuditTrail(), { ...entry, at: new Date().toISOString() }].slice(-AUDIT_TRAIL_LIMIT);
  try {
    window.localStorage.setItem(AUDIT_TRAIL_KEY, JSON.stringify(next));
  } catch {
    // Storage can be unavailable (for example, private mode); the in-memory
    // list below still discloses the event for this session.
  }
  return next;
}

// --- Scenario replay ---------------------------------------------------------
// A scripted airline-side timeline that replays the delay-intervention arc
// (event → reassessment → proposal → consent prompt) without manual clicking.
// Every event stays simulated and is labelled as such; nothing here reads a
// live flight-status feed. Kept as a plain config object so further scenarios
// (other delay sizes, pacing, steps) can be added without touching the runner.
interface ScenarioStep {
  label: string;
  detail: string;
}

interface AirlineScenario {
  id: string;
  name: string;
  delayMinutes: number;
  stepPauseMs: number;
  steps: ScenarioStep[];
}

const AIRLINE_SCENARIOS: Record<string, AirlineScenario> = {
  "inbound-delay-60": {
    id: "inbound-delay-60",
    name: "Inbound delay +60 min",
    delayMinutes: 60,
    stepPauseMs: 1_600,
    steps: [
      { label: "Inject delay event · 注入延误事件", detail: "A simulated inbound delay of +60 min lands on the booked connection." },
      { label: "Re-assess connection · 触发重评估", detail: "The agent rechecks the time fit: 55 min remaining is below the 60-min published minimum — insufficient, confidence high." },
      { label: "Prepare traveller offer · 生成干预提案", detail: "The intervention proposal is drafted for the longer-buffer alternative routing." },
      { label: "Offer recorded · consent pending · 记录并等待同意", detail: "The offer is written to the audit trail; the traveller must still review and accept it." },
    ],
  },
};

const AIRLINE_SCENARIO = AIRLINE_SCENARIOS["inbound-delay-60"];

// The registered policy entry governing this demo itinerary, resolved from
// the shared registry instead of hard-coded numbers, so the rubric
// disclosure can never drift from what drives screening and evidence search.
const DEMO_POLICY = resolveConnectionPolicy({
  connectionAirport: kulConnectionCase.connectionAirport,
  flightNumbers: [...kulConnectionCase.shortest.flights],
});

// Deterministic fixture judgment for the scripted replay: the scenario must
// demonstrate the same arc (insufficient, confidence high) every run, while
// the Manual trigger still calls the real agent provider. Labelled "Demo
// agent fixture" in the UI so it is never mistaken for a live assessment.
const SCENARIO_REASSESSMENT: AgentContractBrief = {
  connectionFit: "insufficient",
  protectionStatus: "not-confirmed",
  recommendedOption: "alternative",
  recommendationSummary: "Choose the longer-buffer alternative: the selected connection no longer meets the published minimum.",
  assessmentConfidence: "high",
  rationale: `The reported delay leaves ${kulConnectionCase.shortest.connectionMinutes - AIRLINE_SCENARIO.delayMinutes} minutes, below the ${kulConnectionCase.flyThruMinimumMinutes}-minute Fly-Thru connection rule at ${kulConnectionCase.connectionAirport}. This is a time-fit failure, not an estimate of missed-connection probability.`,
  keyFactors: ["Remaining connection time is below the published Fly-Thru minimum", "Inbound operational delay"],
  limitations: ["Live flight-status feed is simulated in this demo"],
  nextAction: "Search a later protected connection and offer it to the traveller for approval.",
  model: "demo agent fixture",
};

function scenarioForCandidate(candidateKey: CandidateKey): AirlineScenario {
  if (candidateKey === "shortest") return AIRLINE_SCENARIO;
  const candidate = kulConnectionCase.buffered;
  const publishedMinimum = DEMO_POLICY?.publishedMinimumMinutes ?? kulConnectionCase.flyThruMinimumMinutes;
  const comfortTarget = publishedMinimum + (DEMO_POLICY?.planningBufferMinutes ?? 90);
  const remaining = candidate.connectionMinutes - AIRLINE_SCENARIO.delayMinutes;
  return {
    ...AIRLINE_SCENARIO,
    name: "Inbound delay +60 min · selected longer-buffer itinerary",
    steps: [
      { label: "Inject delay event · 注入延误事件", detail: "A simulated inbound delay of +60 min lands on the traveller-selected longer-buffer connection." },
      { label: "Re-assess connection · 触发重评估", detail: `The selected ${candidate.connectionMinutes}-minute window leaves ${remaining} minutes: above the ${publishedMinimum}-minute published minimum, but below the ${comfortTarget}-minute comfort target — tight, not insufficient.` },
      { label: "Prepare traveller notice · 生成旅客提示", detail: "No longer-buffer fixture is invented. The airline prepares a consent-gated notice for the selected routing." },
      { label: "Offer recorded · consent pending · 记录并等待同意", detail: "The notice is written to the audit trail; the traveller must still review and consent." },
    ],
  };
}

function scenarioReassessmentForCandidate(candidateKey: CandidateKey): AgentContractBrief {
  if (candidateKey === "shortest") return SCENARIO_REASSESSMENT;
  const candidate = kulConnectionCase.buffered;
  const publishedMinimum = DEMO_POLICY?.publishedMinimumMinutes ?? kulConnectionCase.flyThruMinimumMinutes;
  const comfortTarget = publishedMinimum + (DEMO_POLICY?.planningBufferMinutes ?? 90);
  const remaining = candidate.connectionMinutes - AIRLINE_SCENARIO.delayMinutes;
  return {
    connectionFit: "tight",
    protectionStatus: "not-confirmed",
    recommendedOption: "selected",
    recommendationSummary: "Keep the selected longer-buffer itinerary: after the simulated delay it remains above the published minimum, but extra buffer would help.",
    assessmentConfidence: "high",
    rationale: `The reported delay leaves ${remaining} minutes, above the ${publishedMinimum}-minute Fly-Thru connection rule at KUL but below the ${comfortTarget}-minute planning target. This is a time-fit assessment, not an estimate of missed-connection probability.`,
    keyFactors: [`${remaining} planned minutes compared with the ${comfortTarget}-minute comfort target`, "Inbound operational delay"],
    limitations: ["Live flight-status feed is simulated in this demo", "No longer-buffer recovery fixture is available in this scenario"],
    nextAction: "Ask the traveller whether to keep this routing; do not apply any change without consent.",
    model: "demo agent fixture",
  };
}

function writeCachedResearch(key: string, brief: AgentContractBrief) {
  try {
    const cached: CachedResearch = { expiresAt: Date.now() + CONNECTION_RESEARCH_CACHE_TTL_MS, brief };
    window.localStorage.setItem(`${CONNECTION_RESEARCH_CACHE_PREFIX}${key}`, JSON.stringify(cached));
  } catch {
    // Browser storage can be unavailable (for example, private mode). The
    // in-memory cache below still makes repeat clicks within this session fast.
  }
}

function formatResearchDuration(durationMs: number) {
  return durationMs >= 1_000 ? `${(durationMs / 1_000).toFixed(durationMs >= 10_000 ? 0 : 1)} s` : `${durationMs} ms`;
}

const FIT_COPY: Record<ConnectionFit, { title: string; className: string; badgeClassName: string }> = {
  comfortable: { title: "Likely comfortable", className: "contract-protected", badgeClassName: "risk-low" },
  tight: { title: "Tight — extra buffer helps", className: "contract-missing", badgeClassName: "risk-medium" },
  insufficient: { title: "Insufficient connection time", className: "contract-fragile", badgeClassName: "risk-high" },
};

function fallbackFit(delayMinutes: number, scheduledConnectionMinutes: number): ConnectionFit {
  const remaining = scheduledConnectionMinutes - delayMinutes;
  return remaining < kulConnectionCase.flyThruMinimumMinutes ? "insufficient" : "tight";
}

function evidenceTraceSource(
  sources: ConnectionResearchSource[] | undefined,
  tier: ConnectionResearchSource["tier"],
  fromCache: boolean,
  providerSource: AgentTraceSource,
): AgentTraceSource {
  const matching = sources?.filter((source) => source.tier === tier) ?? [];
  if (fromCache && matching.length > 0) return "snapshot";
  if (matching.some((source) => source.disclosed !== true)) return "live";
  if (matching.length > 0) return "snapshot";
  return providerSource === "mock" ? "mock" : "unavailable";
}

function evidenceTraceSummary(
  sources: ConnectionResearchSource[] | undefined,
  tier: ConnectionResearchSource["tier"],
  fromCache: boolean,
  providerSource: AgentTraceSource,
): string {
  const matching = sources?.filter((source) => source.tier === tier) ?? [];
  if (providerSource === "mock" && !sources) return "Mock mode uses the disclosed demo evidence path; no web search is executed.";
  if (matching.length === 0) return `The ${tier} evidence search completed without an accepted source; no ${tier} claim is shown.`;
  if (fromCache) return `${matching.length} ${tier} source${matching.length === 1 ? "" : "s"} reused from the browser's bounded cache; the underlying run was completed earlier.`;
  if (matching.every((source) => source.disclosed === true)) return `${matching.length} disclosed ${tier} policy input${matching.length === 1 ? "" : "s"}; this is a product input, not a live search hit.`;
  return `${matching.length} accepted ${tier} source${matching.length === 1 ? "" : "s"} returned by the bounded evidence search.`;
}

function createInitialConnectionTraceState(): AgentTraceState {
  let state = createAgentTraceState();
  const seed = (event: AgentTraceEventInput) => {
    state = applyAgentTraceEvent(state, { ...event, runId: 0 });
  };
  seed({
    stage: "preference-interpretation",
    status: "complete",
    source: "user",
    summary: "The default cheapest card is visible; changing cards is an explicit traveller preference, not hidden profile inference.",
  });
  seed({
    stage: "flight-search",
    status: "complete",
    source: "snapshot",
    summary: "Recorded ATRIP Sandbox offer snapshot for PVG → KUL → SIN is loaded for the repeatable connection story.",
  });
  seed({
    stage: "policy-rubric-gate",
    status: "complete",
    source: "deterministic",
    summary: "The registered KUL policy drives time-fit screening; it does not certify ticket protection.",
  });
  seed({
    stage: "consent-gate",
    status: "pending",
    source: "pending",
    summary: "No recommendation or itinerary change is accepted without explicit traveller consent.",
  });
  return state;
}

function CandidateCard({ candidate, selected, onChoose, label, disabled }: { candidate: Candidate; selected: boolean; onChoose: () => void; label: string; disabled: boolean }) {
  return (
    <button type="button" className={`integrity-option ${selected ? "selected" : ""}`.trim()} onClick={onChoose} disabled={disabled}>
      <span className="integrity-option-label">{label}</span>
      <strong>{candidate.flights.join(" + ")}</strong>
      <span className="integrity-route">PVG → KUL → SIN</span>
      <span className="integrity-times">KUL {candidate.arrivalAtConnection} → {candidate.departureFromConnection} · {formatDuration(candidate.connectionMinutes)}</span>
      <span className="integrity-price">{formatMoney(candidate.price, candidate.currency)}</span>
    </button>
  );
}

function ContractVerdict({ brief, fallback, delayMinutes, scheduledConnectionMinutes, researchError, selectedLabel, alternativeLabel }: { brief: AgentContractBrief | null; fallback: ConnectionFit; delayMinutes: number; scheduledConnectionMinutes: number; researchError: boolean; selectedLabel: string; alternativeLabel: string }) {
  const fit = brief?.connectionFit ?? fallback;
  const copy = FIT_COPY[fit];
  const remaining = scheduledConnectionMinutes - delayMinutes;
  const usesDeepSeek = brief?.model.toLowerCase().includes("deepseek") ?? false;
  return (
    <section className={`contract-verdict ${copy.className}`}>
      <div className="card-title-row"><h2>{brief ? "Agent recommendation" : "Research ready"}</h2>{DEMO_POLICY && <ProvenancePill label={`Policy: ${DEMO_POLICY.label} · ${DEMO_POLICY.publishedMinimumMinutes} min minimum + ${DEMO_POLICY.planningBufferMinutes} min buffer`} />}{brief && <><span className={`badge ${copy.badgeClassName}`}>{copy.title}</span><ProvenancePill label={brief.protectionStatus === "confirmed" ? "Ticket protection confirmed" : "Ticket protection not confirmed"} /><ProvenancePill label={`Assessment confidence: ${brief.assessmentConfidence}`} /></>}</div>
      {!brief && !researchError && <p>Ask the agent to compare both offers using public KUL transfer evidence. It will answer time fit, ticket protection, and which offer it recommends separately.</p>}
      {!brief && researchError && <p>The live research request did not finish. No agent judgment has been shown; retry the check to obtain a source-backed assessment.</p>}
      {delayMinutes > 0 && <p className="small">Event input leaves {formatDuration(remaining)} against the published {formatDuration(kulConnectionCase.flyThruMinimumMinutes)} minimum.</p>}
      {brief && <div className="agent-brief"><strong>Choose {brief.recommendedOption === "selected" ? selectedLabel : alternativeLabel}</strong><p className="agent-recommendation">{brief.recommendationSummary}</p><p>{brief.rationale}</p>{brief.keyFactors.length > 0 && <p className="small"><strong>Why:</strong> {brief.keyFactors.join(" · ")}</p>}<p className="small"><strong>Before purchase:</strong> {brief.nextAction}</p>{brief.limitations.length > 0 && <p className="small"><strong>What remains unknown:</strong> {brief.limitations.join(" · ")}</p>}{brief.sources && brief.sources.length > 0 && <div className="agent-research"><strong>Agent research</strong>{brief.sources.map((source) => <a key={`${source.tier}-${source.url}`} href={source.url} target="_blank" rel="noreferrer"><span>{source.tier === "official" ? (source.disclosed ? "Official · disclosed fallback input" : "Official") : "Community"}</span><span className="agent-source-copy">{source.title}<small>{source.summary}</small></span></a>)}</div>}<details className="agent-run-details"><summary>How this judgment was made</summary><dl><div><dt>Time-fit rubric</dt><dd>{DEMO_POLICY ? `${DEMO_POLICY.publishedMinimumMinutes} min published minimum + ${DEMO_POLICY.planningBufferMinutes} min planning buffer (${DEMO_POLICY.label})` : "No configured connection policy for this route; no published minimum or buffer applied"}</dd></div><div><dt>Model</dt><dd>{brief.model}</dd></div><div><dt>Workflow</dt><dd>{brief.researchMeta ? `Tavily evidence search → ${usesDeepSeek ? "DeepSeek" : "provider"} assessment` : "Demo fixture (no live call)"}</dd></div>{brief.researchMeta && <><div><dt>Thinking</dt><dd>{usesDeepSeek ? "Enabled · medium effort" : "Provider-configured mode"}</dd></div><div><dt>Search sources</dt><dd>{brief.researchMeta.sourceCount}</dd></div><div><dt>Search rounds</dt><dd>{brief.researchMeta.attempts === 2 ? "2 · round 2 reformulated the official query after round 1 found no relevant official source" : "1"}</dd></div>{brief.researchMeta.attempts === 2 && brief.researchMeta.retryQuery && <div><dt>Round-2 query</dt><dd>{brief.researchMeta.retryQuery}</dd></div>}{typeof brief.researchMeta.policyId === "string" && <div><dt>Policy entry</dt><dd>{brief.researchMeta.policyId}</dd></div>}{brief.researchMeta.policyId === null && <div><dt>Policy entry</dt><dd>None configured for this route</dd></div>}<div><dt>Response time</dt><dd>{formatResearchDuration(brief.researchMeta.durationMs)}</dd></div><div><dt>Result origin</dt><dd>{brief.researchMeta.fromCache ? "This browser's 30-minute cache" : "Live agent run"}</dd></div></>} </dl><p className="small">The rubric is a transparent planning heuristic, not a historical missed-connection probability. No API key, raw prompt, or private chain-of-thought is stored or displayed.</p></details><ProvenancePill label={brief.model === "mock-agent" || brief.model === "demo agent fixture" ? "Demo agent fixture" : `Agent-generated · ${brief.model}`} /></div>}
    </section>
  );
}

export default function ConnectionIntegrityDemo() {
  const { providers } = useDemoSession();
  const [side, setSide] = useState<Side>("traveller");
  const [candidate, setCandidate] = useState<"shortest" | "buffered">("shortest");
  const [delayMinutes, setDelayMinutes] = useState(0);
  const [bookedCandidate, setBookedCandidate] = useState<"shortest" | "buffered" | null>(null);
  const [brief, setBrief] = useState<AgentContractBrief | null>(null);
  const [loading, setLoading] = useState(false);
  const [researchError, setResearchError] = useState(false);
  const [proposalSent, setProposalSent] = useState(false);
  const [triggerMode, setTriggerMode] = useState<"scenario" | "manual">("scenario");
  // Scenario replay cursor: -1 = idle, 0..steps.length-1 = active step,
  // steps.length = replay finished.
  const [scenarioStep, setScenarioStep] = useState(-1);
  const [auditTrail, setAuditTrail] = useState<AuditEvent[]>(readAuditTrail);
  const researchCache = useRef(new Map<string, AgentContractBrief>());
  const traceRun = useRef(0);
  const [traceState, setTraceState] = useState<AgentTraceState>(createInitialConnectionTraceState);
  // Scenario cancellation token: bumping the run id invalidates any in-flight
  // replay, so a paused step can never resume after a side switch or a mode
  // change.
  const scenarioRunId = useRef(0);
  useEffect(() => () => { scenarioRunId.current += 1; }, []);
  // Request generation: every askAgent call bumps it, and a response is only
  // applied if it still belongs to the latest request. The effect bumps it on
  // candidate/side/delay changes, so a slow response can never render under a
  // delay or itinerary the user has since left.
  const researchGen = useRef(0);
  useEffect(() => {
    researchGen.current += 1;
  }, [side, candidate, bookedCandidate, delayMinutes]);
  const activeCandidateKey = side === "airline" ? bookedCandidate ?? "shortest" : candidate;
  const activeCandidate = kulConnectionCase[activeCandidateKey];
  const alternativeCandidateKey = activeCandidateKey === "shortest" ? "buffered" : "shortest";
  const alternativeCandidate = kulConnectionCase[alternativeCandidateKey];
  const activeScenario = scenarioForCandidate(activeCandidateKey);
  const activeScenarioReassessment = scenarioReassessmentForCandidate(activeCandidateKey);
  const fallback = fallbackFit(delayMinutes, activeCandidate.connectionMinutes);

  function beginTraceRun(): number {
    const runId = ++traceRun.current;
    setTraceState(createAgentTraceState(runId));
    return runId;
  }

  function updateTrace(runId: number, event: AgentTraceEventInput) {
    setTraceState((current) => applyAgentTraceEvent(current, { ...event, runId }));
  }

  function seedConnectionTrace(runId: number, providerSource: AgentTraceSource, preferenceSummary: string) {
    updateTrace(runId, {
      stage: "preference-interpretation",
      status: "complete",
      source: "user",
      summary: preferenceSummary,
    });
    updateTrace(runId, {
      stage: "flight-search",
      status: "complete",
      source: "snapshot",
      summary: "This connection story uses the recorded ATRIP Sandbox offer snapshot for PVG → KUL → SIN; it is not the Seattle fixture and does not issue a new flight search.",
    });
    updateTrace(runId, {
      stage: "official-evidence-search",
      status: "active",
      source: providerSource,
      summary: providerSource === "mock" ? "Mock mode is preparing the disclosed policy input; no web call will be made." : "Bounded provider research is checking official connection-policy evidence.",
    });
    updateTrace(runId, {
      stage: "community-evidence-search",
      status: "active",
      source: providerSource,
      summary: providerSource === "mock" ? "Mock mode does not call a community search; this row stays explicitly fixture-backed." : "Bounded provider research is checking community transfer experience separately.",
    });
    updateTrace(runId, {
      stage: "policy-rubric-gate",
      status: "complete",
      source: "deterministic",
      summary: DEMO_POLICY
        ? `${DEMO_POLICY.label}: ${DEMO_POLICY.publishedMinimumMinutes} min published minimum + ${DEMO_POLICY.planningBufferMinutes} min planning buffer. This is a time-fit heuristic, not a missed-connection probability.`
        : "No verified route policy is configured; the explicit no-policy path applies.",
    });
    updateTrace(runId, {
      stage: "recommendation",
      status: "active",
      source: providerSource,
      summary: "Waiting for the whitelist-validated brief; recommendation text does not grant booking authority.",
    });
    updateTrace(runId, {
      stage: "consent-gate",
      status: "pending",
      source: "pending",
      summary: "No change is allowed until the traveller explicitly reviews and consents.",
    });
  }

  function completeBriefTrace(runId: number, result: AgentContractBrief) {
    const providerSource = traceSourceForProvider(providers.agent.source);
    const meta = result.researchMeta;
    const fromCache = meta?.fromCache === true;
    const officialSource = evidenceTraceSource(result.sources, "official", fromCache, providerSource);
    const communitySource = evidenceTraceSource(result.sources, "community", fromCache, providerSource);
    const telemetrySummary = meta
      ? `Safe telemetry: ${meta.sourceCount} whitelisted source${meta.sourceCount === 1 ? "" : "s"}, ${meta.attempts === 2 ? "2 bounded evidence rounds" : "1 bounded evidence round"}, ${fromCache ? "browser cache" : "live run"} (${formatResearchDuration(meta.durationMs)}).`
      : "Mock fixture telemetry: no provider or web call was executed.";
    updateTrace(runId, {
      stage: "official-evidence-search",
      status: meta || providerSource === "mock" ? "complete" : "unavailable",
      source: meta || providerSource === "mock" ? officialSource : "unavailable",
      summary: meta || providerSource === "mock"
        ? evidenceTraceSummary(result.sources, "official", fromCache, providerSource)
        : "No official evidence telemetry was returned; no official claim is shown.",
    });
    updateTrace(runId, {
      stage: "community-evidence-search",
      status: meta || providerSource === "mock" ? "complete" : "unavailable",
      source: meta || providerSource === "mock" ? communitySource : "unavailable",
      summary: meta || providerSource === "mock"
        ? evidenceTraceSummary(result.sources, "community", fromCache, providerSource)
        : "No community evidence telemetry was returned; no community claim is shown.",
    });
    const recommendationSource: AgentTraceSource = fromCache ? "snapshot" : providerSource;
    updateTrace(runId, {
      stage: "recommendation",
      status: "complete",
      source: recommendationSource,
      summary: `Whitelist-validated brief recommends ${result.recommendedOption === "selected" ? "the selected" : "the longer-buffer alternative"} option. ${telemetrySummary} Ranking, execution, and booking authority remain deterministic and consent-gated.`,
    });
    updateTrace(runId, {
      stage: "consent-gate",
      status: "active",
      source: "user",
      summary: "Recommendation is ready for explicit traveller consent; no booking or itinerary change has happened.",
    });
  }

  // Side switch clears any verdict generated under the other side: a
  // traveller-side brief must never linger inside the airline view (or
  // vice versa). The injected delay is side-local state too — reset it so
  // a previous replay's delay never leaks into the other side's view.
  function switchSide(next: Side) {
    if (next === side) return;
    cancelScenario();
    beginTraceRun();
    setSide(next);
    setBrief(null);
    setResearchError(false);
    setProposalSent(false);
    setDelayMinutes(0);
  }

  function recordAudit(entry: Omit<AuditEvent, "at">) {
    setAuditTrail(appendAuditEvent(entry));
  }

  function cancelScenario() {
    scenarioRunId.current += 1;
    setScenarioStep(-1);
  }

  function selectTriggerMode(mode: "scenario" | "manual") {
    if (mode === triggerMode) return;
    cancelScenario();
    beginTraceRun();
    setTriggerMode(mode);
    if (mode === "manual") {
      // A replay may have left its fixture judgment and recorded offer behind;
      // manual mode always starts from a clean slate.
      setBrief(null);
      setResearchError(false);
      setProposalSent(false);
    }
  }

  function acceptRecommendation() {
    if (!brief) return;
    const chosenKey = brief.recommendedOption === "selected" ? activeCandidateKey : alternativeCandidateKey;
    recordAudit({ side: "traveller", event: "traveller-consent", detail: `Traveller confirmed ${kulConnectionCase[chosenKey].flights.join(" + ")} (PVG → KUL → SIN) for airline watch`, source: "Traveller UI · demo consent" });
    updateTrace(traceRun.current, {
      stage: "consent-gate",
      status: "complete",
      source: "user",
      summary: `Traveller explicitly approved ${kulConnectionCase[chosenKey].flights.join(" + ")} for the simulated airline watch. No booking was created.`,
    });
    setBookedCandidate(chosenKey);
    setSide("airline");
    setBrief(null);
    setDelayMinutes(0);
    setProposalSent(false);
  }

  function scenarioPause(runId: number, ms: number): Promise<boolean> {
    return new Promise((resolve) => {
      window.setTimeout(() => resolve(scenarioRunId.current === runId), ms);
    });
  }

  // Scripted replay of the airline intervention arc. Each step runs with a
  // visible pause so the event evolution can be followed; every audit entry is
  // source-labelled as a scenario replay, and the whole timeline is simulated.
  async function runScenario() {
    const scenario = activeScenario;
    const scenarioReassessment = activeScenarioReassessment;
    const scenarioOfferCandidate = activeCandidateKey === "shortest" ? alternativeCandidate : activeCandidate;
    const runId = ++scenarioRunId.current;
    const traceRunId = beginTraceRun();
    seedConnectionTrace(
      traceRunId,
      "mock",
      `Traveller-selected ${activeCandidate.flights.join(" + ")} is being replayed through a scripted airline intervention; no live event feed is connected.`,
    );
    setBrief(null);
    setResearchError(false);
    setProposalSent(false);

    // Step 1 — inject the simulated delay event.
    setScenarioStep(0);
    setDelayMinutes(scenario.delayMinutes);
    recordAudit({ side: "airline", event: "scenario-event-injected", detail: `Scenario replay injected a simulated inbound delay of +${scenario.delayMinutes} min on ${activeCandidate.flights.join(" + ")}`, source: "Scenario replay · demo simulation" });
    if (!(await scenarioPause(runId, scenario.stepPauseMs))) return;

    // Step 2 — re-assessment. The scripted replay applies a deterministic
    // fixture judgment (labelled "Demo agent fixture" in the verdict) so the
    // arc is identical every run; the Manual trigger still calls the live
    // provider.
    setScenarioStep(1);
    recordAudit({ side: "airline", event: "scenario-recheck-triggered", detail: `Scenario replay rechecked the connection contract under a +${scenario.delayMinutes} min inbound delay using the deterministic demo fixture`, source: "Scenario replay · demo simulation" });
    updateTrace(traceRunId, {
      stage: "official-evidence-search",
      status: "complete",
      source: "mock",
      summary: "Scripted scenario uses the disclosed policy fixture; no official web search was executed.",
    });
    updateTrace(traceRunId, {
      stage: "community-evidence-search",
      status: "complete",
      source: "mock",
      summary: "Scripted scenario uses no community search; no simulated result is presented as a live source.",
    });
    setResearchError(false);
    if (!(await scenarioPause(runId, scenario.stepPauseMs))) return;
    setBrief(scenarioReassessment);
    updateTrace(traceRunId, {
      stage: "recommendation",
      status: "complete",
      source: "mock",
      summary: activeCandidateKey === "shortest"
        ? "Demo agent fixture recommends the longer-buffer alternative; ranking and intervention execution remain deterministic."
        : "Demo agent fixture keeps the selected longer-buffer itinerary; no extra recovery flight is invented.",
    });
    updateTrace(traceRunId, {
      stage: "consent-gate",
      status: "pending",
      source: "pending",
      summary: "The fixture recommendation is not an action; an offer must be prepared and then explicitly accepted.",
    });
    if (!(await scenarioPause(runId, scenario.stepPauseMs))) return;

    // Step 3 — intervention proposal (the fixture judgment is insufficient).
    setScenarioStep(2);
    recordAudit({ side: "airline", event: "airline-proposal-offer", detail: activeCandidateKey === "shortest"
      ? `Airline prepared a traveller offer for ${scenarioOfferCandidate.flights.join(" + ")} (fare difference waived in this simulation)`
      : `Airline prepared a consent-gated notice to keep ${scenarioOfferCandidate.flights.join(" + ")} (no alternate recovery flight is claimed)`, source: "Scenario replay · demo simulation" });
    setProposalSent(true);
    if (!(await scenarioPause(runId, scenario.stepPauseMs))) return;

    // Step 4 — consent-flow prompt: the offer is recorded, consent still open.
    setScenarioStep(3);
    recordAudit({ side: "airline", event: "scenario-consent-prompt", detail: activeCandidateKey === "shortest"
      ? `Scenario replay recorded the offer for ${scenarioOfferCandidate.flights.join(" + ")}; traveller review and consent are still required before any change`
      : `Scenario replay recorded the notice for ${scenarioOfferCandidate.flights.join(" + ")}; traveller review and consent are still required`, source: "Scenario replay · demo simulation" });
    updateTrace(traceRunId, {
      stage: "consent-gate",
      status: "active",
      source: "user",
      summary: "Offer recorded in the local audit trail; traveller review and explicit consent are still required.",
    });
    if (!(await scenarioPause(runId, scenario.stepPauseMs))) return;
    setScenarioStep(scenario.steps.length);
  }

  async function askAgent(delayOverride?: number): Promise<AgentContractBrief | null> {
    const delay = delayOverride ?? delayMinutes;
    const researchKey = `${providers.agent.source}:${side}:${activeCandidate.flights.join("+")}:${activeCandidate.connectionMinutes}:${delay}`;
    const gen = ++researchGen.current;
    const traceRunId = beginTraceRun();
    seedConnectionTrace(
      traceRunId,
      traceSourceForProvider(providers.agent.source),
      `Traveller selected the ${activeCandidateKey === "shortest" ? "cheapest" : "more-buffered"} itinerary; the Agent compares this explicit choice with the alternative.`,
    );
    const cached = researchCache.current.get(researchKey) ?? readCachedResearch(researchKey);
    if (cached) {
      setResearchError(false);
      const cacheHit = { ...cached, researchMeta: cached.researchMeta ? { ...cached.researchMeta, fromCache: true } : undefined };
      researchCache.current.set(researchKey, cacheHit);
      setBrief(cacheHit);
      completeBriefTrace(traceRunId, cacheHit);
      return cacheHit;
    }
    setLoading(true);
    setResearchError(false);
    try {
      const result = await providers.agent.reviewConnectionContract({
        origin: kulConnectionCase.origin,
        connectionAirport: kulConnectionCase.connectionAirport,
        destination: kulConnectionCase.destination,
        flightNumbers: [...activeCandidate.flights],
        scheduledConnectionMinutes: activeCandidate.connectionMinutes,
        price: activeCandidate.price,
        currency: activeCandidate.currency,
        minimumConnectionMinutes: kulConnectionCase.flyThruMinimumMinutes,
        inboundDelayMinutes: delay || undefined,
        flyThruVerified: false,
        evidence: kulConnectionCase.evidence.map((item) => `${item.kind}: ${item.detail}`),
        alternative: {
          flightNumbers: [...alternativeCandidate.flights],
          scheduledConnectionMinutes: alternativeCandidate.connectionMinutes,
          price: alternativeCandidate.price,
          currency: alternativeCandidate.currency,
        },
      });
      researchCache.current.set(researchKey, result);
      writeCachedResearch(researchKey, result);
      if (gen !== researchGen.current) return null; // stale: context changed mid-flight
      setBrief(result);
      completeBriefTrace(traceRunId, result);
      return result;
    } catch (error) {
      // Local diagnostics only; server messages never contain provider keys.
      console.error("Connection research failed", error);
      if (gen !== researchGen.current) return null;
      setBrief(null);
      setResearchError(true);
      for (const stage of ["official-evidence-search", "community-evidence-search"] as const) {
        updateTrace(traceRunId, {
          stage,
          status: "unavailable",
          source: "unavailable",
          summary: "The research provider did not return a usable response; no evidence claim is shown.",
        });
      }
      updateTrace(traceRunId, {
        stage: "recommendation",
        status: "unavailable",
        source: "unavailable",
        summary: "No recommendation was generated because the evidence-backed assessment is unavailable.",
      });
      updateTrace(traceRunId, {
        stage: "consent-gate",
        status: "unavailable",
        source: "unavailable",
        summary: "Consent cannot open without a completed recommendation.",
      });
      return null;
    } finally {
      if (gen === researchGen.current) setLoading(false);
    }
  }

  return (
    <div className="integrity-demo">
      <section className="integrity-hero">
        <p className="eyebrow">Connection Integrity Agent</p>
        <h1>“Sellable” is not the same as “protected.”</h1>
        <p><strong>Problem origin · Seattle:</strong> a legal-looking international-to-domestic connection still failed in real life when immigration took longer than the available buffer.</p>
        <p><strong>Demo track · PVG → KUL → SIN:</strong> this Asia-Pacific route is the reproducible Atlas Sandbox example, not the Seattle incident. The flow helps a traveller choose before purchase, then lets an airline rehearse a consent-gated intervention.</p>
        <div className="evidence-row"><ProvenancePill label="Snapshot · ATRIP offer observed" /><ProvenancePill label="Live · provider call when configured" /><ProvenancePill label="Mock · zero-credential replay" /><ProvenancePill label="Unavailable · no claim shown" /></div>
      </section>

      <AgentTrace state={traceState} />

      <div className="integrity-tabs" role="tablist" aria-label="Connection Integrity views">
        <button type="button" role="tab" aria-selected={side === "traveller"} className={side === "traveller" ? "active" : ""} onClick={() => switchSide("traveller")}>Traveller: choose before booking</button>
        <button type="button" role="tab" aria-selected={side === "airline"} className={side === "airline" ? "active" : ""} onClick={() => switchSide("airline")}>Airline: intervene after an event</button>
      </div>

      {side === "traveller" ? (
        <>
          <section className="card">
            <div className="card-title-row"><h2>PVG → KUL → SIN · 10 Sep</h2><ProvenancePill label="ATRIP Sandbox offer snapshot" /></div>
            <p className="muted">Two actual ATRIP routings. The first is cheaper and faster; the second buys 70 more minutes at KUL. Select either card, then ask the agent to compare both for you.</p>
            <div className="integrity-options">
              <CandidateCard label="Cheapest" candidate={kulConnectionCase.shortest} selected={candidate === "shortest"} disabled={loading} onChoose={() => { beginTraceRun(); setCandidate("shortest"); setBrief(null); setResearchError(false); }} />
              <CandidateCard label="More buffer" candidate={kulConnectionCase.buffered} selected={candidate === "buffered"} disabled={loading} onChoose={() => { beginTraceRun(); setCandidate("buffered"); setBrief(null); setResearchError(false); }} />
            </div>
            <div className="btn-row"><button type="button" className="btn btn-primary" onClick={() => void askAgent()} disabled={loading}>{loading ? "Agent is comparing evidence…" : "Ask agent which itinerary to choose"}</button></div>
          </section>
          <ContractVerdict brief={brief} fallback={fallback} delayMinutes={delayMinutes} scheduledConnectionMinutes={activeCandidate.connectionMinutes} researchError={researchError} selectedLabel={activeCandidate.flights.join(" + ")} alternativeLabel={alternativeCandidate.flights.join(" + ")} />
          {brief && <section className="card"><div className="card-title-row"><h2>Use this recommendation</h2><ProvenancePill label="Traveller consent required" /></div><p>Confirming carries <strong>{brief.recommendedOption === "selected" ? activeCandidate.flights.join(" + ") : alternativeCandidate.flights.join(" + ")}</strong> into the airline watch simulation. No booking is created.</p><div className="btn-row"><button type="button" className="btn btn-primary" onClick={acceptRecommendation}>{bookedCandidate === (brief.recommendedOption === "selected" ? activeCandidateKey : alternativeCandidateKey) ? "Selected for airline watch" : "Use recommended itinerary"}</button></div></section>}
          <section className="card"><h2>Evidence ledger</h2>{kulConnectionCase.evidence.map((item) => <div className="evidence-item" key={item.kind}><strong>{item.kind}</strong><p>{item.detail}</p><a href={item.url} target="_blank" rel="noreferrer">Read source</a></div>)}</section>
        </>
      ) : (
        <>
          <section className="card">
            <div className="card-title-row"><h2>Booked connection watch</h2><ProvenancePill label="Simulated operational event" /></div>
            <p><strong>{activeCandidate.flights.join(" + ")}</strong> · scheduled KUL window: {formatDuration(activeCandidate.connectionMinutes)} · connection contract: <strong>not yet verified</strong>{bookedCandidate ? " · traveller-selected itinerary" : " · default demo itinerary"}.</p>
            <div className="trigger-mode-switch" role="group" aria-label="Delay simulation trigger mode">
              <span className="trigger-mode-caption">Delay trigger · 延误触发</span>
              <button type="button" className={triggerMode === "scenario" ? "active" : ""} onClick={() => selectTriggerMode("scenario")}>Scenario replay · 场景回放</button>
              <button type="button" className={triggerMode === "manual" ? "active" : ""} onClick={() => selectTriggerMode("manual")}>Manual · 手动触发</button>
            </div>
            {triggerMode === "scenario" ? (
              <div className="scenario-panel">
                <p className="muted small">{activeScenario.name} — scripted demo timeline. Every event below is simulated; no live flight-status feed is used.</p>
                <ol className="scenario-steps">
                  {activeScenario.steps.map((step, index) => {
                    const stepState = index < scenarioStep ? "done" : index === scenarioStep && scenarioStep < activeScenario.steps.length ? "active" : "";
                    return (
                      <li key={step.label} className={stepState}>
                        <span className="scenario-step-dot" aria-hidden="true">{index < scenarioStep ? "✓" : index + 1}</span>
                        <span className="scenario-step-copy"><strong>{step.label}</strong><small>{step.detail}</small></span>
                      </li>
                    );
                  })}
                </ol>
                <div className="btn-row">
                  <button type="button" className="btn btn-primary" onClick={() => void runScenario()} disabled={(scenarioStep >= 0 && scenarioStep < activeScenario.steps.length) || loading}>
                    {scenarioStep >= 0 && scenarioStep < activeScenario.steps.length
                      ? (loading ? "Agent is rechecking…" : "Scenario running…")
                      : scenarioStep >= activeScenario.steps.length ? "Replay scenario again · 重新回放" : "Run scenario · 一键回放"}
                  </button>
                  {scenarioStep >= 0 && scenarioStep < activeScenario.steps.length && <button type="button" className="btn btn-secondary" onClick={cancelScenario}>Stop replay · 停止</button>}
                </div>
                {scenarioStep >= 3 && <div className="callout callout-success"><span className="callout-title">Offer recorded — consent pending.</span> {activeCandidateKey === "shortest" ? "The traveller must still review and accept the alternative routing" : "The traveller must still review the selected routing notice"}; no change applies without consent (simulated flow).</div>}
                {scenarioStep >= activeScenario.steps.length && <div className="banner banner-success">Replay complete — each step was written to the audit trail below. All events are simulated.</div>}
              </div>
            ) : (
              <>
                <div className="integrity-event"><span>Inbound event</span><button type="button" className={delayMinutes === 0 ? "selected" : ""} onClick={() => { beginTraceRun(); setDelayMinutes(0); setProposalSent(false); setBrief(null); setResearchError(false); }}>No disruption</button><button type="button" className={delayMinutes === 60 ? "selected" : ""} onClick={() => { beginTraceRun(); setDelayMinutes(60); setProposalSent(false); setBrief(null); setResearchError(false); }}>Inbound delayed +60 min</button></div>
                <div className="btn-row"><button type="button" className="btn btn-primary" onClick={() => void askAgent()} disabled={loading}>{loading ? "Agent is rechecking…" : "Recheck connection contract"}</button></div>
              </>
            )}
          </section>
          <ContractVerdict brief={brief} fallback={fallback} delayMinutes={delayMinutes} scheduledConnectionMinutes={activeCandidate.connectionMinutes} researchError={researchError} selectedLabel={activeCandidate.flights.join(" + ")} alternativeLabel={alternativeCandidate.flights.join(" + ")} />
          {(brief?.connectionFit === "insufficient" || fallback === "insufficient") && <section className="card"><div className="card-title-row"><h2>Proposed intervention</h2><ProvenancePill label="Consent required" /></div><p>Offer the traveller the alternate routing <strong>{alternativeCandidate.flights.join(" + ")}</strong>; in this simulated intervention the airline waives the fare difference.</p><div className="btn-row"><button type="button" className="btn btn-primary" disabled={proposalSent} onClick={() => { recordAudit({ side: "airline", event: "airline-proposal-offer", detail: `Airline prepared a traveller offer for ${alternativeCandidate.flights.join(" + ")} (fare difference waived in this simulation)`, source: "Airline ops UI · demo simulation" }); setProposalSent(true); }}>{proposalSent ? "Traveller offer recorded (demo)" : "Prepare traveller offer"}</button></div>{proposalSent && <div className="banner banner-success">Proposal recorded. The traveller must still review and accept the alternative.</div>}</section>}
        </>
      )}

      <section className="card">
        <div className="card-title-row"><h2>Audit trail</h2><ProvenancePill label="Persisted in this browser" /></div>
        <p className="muted">Traveller consent and airline proposal/offer events are written to this browser's local storage with a timestamp and a source label. The trail never leaves the device; it exists so the demo's auditable-consent claim can be inspected.</p>
        {auditTrail.length === 0
          ? <p className="muted">No consent or proposal event has been recorded yet.</p>
          : auditTrail.slice().reverse().map((event) => (
            <div className="evidence-item" key={`${event.at}-${event.event}`}>
              <strong>{event.side === "traveller" ? "Traveller" : "Airline"} · {event.event}</strong>
              <p>{event.detail}</p>
              <p className="small">{new Date(event.at).toLocaleString()} · {event.source}</p>
            </div>
          ))}
      </section>
    </div>
  );
}
