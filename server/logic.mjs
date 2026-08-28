// Shared server-side logic for the Connection Integrity Agent.
//
// This module is the single source of truth for the three API surfaces:
//   POST /api/atlas/<endpoint>.do        — Atlas Sandbox proxy (credentials injected server-side)
//   POST /api/agent/chat                 — OpenAI-compatible chat proxy (whitelist passthrough)
//   POST /api/agent/connection-research  — bounded tool loop + structured brief
//
// Both the Vite dev-server middlewares (vite.config.ts) and the standalone
// Node service (server/index.mjs) mount these exact handlers, so dev and
// deployed behaviour cannot drift apart. Governance is preserved verbatim:
// whitelist-only passthrough, bounded two-round evidence search, fail-closed
// errors, credentials injected server-side and never echoed.
//
// Every handler is `(req, res) => Promise<void>` over Node's
// IncomingMessage/ServerResponse, which is what both Connect (Vite) and a
// plain `http.createServer` provide. Each handler receives a `getEnv()`
// callback instead of a static env object so callers keep their existing
// per-request configuration semantics.

import { readFileSync } from "node:fs";
import { join } from "node:path";
// The connection policy registry is shared verbatim with the bundled UI:
// evidence-search domains, fallback query templates, disclosed policy input
// and the planning rubric all resolve from one module, so the standalone
// service and the dev server can never drift apart.
import {
  resolveConnectionPolicy,
  renderQueryTemplate,
  GENERIC_QUERY_TEMPLATES,
  NO_POLICY_DISCLOSURE,
} from "../src/domain/connection-policies.mjs";

// The browser-facing service is intentionally small, but it is still a
// public HTTP boundary in a deployment. Keep malformed or oversized input
// from becoming an unbounded memory/cost sink before it reaches Atlas, an
// LLM, or Tavily.
export const MAX_REQUEST_BODY_BYTES = 128 * 1024;
const ALLOWED_ATLAS_ENDPOINTS = new Set(["search.do"]);
const MAX_CHAT_MESSAGES = 8;
const MAX_CHAT_MESSAGE_CHARS = 12_000;
const MAX_CHAT_TOTAL_CHARS = 32_000;
const MAX_RESEARCH_TEXT_CHARS = 2_000;
const MAX_RESEARCH_EVIDENCE_ITEMS = 8;

export class RequestBodyTooLargeError extends Error {
  constructor() {
    super(`Request body exceeds ${MAX_REQUEST_BODY_BYTES} bytes`);
    this.name = "RequestBodyTooLargeError";
  }
}

/** Read a request body fully and return it as a UTF-8 string, with a hard cap. */
async function readBody(req, maxBytes = MAX_REQUEST_BODY_BYTES) {
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    const bytes = buffer.length;
    totalBytes += bytes;
    if (totalBytes > maxBytes) throw new RequestBodyTooLargeError();
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalidInput(res, msg = "Invalid JSON request body") {
  sendJson(res, 400, { status: "error", msg });
}

function oversizedInput(res) {
  sendJson(res, 413, { status: "error", msg: `Request body exceeds ${MAX_REQUEST_BODY_BYTES} bytes` });
}

function readRequestBodyOrRespond(req, res) {
  return readBody(req).catch((error) => {
    if (error instanceof RequestBodyTooLargeError) {
      oversizedInput(res);
      return null;
    }
    throw error;
  });
}

function safeHttpsUrl(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > 2_000) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || !url.hostname) return null;
    return url;
  } catch {
    return null;
  }
}

function hostMatchesDomain(hostname, domain) {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  const allowed = String(domain).toLowerCase().replace(/^\.+|\.+$/g, "");
  return Boolean(allowed) && (host === allowed || host.endsWith(`.${allowed}`));
}

function safeConfiguredBaseUrl(value, { originOnly = false } = {}) {
  const url = safeHttpsUrl(value);
  if (!url || url.search || url.hash || (originOnly && url.pathname !== "/" && url.pathname !== "")) return null;
  return url.toString().replace(/\/$/, "");
}

function normalizeIata(value) {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  return /^[A-Z]{3}$/.test(normalized) ? normalized : null;
}

