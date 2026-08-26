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

/** Read a request body fully and return it as a UTF-8 string. */
async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

/**
 * Atlas Sandbox proxy. Forwards POST bodies to `${ATLAS_BASE_URL}/<endpoint>`
 * with client credentials injected server-side, so secrets never reach the
 * browser. Without credentials it answers 503 + `unavailable`, which lets the
 * provider layer degrade honestly (no invented live data).
 */
export function createAtlasProxyHandler(getEnv) {
  return async (req, res) => {
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

    const endpoint = (req.url ?? "").split("?")[0].replace(/^\//, "");
    const body = await readBody(req);

    try {
      const upstream = await fetch(`${baseUrl.replace(/\/$/, "")}/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "*/*",
          "x-atlas-client-id": clientId,
          "x-atlas-client-secret": clientSecret,
        },
        body,
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
    } catch {
      raw = {};
    }
    if (typeof raw !== "object" || raw === null) raw = {};

    try {
      // Whitelist passthrough only: anything else a client might smuggle
      // (stream, tools, n, ...) is dropped before reaching upstream.
      const body = {
        messages: raw.messages,
        response_format: raw.response_format,
        temperature: raw.temperature,
        seed: raw.seed,
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

      const baseUrl = (env.LLM_BASE_URL ?? env.DASHSCOPE_BASE_URL ?? "https://dashscope.aliyuncs.com/compatible-mode/v1").replace(/\/$/, "");
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
    let raw = {};
    try { raw = JSON.parse((await readBody(req)) || "{}"); } catch { /* invalid input handled below */ }
    const connection = raw.connection;
    const airport = typeof connection?.connectionAirport === "string" ? connection.connectionAirport.toUpperCase().slice(0, 3) : "";
    const flights = Array.isArray(connection?.flightNumbers) ? connection.flightNumbers.filter((item) => typeof item === "string").slice(0, 4) : [];
    if (!/^[A-Z]{3}$/.test(airport) || flights.length === 0) {
      sendJson(res, 400, { status: "error", msg: "Invalid connection research input" });
      return;
    }
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
    const baseUrl = (env.LLM_BASE_URL ?? env.DASHSCOPE_BASE_URL ?? "https://dashscope.aliyuncs.com/compatible-mode/v1").replace(/\/$/, "");
    const useDeepSeek = env.VITE_AGENT_PROVIDER === "deepseek";
    // Search ranking alone is not evidence. Both official and community
    // results must make a transfer/process claim before the model or
    // traveller sees them; this excludes vouchers, check-in pages, social
    // posts and other keyword-adjacent noise.
    const harvestRelevant = (result, tier) => {
      if (!Array.isArray(result.results)) return [];
      return result.results.flatMap((entry) => {
        if (typeof entry.title !== "string" || typeof entry.url !== "string" || typeof entry.content !== "string") return [];
        const evidenceText = `${entry.title} ${entry.content}`;
        const isNonTransferPage = /cheap flights?|travel voucher|mobile app|check[ -]?in/i.test(entry.title);
        const hasConnectionClaim = /fly[ -]?thru|baggage[ -]?(?:through|transfer)|minimum[ -]?connecting|\bmct\b|self[ -]?transfer|transit[ -]?(?:procedure|process|requirement)/i.test(evidenceText);
        const hasProcessContext = /terminal|transfer|immigration|customs|re-?check|check[ -]?in|boarding|connection time/i.test(evidenceText);
        if (isNonTransferPage || !hasConnectionClaim || !hasProcessContext) return [];
        // Official-tier precision gate: a press release or a page without
        // an explicit numeric connection-window / policy claim is not
        // official connection evidence, whatever its search rank is.
        if (tier === "official") {
          const isPromotionalPage = /newsroom|press[ -]?release|media[- ]cent(?:er|re)|corporate[- ]news/i.test(`${entry.title} ${entry.url}`);
          // Whole-word transfer context only, with non-/non- prefixes
          // excluded: fare T&C wording such as "non-transferable" must
          // never qualify a page as official connection evidence.
          const hasTransferContext = /(?<!non[- ])\b(?:connections?|connecting|transfers?|transit|fly[ -]?thru)\b/i.test(evidenceText);
          const hasNumericPolicyClaim = /\b\d+\s*(?:min(?:ute)?s?|hours?|hrs?|h)\b/i.test(evidenceText) && hasTransferContext;
          if (isPromotionalPage || !hasNumericPolicyClaim) return [];
        }
        return [{ tier, title: entry.title.slice(0, 160), url: entry.url, summary: entry.content.slice(0, 700) }];
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
      'After tool results, return ONLY JSON: {"connectionFit":"comfortable|tight|insufficient","protectionStatus":"confirmed|not-confirmed","recommendedOption":"selected|alternative","recommendationSummary":string,"assessmentConfidence":"low|medium|high","rationale":string,"keyFactors":string[],"limitations":string[],"nextAction":string}.',
      "ConnectionFit answers only whether the planned time is workable; it is never a missed-connection probability. ProtectionStatus answers whether the supplied offer proves airline/booking protection; it must not lower ConnectionFit merely because the protection evidence is missing.",
      "Use only the supplied itinerary, alternative, policy input and tool results. Never infer a single PNR, baggage-through, immigration requirement, airline liability, or probability.",
      rubricSentence,
      "Choose selected or alternative for the traveller. Compare the two supplied connection windows and fare difference. Recommend the alternative only when its extra buffer creates a material improvement for the traveller; do not recommend verification as a substitute for a choice.",
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
    try {
      const initialMessages = [
        { role: "system", content: system },
        { role: "user", content: `Connection evidence: ${JSON.stringify(connection)}` },
      ];
      const first = await requestModel(initialMessages, [tool], "required");
      const assistantMessage = first.choices?.[0]?.message;
      const calls = Array.isArray(assistantMessage?.tool_calls) ? assistantMessage.tool_calls.slice(0, 2) : [];
      if (calls.length === 0) throw new Error("Agent did not request connection evidence");
      const sources = [];
      const toolMessages = [];
      for (const call of calls) {
        if (typeof call !== "object" || call === null) continue;
        const item = call;
        if (item.function?.name !== "search_connection_evidence" || typeof item.id !== "string") continue;
        let args = {};
        try { args = JSON.parse(typeof item.function.arguments === "string" ? item.function.arguments : "{}"); } catch { /* use controlled fallback */ }
        const tier = args.evidence_type === "community" ? "community" : "official";
        const fallbackQuery = tier === "official"
          ? renderQueryTemplate(queryTemplates.official, { airport, flights })
          : renderQueryTemplate(queryTemplates.community, { airport, flights });
        const candidateQuery = typeof args.query === "string" && args.query.length >= 8 && args.query.length <= 180 ? args.query : fallbackQuery;
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
            'Return ONLY JSON: {"connectionFit":"comfortable|tight|insufficient","protectionStatus":"confirmed|not-confirmed","recommendedOption":"selected|alternative","recommendationSummary":string,"assessmentConfidence":"low|medium|high","rationale":string,"keyFactors":string[],"limitations":string[],"nextAction":string}.',
            "ConnectionFit is time adequacy only, never a probability. ProtectionStatus is a separate booking-protection fact. AssessmentConfidence is confidence in this evidence review, never chance of catching a flight.",
            "Use only the supplied itinerary, alternative and research results. Do not infer a single PNR, baggage-through, immigration requirement, airline liability, or a calibrated probability.",
            policy
              ? `Apply this transparent planning rubric from the registered policy "${policy.label}" unless airport-specific evidence contradicts it: below the published minimum of ${policy.publishedMinimumMinutes} minutes is insufficient; meeting it with less than ${policy.planningBufferMinutes} additional minutes is tight; with ${policy.planningBufferMinutes} or more additional minutes is comfortable. Do not make a comfortable connection tight solely because protection is not confirmed.`
              : `${NO_POLICY_DISCLOSURE} Do not invent a published minimum or planning buffer; judge time adequacy only from the retrieved evidence and disclose the missing policy parameters in limitations.`,
            "Make a choice between selected and alternative. State the time and fare trade-off in recommendationSummary; do not respond only with a verification request.",
            'Use the phrase "published minimum connection time" in traveller-facing text; never use the abbreviation "MCT".',
          ].join(" "),
        },
        { role: "user", content: `Connection evidence: ${JSON.stringify(connection)}\nResearch results: ${JSON.stringify(sources)}` },
      ];
      // JSON mode is omitted only for the thinking synthesis; the prompt
      // and client schema still require valid structured JSON.
      let final = await requestModel(finalMessages, undefined, undefined, false, true);
      let synthesis = describeChoice(final);
      // A synthesis answer is unusable when it is empty, token-capped
      // (finish_reason=length truncates the JSON mid-way) or not valid
      // JSON. In every case: log the diagnostics (never the key or the
      // reasoning text) and retry once with thinking disabled.
      const parsesAsJsonObject = (text) => {
        try { const parsed = JSON.parse(text); return typeof parsed === "object" && parsed !== null; } catch { return false; }
      };
      if (synthesis.content.length === 0 || synthesis.finishReason === "length" || !parsesAsJsonObject(synthesis.content)) {
        console.warn(
          `[connection-research] unusable synthesis content: finish_reason=${synthesis.finishReason}, content_chars=${synthesis.content.length}, reasoning_chars=${synthesis.reasoningLength}, model=${String(final.model)}; retrying with thinking disabled`,
        );
        final = await requestModel(finalMessages, undefined, undefined, false, true, false);
        synthesis = describeChoice(final);
      }
      const content = synthesis.content;
      if (content.length === 0) throw new Error(`Agent returned no final research brief (finish_reason=${synthesis.finishReason})`);
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
