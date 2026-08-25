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

export interface AtlasFlightProvider {
  readonly source: DataSource;
  searchOffers(input: FlightSearchInput): Promise<FlightOffer[]>;
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
