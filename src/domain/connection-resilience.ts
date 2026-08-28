import { resolveConnectionPolicy } from "./connection-policies.mjs";

export type ConnectionCandidateKey = "shortest" | "buffered";

export interface ConnectionCandidateContract {
  key: ConnectionCandidateKey;
  flights: readonly string[];
  connectionMinutes: number;
  price: number;
  currency: string;
}

export interface ConnectionResilienceReceipt {
  recommendedKey: ConnectionCandidateKey;
  counterfactualKey: ConnectionCandidateKey;
  recommendedFlights: readonly string[];
  counterfactualFlights: readonly string[];
  extraFareCents: number;
  addedBufferMinutes: number;
  publishedFloorMinutes: number;
  delayMinutes: number;
  recommendedRemainingMinutes: number;
  counterfactualRemainingMinutes: number;
}

function cents(price: number): number {
  return Math.round(price * 100);
}

/**
 * The product—not an Agent response—owns this comparison.  It is deliberately
 * pure so the traveller decision and airline replay cannot drift apart.
 */
export function createConnectionResilienceReceipt(
  candidates: Record<ConnectionCandidateKey, ConnectionCandidateContract>,
  connectionAirport: string,
  delayMinutes: number,
): ConnectionResilienceReceipt {
  const shortest = candidates.shortest;
  const buffered = candidates.buffered;
  const policy = resolveConnectionPolicy({ connectionAirport, flightNumbers: [...shortest.flights] });
  if (!policy) throw new Error("A registered policy is required for the resilience receipt");
  if (shortest.currency !== buffered.currency) throw new Error("Receipt candidates must share a currency");
  if (buffered.connectionMinutes <= shortest.connectionMinutes) throw new Error("Buffered candidate must add connection time");
  if (cents(buffered.price) < cents(shortest.price)) throw new Error("Buffered candidate cannot be cheaper in this fixture");
  return {
    recommendedKey: "buffered",
    counterfactualKey: "shortest",
    recommendedFlights: buffered.flights,
    counterfactualFlights: shortest.flights,
    extraFareCents: cents(buffered.price) - cents(shortest.price),
    addedBufferMinutes: buffered.connectionMinutes - shortest.connectionMinutes,
    publishedFloorMinutes: policy.publishedMinimumMinutes,
    delayMinutes,
    recommendedRemainingMinutes: buffered.connectionMinutes - delayMinutes,
    counterfactualRemainingMinutes: shortest.connectionMinutes - delayMinutes,
  };
}

export function formatReceiptMoney(centsValue: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(centsValue / 100);
}
