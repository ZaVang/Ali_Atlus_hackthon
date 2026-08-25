// OpenAI-compatible live agent calls through the server-side proxy. The proxy
// can target Alibaba Cloud Bailian or DeepSeek without exposing a key to the
// browser. The agent only understands and expresses — ranking, execution, and
// consent stay with the deterministic engine. Every response is
// whitelist-validated; failures surface as ProviderUnavailableError so the
// UI can degrade gracefully.
import type {
  AgentProvider,
  ConnectionContractBrief,
  ConnectionContractInput,
  ConnectionResearchSource,
  ConnectionChoicePriority,
  ParsedConnectionPreference,
} from "../domain/types";
import { ProviderUnavailableError } from "./sandbox-atlas";

const SEED = 20260908;
const PARSE_TIMEOUT_MS = 8_000;
// This request runs a server-side Tavily search followed by a thinking
// synthesis. It is deliberately given a larger budget than the short,
// non-research preference-parsing task.
const CONNECTION_RESEARCH_TIMEOUT_MS = 300_000;

const CONNECTION_PREFERENCE_SYSTEM_PROMPT =
  "You are a flight-choice preference parser. " +
  'Respond ONLY with a JSON object of the form {"priority": string, "note": string}. ' +
  'The "priority" value MUST be exactly one of: "lowest-cost", "earliest-arrival", "largest-buffer". ' +
  '"lowest-cost" = minimise the total displayed fare; "earliest-arrival" = arrive at the final destination earliest; ' +
  '"largest-buffer" = prefer a comfortable planned connection window and avoid unnecessarily long waits. ' +
  'If the intent is unclear, default to "largest-buffer" and explain in "note" (one short English sentence). ' +
  "Never ask questions. Never request, infer, or mention passport, nationality, visa, or immigration status.";

interface ChatMessage {
  role: "system" | "user";
  content: string;
}

interface ChatResult {
  content: string;
  model: string;
}

async function chat(messages: ChatMessage[], timeoutMs: number, outerSignal?: AbortSignal): Promise<ChatResult> {
  // Already cancelled before we even started: fail fast with a real AbortError.
  if (outerSignal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onOuterAbort = () => controller.abort();
  outerSignal?.addEventListener("abort", onOuterAbort, { once: true });
  try {
    const res = await fetch("/api/agent/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        response_format: { type: "json_object" },
        temperature: 0.2,
        seed: SEED,
      }),
      signal: controller.signal,
    });
    if (res.status === 503) {
      throw new ProviderUnavailableError("Agent endpoint unavailable (missing LLM_API_KEY)");
    }
    if (!res.ok) {
      throw new Error(`Agent endpoint returned HTTP ${res.status}`);
    }
    const json: unknown = await res.json();
    if (typeof json === "object" && json !== null && (json as { status?: unknown }).status === "unavailable") {
      throw new ProviderUnavailableError("Agent endpoint unavailable");
    }
    const body = json as { model?: unknown; choices?: { message?: { content?: unknown } }[] };
    const content = body.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.length === 0) {
      throw new Error("Agent response had no content");
    }
    return { content, model: typeof body.model === "string" ? body.model : "bailian" };
  } finally {
    clearTimeout(timer);
    outerSignal?.removeEventListener("abort", onOuterAbort);
  }
}

