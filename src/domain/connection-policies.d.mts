// Type surface for connection-policies.mjs (the connection policy registry).
// The implementation is plain ESM JavaScript so the Vite-bundled UI and the
// standalone Node service (server/logic.mjs) can share one runtime module.
export interface ConnectionPolicySource {
  description: string;
  url?: string;
  /** True when the entry is a demonstration template, not a verified policy. */
  illustrative?: boolean;
}

export interface ConnectionPolicyDisclosedFallback {
  title: string;
  url: string;
  summary: string;
}

export interface ConnectionPolicyQueryTemplates {
  official: string;
  community: string;
  retry: string;
}

export interface ConnectionPolicy {
  id: string;
  label: string;
  /** Connection airports this policy applies to (IATA, uppercase). */
  connectionAirports: string[];
  /** Carrier/flight prefixes (e.g. "D7", "AK") used for disclosed-fallback eligibility. */
  flightPrefixes: string[];
  publishedMinimumMinutes: number;
  planningBufferMinutes: number;
  maxConnectionMinutes: number;
  policySource: ConnectionPolicySource;
  /** Official-tier evidence domain whitelist for the research search. */
  officialDomains: string[];
  /** Fallback query templates; {airport} and {flights} are substituted. */
  queryTemplates: ConnectionPolicyQueryTemplates;
  /** Durable disclosed policy input, or null when the policy has none. */
  disclosedFallback: ConnectionPolicyDisclosedFallback | null;
}

export interface ConnectionPolicyQuery {
  connectionAirport?: string;
  flightNumbers?: string[];
}

export const CONNECTION_POLICIES: ConnectionPolicy[];
export const GENERIC_QUERY_TEMPLATES: ConnectionPolicyQueryTemplates;
export const NO_POLICY_DISCLOSURE: string;
/** Resolves only verified operational entries; illustrative templates return null. */
export function resolveConnectionPolicy(query?: ConnectionPolicyQuery): ConnectionPolicy | null;
export function renderQueryTemplate(template: string, vars: { airport: string; flights: string[] }): string;
