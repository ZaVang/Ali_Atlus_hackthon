# Atlas integration contract

> Scope note: the current product contract is [CONNECTION_INTEGRITY_DEMO.md](CONNECTION_INTEGRITY_DEMO.md). This demo exercises ATRIP `search.do` plus a non-destructive offer recheck that repeats `search.do`; booking, ancillary and post-booking servicing are out of scope and never claimed. The "Seattle track" references below are historical (archived under `docs/legacy/`).

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
- Success rule: top-level numeric `status == 0`. `search.do` returns offers in a top-level `routings` array; each entry carries `fid`, `routingIdentifier`, `adultPrice`, `adultTax`, `currency`, and `supportPaymentMethods`. A live read-only shape probe on 2026-08-26 also observed `fromSegments[]` with `carrier`, `flightNumber`, `depAirport`, `depTime`, `arrAirport`, `arrTime`, and `duration` fields (plus additional vendor fields that this app does not depend on).
- Rate limit: `search.do` defaults to 10 QPS; HTTP 429 responses carry `retryAfter`.
- Until the account has a configured settlement currency, search requests must pass `"currency": "USD"`.

Documented but not yet exercised: the identifier chain `routingIdentifier` → `sessionId` → `orderNo`, and the endpoints `verify.do`, `order.do`, `pay.do`, order query, and the void workflow `voidQuotation.do` → `void.do` → `queryVoidOrders.do`. Rebooking in the demo is expressed as a consent-gated simulation until a native change capability is confirmed.

### Implemented offer recheck boundary

`SandboxAtlasFlightProvider.recheckOffer` is deliberately a **non-destructive freshness check**, not a call to the unverified `verify.do` endpoint. It repeats the already verified `search.do` request for the offer's route/date and compares the exact `routingIdentifier` returned by the fresh response:

| Result | Meaning | Source boundary |
| --- | --- | --- |
| `verified` | Numeric `status == 0`, a `routings` array exists, and the exact identifier is returned again | `atlas-sandbox` |
| `not-found` | Numeric `status == 0` and the response is structurally usable, but the identifier is absent | `atlas-sandbox` |
| `snapshot` | Mock fixture cannot be revalidated against Atlas | `mock` |
| `unavailable` | Missing identifier, credentials/proxy/network failure, non-zero or unknown status, malformed JSON, malformed routings, or unverified source | `unavailable` |

The UI displays the routing identifiers, result status, and source for both independent legs. `verified` means only that the offer reappeared in a fresh search; it does not prove a single PNR, Fly-Thru/baggage-through protection, price lock, booking, payment, or servicing entitlement. The proxy exposes only `search.do`; `verify.do` remains fail-closed until its request/response schema and Sandbox permission are exercised.

### Sandbox route coverage (verified 2026-08-17)

Sandbox inventory covers Asia-Pacific routes only. Verified with offers: PVG→SIN, SIN→PVG, PVG→NRT, KUL→SIN, HKG→SIN, BKK→SIN, SIN→SYD, SIN→KUL, SIN→HKG. Verified empty: PVG→SEA, PVG→LAX, SEA→SFO, PVG→HKG. Consequence: the Seattle demo story runs on labelled fixtures, and the live Atlas demonstration uses PVG→SIN.

## Provider contract

The application should define a narrow application-level interface, rather than allowing components to call a vendor SDK directly.

```ts
export interface AtlasFlightProvider {
  searchOffers(input: FlightSearchInput): Promise<FlightOffer[]>;
  recheckOffer(input: { offer: FlightOffer; search: FlightSearchInput }): Promise<OfferRecheckResult>;
}
```

Implement:

- `MockAtlasFlightProvider` for fixtures and deterministic demo playback.
- `SandboxAtlasFlightProvider` for credentials-backed Atlas calls.

The provider should return explicit source metadata: `mock`, `atlas-sandbox`, or `unavailable`. Recheck status and source are separate fields so an unavailable live call can never be presented as a mock snapshot or a verified offer.

## Demo data strategy

- Seattle track: the MVP story uses deterministic fixtures because the Sandbox has no North America inventory. Fixture data is always labelled and never presented as Atlas data.
- Live track: a PVG→SIN search runs against the real Sandbox to demonstrate live offers and identifier handling.
- Provider selection follows `VITE_FLIGHT_PROVIDER`. In sandbox mode there is no per-route fixture fallback: when a search is unavailable the app surfaces no recommendation rather than substituting fixtures for live results. The deterministic mock provider remains available by selecting `VITE_FLIGHT_PROVIDER=mock`.

## Data provenance in the UI

Each recommendation must label its evidence:

| Data | Expected source | UI label |
| --- | --- | --- |
| Flight offer, fare, rules, availability | Atlas Sandbox | Atlas flight data |
| Offer freshness recheck | Fresh Atlas `search.do` identifier match, mock snapshot, or unavailable | Fresh Atlas recheck / Snapshot only / Unavailable — not verified |
| Arrival-process time, walking estimate, security buffer | Fixture or separate provider | Estimated transfer process |
| Connection risk | Application calculation | Agent estimate |
| Booking/recovery result | Atlas Sandbox or local simulation | Sandbox action / Demo simulation |

## Safe failure behavior

When credentials are missing or Sandbox calls fail:

1. Do not render invented live data as Atlas data.
2. Keep the Sandbox provider in an honest unavailable state; do not silently substitute fixtures.
3. Display that no recommendation was generated from provider data.
4. For recheck, never treat an unknown status or malformed payload as `verified`.
5. For a credential-free demo, select `VITE_FLIGHT_PROVIDER=mock` explicitly and display the fixture provenance.

## Server-side hosting

The Atlas proxy (`POST /api/atlas/search.do`), together with the agent chat proxy and the connection-research tool loop, lives in a shared server module (`server/logic.mjs`). The Vite dev server mounts these handlers as middlewares, and the same module runs as a standalone Node HTTP service via `npm run server` (`server/index.mjs`, port 8787 or `PORT`), so dev and deployed behaviour cannot drift. Credentials are loaded from `.env` / `.env.local` / process environment on the server only. Unknown Atlas endpoints, including `verify.do`, are rejected rather than forwarded. This hosting change does not extend the integration scope: booking, payment and servicing (refund/cancel/change) remain out of scope.

## Secrets

All secrets stay in local environment files. Never commit API credentials, participant mailbox credentials, passwords, or tokens. Use `.env.example` only as a key-name template.
