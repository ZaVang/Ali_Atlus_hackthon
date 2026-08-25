import { useEffect, useRef, useState } from "react";
import type { ConnectionContractBrief, ConnectionFit } from "../domain/types";
import { kulConnectionCase } from "../data/connection-integrity";
import { useDemoSession } from "../state/session";
import { ProvenancePill, formatDuration, formatMoney } from "./shared";

type Side = "traveller" | "airline";
type Candidate = typeof kulConnectionCase.shortest | typeof kulConnectionCase.buffered;
type AgentContractBrief = ConnectionContractBrief & { model: string };

const CONNECTION_RESEARCH_CACHE_PREFIX = "connection-integrity:research:v4:";
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

// Cached briefs come from untrusted browser storage: re-apply the same enum
// whitelist the live provider enforces so a tampered value can never reach
// the verdict rendering.
function isValidBriefShape(brief: AgentContractBrief): boolean {
  return (
    (brief.connectionFit === "comfortable" || brief.connectionFit === "tight" || brief.connectionFit === "insufficient")
    && (brief.protectionStatus === "confirmed" || brief.protectionStatus === "not-confirmed")
    && (brief.recommendedOption === "selected" || brief.recommendedOption === "alternative")
    && typeof brief.recommendationSummary === "string"
    && typeof brief.model === "string"
    && Array.isArray(brief.keyFactors)
    && Array.isArray(brief.limitations)
  );
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
      <div className="card-title-row"><h2>{brief ? "Agent recommendation" : "Research ready"}</h2>{brief && <><span className={`badge ${copy.badgeClassName}`}>{copy.title}</span><ProvenancePill label={brief.protectionStatus === "confirmed" ? "Ticket protection confirmed" : "Ticket protection not confirmed"} /><ProvenancePill label={`Assessment confidence: ${brief.assessmentConfidence}`} /></>}</div>
      {!brief && !researchError && <p>Ask the agent to compare both offers using public KUL transfer evidence. It will answer time fit, ticket protection, and which offer it recommends separately.</p>}
      {!brief && researchError && <p>The live research request did not finish. No agent judgment has been shown; retry the check to obtain a source-backed assessment.</p>}
      {delayMinutes > 0 && <p className="small">Event input leaves {formatDuration(remaining)} against the published {formatDuration(kulConnectionCase.flyThruMinimumMinutes)} minimum.</p>}
      {brief && <div className="agent-brief"><strong>Choose {brief.recommendedOption === "selected" ? selectedLabel : alternativeLabel}</strong><p className="agent-recommendation">{brief.recommendationSummary}</p><p>{brief.rationale}</p>{brief.keyFactors.length > 0 && <p className="small"><strong>Why:</strong> {brief.keyFactors.join(" · ")}</p>}<p className="small"><strong>Before purchase:</strong> {brief.nextAction}</p>{brief.limitations.length > 0 && <p className="small"><strong>What remains unknown:</strong> {brief.limitations.join(" · ")}</p>}{brief.sources && brief.sources.length > 0 && <div className="agent-research"><strong>Agent research</strong>{brief.sources.map((source) => <a key={`${source.tier}-${source.url}`} href={source.url} target="_blank" rel="noreferrer"><span>{source.tier === "official" ? (source.disclosed ? "Official · disclosed fallback input" : "Official") : "Community"}</span><span className="agent-source-copy">{source.title}<small>{source.summary}</small></span></a>)}</div>}<details className="agent-run-details"><summary>How this judgment was made</summary><dl><div><dt>Time-fit rubric</dt><dd>60 min published minimum + 90 min planning buffer</dd></div><div><dt>Model</dt><dd>{brief.model}</dd></div><div><dt>Workflow</dt><dd>{brief.researchMeta ? `Tavily evidence search → ${usesDeepSeek ? "DeepSeek" : "provider"} assessment` : "Demo fixture (no live call)"}</dd></div>{brief.researchMeta && <><div><dt>Thinking</dt><dd>{usesDeepSeek ? "Enabled · medium effort" : "Provider-configured mode"}</dd></div><div><dt>Search sources</dt><dd>{brief.researchMeta.sourceCount}</dd></div><div><dt>Search rounds</dt><dd>{brief.researchMeta.attempts === 2 ? "2 · round 2 reformulated the official query after round 1 found no relevant official source" : "1"}</dd></div>{brief.researchMeta.attempts === 2 && brief.researchMeta.retryQuery && <div><dt>Round-2 query</dt><dd>{brief.researchMeta.retryQuery}</dd></div>}<div><dt>Response time</dt><dd>{formatResearchDuration(brief.researchMeta.durationMs)}</dd></div><div><dt>Result origin</dt><dd>{brief.researchMeta.fromCache ? "This browser's 30-minute cache" : "Live agent run"}</dd></div></>} </dl><p className="small">The rubric is a transparent planning heuristic, not a historical missed-connection probability. No API key, raw prompt, or private chain-of-thought is stored or displayed.</p></details><ProvenancePill label={brief.model === "mock-agent" || brief.model === "demo agent fixture" ? "Demo agent fixture" : `Agent-generated · ${brief.model}`} /></div>}
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
  const researchCache = useRef(new Map<string, AgentContractBrief>());
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
  const fallback = fallbackFit(delayMinutes, activeCandidate.connectionMinutes);

  async function askAgent() {
    const researchKey = `${side}:${activeCandidate.flights.join("+")}:${activeCandidate.connectionMinutes}:${delayMinutes}`;
    const gen = ++researchGen.current;
    const cached = researchCache.current.get(researchKey) ?? readCachedResearch(researchKey);
    if (cached) {
      setResearchError(false);
      const cacheHit = { ...cached, researchMeta: cached.researchMeta ? { ...cached.researchMeta, fromCache: true } : undefined };
      researchCache.current.set(researchKey, cacheHit);
      setBrief(cacheHit);
      return;
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
        inboundDelayMinutes: delayMinutes || undefined,
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
      if (gen !== researchGen.current) return; // stale: context changed mid-flight
      setBrief(result);
    } catch (error) {
      // Local diagnostics only; server messages never contain provider keys.
      console.error("Connection research failed", error);
      if (gen !== researchGen.current) return;
      setBrief(null);
      setResearchError(true);
    } finally {
      if (gen === researchGen.current) setLoading(false);
    }
  }

  return (
    <div className="integrity-demo">
      <section className="integrity-hero">
        <p className="eyebrow">Connection Integrity Agent</p>
        <h1>“Sellable” is not the same as “protected.”</h1>
        <p>One Asia-Pacific connection, two decisions: help a traveller choose an evidence-backed itinerary before purchase, then help an airline intervene when an event breaks that connection contract.</p>
        <div className="evidence-row"><ProvenancePill label="ATRIP flight offer" /><ProvenancePill label="AirAsia public policy" /><ProvenancePill label="Time fit ≠ ticket protection" /></div>
      </section>

      <div className="integrity-tabs" role="tablist" aria-label="Connection Integrity views">
        <button type="button" role="tab" aria-selected={side === "traveller"} className={side === "traveller" ? "active" : ""} onClick={() => setSide("traveller")}>Traveller: choose before booking</button>
        <button type="button" role="tab" aria-selected={side === "airline"} className={side === "airline" ? "active" : ""} onClick={() => setSide("airline")}>Airline: intervene after an event</button>
      </div>

      {side === "traveller" ? (
        <>
          <section className="card">
            <div className="card-title-row"><h2>PVG → KUL → SIN · 10 Sep</h2><ProvenancePill label="ATRIP Sandbox offer snapshot" /></div>
            <p className="muted">Two actual ATRIP routings. The first is cheaper and faster; the second buys 70 more minutes at KUL. Select either card, then ask the agent to compare both for you.</p>
            <div className="integrity-options">
              <CandidateCard label="Cheapest" candidate={kulConnectionCase.shortest} selected={candidate === "shortest"} disabled={loading} onChoose={() => { setCandidate("shortest"); setBrief(null); setResearchError(false); }} />
              <CandidateCard label="More buffer" candidate={kulConnectionCase.buffered} selected={candidate === "buffered"} disabled={loading} onChoose={() => { setCandidate("buffered"); setBrief(null); setResearchError(false); }} />
            </div>
            <div className="btn-row"><button type="button" className="btn btn-primary" onClick={() => void askAgent()} disabled={loading}>{loading ? "Agent is comparing evidence…" : "Ask agent which itinerary to choose"}</button></div>
          </section>
          <ContractVerdict brief={brief} fallback={fallback} delayMinutes={delayMinutes} scheduledConnectionMinutes={activeCandidate.connectionMinutes} researchError={researchError} selectedLabel={activeCandidate.flights.join(" + ")} alternativeLabel={alternativeCandidate.flights.join(" + ")} />
          {brief && <section className="card"><div className="card-title-row"><h2>Use this recommendation</h2><ProvenancePill label="Traveller consent required" /></div><p>Confirming carries <strong>{brief.recommendedOption === "selected" ? activeCandidate.flights.join(" + ") : alternativeCandidate.flights.join(" + ")}</strong> into the airline watch simulation. No booking is created.</p><div className="btn-row"><button type="button" className="btn btn-primary" onClick={() => { setBookedCandidate(brief.recommendedOption === "selected" ? activeCandidateKey : alternativeCandidateKey); setSide("airline"); setBrief(null); setDelayMinutes(0); setProposalSent(false); }}>{bookedCandidate === (brief.recommendedOption === "selected" ? activeCandidateKey : alternativeCandidateKey) ? "Selected for airline watch" : "Use recommended itinerary"}</button></div></section>}
          <section className="card"><h2>Evidence ledger</h2>{kulConnectionCase.evidence.map((item) => <div className="evidence-item" key={item.kind}><strong>{item.kind}</strong><p>{item.detail}</p><a href={item.url} target="_blank" rel="noreferrer">Read source</a></div>)}</section>
        </>
      ) : (
        <>
          <section className="card">
            <div className="card-title-row"><h2>Booked connection watch</h2><ProvenancePill label="Simulated operational event" /></div>
            <p><strong>{activeCandidate.flights.join(" + ")}</strong> · scheduled KUL window: {formatDuration(activeCandidate.connectionMinutes)} · connection contract: <strong>not yet verified</strong>{bookedCandidate ? " · traveller-selected itinerary" : " · default demo itinerary"}.</p>
            <div className="integrity-event"><span>Inbound event</span><button type="button" className={delayMinutes === 0 ? "selected" : ""} onClick={() => { setDelayMinutes(0); setProposalSent(false); setBrief(null); setResearchError(false); }}>No disruption</button><button type="button" className={delayMinutes === 60 ? "selected" : ""} onClick={() => { setDelayMinutes(60); setProposalSent(false); setBrief(null); setResearchError(false); }}>Inbound delayed +60 min</button></div>
            <div className="btn-row"><button type="button" className="btn btn-primary" onClick={() => void askAgent()} disabled={loading}>{loading ? "Agent is rechecking…" : "Recheck connection contract"}</button></div>
          </section>
          <ContractVerdict brief={brief} fallback={fallback} delayMinutes={delayMinutes} scheduledConnectionMinutes={activeCandidate.connectionMinutes} researchError={researchError} selectedLabel={activeCandidate.flights.join(" + ")} alternativeLabel={alternativeCandidate.flights.join(" + ")} />
          {(brief?.connectionFit === "insufficient" || fallback === "insufficient") && <section className="card"><div className="card-title-row"><h2>Proposed intervention</h2><ProvenancePill label="Consent required" /></div><p>Offer the traveller the alternate routing <strong>{alternativeCandidate.flights.join(" + ")}</strong>; in this simulated intervention the airline waives the fare difference.</p><div className="btn-row"><button type="button" className="btn btn-primary" disabled={proposalSent} onClick={() => setProposalSent(true)}>{proposalSent ? "Traveller offer recorded (demo)" : "Prepare traveller offer"}</button></div>{proposalSent && <div className="banner banner-success">Proposal recorded. The traveller must still review and accept the alternative.</div>}</section>}
        </>
      )}
    </div>
  );
}
