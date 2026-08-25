import { fixtureOffersByKey } from "../data/fixtures";
import type { AtlasFlightProvider, DataSource, FlightOffer, FlightSearchInput } from "../domain/types";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class MockAtlasFlightProvider implements AtlasFlightProvider {
  readonly source: DataSource = "mock";

  async searchOffers(input: FlightSearchInput): Promise<FlightOffer[]> {
    await delay(350); // small artificial latency so loading states stay honest
    return fixtureOffersByKey[`${input.origin}-${input.destination}`] ?? [];
  }
}
