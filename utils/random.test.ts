import assert from "node:assert";
import { describe, test } from "node:test";
import {
  getRandomElement,
  getRandomInt,
  getWeightedRandomElement,
} from "./random.ts";

const withMockedRandom = <T>(value: number, fn: () => T): T => {
  const originalRandom = Math.random;
  Math.random = () => value;

  try {
    return fn();
  } finally {
    Math.random = originalRandom;
  }
};

describe("random utilities", () => {
  test("getRandomInt should include the lower bound", () => {
    const result = withMockedRandom(0, () => getRandomInt(3, 7));
    assert.strictEqual(result, 3);
  });

  test("getRandomInt should include the upper bound", () => {
    const result = withMockedRandom(0.999999, () => getRandomInt(3, 7));
    assert.strictEqual(result, 7);
  });

  test("getRandomElement should return the first item for low thresholds", () => {
    const result = withMockedRandom(0, () => getRandomElement(["A", "B", "C"]));
    assert.strictEqual(result, "A");
  });

  test("getRandomElement should return the last item for high thresholds", () => {
    const result = withMockedRandom(0.999999, () =>
      getRandomElement(["A", "B", "C"])
    );
    assert.strictEqual(result, "C");
  });

  test("getWeightedRandomElement should throw for empty collections", () => {
    assert.throws(
      () => getWeightedRandomElement([], () => 1),
      /Cannot select from an empty weighted collection/,
    );
  });

  test("getWeightedRandomElement should fall back to the first item when weights are non-positive", () => {
    const result = withMockedRandom(0.75, () =>
      getWeightedRandomElement(["A", "B", "C"], () => 0)
    );
    assert.strictEqual(result, "A");
  });

  test("getWeightedRandomElement should honor relative weights", () => {
    const result = withMockedRandom(0.9, () =>
      getWeightedRandomElement(
        ["light", "heavy"],
        (item) => (item === "light" ? 1 : 3),
      )
    );
    assert.strictEqual(result, "heavy");
  });
});