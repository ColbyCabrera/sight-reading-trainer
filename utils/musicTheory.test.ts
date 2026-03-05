import assert from "node:assert";
import { test, describe } from "node:test";
import { getSettingsForLevel } from "./musicTheory.ts";
import type { DifficultyLevel, GenerationSettings } from "../types.ts";

describe("getSettingsForLevel", () => {
  const testCases: { level: DifficultyLevel; expected: GenerationSettings }[] =
    [
      {
        level: 1,
        expected: {
          maxInterval: 2,
          handCoordination: "SEPARATE",
          playability: "5-FINGER",
          rhythmComplexity: 1,
          rhythmVariance: 0.8,
          accompanimentStyle: ["NONE"],
        },
      },
      {
        level: 2,
        expected: {
          maxInterval: 3,
          handCoordination: "RANDOM",
          playability: "5-FINGER",
          rhythmComplexity: 2,
          rhythmVariance: 0.3,
          accompanimentStyle: ["NONE"],
        },
      },
      {
        level: 3,
        expected: {
          maxInterval: 6,
          handCoordination: "RANDOM",
          playability: "OCTAVE",
          rhythmComplexity: 3,
          rhythmVariance: 0.6,
          accompanimentStyle: ["NONE"],
        },
      },
      {
        level: 4,
        expected: {
          maxInterval: 4,
          handCoordination: "INDEPENDENT",
          playability: "5-FINGER",
          rhythmComplexity: 2,
          rhythmVariance: 0.3,
          accompanimentStyle: ["BLOCK", "BROKEN"],
        },
      },
      {
        level: 5,
        expected: {
          maxInterval: 5,
          handCoordination: "INDEPENDENT",
          playability: "OCTAVE",
          rhythmComplexity: 3,
          rhythmVariance: 0.4,
          accompanimentStyle: ["MIXED", "BLOCK", "ALBERTI"],
        },
      },
      {
        level: 6,
        expected: {
          maxInterval: 6,
          handCoordination: "INDEPENDENT",
          playability: "OCTAVE",
          rhythmComplexity: 5,
          rhythmVariance: 0.5,
          accompanimentStyle: ["WALTZ"],
        },
      },
      {
        level: 7,
        expected: {
          maxInterval: 8,
          handCoordination: "INDEPENDENT",
          playability: "OCTAVE",
          rhythmComplexity: 7,
          rhythmVariance: 0.6,
          accompanimentStyle: ["ALBERTI"],
        },
      },
      {
        level: 8,
        expected: {
          maxInterval: 12,
          handCoordination: "INDEPENDENT",
          playability: "LARGE",
          rhythmComplexity: 8,
          rhythmVariance: 0.7,
          accompanimentStyle: ["STRIDE"],
        },
      },
      {
        level: 9,
        expected: {
          maxInterval: 12,
          handCoordination: "INDEPENDENT",
          playability: "LARGE",
          rhythmComplexity: 9,
          rhythmVariance: 0.7,
          accompanimentStyle: ["STRIDE"],
        },
      },
      {
        level: 10,
        expected: {
          maxInterval: 12,
          handCoordination: "INDEPENDENT",
          playability: "LARGE",
          rhythmComplexity: 10,
          rhythmVariance: 0.7,
          accompanimentStyle: ["STRIDE"],
        },
      },
    ];

  testCases.forEach(({ level, expected }) => {
    test(`should return correct settings for level ${level}`, () => {
      const settings = getSettingsForLevel(level);
      assert.deepStrictEqual(
        settings,
        expected,
        `Full settings mismatch for level ${level}`,
      );
    });
  });
});
