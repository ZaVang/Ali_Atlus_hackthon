/**
 * Browser cache for Agent evidence only. v5 is intentionally not migrated:
 * its free-text ownership semantics predate the deterministic-choice contract.
 */
export const CONNECTION_RESEARCH_CACHE_PREFIX = "connection-integrity:research:v6:";
export const CONNECTION_RESEARCH_LEGACY_V5_PREFIX = "connection-integrity:research:v5:";
export const CONNECTION_RESEARCH_SEMANTICS_VERSION = "deterministic-choice-baseline-evidence-v6";
export const CONNECTION_RESEARCH_CACHE_TTL_MS = 30 * 60 * 1_000;

export interface ResearchCacheStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface CachedResearch<T> {
  semanticsVersion: string;
  expiresAt: number;
  brief: T;
}

export function readCurrentResearchCache<T>(storage: ResearchCacheStorage, key: string, now: number, isValid: (brief: T) => boolean): T | null {
  // A v5 item is deliberately removed rather than normalized. Safe shape
  // validation cannot establish the ownership of its free-text explanation.
  storage.removeItem(`${CONNECTION_RESEARCH_LEGACY_V5_PREFIX}${key}`);
  try {
    const raw = storage.getItem(`${CONNECTION_RESEARCH_CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const cached = JSON.parse(raw) as Partial<CachedResearch<T>>;
    if (cached.semanticsVersion !== CONNECTION_RESEARCH_SEMANTICS_VERSION || typeof cached.expiresAt !== "number" || cached.expiresAt <= now || cached.brief === undefined || !isValid(cached.brief)) {
      storage.removeItem(`${CONNECTION_RESEARCH_CACHE_PREFIX}${key}`);
      return null;
    }
    return cached.brief;
  } catch {
    return null;
  }
}

export function writeCurrentResearchCache<T>(storage: ResearchCacheStorage, key: string, brief: T, now: number): void {
  const cached: CachedResearch<T> = {
    semanticsVersion: CONNECTION_RESEARCH_SEMANTICS_VERSION,
    expiresAt: now + CONNECTION_RESEARCH_CACHE_TTL_MS,
    brief,
  };
  storage.setItem(`${CONNECTION_RESEARCH_CACHE_PREFIX}${key}`, JSON.stringify(cached));
}
