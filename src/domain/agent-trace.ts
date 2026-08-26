/**
 * Safe, user-visible Agent trace state.
 *
 * This is a status ledger, not a reasoning transcript. It deliberately
 * carries only a fixed stage, a short UI summary, and a provenance class.
 * The state machine rejects stale runs and backwards status updates so a
 * slower request can never make the visible trace tell an impossible story.
 */

export const AGENT_TRACE_STAGES = [
  "preference-interpretation",
  "flight-search",
  "official-evidence-search",
  "community-evidence-search",
  "policy-rubric-gate",
  "recommendation",
  "consent-gate",
] as const;

export type AgentTraceStage = (typeof AGENT_TRACE_STAGES)[number];
export type AgentTraceStatus = "pending" | "active" | "complete" | "unavailable";

/** Provenance classes shown in the trace. `live` is reserved for a provider
 * call that actually completed; scripted fixtures must use `mock` or
 * `snapshot`, never `live`. */
export type AgentTraceSource =
  | "live"
  | "mock"
  | "snapshot"
  | "unavailable"
  | "deterministic"
  | "user"
  | "pending";

export interface AgentTraceEvent {
  id: string;
  runId: number;
  stage: AgentTraceStage;
  label: string;
  status: AgentTraceStatus;
  source: AgentTraceSource;
  summary: string;
}

export interface AgentTraceState {
  runId: number;
  events: AgentTraceEvent[];
}

export type AgentTraceEventInput = Omit<AgentTraceEvent, "id" | "runId" | "label"> & {
  label?: string;
};

const STAGE_LABELS: Record<AgentTraceStage, string> = {
  "preference-interpretation": "Preference interpretation",
  "flight-search": "Atlas / flight search",
  "official-evidence-search": "Official evidence search",
  "community-evidence-search": "Community evidence search",
  "policy-rubric-gate": "Policy / rubric gate",
  recommendation: "Recommendation",
  "consent-gate": "Consent gate",
};

const SOURCE_LABELS: Record<AgentTraceSource, string> = {
  live: "Live · provider call",
  mock: "Mock · deterministic fixture",
  snapshot: "Snapshot · recorded input/cache",
  unavailable: "Unavailable · no claim shown",
  deterministic: "Deterministic engine",
  user: "User action · explicit",
  pending: "Pending · not run",
};

const STATUS_RANK: Record<AgentTraceStatus, number> = {
  pending: 0,
  active: 1,
  complete: 2,
  unavailable: 2,
};

const STAGE_INDEX = new Map<AgentTraceStage, number>(AGENT_TRACE_STAGES.map((stage, index) => [stage, index]));

export function traceStageLabel(stage: AgentTraceStage): string {
  return STAGE_LABELS[stage];
}

export function traceSourceLabel(source: AgentTraceSource): string {
  return SOURCE_LABELS[source];
}

/** Map provider identifiers to the only provenance classes that are allowed
 * to appear in a trace. Errors are mapped to `unavailable` by the caller. */
export function traceSourceForProvider(source: string): AgentTraceSource {
  if (source === "atlas-sandbox" || source === "bailian" || source === "deepseek") return "live";
  if (source === "mock") return "mock";
  return "unavailable";
}

export function createAgentTraceState(runId = 0): AgentTraceState {
  return {
    runId,
    events: AGENT_TRACE_STAGES.map((stage) => ({
      id: `${runId}:${stage}`,
      runId,
      stage,
      label: traceStageLabel(stage),
      status: "pending",
      source: "pending",
      summary: "Waiting for this step.",
    })),
  };
}

function canApplyStatus(current: AgentTraceEvent | undefined, next: AgentTraceStatus): boolean {
  if (!current) return true;
  // Completed/unavailable stages are terminal for a run. A retry starts a
  // fresh run instead of reopening a row and mixing two request histories.
  if (STATUS_RANK[current.status] === STATUS_RANK[next] && current.status !== next) return false;
  return STATUS_RANK[next] >= STATUS_RANK[current.status];
}

/**
 * Apply one safe event to a trace. Events from an older run are ignored.
 * Events can arrive in any order (official/community search may resolve at
 * different times), but rendering always follows the fixed stage order.
 */
export function applyAgentTraceEvent(
  state: AgentTraceState,
  event: AgentTraceEventInput & { runId: number },
): AgentTraceState {
  if (event.runId !== state.runId || !STAGE_INDEX.has(event.stage)) return state;
  const current = state.events.find((item) => item.stage === event.stage);
  if (!canApplyStatus(current, event.status)) return state;
  const next: AgentTraceEvent = {
    id: `${state.runId}:${event.stage}`,
    runId: state.runId,
    stage: event.stage,
    label: event.label ?? traceStageLabel(event.stage),
    status: event.status,
    source: event.source,
    summary: event.summary,
  };
  const events = state.events.filter((item) => item.stage !== event.stage).concat(next);
  events.sort((a, b) => (STAGE_INDEX.get(a.stage) ?? 0) - (STAGE_INDEX.get(b.stage) ?? 0));
  return { ...state, events };
}

/** A mock or snapshot is never a live provider call. Kept as a pure helper so
 * regressions cannot silently relabel scripted demo events as live. */
export function isLiveTraceSource(source: AgentTraceSource): boolean {
  return source === "live";
}