function isConnectionChoicePriority(value: unknown): value is ConnectionChoicePriority {
  return value === "lowest-cost" || value === "earliest-arrival" || value === "largest-buffer";
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

/**
 * Run `attempt` with one retry. AbortErrors propagate immediately (no retry);
 * ProviderUnavailableError keeps its original type and message; anything else
 * is rethrown as ProviderUnavailableError after the retry fails.
 */
async function withRetry<T>(attempt: () => Promise<T>): Promise<T> {
  try {
    return await attempt();
  } catch (first) {
    if (isAbortError(first)) throw first;
    if (first instanceof ProviderUnavailableError) throw first;
    try {
      return await attempt();
    } catch (second) {
      if (isAbortError(second)) throw second;
      if (second instanceof ProviderUnavailableError) throw second;
      throw new ProviderUnavailableError("Agent response invalid after retry");
    }
  }
}

export class BailianAgentProvider implements AgentProvider {
  constructor(readonly source: "bailian" | "deepseek" = "bailian") {}

  async parseConnectionPreference(text: string, signal?: AbortSignal): Promise<ParsedConnectionPreference & { model: string }> {
    return withRetry(async () => {
      const { content, model } = await chat(
        [
          { role: "system", content: CONNECTION_PREFERENCE_SYSTEM_PROMPT },
          { role: "user", content: `Traveller said: ${JSON.stringify(text)}` },
        ],
        PARSE_TIMEOUT_MS,
        signal,
      );
      const parsed: unknown = JSON.parse(content);
      if (typeof parsed !== "object" || parsed === null) throw new Error("Agent JSON was not an object");
      const { priority, note } = parsed as { priority?: unknown; note?: unknown };
      if (!isConnectionChoicePriority(priority)) throw new Error(`Agent returned invalid connection preference: ${String(priority)}`);
      return { priority, note: typeof note === "string" ? note : "", model };
    });
  }

  async reviewConnectionContract(
    input: ConnectionContractInput,
    signal?: AbortSignal,
  ): Promise<ConnectionContractBrief & { model: string }> {
    // Connection research is the only agent task that may use web evidence.
    // It runs through a separate, server-only tool loop so the browser never
    // receives either the Tavily or LLM credentials.
    const startedAt = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CONNECTION_RESEARCH_TIMEOUT_MS);
    const onOuterAbort = () => controller.abort();
    signal?.addEventListener("abort", onOuterAbort, { once: true });
    try {
      const res = await fetch("/api/agent/connection-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connection: input }),
        signal: controller.signal,
      });
      if (res.status === 503) throw new ProviderUnavailableError("Connection research is not configured");
      const payload: unknown = await res.json();
      if (!res.ok) {
        const message = typeof payload === "object" && payload !== null && typeof (payload as { msg?: unknown }).msg === "string" ? (payload as { msg: string }).msg : "unavailable";
        throw new Error(`Connection research returned HTTP ${res.status}: ${message}`);
      }
      const body = payload as { model?: unknown; content?: unknown; sources?: unknown; attempts?: unknown; retryQuery?: unknown };
      if (typeof body.content !== "string" || body.content.length === 0) throw new Error("Connection research returned no content");
      const parsed: unknown = JSON.parse(body.content);
      if (typeof parsed !== "object" || parsed === null) throw new Error("Connection research JSON was not an object");
      const { connectionFit, protectionStatus, recommendedOption, recommendationSummary, assessmentConfidence, rationale, keyFactors, limitations, nextAction } = parsed as {
        connectionFit?: unknown;
        protectionStatus?: unknown;
        recommendedOption?: unknown;
        recommendationSummary?: unknown;
        assessmentConfidence?: unknown;
        rationale?: unknown;
        keyFactors?: unknown;
        limitations?: unknown;
        nextAction?: unknown;
      };
      if ((connectionFit !== "comfortable" && connectionFit !== "tight" && connectionFit !== "insufficient") || (protectionStatus !== "confirmed" && protectionStatus !== "not-confirmed") || (recommendedOption !== "selected" && recommendedOption !== "alternative") || (assessmentConfidence !== "low" && assessmentConfidence !== "medium" && assessmentConfidence !== "high")) throw new Error("Agent returned invalid connection assessment");
      if (typeof recommendationSummary !== "string" || typeof rationale !== "string" || typeof nextAction !== "string") throw new Error("Agent response missing connection explanation");
      const sources: ConnectionResearchSource[] = Array.isArray(body.sources)
        ? body.sources.flatMap((item): ConnectionResearchSource[] => {
            if (typeof item !== "object" || item === null) return [];
            const source = item as Partial<ConnectionResearchSource>;
            return (source.tier === "official" || source.tier === "community") && typeof source.title === "string" && typeof source.url === "string" && typeof source.summary === "string"
              ? [{ tier: source.tier, title: source.title, url: source.url, summary: source.summary, disclosed: (source as { disclosed?: unknown }).disclosed === true ? true : undefined }]
              : [];
          })
        : [];
      return {
        connectionFit,
        protectionStatus,
        recommendedOption,
        recommendationSummary,
        assessmentConfidence,
        rationale,
        keyFactors: Array.isArray(keyFactors) ? keyFactors.filter((item): item is string => typeof item === "string").slice(0, 4) : [],
        limitations: Array.isArray(limitations) ? limitations.filter((item): item is string => typeof item === "string").slice(0, 4) : [],
        nextAction,
        sources,
        model: typeof body.model === "string" ? body.model : this.source,
        researchMeta: {
          sourceCount: sources.length,
          durationMs: Date.now() - startedAt,
          fromCache: false,
          completedAt: new Date().toISOString(),
          // Whitelist-validated telemetry: the server reports how many
          // evidence rounds actually ran (bounded at 2) and, when a second
          // round ran, the reformulated query it used.
          attempts: body.attempts === 1 || body.attempts === 2 ? body.attempts : 1,
          retryQuery: typeof body.retryQuery === "string" && body.retryQuery.length <= 200 ? body.retryQuery : undefined,
        },
      };
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onOuterAbort);
    }
  }
}