function normalizeFlightNumbers(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 4) return null;
  const flights = value.map((item) => typeof item === "string" ? item.trim().toUpperCase() : "");
  return flights.every((item) => /^[A-Z0-9][A-Z0-9-]{1,11}$/.test(item)) ? flights : null;
}

function boundedNumber(value, { integer = false, min = -Infinity, max = Infinity } = {}) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) return null;
  if (integer && !Number.isInteger(value)) return null;
  return value;
}

function normalizeResearchInput(value) {
  if (!isRecord(value)) return null;
  const origin = normalizeIata(value.origin);
  const connectionAirport = normalizeIata(value.connectionAirport);
  const destination = normalizeIata(value.destination);
  const flightNumbers = normalizeFlightNumbers(value.flightNumbers);
  const scheduledConnectionMinutes = boundedNumber(value.scheduledConnectionMinutes, { integer: true, min: 1, max: 36 * 60 });
  const price = boundedNumber(value.price, { min: 0, max: 1_000_000 });
  const currency = typeof value.currency === "string" && /^[A-Z]{3}$/.test(value.currency.trim().toUpperCase())
    ? value.currency.trim().toUpperCase()
    : null;
  if (!origin || !connectionAirport || !destination || !flightNumbers || scheduledConnectionMinutes === null || price === null || !currency) return null;
  if (origin === connectionAirport || connectionAirport === destination) return null;

  const evidence = Array.isArray(value.evidence)
    ? value.evidence.filter((item) => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, MAX_RESEARCH_EVIDENCE_ITEMS)
    : [];
  if (evidence.some((item) => item.length > MAX_RESEARCH_TEXT_CHARS)) return null;

  const inboundDelayMinutes = value.inboundDelayMinutes === undefined
    ? undefined
    : boundedNumber(value.inboundDelayMinutes, { integer: true, min: 0, max: 36 * 60 });
  if (value.inboundDelayMinutes !== undefined && inboundDelayMinutes === null) return null;

  let alternative;
  if (value.alternative !== undefined) {
    if (!isRecord(value.alternative)) return null;
    const alternativeFlights = normalizeFlightNumbers(value.alternative.flightNumbers);
    const alternativeMinutes = boundedNumber(value.alternative.scheduledConnectionMinutes, { integer: true, min: 1, max: 36 * 60 });
    const alternativePrice = boundedNumber(value.alternative.price, { min: 0, max: 1_000_000 });
    const alternativeCurrency = typeof value.alternative.currency === "string" && /^[A-Z]{3}$/.test(value.alternative.currency.trim().toUpperCase())
      ? value.alternative.currency.trim().toUpperCase()
      : null;
    if (!alternativeFlights || alternativeMinutes === null || alternativePrice === null || !alternativeCurrency) return null;
    alternative = {
      flightNumbers: alternativeFlights,
      scheduledConnectionMinutes: alternativeMinutes,
      price: alternativePrice,
      currency: alternativeCurrency,
    };
  }

  // `minimumConnectionMinutes` and `flyThruVerified` are intentionally not
  // trusted from the browser. The registered policy (if any) owns the
  // published threshold, and this prototype has no Atlas verify capability,
  // so every research request remains protection-unconfirmed.
  return {
    origin,
    connectionAirport,
    destination,
    flightNumbers,
    scheduledConnectionMinutes,
    price,
    currency,
    inboundDelayMinutes,
    flyThruVerified: false,
    evidence,
    alternative,
  };
}

function normalizeChatRequest(value) {
  if (!isRecord(value) || !Array.isArray(value.messages) || value.messages.length === 0 || value.messages.length > MAX_CHAT_MESSAGES) return null;
  let totalChars = 0;
  const messages = value.messages.map((message, index) => {
    if (!isRecord(message) || (message.role !== "system" && message.role !== "user") || typeof message.content !== "string") return null;
    if (index === 0 && message.role !== "system") return null;
    if (message.content.length === 0 || message.content.length > MAX_CHAT_MESSAGE_CHARS) return null;
    totalChars += message.content.length;
    return { role: message.role, content: message.content };
  });
  if (messages.some((message) => message === null) || !messages.some((message) => message.role === "user") || totalChars > MAX_CHAT_TOTAL_CHARS) return null;

  let responseFormat;
  if (value.response_format !== undefined) {
    if (!isRecord(value.response_format) || value.response_format.type !== "json_object" || Object.keys(value.response_format).some((key) => key !== "type")) return null;
    responseFormat = { type: "json_object" };
  }
  let temperature;
  if (value.temperature !== undefined) {
    temperature = boundedNumber(value.temperature, { min: 0, max: 2 });
    if (temperature === null) return null;
  }
  let seed;
  if (value.seed !== undefined) {
    seed = boundedNumber(value.seed, { integer: true, min: -2_147_483_648, max: 2_147_483_647 });
    if (seed === null) return null;
  }
  return { messages, response_format: responseFormat, temperature, seed };
}

