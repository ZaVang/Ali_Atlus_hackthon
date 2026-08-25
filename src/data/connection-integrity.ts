// Evidence-backed demo fixture for the new main product. Flight data was
// observed in ATRIP Sandbox on 2026-08-24; the AirAsia policy is a public
// source, and the missing Fly-Thru/PNR proof is deliberately kept missing.
export const kulConnectionCase = {
  origin: "PVG",
  connectionAirport: "KUL",
  destination: "SIN",
  date: "2026-09-10",
  shortest: {
    flights: ["D73331", "AK727"],
    arrivalAtConnection: "07:15",
    departureFromConnection: "09:10",
    connectionMinutes: 115,
    price: 133.91,
    currency: "USD",
  },
  buffered: {
    flights: ["D73331", "AK707"],
    arrivalAtConnection: "07:15",
    departureFromConnection: "10:20",
    connectionMinutes: 185,
    price: 148.1,
    currency: "USD",
  },
  flyThruMinimumMinutes: 60,
  evidence: [
    {
      kind: "ATRIP Sandbox offer",
      detail: "ATRIP returned the routing, flight numbers, schedule and fare. It did not return a verified single-PNR / Fly-Thru flag.",
      url: "https://resources.atriptech.com/api-document/guidance/quick-start",
    },
    {
      kind: "AirAsia Fly-Thru policy",
      detail: "At KLIA Terminal 2, the published Fly-Thru connection window is 60 minutes to 18 hours; the protection applies only to eligible Fly-Thru / single-booking itineraries.",
      url: "https://support.airasia.com/s/article/Does-AirAsia-provide-stop-over-en?language=km",
    },
  ],
} as const;
