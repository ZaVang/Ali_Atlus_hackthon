import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";

/**
 * Dev-only proxy: forwards /api/atlas/<endpoint>.do to the Atlas Sandbox with
 * credentials injected server-side, so secrets never reach the browser.
 * Without credentials it answers 503 + `unavailable`, which lets the provider
 * layer fall back to labelled fixtures (safe-failure behaviour).
 */
function atlasSandboxProxy(): Plugin {
  return {
    name: "atlas-sandbox-proxy",
    configureServer(server) {
      server.middlewares.use("/api/atlas/", async (req, res) => {
        const env = { ...loadEnv(server.config.mode, server.config.root, ""), ...server.config.env };
        const baseUrl = env.ATLAS_BASE_URL;
        const clientId = env.ATLAS_CLIENT_ID;
        const clientSecret = env.ATLAS_CLIENT_SECRET;
        if (!baseUrl || !clientId || !clientSecret) {
          res.statusCode = 503;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              status: "unavailable",
              msg: `Atlas Sandbox credentials not configured (baseUrl:${!!baseUrl} clientId:${!!clientId} secret:${!!clientSecret})`,
            }),
          );
          return;
        }

        const endpoint = (req.url ?? "").split("?")[0].replace(/^\//, "");
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);

        try {
          const upstream = await fetch(`${baseUrl.replace(/\/$/, "")}/${endpoint}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "*/*",
              "x-atlas-client-id": clientId,
              "x-atlas-client-secret": clientSecret,
            },
            body: Buffer.concat(chunks).toString("utf8"),
          });
          res.statusCode = upstream.status;
          res.setHeader("Content-Type", "application/json");
          res.end(await upstream.text());
        } catch (error) {
          res.statusCode = 502;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ status: "unavailable", msg: String(error) }));
        }
      });
    },
  };
}

/**
 * Dev-only proxy for OpenAI-compatible chat providers. `LLM_*` is the
 * preferred generic configuration; `DASHSCOPE_*` remains supported for the
 * existing Bailian setup. Credentials are injected server-side only.
 */
function agentProxy(): Plugin {
  return {
    name: "agent-proxy",
    configureServer(server) {
      server.middlewares.use("/api/agent/chat", async (req, res) => {
        // Chat completions are only ever POSTed; reject anything else.
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.setHeader("Allow", "POST");
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ status: "error", msg: "Method not allowed" }));
          return;
        }

        const env = { ...loadEnv(server.config.mode, server.config.root, ""), ...server.config.env };
        // Do not silently send a legacy DashScope key to a different provider.
        // `deepseek` must have an explicit generic LLM key; Bailian retains its
        // backwards-compatible DASHSCOPE fallback.
        const isDeepSeek = env.VITE_AGENT_PROVIDER === "deepseek";
        const apiKey = isDeepSeek ? env.LLM_API_KEY : env.LLM_API_KEY || env.DASHSCOPE_API_KEY;
        if (!apiKey) {
          res.statusCode = 503;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ status: "unavailable", msg: "LLM_API_KEY not configured" }));
          return;
        }

        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);

        try {
          // Inject the model server-side: LLM_MODEL has no VITE_ prefix
          // and therefore never ships to the browser bundle. The client may
          // NOT choose its own model — it is always overridden here.
          let raw: Record<string, unknown>;
          try {
            raw = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
          } catch {
            raw = {};
          }
          if (typeof raw !== "object" || raw === null) raw = {};
          // Whitelist passthrough only: anything else a client might smuggle
          // (stream, tools, n, ...) is dropped before reaching upstream.
          const body: Record<string, unknown> = {
            messages: raw.messages,
            response_format: raw.response_format,
            temperature: raw.temperature,
            seed: raw.seed,
            model: env.LLM_MODEL || env.DASHSCOPE_MODEL || "qwen-plus",
            // Preference parsing, recovery rationales and advisory extraction
            // are small structured tasks. Disable DeepSeek thinking here;
            // the research proxy alone intentionally enables medium effort
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
          res.statusCode = 502;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ status: "unavailable", msg: String(error) }));
        }
      });
    },
  };
}

/**
 * A bounded tool loop for the Connection Integrity Agent. DeepSeek chooses
 * one or two research queries; this server-only proxy executes them through
 * Tavily, returns compact source snippets to the model, then emits a
 * structured brief. The browser never receives either API key.
 */
function connectionResearchProxy(): Plugin {
  return {
    name: "connection-research-proxy",
    configureServer(server) {
      server.middlewares.use("/api/agent/connection-research", async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.setHeader("Allow", "POST");
          res.end(JSON.stringify({ status: "error", msg: "Method not allowed" }));
          return;
        }
        const env = { ...loadEnv(server.config.mode, server.config.root, ""), ...server.config.env };
        const llmKey = env.VITE_AGENT_PROVIDER === "deepseek" ? env.LLM_API_KEY : env.LLM_API_KEY || env.DASHSCOPE_API_KEY;
        const tavilyKey = env.TAVILY_API_KEY;
        if (!llmKey || !tavilyKey) {
          res.statusCode = 503;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ status: "unavailable", msg: "LLM_API_KEY and TAVILY_API_KEY are required for connection research" }));
          return;
        }
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        let raw: { connection?: Record<string, unknown> } = {};
        try { raw = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); } catch { /* invalid input handled below */ }
        const connection = raw.connection;
        const airport = typeof connection?.connectionAirport === "string" ? connection.connectionAirport.toUpperCase().slice(0, 3) : "";
        const flights = Array.isArray(connection?.flightNumbers) ? connection.flightNumbers.filter((item): item is string => typeof item === "string").slice(0, 4) : [];
        if (!/^[A-Z]{3}$/.test(airport) || flights.length === 0) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ status: "error", msg: "Invalid connection research input" }));
          return;
        }
        const model = env.LLM_MODEL || env.DASHSCOPE_MODEL || "qwen-plus";
        const baseUrl = (env.LLM_BASE_URL ?? env.DASHSCOPE_BASE_URL ?? "https://dashscope.aliyuncs.com/compatible-mode/v1").replace(/\/$/, "");
        const useDeepSeek = env.VITE_AGENT_PROVIDER === "deepseek";
        const system = [
          "You are the Connection Integrity research agent.",
          "You must make two search_connection_evidence calls before producing a decision: one official and one community search. Focus them on the actual connection airport, terminal process, airline and transfer time.",
          'After tool results, return ONLY JSON: {"connectionFit":"comfortable|tight|insufficient","protectionStatus":"confirmed|not-confirmed","recommendedOption":"selected|alternative","recommendationSummary":string,"assessmentConfidence":"low|medium|high","rationale":string,"keyFactors":string[],"limitations":string[],"nextAction":string}.',
          "ConnectionFit answers only whether the planned time is workable; it is never a missed-connection probability. ProtectionStatus answers whether the supplied offer proves airline/booking protection; it must not lower ConnectionFit merely because the protection evidence is missing.",
          "Use only the supplied itinerary, alternative, policy input and tool results. Never infer a single PNR, baggage-through, immigration requirement, airline liability, or probability.",
          "Use this transparent planning rubric unless airport-specific evidence contradicts it: below the published minimum is insufficient; meeting the minimum with less than 90 additional minutes is tight; meeting it with 90 or more additional minutes is comfortable. State the minutes and the published minimum in the rationale. This rubric is a planning heuristic, not historical calibration.",
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
        const requestModel = async (messages: unknown[], tools?: unknown[], toolChoice?: unknown, json = false, finalSynthesis = false) => {
          const upstream = await fetch(`${baseUrl}/chat/completions`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${llmKey}` },
            body: JSON.stringify({ model, messages, tools, tool_choice: toolChoice, response_format: json ? { type: "json_object" } : undefined, temperature: 0.1, seed: 20260910, max_tokens: finalSynthesis ? 4096 : undefined, ...(useDeepSeek ? (finalSynthesis ? { thinking: { type: "enabled" }, reasoning_effort: "medium" } : { thinking: { type: "disabled" } }) : {}) }),
          });
          const text = await upstream.text();
          if (!upstream.ok) throw new Error(`LLM HTTP ${upstream.status}: ${text.slice(0, 500)}`);
          return JSON.parse(text) as { model?: unknown; choices?: Array<{ message?: Record<string, unknown> }> };
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
          const sources: Array<{ tier: "official" | "community"; title: string; url: string; summary: string }> = [];
          const toolMessages: Array<Record<string, unknown>> = [];
          for (const call of calls) {
            if (typeof call !== "object" || call === null) continue;
            const item = call as { id?: unknown; function?: { name?: unknown; arguments?: unknown } };
            if (item.function?.name !== "search_connection_evidence" || typeof item.id !== "string") continue;
            let args: { evidence_type?: unknown; query?: unknown } = {};
            try { args = JSON.parse(typeof item.function.arguments === "string" ? item.function.arguments : "{}"); } catch { /* use controlled fallback */ }
            const tier: "official" | "community" = args.evidence_type === "community" ? "community" : "official";
            const fallbackQuery = tier === "official"
              ? `AirAsia Fly-Thru ${airport} Terminal 2 ${flights.join(" ")} minimum connection time`
              : `${airport} Terminal 2 AirAsia international transfer time Fly-Thru passenger experience`;
            const candidateQuery = typeof args.query === "string" && args.query.length >= 8 && args.query.length <= 180 ? args.query : fallbackQuery;
            const tavily = await fetch("https://api.tavily.com/search", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${tavilyKey}` },
              body: JSON.stringify({ query: candidateQuery, search_depth: "basic", max_results: 3, include_answer: false, include_raw_content: false, ...(tier === "official" ? { include_domains: ["airasia.com"] } : {}) }),
            });
            if (!tavily.ok) throw new Error(`Tavily HTTP ${tavily.status}`);
            const result = await tavily.json() as { results?: Array<{ title?: unknown; url?: unknown; content?: unknown }> };
            const normalized = Array.isArray(result.results) ? result.results.flatMap((entry) => {
              if (typeof entry.title !== "string" || typeof entry.url !== "string" || typeof entry.content !== "string") return [];
              // Search ranking alone is not evidence. Both official and
              // community results must make a transfer/process claim before
              // the model or traveller sees them; this excludes vouchers,
              // check-in pages, social posts and other keyword-adjacent noise.
              const evidenceText = `${entry.title} ${entry.content}`;
              const isNonTransferPage = /cheap flights?|travel voucher|mobile app|check[ -]?in/i.test(entry.title);
              const hasConnectionClaim = /fly[ -]?thru|baggage[ -]?(?:through|transfer)|minimum[ -]?connecting|\bmct\b|self[ -]?transfer|transit[ -]?(?:procedure|process|requirement)/i.test(evidenceText);
              const hasProcessContext = /terminal|transfer|immigration|customs|re-?check|check[ -]?in|boarding|connection time/i.test(evidenceText);
              if (isNonTransferPage || !hasConnectionClaim || !hasProcessContext) return [];
              const source = { tier, title: entry.title.slice(0, 160), url: entry.url, summary: entry.content.slice(0, 700) };
              sources.push(source);
              return [source];
            }) : [];
            toolMessages.push({ role: "tool", tool_call_id: item.id, content: JSON.stringify({ tier, results: normalized }) });
          }
          // The KUL demo's published policy is a durable, explicit product
          // input. Use it only as a disclosed fallback when search returns no
          // relevant official page, never as invented live itinerary proof.
          if (!sources.some((source) => source.tier === "official") && airport === "KUL" && flights.some((flight) => /^(D7|AK)/.test(flight))) {
            sources.push({
              tier: "official",
              title: "AirAsia Fly-Thru connection policy (disclosed fallback input)",
              url: "https://support.airasia.com/s/article/Does-AirAsia-provide-stop-over-en?language=km",
              summary: "Published KLIA Terminal 2 Fly-Thru connection window: 60 minutes to 18 hours for eligible single-booking / Fly-Thru itineraries. This is a disclosed product policy input used because the live search returned no relevant official page; it is not a live research hit.",
              disclosed: true,
            });
          }
          if (!sources.some((source) => source.tier === "official")) {
            throw new Error("No relevant official connection-policy source was found");
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
                "Apply this transparent planning rubric unless airport-specific evidence contradicts it: below the published minimum is insufficient; meeting it with less than 90 additional minutes is tight; with 90 or more additional minutes is comfortable. Do not make a comfortable connection tight solely because protection is not confirmed.",
                "Make a choice between selected and alternative. State the time and fare trade-off in recommendationSummary; do not respond only with a verification request.",
              ].join(" "),
            },
            { role: "user", content: `Connection evidence: ${JSON.stringify(connection)}\nResearch results: ${JSON.stringify(sources)}` },
          ];
          // JSON mode is omitted only for the thinking synthesis; the prompt
          // and client schema still require valid structured JSON.
          const final = await requestModel(finalMessages, undefined, undefined, false, true);
          const content = final.choices?.[0]?.message?.content;
          if (typeof content !== "string" || content.length === 0) throw new Error("Agent returned no final research brief");
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ model: typeof final.model === "string" ? final.model : model, content, sources }));
        } catch (error) {
          res.statusCode = 502;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ status: "unavailable", msg: error instanceof Error ? error.message : "Connection research failed" }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), atlasSandboxProxy(), agentProxy(), connectionResearchProxy()],
});
