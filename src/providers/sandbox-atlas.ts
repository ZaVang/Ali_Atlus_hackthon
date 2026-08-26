import type {
  AtlasFlightProvider,
  DataSource,
  FlightOffer,
  FlightSearchInput,
  FlightSegment,
  OfferRecheckInput,
  OfferRecheckResult,
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

interface AtlasSearchResponse {
  status?: unknown;
  msg?: unknown;
  routings?: unknown;
}

export class SandboxAtlasFlightProvider implements AtlasFlightProvider {
  readonly source: DataSource = "atlas-sandbox";

  async searchOffers(input: FlightSearchInput): Promise<FlightOffer[]> {
    const json = await this.requestSearch(input);
    if (json.status !== 0) {
      throw new ProviderUnavailableError(`search.do status=${json.status}: ${json.msg ?? "unknown error"}`);
    }

    if (!Array.isArray(json.routings)) {
      throw new ProviderUnavailableError("search.do response omitted a routings array");
    }

    const routings = json.routings as AtlasRouting[];
    return routings.map((routing, index) => this.mapRouting(routing, input, index));
  }

  /**
   * Re-run the already verified, read-only search.do request and require the
   * exact routingIdentifier to appear again. This intentionally does not call
   * verify.do: its request/response schema and Sandbox permission are not
   * exercised in this project yet. Unknown or malformed responses are always
   * unavailable, never verified.
   */
  async recheckOffer({ offer, search }: OfferRecheckInput): Promise<OfferRecheckResult> {
    const routingIdentifier = offer.routingIdentifier;
    if (offer.source !== this.source) {
      return unavailableRecheck("Offer is not an Atlas Sandbox offer; no live recheck was made.", routingIdentifier);
    }
    if (typeof routingIdentifier !== "string" || routingIdentifier.length === 0) {
      return unavailableRecheck("Atlas offer has no routingIdentifier; freshness cannot be verified.");
    }

    let json: AtlasSearchResponse;
    try {
      json = await this.requestSearch(search);
    } catch (error) {
      return unavailableRecheck(String(error), routingIdentifier);
    }

    // The only accepted success marker is the confirmed numeric status value.
    // A string "0", missing status, or any vendor-specific unknown state is
    // deliberately not a verified result.
    if (json.status !== 0) {
      return unavailableRecheck(`search.do did not return status=0 (received ${String(json.status)}).`, routingIdentifier);
    }
    if (!Array.isArray(json.routings)) {
      return unavailableRecheck("search.do response omitted a routings array; offer was not verified.", routingIdentifier);
    }

    const returnedIdentifiers = json.routings
      .filter(isRecord)
      .map((routing) => routing.routingIdentifier)
      .filter((value): value is string => typeof value === "string" && value.length > 0);
    if (returnedIdentifiers.length === 0 && json.routings.length > 0) {
      return unavailableRecheck("search.do returned routings without usable routingIdentifier values.", routingIdentifier);
    }

    if (returnedIdentifiers.includes(routingIdentifier)) {
      return {
        status: "verified",
        source: this.source,
        routingIdentifier,
        checkedAt: new Date().toISOString(),
        message: "Fresh Atlas search.do returned the same routingIdentifier.",
      };
    }

    return {
      status: "not-found",
      source: this.source,
      routingIdentifier,
      checkedAt: new Date().toISOString(),
      message: "Fresh Atlas search.do completed, but the routingIdentifier was not returned.",
    };
  }

  private async requestSearch(input: FlightSearchInput): Promise<AtlasSearchResponse> {
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

    let json: unknown;
    try {
      json = await res.json();
    } catch (error) {
      throw new ProviderUnavailableError(`Atlas proxy returned invalid JSON: ${String(error)}`);
    }
    if (!isRecord(json)) throw new ProviderUnavailableError("Atlas proxy returned a non-object JSON payload");
    return json as AtlasSearchResponse;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unavailableRecheck(message: string, routingIdentifier?: string): OfferRecheckResult {
  return { status: "unavailable", source: "unavailable", routingIdentifier, message };
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
