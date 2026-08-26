import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import {
  createAtlasProxyHandler,
  createAgentChatHandler,
  createConnectionResearchHandler,
} from "./server/logic.mjs";

/**
 * All server-side logic lives in server/logic.mjs. The Vite dev server and
 * the standalone Node service (server/index.mjs, `npm run server`) mount the
 * exact same handlers, so dev behaviour and deployed behaviour cannot drift.
 *
 * Governance preserved: whitelist-only chat passthrough, bounded two-round
 * evidence search, fail-closed errors, credentials injected server-side and
 * never shipped to the browser (no VITE_ prefix).
 */

/** Per-request env merge, identical to the pre-refactor dev behaviour. */
function devEnvOf(server: Parameters<NonNullable<Plugin["configureServer"]>>[0]) {
  return () => ({ ...loadEnv(server.config.mode, server.config.root, ""), ...server.config.env });
}

/**
 * Dev proxy: forwards /api/atlas/<endpoint>.do to the Atlas Sandbox with
 * credentials injected server-side. Without credentials it answers 503 +
 * `unavailable`, which lets the provider layer fall back to labelled
 * fixtures (safe-failure behaviour).
 */
function atlasSandboxProxy(): Plugin {
  return {
    name: "atlas-sandbox-proxy",
    configureServer(server) {
      server.middlewares.use("/api/atlas/", createAtlasProxyHandler(devEnvOf(server)));
    },
  };
}

/**
 * Dev proxy for OpenAI-compatible chat providers. `LLM_*` is the preferred
 * generic configuration; `DASHSCOPE_*` remains supported for the existing
 * Bailian setup. Request fields pass a strict whitelist; the model is
 * injected server-side and the client may not choose its own.
 */
function agentProxy(): Plugin {
  return {
    name: "agent-proxy",
    configureServer(server) {
      server.middlewares.use("/api/agent/chat", createAgentChatHandler(devEnvOf(server)));
    },
  };
}

/**
 * A bounded tool loop for the Connection Integrity Agent. The model chooses
 * one or two research queries; this server-only handler executes them through
 * Tavily, returns compact source snippets to the model, then emits a
 * structured brief. The browser never receives either API key.
 */
function connectionResearchProxy(): Plugin {
  return {
    name: "connection-research-proxy",
    configureServer(server) {
      server.middlewares.use("/api/agent/connection-research", createConnectionResearchHandler(devEnvOf(server)));
    },
  };
}

export default defineConfig({
  plugins: [react(), atlasSandboxProxy(), agentProxy(), connectionResearchProxy()],
});
