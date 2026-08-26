// Pure screening and ranking rules for the Itinerary Lab. Extracted from the
// component so they can be verified numerically (tests/itinerary-rules.test.mjs).
//
// Every threshold is parameterized by the resolved connection policy
// (src/domain/connection-policies.mjs): the KUL demo's 60-minute floor and
// 90-minute buffer are one registered entry, not hard-coded universals. When
// no policy matches, callers pass null and take the explicit no-policy path:
// pairs are kept by time compatibility only and the UI discloses that no
// policy parameters are configured instead of ranking on borrowed numbers.
import type { ConnectionChoicePriority, FlightOffer, FlightSegment } from "./types";
import type { ConnectionPolicy } from "./connection-policies.mjs";

/** Generic pairing sanity cap used even without a policy: a positive window
 * longer than 18 hours is never a sensible single-day transfer. */
export const GENERIC_MAX_CONNECTION_MINUTES = 18 * 60;

export interface ItineraryCombination {
  id: string;
  inbound: FlightOffer;
  outbound: FlightOffer;
  connectionAirport: string;
  connectionMinutes: number;
  totalPrice: number;
  currency: string;
  finalArrival: string;
}

export function firstSegment(offer: FlightOffer): FlightSegment | undefined {
  return offer.segments[0];
}

export function lastSegment(offer: FlightOffer): FlightSegment | undefined {
  return offer.segments[offer.segments.length - 1];
}

// ATRIP's current routing identifier carries local wall-clock times without
// an offset. Pairing happens at one airport, so compare those wall clocks
// directly rather than letting the browser's timezone reinterpret them.
export function localWallClockMinutes(iso: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  if (!match) return null;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5])) / 60_000;
}

export function connectionFit(connectionMinutes: number, policy: ConnectionPolicy): "comfortable" | "tight" | "insufficient" {
  if (connectionMinutes < policy.publishedMinimumMinutes) return "insufficient";
  if (connectionMinutes < policy.publishedMinimumMinutes + policy.planningBufferMinutes) return "tight";
  return "comfortable";
}

export function makeCombinations(inbound: FlightOffer[], outbound: FlightOffer[], policy: ConnectionPolicy | null): ItineraryCombination[] {
  const combinations: ItineraryCombination[] = [];
  const maximumMinutes = policy ? policy.maxConnectionMinutes : GENERIC_MAX_CONNECTION_MINUTES;
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
      // A pair is only eligible for ranking if it clears the resolved
      // policy's published screening floor. Below-floor pairs are not merely
      // "tight"; they are impossible for this chooser and must never be
      // recommended. With no configured policy there is no honest floor:
      // only strictly positive windows survive (the UI discloses the gap).
      const belowFloor = policy ? connectionMinutes < policy.publishedMinimumMinutes : connectionMinutes <= 0;
      if (!Number.isFinite(connectionMinutes) || belowFloor || connectionMinutes > maximumMinutes) continue;
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

export function compareCombinations(priority: ConnectionChoicePriority, a: ItineraryCombination, b: ItineraryCombination, policy: ConnectionPolicy | null): number {
  const fitValue = (item: ItineraryCombination) => {
    if (!policy) return 0; // no policy → no time-fit judgment; ordering ignores fit
    const fit = connectionFit(item.connectionMinutes, policy);
    return fit === "comfortable" ? 2 : fit === "tight" ? 1 : 0;
  };
  const finalArrival = (item: ItineraryCombination) => localWallClockMinutes(item.finalArrival) ?? Number.POSITIVE_INFINITY;
  switch (priority) {
    case "lowest-cost":
      return a.totalPrice - b.totalPrice || fitValue(b) - fitValue(a) || finalArrival(a) - finalArrival(b);
    case "earliest-arrival":
      return finalArrival(a) - finalArrival(b) || fitValue(b) - fitValue(a) || a.totalPrice - b.totalPrice;
    case "largest-buffer": {
      if (!policy) {
        // No configured policy means no comfort target: disclose the gap in
        // the UI and order by arrival instead of inventing a buffer goal.
        return finalArrival(a) - finalArrival(b) || a.totalPrice - b.totalPrice;
      }
      // "More buffer" means reach the policy's published minimum plus its
      // planning buffer, not maximise airport waiting. Once both options are
      // comfortable, the one closest to that target wins.
      const comfortTarget = policy.publishedMinimumMinutes + policy.planningBufferMinutes;
      return fitValue(b) - fitValue(a)
        || Math.abs(a.connectionMinutes - comfortTarget) - Math.abs(b.connectionMinutes - comfortTarget)
        || a.totalPrice - b.totalPrice
        || finalArrival(a) - finalArrival(b);
    }
  }
}
