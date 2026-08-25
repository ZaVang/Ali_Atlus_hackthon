import type { AgentProvider, AtlasFlightProvider } from "../domain/types";
import { BailianAgentProvider } from "./bailian-agent";
import { MockAgentProvider } from "./mock-agent";
import { MockAtlasFlightProvider } from "./mock-atlas";
import { SandboxAtlasFlightProvider } from "./sandbox-atlas";

export { ProviderUnavailableError } from "./sandbox-atlas";

export interface Providers {
  flights: AtlasFlightProvider;
  agent: AgentProvider;
}

export function getProviders(): Providers {
  const mode = import.meta.env.VITE_FLIGHT_PROVIDER;
  const agentMode = import.meta.env.VITE_AGENT_PROVIDER;
  return {
    flights: mode === "atlas-sandbox" ? new SandboxAtlasFlightProvider() : new MockAtlasFlightProvider(),
    agent:
      agentMode === "bailian" || agentMode === "deepseek"
        ? new BailianAgentProvider(agentMode)
        : new MockAgentProvider(),
  };
}
