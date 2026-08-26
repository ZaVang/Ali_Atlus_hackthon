// The disclosed planning rubric, expressed as a pure function so it can be
// verified numerically (see tests/rubric.test.mjs). This is a planning
// heuristic agreed with the traveller, not historical calibration:
// below the published minimum is insufficient; meeting the minimum with
// less than the planning buffer of additional minutes is tight; with the
// buffer or more additional minutes is comfortable.
//
// The published minimum and planning buffer are NOT hard-coded here: they
// are resolved per itinerary from the connection policy registry
// (src/domain/connection-policies.mjs). The KUL demo's 60 + 90 pair is one
// registered policy entry (AirAsia Fly-Thru), not a universal constant.
export type ConnectionFit = "comfortable" | "tight" | "insufficient";

/** Default planning buffer used when a caller does not supply one; the
 * registered KUL policy uses exactly this value. */
export const PLANNING_BUFFER_MINUTES = 90;

/**
 * Evaluate a connection window against a published minimum.
 * Boundary contract (publishedMinimum = 60, buffer = 90):
 *   59 → insufficient, 60 → tight, 149 → tight, 150 → comfortable, 151 → comfortable.
 */
export function evaluateConnectionFit(
  connectionMinutes: number,
  publishedMinimumMinutes: number,
  planningBufferMinutes: number = PLANNING_BUFFER_MINUTES,
): ConnectionFit {
  if (connectionMinutes < publishedMinimumMinutes) return "insufficient";
  if (connectionMinutes < publishedMinimumMinutes + planningBufferMinutes) return "tight";
  return "comfortable";
}
