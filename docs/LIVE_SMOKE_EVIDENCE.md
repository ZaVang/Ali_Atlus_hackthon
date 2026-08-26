# Live smoke evidence / Live 冒烟证据

This is a secret-free record of the read-only live checks run against the current checkout on 2026-08-26. It is evidence of provider connectivity and response shape, not proof of booking, payment, servicing, or public deployment.

## Results

| Check | Result | Evidence |
| --- | --- | --- |
| ATRIP Sandbox `search.do` | PASS | `node scripts/atlas-smoke-test.mjs PVG KUL 20260910` returned HTTP 200, gzip content, numeric `status: 0`, and a non-empty `routings` response. |
| Vite connection research | PASS | `npm run smoke:research` returned HTTP 200, model `deepseek-v4-flash`, `attempts=2`, `sources=4` in the run output with one official source, and a whitelist-shaped `tight` / `alternative` brief. |
| Standalone Node service | PASS | `npm run smoke:server -- --live` passed Atlas search, Agent chat, and connection research through `server/index.mjs` using the shared handlers. |
| Booking / payment / servicing | NOT RUN | The current project intentionally does not call `verify.do`, `order.do`, `pay.do`, void, or rebooking endpoints. |
| Public deployment | NOT PROVEN | The live checks ran locally; they do not prove an Alibaba Cloud or other stable public URL. |

## Safety boundary

The live checks were read-only. No order, payment, cancellation, rebooking, or passenger-facing change was created. Credentials were read from local environment configuration and were not printed or written to this document.
