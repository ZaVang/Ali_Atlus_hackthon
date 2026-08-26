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

/**
 * Field-by-field whitelist for a parsed connection brief. The exact same
 * check guards live agent responses and briefs re-read from browser cache,
 * so a tampered or malformed value can never reach the verdict rendering:
 * every enum is closed, explanation fields must be strings, and any carried
 * research source must match the source shape.
 */
export function isWhitelistedConnectionBrief(parsed: unknown): parsed is ConnectionContractBrief {
  const boundedText = (value: unknown, maxLength: number) => typeof value === "string" && value.length > 0 && value.length <= maxLength;
  const boundedStringArray = (value: unknown, maxItems: number, maxItemLength: number) => Array.isArray(value)
    && value.length <= maxItems
    && value.every((item) => boundedText(item, maxItemLength));
  const safeResearchUrl = (value: unknown) => {
    if (typeof value !== "string" || value.length > 2_000) return false;
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  };
  if (typeof parsed !== "object" || parsed === null) return false;
  const brief = parsed as {
    connectionFit?: unknown;
    protectionStatus?: unknown;
    recommendedOption?: unknown;
    recommendationSummary?: unknown;
    assessmentConfidence?: unknown;
    rationale?: unknown;
    keyFactors?: unknown;
    limitations?: unknown;
    nextAction?: unknown;
    sources?: unknown;
  };
  if (
    (brief.connectionFit !== "comfortable" && brief.connectionFit !== "tight" && brief.connectionFit !== "insufficient")
    || (brief.protectionStatus !== "confirmed" && brief.protectionStatus !== "not-confirmed")
    || (brief.recommendedOption !== "selected" && brief.recommendedOption !== "alternative")
    || (brief.assessmentConfidence !== "low" && brief.assessmentConfidence !== "medium" && brief.assessmentConfidence !== "high")
  ) return false;
  if (!boundedText(brief.recommendationSummary, 4_000) || !boundedText(brief.rationale, 8_000) || !boundedText(brief.nextAction, 4_000)) return false;
  if (!boundedStringArray(brief.keyFactors, 8, 1_000) || !boundedStringArray(brief.limitations, 8, 1_000)) return false;
  if (brief.sources !== undefined) {
    if (!Array.isArray(brief.sources) || brief.sources.length > 8) return false;
    for (const item of brief.sources) {
      if (typeof item !== "object" || item === null) return false;
      const source = item as { tier?: unknown; title?: unknown; url?: unknown; summary?: unknown; disclosed?: unknown };
      if ((source.tier !== "official" && source.tier !== "community") || !boundedText(source.title, 300) || !safeResearchUrl(source.url) || !boundedText(source.summary, 2_000) || (source.disclosed !== undefined && typeof source.disclosed !== "boolean")) return false;
    }
  }
  return true;
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
      const body = payload as { model?: unknown; content?: unknown; sources?: unknown; attempts?: unknown; retryQuery?: unknown; policyId?: unknown };
      if (typeof body.content !== "string" || body.content.length === 0) throw new Error("Connection research returned no content");
      const parsed: unknown = JSON.parse(body.content);
      if (!isWhitelistedConnectionBrief(parsed)) throw new Error("Agent returned invalid connection assessment");
      const { connectionFit, protectionStatus, recommendedOption, recommendationSummary, assessmentConfidence, rationale, keyFactors, limitations, nextAction } = parsed;
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
          // Registry entry that drove the evidence thresholds; null marks the
          // explicit no-policy path. Ids are short kebab-case identifiers.
          policyId: typeof body.policyId === "string" && /^[a-z0-9-]{1,64}$/.test(body.policyId) ? body.policyId : null,
        },
      };
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onOuterAbort);
    }
  }
}
