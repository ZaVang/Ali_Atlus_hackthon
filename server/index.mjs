// Standalone Node HTTP service for the Connection Integrity Agent.
//
// This is the deployable form of the backend: the exact same handler
// factories that the Vite dev-server middlewares mount (see vite.config.ts)
// are mounted here on a plain `http.createServer`. Dev and deployed
// behaviour come from one module (server/logic.mjs) and cannot drift.
//
// Routes:
//   POST /api/atlas/<endpoint>.do        Atlas Sandbox proxy (credentials server-side)
//   POST /api/agent/chat                 OpenAI-compatible chat proxy (whitelist passthrough)
//   POST /api/agent/connection-research  bounded evidence tool loop + structured brief
//
// Non-/api requests are served from dist/ when a production build exists
// (SPA fallback to index.html), so one process can host the whole demo.
// Credentials are loaded from .env / .env.local / process.env and never
// leave this process.

import { createServer } from "node:http";
import { existsSync, statSync, readFileSync } from "node:fs";
import { join, normalize, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createAtlasProxyHandler,
  createAgentChatHandler,
  createConnectionResearchHandler,
  loadServiceEnv,
} from "./logic.mjs";

const projectRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const distDir = join(projectRoot, "dist");

// Compose once at startup: .env < .env.local < process.env.
const serviceEnv = loadServiceEnv(projectRoot);
const getEnv = () => serviceEnv;

const atlasHandler = createAtlasProxyHandler(getEnv);
const chatHandler = createAgentChatHandler(getEnv);
const researchHandler = createConnectionResearchHandler(getEnv);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function serveStatic(res, filePath) {
  const type = MIME[extname(filePath).toLowerCase()] ?? "application/octet-stream";
  res.statusCode = 200;
  res.setHeader("Content-Type", type);
  res.end(readFileSync(filePath));
}

const server = createServer(async (req, res) => {
  try {
    const url = (req.url ?? "").split("?")[0];

    if (url === "/api/agent/chat") return await chatHandler(req, res);
    if (url === "/api/agent/connection-research") return await researchHandler(req, res);

    if (url.startsWith("/api/atlas/")) {
      // Connect-style mount semantics: strip the mount prefix so the shared
      // handler sees the same req.url it sees inside the Vite dev server.
      req.url = (req.url ?? "").slice("/api/atlas/".length);
      return await atlasHandler(req, res);
    }

    if (url.startsWith("/api/")) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ status: "error", msg: "Unknown API route" }));
    }

    // Static hosting for the production build (optional; dist/ may be absent).
    if (existsSync(distDir)) {
      const candidate = normalize(join(distDir, url === "/" ? "index.html" : url));
      if (candidate.startsWith(distDir)) {
        if (existsSync(candidate) && statSync(candidate).isFile()) return serveStatic(res, candidate);
        const spaFallback = join(distDir, "index.html");
        if (!extname(url) && existsSync(spaFallback)) return serveStatic(res, spaFallback);
      }
    }

    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ status: "error", msg: "Not found. Run `npm run build` first to host the UI from this service." }));
  } catch (error) {
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ status: "error", msg: "Internal server error" }));
    }
  }
});

const port = Number(process.env.PORT || 8787);
server.listen(port, () => {
  console.log(`[server] Connection Integrity backend listening on http://localhost:${port}`);
  console.log("[server] /api routes served from server/logic.mjs (same module as the Vite dev middlewares)");
});
