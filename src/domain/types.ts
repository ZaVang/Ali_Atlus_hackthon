// Core domain types shared by providers and UI.

export type DataSource = "mock" | "atlas-sandbox" | "unavailable";

export interface FlightSegment {
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string; // ISO local time, e.g. "2026-09-09T13:35:00"
  arrivalTime: string;
  carrier: string;
  flightNumber: string;
  durationMinutes: number;
}

export interface FlightOffer {
  id: string;
  source: DataSource;
  origin: string;
  destination: string;
  segments: FlightSegment[];
  totalPrice: number;
  currency: string;
  routingIdentifier?: string;
}

export interface FlightSearchInput {
  origin: string;
  destination: string;
  departDate: string; // YYYY-MM-DD
  adults?: number;
  currency?: string;
}

/** Result of a non-destructive offer freshness check. `verified` means only
 * that a fresh search returned the same routingIdentifier; it is not a PNR,
 * Fly-Thru, booking, payment, or servicing confirmation. */
export type OfferRecheckStatus = "verified" | "not-found" | "snapshot" | "unavailable";

export interface OfferRecheckInput {
  offer: FlightOffer;
  search: FlightSearchInput;
}

export interface OfferRecheckResult {
  status: OfferRecheckStatus;
  /** `unavailable` is used when no live claim can be made. */
  source: DataSource;
  routingIdentifier?: string;
  checkedAt?: string;
  message: string;
}

export interface AtlasFlightProvider {
  readonly source: DataSource;
  searchOffers(input: FlightSearchInput): Promise<FlightOffer[]>;
  recheckOffer(input: OfferRecheckInput): Promise<OfferRecheckResult>;
}

/** UI label describing where displayed data came from. */
export type RiskProvenance = "agent-generated";

// ---------------------------------------------------------------------------
// Agent (LLM) provider: understanding & expression only. The deterministic
// engine keeps ownership of ranking, execution, and consent.
// ---------------------------------------------------------------------------

/** Preferences for choosing a ticket before purchase. */
export type ConnectionChoicePriority = "lowest-cost" | "earliest-arrival" | "largest-buffer";

export interface ParsedConnectionPreference {
  priority: ConnectionChoicePriority;
  note: string;
}

export type ConnectionFit = "comfortable" | "tight" | "insufficient";
export type ConnectionProtectionStatus = "confirmed" | "not-confirmed";
export type ConnectionRecommendation = "selected" | "alternative";
export type ConnectionAssessmentConfidence = "low" | "medium" | "high";

export interface ConnectionContractBrief {
  /** Whether the planned transfer time is comfortable, tight, or insufficient.
   * This is not a missed-connection probability. */
  connectionFit: ConnectionFit;
  /** Ticket protection is deliberately separate from time adequacy. */
  protectionStatus: ConnectionProtectionStatus;
  /** Which of the two supplied options the agent would pick for the traveller. */
  recommendedOption: ConnectionRecommendation;
  recommendationSummary: string;
  assessmentConfidence: ConnectionAssessmentConfidence;
  rationale: string;
  keyFactors: string[];
  limitations: string[];
  nextAction: string;
  sources?: ConnectionResearchSource[];
  researchMeta?: ConnectionResearchMeta;
}

export interface ConnectionResearchSource {
  tier: "official" | "community";
  title: string;
  url: string;
  summary: string;
  /** True when the source is a disclosed product policy input injected as a
   * fallback (no live search hit), never a live research result. */
  disclosed?: boolean;
}

/** Safe, user-visible telemetry for one connection-research run. It contains
 * neither API credentials nor hidden model reasoning. */
export interface ConnectionResearchMeta {
  sourceCount: number;
  durationMs: number;
  fromCache: boolean;
  completedAt: string;
  /** Evidence-search rounds actually executed (bounded at 2). Round 2 only
   * happens when round 1 returned no relevant official source, and uses a
   * reformulated query. */
  attempts?: number;
  /** The reformulated official query used by round 2, when it ran. */
  retryQuery?: string;
  /** Id of the registered connection policy entry that drove the evidence
   * thresholds, or null when the route took the explicit no-policy path. */
  policyId?: string | null;
}

export interface ConnectionContractInput {
  origin: string;
  connectionAirport: string;
  destination: string;
  flightNumbers: string[];
  scheduledConnectionMinutes: number;
  price: number;
  currency: string;
  minimumConnectionMinutes: number;
  inboundDelayMinutes?: number;
  flyThruVerified: boolean;
  evidence: string[];
  alternative?: {
    flightNumbers: string[];
    scheduledConnectionMinutes: number;
    price: number;
    currency: string;
  };
}

export interface AgentProvider {
  /** `deepseek` and `bailian` both use the same OpenAI-compatible server proxy. */
  readonly source: "mock" | "bailian" | "deepseek";
  parseConnectionPreference(text: string, signal?: AbortSignal): Promise<ParsedConnectionPreference & { model: string }>;
  reviewConnectionContract(
    input: ConnectionContractInput,
    signal?: AbortSignal,
  ): Promise<ConnectionContractBrief & { model: string }>;
}
