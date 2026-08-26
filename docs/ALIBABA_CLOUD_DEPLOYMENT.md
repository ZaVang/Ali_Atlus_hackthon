# Alibaba Cloud deployment contract / 阿里云部署契约

This repository has an optional container contract for a future authorized Alibaba Cloud runtime. The current competition submission is intentionally local/demo-only because deployment access is not available; no public URL is claimed.

## Local proof

```text
npm run build
npm run smoke:server
GET /health -> 200 {"status":"ok","service":"connection-integrity-agent"}
```

The same `server/index.mjs` serves the API handlers and built UI. Secrets are injected as runtime environment variables and are excluded by `.dockerignore`; they must never be copied into the image or frontend `VITE_*` configuration.

## Authorized deployment steps

1. Build the image from the committed `Dockerfile` in an authorized Alibaba Cloud container/runtime project.
2. Configure `ATLAS_BASE_URL`, `ATLAS_CLIENT_ID`, `ATLAS_CLIENT_SECRET`, `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`, and `TAVILY_API_KEY` as server-side secrets only.
3. Set `PORT` to the runtime-provided port; the service defaults to `8787` locally.
4. Verify `/health`, the static mock boundary, and the authorized live smoke path from the deployed URL.
5. Record the owner-controlled URL, deployment timestamp, image/source commit, health response, and `npm run recording-preflight -- --public-url <owned-url> --require-public-url` output before sharing it with judges.

Until those steps are performed in the participant's Alibaba Cloud account, this document is a deployment-ready contract, not deployment evidence.
