import type {
  AtlasFlightProvider,
  DataSource,
  FlightOffer,
  FlightSearchInput,
  FlightSegment,
} from "../domain/types";

export class ProviderUnavailableError extends Error {}

interface AtlasRouting {
  fid?: string;
  routingIdentifier?: string;
  adultPrice?: number;
  adultTax?: number;
  currency?: string;
}

export class SandboxAtlasFlightProvider implements AtlasFlightProvider {
  readonly source: DataSource = "atlas-sandbox";

  async searchOffers(input: FlightSearchInput): Promise<FlightOffer[]> {
    const payload = {
      tripType: "1",
      requestId: `ui-${Date.now()}`,
      adultNum: input.adults ?? 1,
      childNum: 0,
      infantNum: 0,
      fromCity: input.origin,
      toCity: input.destination,
      fromDate: input.departDate.replaceAll("-", ""),
      currency: input.currency ?? "USD",
      includeMultipleFareFamily: false,
    };

    let res: Response;
    try {
      res = await fetch("/api/atlas/search.do", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      throw new ProviderUnavailableError(`Atlas proxy unreachable: ${String(error)}`);
    }
    if (!res.ok) throw new ProviderUnavailableError(`Atlas proxy answered HTTP ${res.status}`);

    const json = await res.json();
    if (json.status !== 0) {
      throw new ProviderUnavailableError(`search.do status=${json.status}: ${json.msg ?? "unknown error"}`);
    }

    const routings: AtlasRouting[] = json.routings ?? [];
    return routings.map((routing, index) => this.mapRouting(routing, input, index));
  }

  private mapRouting(routing: AtlasRouting, input: FlightSearchInput, index: number): FlightOffer {
    return {
      id: routing.fid ?? `atlas-${index}`,
      source: "atlas-sandbox",
      origin: input.origin,
      destination: input.destination,
      segments: parseSegmentsFromIdentifier(routing.routingIdentifier),
      totalPrice: (routing.adultPrice ?? 0) + (routing.adultTax ?? 0),
      currency: routing.currency ?? "USD",
      routingIdentifier: routing.routingIdentifier,
    };
  }
}

/**
 * Best-effort segment extraction: the base64 payload inside routingIdentifier
 * embeds legs like "PVG-D73331--KUL-202609100135-202609100715-Cheapest".
 * The field between the flight number and arrival airport is sometimes empty,
 * so it must not be treated as a required cabin / booking-class token.
 * TODO: replace with documented offer fields once a full sample is captured.
 */
function parseSegmentsFromIdentifier(identifier?: string): FlightSegment[] {
  if (!identifier) return [];
  try {
    const payload = identifier.split(".")[0];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const legs = [...decoded.matchAll(/([A-Z]{3})-([A-Z0-9]{2})(\d{2,4})-[^-]*-([A-Z]{3})-(\d{12})-(\d{12})/g)];
    return legs.map((m) => ({
      departureAirport: m[1],
      arrivalAirport: m[4],
      carrier: m[2],
      flightNumber: `${m[2]}${m[3]}`,
      departureTime: toIso(m[5]),
      arrivalTime: toIso(m[6]),
      durationMinutes: diffMinutes(m[5], m[6]),
    }));
  } catch {
    return [];
  }
}

function toIso(compact: string): string {
  return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}T${compact.slice(8, 10)}:${compact.slice(10, 12)}:00`;
}

function diffMinutes(from: string, to: string): number {
  return Math.max(0, Math.round((Date.parse(toIso(to)) - Date.parse(toIso(from))) / 60000));
}
