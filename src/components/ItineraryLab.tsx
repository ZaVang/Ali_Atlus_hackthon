// A purchase-time connection chooser. ATRIP is queried for two separate
// point-to-point legs; this view only calls their time-compatible pairings
// "self-transfer combinations" and never presents them as a single ticket.
import { useMemo, useState } from "react";
import type { ConnectionChoicePriority, FlightOffer, FlightSegment } from "../domain/types";
import { useDemoSession } from "../state/session";
import { formatClock, formatDuration, formatMoney, ProvenancePill } from "./shared";

type SearchStatus = "idle" | "loading" | "ready" | "error";
type PreferenceStatus = "idle" | "parsing" | "fallback";

interface ItineraryCombination {
  id: string;
  inbound: FlightOffer;
  outbound: FlightOffer;
  connectionAirport: string;
  connectionMinutes: number;
  totalPrice: number;
  currency: string;
  finalArrival: string;
}

// A disclosed product screening floor derived from the KUL demo policy. It
// is not asserted to be an MCT for an independently assembled self-transfer.
const MINIMUM_SCREENING_MINUTES = 60;
const PLANNING_BUFFER_MINUTES = 90;
const MAX_CONNECTION_MINUTES = 18 * 60;
const INITIAL_VISIBLE_COMBINATIONS = 6;

const PREFERENCE_CARDS: Array<{ value: ConnectionChoicePriority; title: string; blurb: string }> = [
  { value: "largest-buffer", title: "Comfortable connection", blurb: "Reach a comfortable buffer first, then avoid an unnecessarily long wait." },
  { value: "lowest-cost", title: "Lowest total fare", blurb: "Minimise the two-leg price, then use time fit as the tie-breaker." },
  { value: "earliest-arrival", title: "Earliest arrival", blurb: "Reach the final destination earliest, without hiding a tight connection." },
];

const SANDBOX_PRESETS = [
  { origin: "PVG", connection: "KUL", destination: "SIN", label: "Shanghai → Kuala Lumpur → Singapore" },
] as const;

function validAirport(value: string): boolean {
  return /^[A-Z]{3}$/.test(value.trim().toUpperCase());
}

function firstSegment(offer: FlightOffer): FlightSegment | undefined {
  return offer.segments[0];
}

// ATRIP's current routing identifier carries local wall-clock times without
// an offset. Pairing happens at one airport, so compare those wall clocks
// directly rather than letting the browser's timezone reinterpret them.
function localWallClockMinutes(iso: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  if (!match) return null;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5])) / 60_000;
}

function lastSegment(offer: FlightOffer): FlightSegment | undefined {
  return offer.segments[offer.segments.length - 1];
}

function flightName(offer: FlightOffer): string {
  return offer.segments.length > 0 ? offer.segments.map((segment) => segment.flightNumber).join(" + ") : offer.id.slice(-8);
}

function connectionFit(connectionMinutes: number): "comfortable" | "tight" | "insufficient" {
  if (connectionMinutes < MINIMUM_SCREENING_MINUTES) return "insufficient";
  if (connectionMinutes < MINIMUM_SCREENING_MINUTES + PLANNING_BUFFER_MINUTES) return "tight";
  return "comfortable";
}

function fitLabel(connectionMinutes: number): string {
  const fit = connectionFit(connectionMinutes);
  return fit === "comfortable" ? "Likely comfortable" : fit === "tight" ? "Tight" : "Insufficient";
}

function fitClassName(connectionMinutes: number): string {
  const fit = connectionFit(connectionMinutes);
  return fit === "comfortable" ? "risk-low" : fit === "tight" ? "risk-medium" : "risk-high";
}

