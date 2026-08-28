import type { AgentTraceEvent, AgentTraceSource, AgentTraceState } from "../domain/agent-trace";
import { traceSourceLabel } from "../domain/agent-trace";

const STATUS_LABELS: Record<AgentTraceEvent["status"], string> = {
  pending: "Pending",
  active: "In progress",
  complete: "Complete",
  unavailable: "Unavailable",
};

function SourcePill({ source }: { source: AgentTraceSource }) {
  return <span className={`agent-trace-source agent-trace-source-${source}`}>{traceSourceLabel(source)}</span>;
}

function TraceRow({ event, index }: { event: AgentTraceEvent; index: number }) {
  return (
    <li className={`agent-trace-row agent-trace-${event.status}`}>
      <span className="agent-trace-index" aria-hidden="true">{event.status === "complete" ? "✓" : index + 1}</span>
      <div className="agent-trace-copy">
        <div className="agent-trace-heading">
          <strong>{event.label}</strong>
          <span className="agent-trace-status">{STATUS_LABELS[event.status]}</span>
        </div>
        <p>{event.summary}</p>
        <SourcePill source={event.source} />
      </div>
    </li>
  );
}

export default function AgentTrace({ state, compact = false, collapsible = false }: { state: AgentTraceState; compact?: boolean; collapsible?: boolean }) {
  const content = <>
    <p className="muted small">The trace exposes stage status and provenance only. It never shows a private prompt, API key, or chain-of-thought. Agent language is advisory; the deterministic engine owns ranking, policy gates, execution, and consent.</p>
    <ol className="agent-trace-list">
      {state.events.map((event, index) => <TraceRow key={event.id} event={event} index={index} />)}
    </ol>
  </>;
  return (
    <section className={`agent-trace ${compact ? "agent-trace-compact" : ""}`.trim()} aria-label="Safe Agent trace">
      <div className="card-title-row">
        <div>
          <p className="agent-trace-kicker">Visible run trace · no hidden reasoning</p>
          <h2>How the Agent and rules reached this point</h2>
        </div>
        <span className="pill">Run {state.runId}</span>
      </div>
      {collapsible ? <details className="agent-trace-details"><summary>Show Agent trace and provenance</summary>{content}</details> : content}
    </section>
  );
}

