import type {
  AtlasFlightProvider,
  DataSource,
  FlightOffer,
  FlightSearchInput,
  FlightSegment,
} from "../domain/types";

export class ProviderUnavailableError extends Error {}

interface AtlasSegment {
  carrier?: string;
  flightNumber?: string;
  depAirport?: string;
  depTime?: string;
  arrAirport?: string;
  arrTime?: string;
  duration?: number;
}

interface AtlasRouting {
  fid?: string;
  routingIdentifier?: string;
  adultPrice?: number;
  adultTax?: number;
  currency?: string;
  /** Structured outbound legs returned by search.do (verified against a live
   * Sandbox response on 2026-08-25; see scripts/atrip-inspect.mjs). */
  fromSegments?: AtlasSegment[];
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
      segments: mapSegments(routing.fromSegments),
      totalPrice: (routing.adultPrice ?? 0) + (routing.adultTax ?? 0),
      currency: routing.currency ?? "USD",
      routingIdentifier: routing.routingIdentifier,
    };
  }
}

/** Map the structured `fromSegments` legs from search.do onto FlightSegment.
 * Times arrive as compact local timestamps ("202609090405"). Legs missing a
 * required field are dropped rather than guessed. */
function mapSegments(fromSegments?: AtlasSegment[]): FlightSegment[] {
  if (!Array.isArray(fromSegments)) return [];
  return fromSegments.flatMap((segment) => {
    if (
      typeof segment.depAirport !== "string" ||
      typeof segment.arrAirport !== "string" ||
      typeof segment.depTime !== "string" ||
      typeof segment.arrTime !== "string" ||
      typeof segment.flightNumber !== "string"
    ) {
      return [];
    }
    return [{
      departureAirport: segment.depAirport,
      arrivalAirport: segment.arrAirport,
      carrier: typeof segment.carrier === "string" && segment.carrier.length > 0
        ? segment.carrier
        : segment.flightNumber.replace(/\d+$/, ""),
      flightNumber: segment.flightNumber,
      departureTime: toIso(segment.depTime),
      arrivalTime: toIso(segment.arrTime),
      durationMinutes: typeof segment.duration === "number" && segment.duration > 0
        ? segment.duration
        : diffMinutes(segment.depTime, segment.arrTime),
    }];
  });
}

function toIso(compact: string): string {
  return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}T${compact.slice(8, 10)}:${compact.slice(10, 12)}:00`;
}

function diffMinutes(from: string, to: string): number {
  return Math.max(0, Math.round((Date.parse(toIso(to)) - Date.parse(toIso(from))) / 60000));
}
