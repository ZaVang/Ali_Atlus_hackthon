// MockAgentProvider: deterministic stand-in for a real LLM. Never throws —
// unknown text falls back to the default mapping. A short artificial delay
// makes the loading states visible in the demo. Every output here must be
// labelled "Demo agent fixture" in the UI.
import type {
  AgentProvider,
  ConnectionContractBrief,
  ConnectionContractInput,
  ParsedConnectionPreference,
} from "../domain/types";

const MOCK_LATENCY_MS = 400;

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason ?? new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export class MockAgentProvider implements AgentProvider {
  readonly source = "mock" as const;

  async parseConnectionPreference(text: string, signal?: AbortSignal): Promise<ParsedConnectionPreference & { model: string }> {
    await delay(MOCK_LATENCY_MS, signal);
    const lower = text.toLowerCase();
    if (/cheap|budget|cost|price|便宜|最低价|省钱/.test(lower)) {
      return { priority: "lowest-cost", note: "Preference mapped to lowest cost", model: "mock-agent" };
    }
    if (/fast|soon|early|arrival|赶时间|尽快|最早/.test(lower)) {
      return { priority: "earliest-arrival", note: "Preference mapped to earliest arrival", model: "mock-agent" };
    }
    return { priority: "largest-buffer", note: "Preference mapped to a comfortable connection buffer", model: "mock-agent" };
  }

  async reviewConnectionContract(
    input: ConnectionContractInput,
    signal?: AbortSignal,
  ): Promise<ConnectionContractBrief & { model: string }> {
    await delay(MOCK_LATENCY_MS, signal);
    const remaining = input.scheduledConnectionMinutes - (input.inboundDelayMinutes ?? 0);
    if (remaining < input.minimumConnectionMinutes) {
      return {
        connectionFit: "insufficient",
        protectionStatus: input.flyThruVerified ? "confirmed" : "not-confirmed",
        recommendedOption: "alternative",
        recommendationSummary: "Choose the longer-buffer alternative: the selected connection no longer meets the published minimum.",
        assessmentConfidence: "high",
        rationale: `The reported delay leaves ${remaining} minutes, below the ${input.minimumConnectionMinutes}-minute Fly-Thru connection rule at ${input.connectionAirport}. This is a time-fit failure, not an estimate of missed-connection probability.`,
        keyFactors: ["Remaining connection time is below the published Fly-Thru minimum", "Inbound operational delay"],
        limitations: ["Live flight-status feed is simulated in this demo"],
        nextAction: "Search a later protected connection and offer it to the traveller for approval.",
        model: "mock-agent",
      };
    }
    const fit = remaining >= input.minimumConnectionMinutes + 90 ? "comfortable" : "tight";
    const alternativeHasMoreBuffer = (input.alternative?.scheduledConnectionMinutes ?? remaining) > remaining;
    return {
      connectionFit: fit,
      protectionStatus: input.flyThruVerified ? "confirmed" : "not-confirmed",
      recommendedOption: alternativeHasMoreBuffer ? "alternative" : "selected",
      recommendationSummary: alternativeHasMoreBuffer
        ? `Choose the longer-buffer alternative if the extra fare is acceptable: it buys more resilience without claiming a probability.`
        : `Choose this itinerary: its planned connection time is ${fit}.`,
      assessmentConfidence: "medium",
      rationale: `The schedule leaves ${remaining} minutes. It is ${fit === "comfortable" ? "well above" : "above but not far beyond"} the ${input.minimumConnectionMinutes}-minute published Fly-Thru minimum. Whether the ticket is protected is a separate booking fact and does not make the time itself insufficient.`,
      keyFactors: [`${remaining} planned minutes compared with the ${input.minimumConnectionMinutes}-minute published minimum`, "Connection protection is not confirmed in the ATRIP quote"],
      limitations: ["Single PNR / Fly-Thru eligibility", "Baggage-through confirmation"],
      nextAction: "Verify the connection contract before recommending the shortest option; otherwise show a longer-buffer alternative.",
      model: "mock-agent",
    };
  }
}
