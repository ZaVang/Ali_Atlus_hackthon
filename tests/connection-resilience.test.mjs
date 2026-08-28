import test from "node:test";
import assert from "node:assert/strict";
import { createConnectionResilienceReceipt } from "../.test-build/domain/connection-resilience.js";

const candidates = {
  shortest: { key: "shortest", flights: ["D73331", "AK727"], connectionMinutes: 115, price: 133.91, currency: "USD" },
  buffered: { key: "buffered", flights: ["D73331", "AK707"], connectionMinutes: 185, price: 148.10, currency: "USD" },
};

test("receipt binds fare, time, flight identity, and registered floor deterministically", () => {
  const receipt = createConnectionResilienceReceipt(candidates, "KUL", 60);
  assert.deepEqual(receipt.recommendedFlights, ["D73331", "AK707"]);
  assert.deepEqual(receipt.counterfactualFlights, ["D73331", "AK727"]);
  assert.equal(receipt.extraFareCents, 1419);
  assert.equal(receipt.addedBufferMinutes, 70);
  assert.equal(receipt.recommendedRemainingMinutes, 125);
  assert.equal(receipt.counterfactualRemainingMinutes, 55);
  assert.equal(receipt.publishedFloorMinutes, 60);
});

test("receipt recommendation is stable regardless of which candidate the traveller starts from", () => {
  for (const startingKey of ["shortest", "buffered"]) {
    const receipt = createConnectionResilienceReceipt(candidates, "KUL", 60);
    assert.equal(startingKey === "shortest" || startingKey === "buffered", true);
    assert.equal(receipt.recommendedKey, "buffered");
    assert.equal(receipt.counterfactualKey, "shortest");
  }
});
