# Atlas integration contract

> Scope note: the current product contract is [CONNECTION_INTEGRITY_DEMO.md](CONNECTION_INTEGRITY_DEMO.md). This demo exercises the ATRIP `search.do` path only; booking, ancillary and post-booking servicing are out of scope and never claimed. The "Seattle track" references below are historical (archived under `docs/legacy/`).

## Purpose

Atlas is the real flight retailing and servicing layer for this project. It should provide flight offers and, subject to the Sandbox permissions, supported verification, booking, ancillary, and post-booking interactions.

The project must not represent Atlas as a source of airport immigration wait times, luggage processing estimates, terminal walking time, or personal traveller context.

## Integration paths

### Decision: ATRIP REST API (investigated 2026-08-17)

The main path is the ATRIP REST API. The open-source Atlas Skill (`atlas-doc/atlas-flight-booking-skill`) was rejected as the primary integration: it is a Python CLI built for agent frameworks (Python 3.12, OS keyring, interactive browser authorization), it explicitly does not implement refund, cancel, or change operations, and it does not fit a browser-based Vite application. Its repository remains a useful reference for payload field names and error-code semantics.

### ATRIP REST API integration facts

Verified against the live Sandbox:

- Sandbox base URL: `https://sandbox.atriptech.com/`; all calls are `POST /<endpoint>.do` with JSON bodies.
- Authentication: static headers `x-atlas-client-id` and `x-atlas-client-secret`, generated in ATRIP under Profile → My Profile → Company Information → Sandbox Info.
- Required headers: `Content-Type: application/json` and `Accept: */*` (never `Accept: application/json`); handle gzip responses.
- Success rule: top-level `status == 0`. `search.do` returns offers in a top-level `routings` array; each entry carries `fid`, `routingIdentifier`, `adultPrice`, `adultTax`, `currency`, and `supportPaymentMethods`.
- Rate limit: `search.do` defaults to 10 QPS; HTTP 429 responses carry `retryAfter`.
- Until the account has a configured settlement currency, search requests must pass `"currency": "USD"`.

Documented but not yet exercised: the identifier chain `routingIdentifier` → `sessionId` → `orderNo`, and the endpoints `verify.do`, `order.do`, `pay.do`, order query, and the void workflow `voidQuotation.do` → `void.do` → `queryVoidOrders.do`. Rebooking in the demo is expressed as booking a recovery offer plus a simulated void of the original ticket, until a native change capability is confirmed.

### Sandbox route coverage (verified 2026-08-17)

Sandbox inventory covers Asia-Pacific routes only. Verified with offers: PVG→SIN, SIN→PVG, PVG→NRT, KUL→SIN, HKG→SIN, BKK→SIN, SIN→SYD, SIN→KUL, SIN→HKG. Verified empty: PVG→SEA, PVG→LAX, SEA→SFO, PVG→HKG. Consequence: the Seattle demo story runs on labelled fixtures, and the live Atlas demonstration uses PVG→SIN.

## Provider contract

The application should define a narrow application-level interface, rather than allowing components to call a vendor SDK directly.

```ts
export interface AtlasFlightProvider {
  searchOffers(input: FlightSearchInput): Promise<FlightOffer[]>;
  verifyOffer?(offerId: string): Promise<VerifiedOffer>;
  createBooking?(input: BookingRequest): Promise<BookingResult>;
  serviceBooking?(input: ServicingRequest): Promise<ServicingResult>;
}
```

Implement:

- `MockAtlasFlightProvider` for fixtures and deterministic demo playback.
- `SandboxAtlasFlightProvider` for credentials-backed Atlas calls.

The provider should return explicit source metadata: `mock`, `atlas-sandbox`, or `unavailable`.

## Demo data strategy

- Seattle track: the MVP story uses deterministic fixtures because the Sandbox has no North America inventory. Fixture data is always labelled and never presented as Atlas data.
- Live track: a PVG→SIN search runs against the real Sandbox to demonstrate live offers and identifier handling.
- Provider selection follows `VITE_FLIGHT_PROVIDER`; even in sandbox mode, a route without inventory falls back to labelled fixtures.

## Data provenance in the UI

Each recommendation must label its evidence:

| Data | Expected source | UI label |
| --- | --- | --- |
| Flight offer, fare, rules, availability | Atlas Sandbox | Atlas flight data |
| Arrival-process time, walking estimate, security buffer | Fixture or separate provider | Estimated transfer process |
| Connection risk | Application calculation | Agent estimate |
| Booking/recovery result | Atlas Sandbox or local simulation | Sandbox action / Demo simulation |

## Safe failure behavior

When credentials are missing or Sandbox calls fail:

1. Do not render invented live data as Atlas data.
2. Fall back to the deterministic mock scenario.
3. Display that the demo is running with fixture data.
4. Keep the risk and recovery workflow usable for the demo.

## Secrets

All secrets stay in local environment files. Never commit API credentials, participant mailbox credentials, passwords, or tokens. Use `.env.example` only as a key-name template.
