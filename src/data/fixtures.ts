// Deterministic fixture offers used only when ATRIP Sandbox credentials are
// absent or a search fails. Every entry is labelled "Demo fixtures" in the UI
// and is never presented as Atlas data. Flight numbers mirror the KUL demo
// case observed in ATRIP Sandbox on 2026-08-24.
import type { FlightOffer } from "../domain/types";

function segment(
  departureAirport: string,
  arrivalAirport: string,
  carrier: string,
  flightNumber: string,
  departureTime: string,
  arrivalTime: string,
) {
  return {
    departureAirport,
    arrivalAirport,
    carrier,
    flightNumber,
    departureTime,
    arrivalTime,
    durationMinutes: Math.max(0, Math.round((Date.parse(arrivalTime) - Date.parse(departureTime)) / 60000)),
  };
}

function offer(id: string, origin: string, destination: string, totalPrice: number, ...segments: ReturnType<typeof segment>[]): FlightOffer {
  return { id, source: "mock", origin, destination, segments, totalPrice, currency: "USD" };
}

export const fixtureOffersByKey: Record<string, FlightOffer[]> = {
  "PVG-KUL": [
    offer("fix-pvg-kul-1", "PVG", "KUL", 87.5, segment("PVG", "KUL", "D7", "D73331", "2026-09-10T01:35:00", "2026-09-10T07:15:00")),
  ],
  "KUL-SIN": [
    offer("fix-kul-sin-1", "KUL", "SIN", 46.41, segment("KUL", "SIN", "AK", "AK727", "2026-09-10T09:10:00", "2026-09-10T10:15:00")),
    offer("fix-kul-sin-2", "KUL", "SIN", 60.6, segment("KUL", "SIN", "AK", "AK707", "2026-09-10T10:20:00", "2026-09-10T11:25:00")),
  ],
  "PVG-SIN": [
    offer("fix-pvg-sin-1", "PVG", "SIN", 214.5, segment("PVG", "SIN", "PA", "PA761", "2026-09-10T09:15:00", "2026-09-10T14:40:00")),
    offer("fix-pvg-sin-2", "PVG", "SIN", 189.9, segment("PVG", "SIN", "PA", "PA765", "2026-09-10T16:30:00", "2026-09-10T21:55:00")),
  ],
};