function isStructuredBrief(value) {
  if (!isRecord(value)) return false;
  if (!["comfortable", "tight", "insufficient"].includes(value.connectionFit)) return false;
  if (!["confirmed", "not-confirmed"].includes(value.protectionStatus)) return false;
  if (!["low", "medium", "high"].includes(value.assessmentConfidence)) return false;
  if (!["recommendationSummary", "rationale", "nextAction"].every((key) => typeof value[key] === "string" && value[key].length > 0 && value[key].length <= 8_000)) return false;
  if (!["keyFactors", "limitations"].every((key) => Array.isArray(value[key]) && value[key].length <= 8 && value[key].every((item) => typeof item === "string" && item.length > 0 && item.length <= 1_000))) return false;
  if (value.sources !== undefined && (!Array.isArray(value.sources) || value.sources.length > 8)) return false;
  return true;
}

function validateResearchBrief(value, connection, policy) {
  if (!isStructuredBrief(value)) return false;
  // No `verify.do`/booking contract is implemented in this prototype. A
  // model must never turn a browser-controlled or absent proof field into a
  // confirmed protection claim.
  if (value.protectionStatus === "confirmed") return false;
  if (policy) {
    const remaining = connection.scheduledConnectionMinutes - (connection.inboundDelayMinutes ?? 0);
    if (remaining < policy.publishedMinimumMinutes && value.connectionFit !== "insufficient") return false;
  }
  return true;
}

/**
 * Atlas Sandbox proxy. Forwards POST bodies to `${ATLAS_BASE_URL}/<endpoint>`
 * with client credentials injected server-side, so secrets never reach the
 * browser. Without credentials it answers 503 + `unavailable`, which lets the
 * provider layer degrade honestly (no invented live data).
 */