function makeCombinations(inbound: FlightOffer[], outbound: FlightOffer[]): ItineraryCombination[] {
  const combinations: ItineraryCombination[] = [];
  for (const inOffer of inbound) {
    const inboundArrival = lastSegment(inOffer);
    if (!inboundArrival) continue;
    for (const outOffer of outbound) {
      const outboundDeparture = firstSegment(outOffer);
      const outboundArrival = lastSegment(outOffer);
      if (!outboundDeparture || !outboundArrival) continue;
      if (inboundArrival.arrivalAirport !== outboundDeparture.departureAirport) continue;
      const departureMinutes = localWallClockMinutes(outboundDeparture.departureTime);
      const arrivalMinutes = localWallClockMinutes(inboundArrival.arrivalTime);
      const connectionMinutes = departureMinutes === null || arrivalMinutes === null ? Number.NaN : departureMinutes - arrivalMinutes;
      // A pair is only eligible for ranking if it clears the published
      // 60-minute disclosed screening floor. Below-floor pairs are not merely "tight";
      // they are impossible for this chooser and must never be recommended.
      if (!Number.isFinite(connectionMinutes) || connectionMinutes < MINIMUM_SCREENING_MINUTES || connectionMinutes > MAX_CONNECTION_MINUTES) continue;
      if (inOffer.currency !== outOffer.currency) continue;
      combinations.push({
        id: `${inOffer.id}::${outOffer.id}`,
        inbound: inOffer,
        outbound: outOffer,
        connectionAirport: inboundArrival.arrivalAirport,
        connectionMinutes,
        totalPrice: inOffer.totalPrice + outOffer.totalPrice,
        currency: inOffer.currency,
        finalArrival: outboundArrival.arrivalTime,
      });
    }
  }
  return combinations;
}

function compareCombinations(priority: ConnectionChoicePriority, a: ItineraryCombination, b: ItineraryCombination): number {
  const fitValue = (item: ItineraryCombination) => connectionFit(item.connectionMinutes) === "comfortable" ? 2 : connectionFit(item.connectionMinutes) === "tight" ? 1 : 0;
  const finalArrival = (item: ItineraryCombination) => localWallClockMinutes(item.finalArrival) ?? Number.POSITIVE_INFINITY;
  switch (priority) {
    case "lowest-cost":
      return a.totalPrice - b.totalPrice || fitValue(b) - fitValue(a) || finalArrival(a) - finalArrival(b);
    case "earliest-arrival":
      return finalArrival(a) - finalArrival(b) || fitValue(b) - fitValue(a) || a.totalPrice - b.totalPrice;
    case "largest-buffer":
      // "More buffer" means reach the published minimum plus planning buffer,
      // not maximise airport waiting. Once both options are comfortable, the
      // one closest to the 150-minute target wins.
      return fitValue(b) - fitValue(a)
        || Math.abs(a.connectionMinutes - (MINIMUM_SCREENING_MINUTES + PLANNING_BUFFER_MINUTES)) - Math.abs(b.connectionMinutes - (MINIMUM_SCREENING_MINUTES + PLANNING_BUFFER_MINUTES))
        || a.totalPrice - b.totalPrice
        || finalArrival(a) - finalArrival(b);
  }
}

function rankingExplanation(priority: ConnectionChoicePriority, option: ItineraryCombination): string {
  if (priority === "lowest-cost") return `Lowest combined fare among the compatible pairs: ${formatMoney(option.totalPrice, option.currency)}.`;
  if (priority === "earliest-arrival") return `Earliest final arrival among the compatible pairs: ${formatClock(option.finalArrival)}.`;
  return `Reaches the ${formatDuration(MINIMUM_SCREENING_MINUTES + PLANNING_BUFFER_MINUTES)} comfort target without an unnecessarily long wait: ${formatDuration(option.connectionMinutes)} at ${option.connectionAirport}.`;
}

function CombinationCard({ option, selected, recommended, onChoose }: { option: ItineraryCombination; selected: boolean; recommended: boolean; onChoose: () => void }) {
  const inboundArrival = lastSegment(option.inbound)!;
  const outboundDeparture = firstSegment(option.outbound)!;
  const outboundArrival = lastSegment(option.outbound)!;
  return (
    <button type="button" className={`offer-choice ${selected ? "selected" : ""}`.trim()} onClick={onChoose}>
      <div className="option-card-title">
        {recommended ? "Top pick by transparent ranking" : "Compatible self-transfer pair"}
        <ProvenancePill source={option.inbound.source} />
      </div>
      <div className="offer-price">{formatMoney(option.totalPrice, option.currency)}</div>
      <div className="offer-route"><strong>{flightName(option.inbound)}</strong> → <strong>{flightName(option.outbound)}</strong></div>
      <div className="muted small">{option.connectionAirport} {formatClock(inboundArrival.arrivalTime)} → {formatClock(outboundDeparture.departureTime)} · {formatDuration(option.connectionMinutes)} <span className={`badge ${fitClassName(option.connectionMinutes)}`}>{fitLabel(option.connectionMinutes)}</span></div>
      <div className="muted small">Final arrival {formatClock(outboundArrival.arrivalTime)} · Ticket protection not confirmed from two independent offers.</div>
    </button>
  );
}

