// Shared presentation helpers consumed by both views.
import type { DataSource, RiskProvenance } from "../domain/types";

const SOURCE_LABELS: Record<DataSource, string> = {
  mock: "Demo fixtures",
  "atlas-sandbox": "Atlas flight data",
  unavailable: "Data unavailable",
};

const PROVENANCE_LABELS: Record<RiskProvenance, string> = {
  "agent-generated": "Agent-generated",
};

/** The single source-of-truth mapping from data origin to UI label. */
export function ProvenancePill({
  source,
  provenance,
  label,
}: {
  source?: DataSource;
  provenance?: RiskProvenance;
  label?: string;
}) {
  const text = label ?? (source ? SOURCE_LABELS[source] : provenance ? PROVENANCE_LABELS[provenance] : null);
  if (!text) return null;
  return <span className="pill">{text}</span>;
}

export function formatClock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit" });
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} m`;
}

export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}