export function createAtlasProxyHandler(getEnv) {
  return async (req, res) => {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      sendJson(res, 405, { status: "error", msg: "Method not allowed" });
      return;
    }
    const endpoint = (req.url ?? "").split("?")[0].replace(/^\/+/, "");
    // Only search.do is implemented by the application. Do not expose a
    // generic credentialed Atlas tunnel that could be repurposed for order,
    // payment, void, or other servicing endpoints without a consent gate.
    if (!ALLOWED_ATLAS_ENDPOINTS.has(endpoint)) {
      sendJson(res, 404, { status: "unavailable", msg: "Atlas endpoint is not enabled by this demo" });
      return;
    }
    const env = getEnv();
    const baseUrl = env.ATLAS_BASE_URL;
    const clientId = env.ATLAS_CLIENT_ID;
    const clientSecret = env.ATLAS_CLIENT_SECRET;
    if (!baseUrl || !clientId || !clientSecret) {
      sendJson(res, 503, {
        status: "unavailable",
        msg: `Atlas Sandbox credentials not configured (baseUrl:${!!baseUrl} clientId:${!!clientId} secret:${!!clientSecret})`,
      });
      return;
    }

    const safeBaseUrl = safeConfiguredBaseUrl(baseUrl, { originOnly: true });
    if (!safeBaseUrl) {
      sendJson(res, 503, { status: "unavailable", msg: "Atlas Sandbox base URL must be an HTTPS origin" });
      return;
    }

    let body;
    try {
      const rawBody = await readBody(req);
      body = JSON.parse(rawBody || "{}");
    } catch (error) {
      if (error instanceof RequestBodyTooLargeError) {
        oversizedInput(res);
      } else {
        invalidInput(res);
      }
      return;
    }
    if (!isRecord(body)) {
      invalidInput(res, "Atlas request body must be a JSON object");
      return;
    }

    try {
      const upstream = await fetch(`${safeBaseUrl}/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "*/*",
          "x-atlas-client-id": clientId,
          "x-atlas-client-secret": clientSecret,
        },
        body: JSON.stringify(body),
      });
      res.statusCode = upstream.status;
      res.setHeader("Content-Type", "application/json");
      res.end(await upstream.text());
    } catch (error) {
      sendJson(res, 502, { status: "unavailable", msg: String(error) });
    }
  };
}

/**
 * OpenAI-compatible chat proxy. `LLM_*` is the preferred generic
 * configuration; `DASHSCOPE_*` remains supported for the existing Bailian
 * setup. Credentials and the model are injected server-side only; the client
 * may not choose its own model. Request fields pass a strict whitelist —
 * anything else a client might smuggle (stream, tools, n, ...) is dropped.
 */
export function createAgentChatHandler(getEnv) {
  return async (req, res) => {
    // Chat completions are only ever POSTed; reject anything else.
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      sendJson(res, 405, { status: "error", msg: "Method not allowed" });
      return;
    }

    const env = getEnv();
    // Do not silently send a legacy DashScope key to a different provider.
    // `deepseek` must have an explicit generic LLM key; Bailian retains its
    // backwards-compatible DASHSCOPE fallback.
    const isDeepSeek = env.VITE_AGENT_PROVIDER === "deepseek";
    const apiKey = isDeepSeek ? env.LLM_API_KEY : env.LLM_API_KEY || env.DASHSCOPE_API_KEY;
    if (!apiKey) {
      sendJson(res, 503, { status: "unavailable", msg: "LLM_API_KEY not configured" });
      return;
    }

    let raw;
    try {
      raw = JSON.parse((await readBody(req)) || "{}");
    } catch (error) {
      if (error instanceof RequestBodyTooLargeError) oversizedInput(res);
      else invalidInput(res);
      return;
    }
    const request = normalizeChatRequest(raw);
    if (!request) {
      invalidInput(res, "Chat request must contain bounded system/user messages and only supported options");
      return;
    }

    try {
      // Whitelist passthrough only: anything else a client might smuggle
      // (stream, tools, n, ...) is dropped before reaching upstream.
      const body = {
        messages: request.messages,
        response_format: request.response_format,
        temperature: request.temperature,
        seed: request.seed,
        // Inject the model server-side: LLM_MODEL has no VITE_ prefix and
        // therefore never ships to the browser bundle. The client may NOT
        // choose its own model — it is always overridden here.
        model: env.LLM_MODEL || env.DASHSCOPE_MODEL || "qwen-plus",
        // Preference parsing, recovery rationales and advisory extraction
        // are small structured tasks. Disable DeepSeek thinking here; the
        // research handler alone intentionally enables medium effort
        // thinking for its evidence synthesis stage.
        ...(isDeepSeek ? { thinking: { type: "disabled" } } : {}),
      };

      const baseUrl = safeConfiguredBaseUrl(env.LLM_BASE_URL ?? env.DASHSCOPE_BASE_URL ?? "https://dashscope.aliyuncs.com/compatible-mode/v1");
      if (!baseUrl) {
        sendJson(res, 503, { status: "unavailable", msg: "LLM base URL must be an HTTPS origin" });
        return;
      }
      const upstream = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });
      res.statusCode = upstream.status;
      res.setHeader("Content-Type", "application/json");
      res.end(await upstream.text());
    } catch (error) {
      sendJson(res, 502, { status: "unavailable", msg: String(error) });
    }
  };
}

/**
 * A bounded tool loop for the Connection Integrity Agent. The model chooses
 * one or two research queries; this server-only handler executes them through
 * Tavily, returns compact source snippets to the model, then emits a
 * structured brief. The browser never receives either API key.
 */
export function createConnectionResearchHandler(getEnv) {
  return async (req, res) => {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      sendJson(res, 405, { status: "error", msg: "Method not allowed" });
      return;
    }
    const env = getEnv();
    const llmKey = env.VITE_AGENT_PROVIDER === "deepseek" ? env.LLM_API_KEY : env.LLM_API_KEY || env.DASHSCOPE_API_KEY;
    const tavilyKey = env.TAVILY_API_KEY;
    if (!llmKey || !tavilyKey) {
      sendJson(res, 503, { status: "unavailable", msg: "LLM_API_KEY and TAVILY_API_KEY are required for connection research" });
      return;
    }
    let raw;
    try {
      raw = JSON.parse((await readBody(req)) || "{}");
    } catch (error) {
      if (error instanceof RequestBodyTooLargeError) oversizedInput(res);
      else invalidInput(res);
      return;
    }
    const connection = normalizeResearchInput(isRecord(raw) ? raw.connection : null);
    if (!connection) {
      sendJson(res, 400, { status: "error", msg: "Invalid connection research input" });
      return;
    }
    const airport = connection.connectionAirport;
    const flights = connection.flightNumbers;
    // Resolve the registered policy entry for this itinerary. `null` takes
    // the explicit no-policy path: generic query templates, no domain gate,
    // no disclosed policy input, and an honest disclosure in the prompt and
    // telemetry — never another airport's numbers reused silently.
    const policy = resolveConnectionPolicy({ connectionAirport: airport, flightNumbers: flights });
    const queryTemplates = policy ? policy.queryTemplates : GENERIC_QUERY_TEMPLATES;
    const rubricSentence = policy
      ? `Use this transparent planning rubric from the registered policy "${policy.label}" unless airport-specific evidence contradicts it: below the published minimum of ${policy.publishedMinimumMinutes} minutes is insufficient; meeting the minimum with less than ${policy.planningBufferMinutes} additional minutes is tight; meeting it with ${policy.planningBufferMinutes} or more additional minutes is comfortable. State the minutes and the published minimum in the rationale. This rubric is a planning heuristic, not historical calibration.`
      : `${NO_POLICY_DISCLOSURE} Do not invent a published minimum or planning buffer for this route; judge time adequacy only from the evidence actually retrieved, and list the missing policy parameters under limitations.`;
    const model = env.LLM_MODEL || env.DASHSCOPE_MODEL || "qwen-plus";
    const baseUrl = safeConfiguredBaseUrl(env.LLM_BASE_URL ?? env.DASHSCOPE_BASE_URL ?? "https://dashscope.aliyuncs.com/compatible-mode/v1");
    if (!baseUrl) {
      sendJson(res, 503, { status: "unavailable", msg: "LLM base URL must be an HTTPS origin" });
      return;
    }
    const useDeepSeek = env.VITE_AGENT_PROVIDER === "deepseek";
    // Search ranking alone is not evidence. Both official and community
    // results must make a transfer/process claim before the model or
    // traveller sees them; this excludes vouchers, check-in pages, social
    // posts and other keyword-adjacent noise.
    const harvestRelevant = (result, tier) => {
      if (!Array.isArray(result.results)) return [];
      return result.results.flatMap((entry) => {
        if (typeof entry.title !== "string" || typeof entry.url !== "string" || typeof entry.content !== "string") return [];
        const sourceUrl = safeHttpsUrl(entry.url);
        if (!sourceUrl) return [];
        const evidenceText = `${entry.title} ${entry.content}`;
        const isNonTransferPage = /cheap flights?|travel voucher|mobile app|check[ -]?in/i.test(entry.title);
        const hasConnectionClaim = /fly[ -]?thru|baggage[ -]?(?:through|transfer)|minimum[ -]?connecting|\bmct\b|self[ -]?transfer|transit[ -]?(?:procedure|process|requirement)/i.test(evidenceText);
        const hasProcessContext = /terminal|transfer|immigration|customs|re-?check|check[ -]?in|boarding|connection time/i.test(evidenceText);
        if (isNonTransferPage || !hasConnectionClaim || !hasProcessContext) return [];
        // Official-tier precision gate: a press release or a page without
        // an explicit numeric connection-window / policy claim is not
        // official connection evidence, whatever its search rank is.
        if (tier === "official") {
          // Tavily's include_domains request parameter is not a security
          // boundary: a provider response can still contain a redirected or
          // malformed URL. Re-check the final host before calling it official.
          if (policy?.officialDomains?.length && !policy.officialDomains.some((domain) => hostMatchesDomain(sourceUrl.hostname, domain))) return [];
          const isPromotionalPage = /newsroom|press[ -]?release|media[- ]cent(?:er|re)|corporate[- ]news/i.test(`${entry.title} ${entry.url}`);
          // Whole-word transfer context only, with non-/non- prefixes
          // excluded: fare T&C wording such as "non-transferable" must
          // never qualify a page as official connection evidence.
          const hasTransferContext = /(?<!non[- ])\b(?:connections?|connecting|transfers?|transit|fly[ -]?thru)\b/i.test(evidenceText);
          const hasNumericPolicyClaim = /\b\d+\s*(?:min(?:ute)?s?|hours?|hrs?|h)\b/i.test(evidenceText) && hasTransferContext;
          if (isPromotionalPage || !hasNumericPolicyClaim) return [];
        }
        return [{ tier, title: entry.title.slice(0, 160), url: sourceUrl.toString(), summary: entry.content.slice(0, 700) }];
      });
    };
    const searchTavily = async (query, tier) => {
      const tavily = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tavilyKey}` },
        body: JSON.stringify({ query, search_depth: "basic", max_results: 3, include_answer: false, include_raw_content: false, ...(tier === "official" && policy?.officialDomains?.length ? { include_domains: policy.officialDomains } : {}) }),
      });
      if (!tavily.ok) throw new Error(`Tavily HTTP ${tavily.status}`);
      return await tavily.json();
    };
    const system = [
      "You are the Connection Integrity research agent.",
      "You must make two search_connection_evidence calls before producing a decision: one official and one community search. Focus them on the actual connection airport, terminal process, airline and transfer time.",
      'After tool results, return ONLY JSON: {"connectionFit":"comfortable|tight|insufficient","protectionStatus":"confirmed|not-confirmed","recommendationSummary":string,"assessmentConfidence":"low|medium|high","rationale":string,"keyFactors":string[],"limitations":string[],"nextAction":string}.',
      "ConnectionFit answers only whether the planned time is workable; it is never a missed-connection probability. ProtectionStatus answers whether the supplied offer proves airline/booking protection; it must not lower ConnectionFit merely because the protection evidence is missing.",
      "Use only the supplied itinerary, alternative, policy input and tool results. Never infer a single PNR, baggage-through, immigration requirement, airline liability, or probability.",
      rubricSentence,
      "Explain the evidence for the supplied candidates. The deterministic product comparison, not this Agent, owns the final candidate and fare/time trade-off.",
    ].join(" ");
    const tool = {
      type: "function",
      function: {
        name: "search_connection_evidence",
        description: "Search connection rules and passenger experience for the supplied airport, terminal and flights. Use official policy and community experience as distinct evidence types.",
        parameters: {
          type: "object",
          properties: {
            evidence_type: { type: "string", enum: ["official", "community"] },
            query: { type: "string", description: "A focused search query containing airport or airline terms." },
          },
          required: ["evidence_type", "query"],
        },
      },
    };
    const requestModel = async (messages, tools, toolChoice, json = false, finalSynthesis = false, thinking = finalSynthesis) => {
      const upstream = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${llmKey}` },
        body: JSON.stringify({ model, messages, tools, tool_choice: toolChoice, response_format: json ? { type: "json_object" } : undefined, temperature: 0.1, seed: 20260910, max_tokens: finalSynthesis ? 8192 : undefined, ...(useDeepSeek ? (thinking ? { thinking: { type: "enabled" }, reasoning_effort: "medium" } : { thinking: { type: "disabled" } }) : {}) }),
      });
      const text = await upstream.text();
      if (!upstream.ok) throw new Error(`LLM HTTP ${upstream.status}: ${text.slice(0, 500)}`);
      return JSON.parse(text);
    };
      const describeChoice = (reply) => {
        const choice = reply.choices?.[0];
        const content = choice?.message?.content;
      const reasoning = choice?.message?.reasoning_content;
      return {
        content: typeof content === "string" ? content : "",
        finishReason: typeof choice?.finish_reason === "string" ? choice.finish_reason : "unknown",
        reasoningLength: typeof reasoning === "string" ? reasoning.length : 0,
        };
      };
      const parseBrief = (text) => {
        try {
          const parsed = JSON.parse(text);
          return validateResearchBrief(parsed, connection, policy) ? parsed : null;
        } catch {
          return null;
        }
      };
      try {
      const initialMessages = [
        { role: "system", content: system },
        { role: "user", content: `Connection evidence: ${JSON.stringify(connection)}` },
      ];
      const first = await requestModel(initialMessages, [tool], "required");
      const assistantMessage = first.choices?.[0]?.message;
      const calls = Array.isArray(assistantMessage?.tool_calls) ? assistantMessage.tool_calls.slice(0, 2) : [];
      const parsedCalls = calls.flatMap((call) => {
        if (typeof call !== "object" || call === null || call.function?.name !== "search_connection_evidence" || typeof call.id !== "string") return [];
        let args;
        try { args = JSON.parse(typeof call.function.arguments === "string" ? call.function.arguments : "{}"); } catch { return []; }
        if (!isRecord(args) || (args.evidence_type !== "official" && args.evidence_type !== "community")) return [];
        return [{ call, args, tier: args.evidence_type }];
      });
      const requestedTiers = new Set(parsedCalls.map((item) => item.tier));
      if (parsedCalls.length < 2 || !requestedTiers.has("official") || !requestedTiers.has("community")) {
        throw new Error("Agent did not request one official and one community evidence search");
      }
      const sources = [];
      const toolMessages = [];
      for (const { call: item, args, tier } of parsedCalls) {
        const fallbackQuery = tier === "official"
          ? renderQueryTemplate(queryTemplates.official, { airport, flights })
          : renderQueryTemplate(queryTemplates.community, { airport, flights });
        const candidateQuery = typeof args.query === "string" && args.query.trim().length >= 8 && args.query.length <= 180
          ? args.query.replace(/\s+/g, " ").trim()
          : fallbackQuery;
        const normalized = harvestRelevant(await searchTavily(candidateQuery, tier), tier);
        sources.push(...normalized);
        toolMessages.push({ role: "tool", tool_call_id: item.id, content: JSON.stringify({ tier, results: normalized }) });
      }
      // Bounded second round: if round 1 returned no relevant official
      // source, the agent reformulates the official query exactly once
      // and searches again. The loop never exceeds two evidence rounds,
      // and the retry is disclosed in the returned telemetry.
      let attempts = 1;
      let retryQuery;
      if (!sources.some((source) => source.tier === "official")) {
        attempts = 2;
        retryQuery = renderQueryTemplate(queryTemplates.retry, { airport, flights });
        sources.push(...harvestRelevant(await searchTavily(retryQuery, "official"), "official"));
      }
      // The registered policy's disclosed input is a durable, explicit product
      // input. Use it only as a disclosed fallback when search returns no
      // relevant official page, never as invented live itinerary proof. The
      // no-policy path has no such input: it fails closed instead.
      if (
        !sources.some((source) => source.tier === "official")
        && policy?.disclosedFallback
        && policy.flightPrefixes.length > 0
        && flights.some((flight) => policy.flightPrefixes.some((prefix) => flight.startsWith(prefix)))
      ) {
        sources.push({
          tier: "official",
          title: policy.disclosedFallback.title,
          url: policy.disclosedFallback.url,
          summary: policy.disclosedFallback.summary,
          disclosed: true,
        });
      }
      if (!sources.some((source) => source.tier === "official")) {
        throw new Error(policy
          ? "No relevant official connection-policy source was found"
          : "No relevant official connection-policy source was found, and no connection policy is configured for this route");
      }
      // A DeepSeek thinking conversation must carry forward its own
      // reasoning_content. The tool-planning round intentionally runs in
      // non-thinking mode, so begin an independent synthesis turn with
      // the collected, bounded evidence rather than switching modes in a
      // single history.
      const finalMessages = [
        {
          role: "system",
          content: [
            "You are the final Connection Integrity assessor.",
            'Return ONLY JSON: {"connectionFit":"comfortable|tight|insufficient","protectionStatus":"confirmed|not-confirmed","recommendationSummary":string,"assessmentConfidence":"low|medium|high","rationale":string,"keyFactors":string[],"limitations":string[],"nextAction":string}.',
            "ConnectionFit is time adequacy only, never a probability. ProtectionStatus is a separate booking-protection fact. AssessmentConfidence is confidence in this evidence review, never chance of catching a flight.",
            "Use only the supplied itinerary, alternative and research results. Do not infer a single PNR, baggage-through, immigration requirement, airline liability, or a calibrated probability.",
            policy
              ? `Apply this transparent planning rubric from the registered policy "${policy.label}" unless airport-specific evidence contradicts it: below the published minimum of ${policy.publishedMinimumMinutes} minutes is insufficient; meeting it with less than ${policy.planningBufferMinutes} additional minutes is tight; with ${policy.planningBufferMinutes} or more additional minutes is comfortable. Do not make a comfortable connection tight solely because protection is not confirmed.`
              : `${NO_POLICY_DISCLOSURE} Do not invent a published minimum or planning buffer; judge time adequacy only from the retrieved evidence and disclose the missing policy parameters in limitations.`,
            "Explain evidence only. The deterministic product comparison owns the candidate choice and fare/time trade-off.",
            'Use the phrase "published minimum connection time" in traveller-facing text; never use the abbreviation "MCT".',
          ].join(" "),
        },
        { role: "user", content: `Connection evidence: ${JSON.stringify(connection)}\nResearch results: ${JSON.stringify(sources)}` },
      ];
      // JSON mode is omitted only for the thinking synthesis; the prompt
      // and client schema still require valid structured JSON.
      let final = await requestModel(finalMessages, undefined, undefined, false, true);
      let synthesis = describeChoice(final);
      let parsedBrief = parseBrief(synthesis.content);
      // A synthesis answer is unusable when it is empty, token-capped
      // (finish_reason=length truncates the JSON), structurally invalid, or
      // semantically unsafe (for example, `confirmed` protection without a
      // verify capability). In every case: log diagnostics (never the key or
      // reasoning text) and retry once with thinking disabled.
      if (synthesis.content.length === 0 || synthesis.finishReason === "length" || !parsedBrief) {
        console.warn(
          `[connection-research] unusable synthesis content: finish_reason=${synthesis.finishReason}, content_chars=${synthesis.content.length}, reasoning_chars=${synthesis.reasoningLength}, model=${String(final.model)}; retrying with thinking disabled`,
        );
        final = await requestModel(finalMessages, undefined, undefined, false, true, false);
        synthesis = describeChoice(final);
        parsedBrief = parseBrief(synthesis.content);
      }
      if (!parsedBrief) throw new Error(`Agent returned an invalid or unsafe research brief (finish_reason=${synthesis.finishReason})`);
      // Return only the validated contract fields. This prevents an LLM from
      // smuggling arbitrary source links or extra control fields through the
      // raw content channel even after the shape check succeeds.
      const content = JSON.stringify({
        connectionFit: parsedBrief.connectionFit,
        protectionStatus: parsedBrief.protectionStatus,
        recommendationSummary: parsedBrief.recommendationSummary,
        assessmentConfidence: parsedBrief.assessmentConfidence,
        rationale: parsedBrief.rationale,
        keyFactors: parsedBrief.keyFactors,
        limitations: parsedBrief.limitations,
        nextAction: parsedBrief.nextAction,
      });
      sendJson(res, 200, { model: typeof final.model === "string" ? final.model : model, content, sources, attempts, retryQuery, policyId: policy ? policy.id : null });
    } catch (error) {
      sendJson(res, 502, { status: "unavailable", msg: error instanceof Error ? error.message : "Connection research failed" });
    }
  };
}

/**
 * Minimal dotenv-style loader for the standalone service. Vite's dev path
 * keeps using its own loadEnv merge; here we reproduce the same precedence:
 * `.env` first, `.env.local` overrides it, and the real process environment
 * overrides both. Values are never logged anywhere.
 */
export function parseEnvFile(filePath) {
  const result = {};
  let text;
  try {
    text = readFileSync(filePath, "utf8");
  } catch {
    return result;
  }
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

/** Compose the standalone service environment: .env < .env.local < process.env. */
export function loadServiceEnv(rootDir) {
  return {
    ...parseEnvFile(join(rootDir, ".env")),
    ...parseEnvFile(join(rootDir, ".env.local")),
    ...process.env,
  };
}