export default function ItineraryLab() {
  const { providers, notifySearchFallback } = useDemoSession();
  const [origin, setOrigin] = useState("PVG");
  const [connection, setConnection] = useState("KUL");
  const [destination, setDestination] = useState("SIN");
  const [date, setDate] = useState("2026-09-10");
  const [inbound, setInbound] = useState<FlightOffer[]>([]);
  const [outbound, setOutbound] = useState<FlightOffer[]>([]);
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [priority, setPriority] = useState<ConnectionChoicePriority>("largest-buffer");
  const [preferenceText, setPreferenceText] = useState("");
  const [preferenceStatus, setPreferenceStatus] = useState<PreferenceStatus>("idle");
  const [agentNote, setAgentNote] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const compatible = useMemo(() => makeCombinations(inbound, outbound), [inbound, outbound]);
  const ranked = useMemo(() => [...compatible].sort((a, b) => compareCombinations(priority, a, b)), [compatible, priority]);
  const recommended = ranked[0] ?? null;
  const visible = showAll ? ranked : ranked.slice(0, INITIAL_VISIBLE_COMBINATIONS);
  const selected = compatible.find((item) => item.id === selectedId) ?? recommended;

  async function runSearch(rawOrigin: string, rawConnection: string, rawDestination: string, rawDate: string) {
    const normalizedOrigin = rawOrigin.trim().toUpperCase();
    const normalizedConnection = rawConnection.trim().toUpperCase();
    const normalizedDestination = rawDestination.trim().toUpperCase();
    if (![normalizedOrigin, normalizedConnection, normalizedDestination].every(validAirport)) {
      setMessage("Use three-letter IATA airport codes, for example PVG, KUL, SIN.");
      return;
    }
    if (normalizedOrigin === normalizedConnection || normalizedConnection === normalizedDestination) {
      setMessage("Origin, connection airport, and destination must be different.");
      return;
    }
    setStatus("loading");
    setMessage(null);
    setSelectedId(null);
    setShowAll(false);
    try {
      const [first, second] = await Promise.all([
        providers.flights.searchOffers({ origin: normalizedOrigin, destination: normalizedConnection, departDate: rawDate }),
        providers.flights.searchOffers({ origin: normalizedConnection, destination: normalizedDestination, departDate: rawDate }),
      ]);
      setInbound(first);
      setOutbound(second);
      setStatus("ready");
      if (first.length === 0 || second.length === 0) {
        setMessage("No live offer was returned for one leg. ATRIP Sandbox covers selected Asia-Pacific routes; try a verified chain below.");
      } else if (makeCombinations(first, second).length === 0) {
        setMessage("Offers were returned, but none form a time-compatible pair with a usable timetable. The app will not invent a connection.");
      }
    } catch {
      setInbound([]);
      setOutbound([]);
      setStatus("error");
      setMessage("Flight search is unavailable. No recommendation has been generated from provider data.");
      notifySearchFallback();
    }
  }

  async function applyPreference() {
    if (!preferenceText.trim()) return;
    setPreferenceStatus("parsing");
    setAgentNote(null);
    try {
      const parsed = await providers.agent.parseConnectionPreference(preferenceText.trim());
      setPriority(parsed.priority);
      setAgentNote(`${parsed.note} · ${parsed.model}`);
      setPreferenceStatus("idle");
    } catch {
      setPreferenceStatus("fallback");
    }
  }

  function choosePriority(next: ConnectionChoicePriority) {
    setPriority(next);
    setAgentNote(null);
    setPreferenceStatus("idle");
  }

  function useSandboxPreset(preset: (typeof SANDBOX_PRESETS)[number]) {
    setOrigin(preset.origin);
    setConnection(preset.connection);
    setDestination(preset.destination);
    void runSearch(preset.origin, preset.connection, preset.destination, date);
  }

  return (
    <div className="itinerary-lab">
      <section className="card">
        <div className="card-title-row"><h2>Find a connection that fits you</h2><ProvenancePill label="Live ATRIP search when configured" /></div>
        <p className="muted">Search two legs, then compare every time-compatible pair returned by the provider. These are independent offers, so the page never claims a single ticket, checked-through bags, or protected rebooking.</p>
        <div className="form-grid">
          <label>Origin<input value={origin} maxLength={3} onChange={(event) => setOrigin(event.target.value.toUpperCase())} aria-label="Origin airport" /></label>
          <label>Connection airport<input value={connection} maxLength={3} onChange={(event) => setConnection(event.target.value.toUpperCase())} aria-label="Connection airport" /></label>
          <label>Destination<input value={destination} maxLength={3} onChange={(event) => setDestination(event.target.value.toUpperCase())} aria-label="Destination airport" /></label>
          <label>Travel date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label="Travel date" /></label>
        </div>
        <div className="btn-row"><button type="button" className="btn btn-primary" onClick={() => void runSearch(origin, connection, destination, date)} disabled={status === "loading"}>{status === "loading" ? "Searching flights…" : "Search flight options"}</button><span className="muted small">Provider: {providers.flights.source}</span></div>
        {providers.flights.source === "atlas-sandbox" && <div className="callout"><div className="callout-title">Verified Sandbox chain</div><p className="small muted">The Sandbox does not have global inventory. This chain was verified to return time-compatible pairs.</p><div className="preset-row">{SANDBOX_PRESETS.map((preset) => <button key={preset.label} type="button" className="btn btn-secondary" onClick={() => useSandboxPreset(preset)}>Use {preset.label}</button>)}</div></div>}
        {message && <div className="banner banner-warning" role="status">{message}</div>}
      </section>

      {status === "ready" && compatible.length > 0 && <>
        <section className="card">
          <div className="card-title-row"><h2>What matters most?</h2><ProvenancePill label="Agent understands preference; ranking is transparent" /></div>
          <p className="muted">Choose a priority, or describe it in your own words. The Agent maps your words to one visible ranking rule; it does not invent availability, ticket protection, or airport data.</p>
          <div className="agent-input"><textarea className="agent-textarea" rows={2} placeholder="e.g. 我愿意多花一点，但不想赶转机；或者：最便宜即可。" value={preferenceText} onChange={(event) => setPreferenceText(event.target.value)} disabled={preferenceStatus === "parsing"} aria-label="Describe your flight preference" /><div className="btn-row"><button type="button" className="btn btn-primary" disabled={preferenceStatus === "parsing" || preferenceText.trim().length === 0} onClick={() => void applyPreference()}>{preferenceStatus === "parsing" ? "Agent is understanding…" : "Use my preference"}</button></div>{preferenceStatus === "fallback" && <div className="banner banner-warning">Agent unavailable — choose a visible priority below.</div>}{agentNote && <p className="small muted">Agent: {agentNote}</p>}</div>
          <div className="option-cards">{PREFERENCE_CARDS.map((card) => <button key={card.value} type="button" className={`option-card ${priority === card.value ? "selected" : ""}`.trim()} disabled={preferenceStatus === "parsing"} onClick={() => choosePriority(card.value)}><div className="option-card-title">{card.title}</div><div className="muted small">{card.blurb}</div></button>)}</div>
        </section>

        <section className="card">
          <div className="card-title-row"><h2>Compatible combinations</h2><ProvenancePill label={`${compatible.length} returned pair${compatible.length === 1 ? "" : "s"}`} /></div>
          <p className="muted">Top pick by transparent ranking: <strong>{rankingExplanation(priority, recommended!)}</strong> The time-fit labels use a disclosed 60-minute screening floor plus a 90-minute planning buffer; they are not missed-connection probabilities and do not certify an independent self-transfer.</p>
          <div className="offer-list">{visible.map((option) => <CombinationCard key={option.id} option={option} selected={selected?.id === option.id} recommended={recommended?.id === option.id} onChoose={() => setSelectedId(option.id)} />)}</div>
          {compatible.length > INITIAL_VISIBLE_COMBINATIONS && <div className="btn-row"><button type="button" className="btn btn-secondary" onClick={() => setShowAll((current) => !current)}>{showAll ? "Show fewer combinations" : `Show all ${compatible.length} compatible combinations`}</button></div>}
        </section>

        {selected && <section className="card"><div className="card-title-row"><h2>Your selected combination</h2><ProvenancePill label="Consent required before any booking" /></div><p><strong>{flightName(selected.inbound)} → {flightName(selected.outbound)}</strong> · {formatMoney(selected.totalPrice, selected.currency)} · {formatDuration(selected.connectionMinutes)} at {selected.connectionAirport}.</p><p className="small muted">This is assembled from two provider offers. Confirm a single PNR, baggage-through, and servicing terms with the seller before purchase; this demo does not book or promise protection.</p></section>}
      </>}
    </div>
  );
}
