import assert from "node:assert";
import { test, describe } from "node:test";
import {
  getDefaultKeyPoolForLevel,
  buildCadencedProgression,
  getCadenceWeight,
  getEligibleCadences,
  getEligibleProgressions,
  getProgressionWeight,
  getSettingsForLevel,
  PROGRESSION_TEMPLATES,
} from "./musicTheory.ts";
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

  test("should keep every progression within valid scale-degree bounds", () => {
    PROGRESSION_TEMPLATES.forEach((progression) => {
      assert.ok(progression.degrees.length > 0, `${progression.id} must not be empty`);
      progression.degrees.forEach((degree) => {
        assert.ok(
          degree >= 0 && degree <= 6,
          `${progression.id} contains invalid degree ${degree}`,
        );
      });
      assert.ok(
        progression.cadenceFamilies.length > 0,
        `${progression.id} must allow at least one cadence family`,
      );
    });
  });

  test("should filter progressions by key sonority", () => {
    const majorProgressions = getEligibleProgressions("MAJOR", 3);
    const minorProgressions = getEligibleProgressions("MINOR", 3);

    assert.ok(majorProgressions.every((progression) => progression.sonority !== "MINOR"));
    assert.ok(minorProgressions.every((progression) => progression.sonority !== "MAJOR"));
    assert.ok(majorProgressions.some((progression) => progression.sonority === "MAJOR"));
    assert.ok(minorProgressions.some((progression) => progression.sonority === "MINOR"));
  });

  test("should bias simpler progressions early without excluding richer ones", () => {
    const basic = PROGRESSION_TEMPLATES.find((progression) => progression.id === "BASIC");
    const circle = PROGRESSION_TEMPLATES.find((progression) => progression.id === "CIRCLE");

    assert.ok(basic);
    assert.ok(circle);
    assert.ok(getProgressionWeight(basic!, 1) > getProgressionWeight(circle!, 1));
    assert.ok(getProgressionWeight(circle!, 1) > 0);
  });

  test("should gate deceptive cadences until higher difficulty", () => {
    const earlyCadences = getEligibleCadences("MAJOR", 2, ["AUTHENTIC", "DECEPTIVE"]);
    const advancedCadences = getEligibleCadences("MINOR", 6, ["AUTHENTIC", "DECEPTIVE"]);

    assert.ok(earlyCadences.every((cadence) => cadence.family !== "DECEPTIVE"));
    assert.ok(advancedCadences.some((cadence) => cadence.family === "DECEPTIVE"));
    assert.ok(
      advancedCadences.every((cadence) => getCadenceWeight(cadence, 6) > 0),
    );
  });

  test("should build a progression that ends with the selected cadence", () => {
    const progression = PROGRESSION_TEMPLATES.find((template) => template.id === "CLASSICAL");
    const cadence = getEligibleCadences("MAJOR", 4, ["PLAGAL"]).find(
      (entry) => entry.family === "PLAGAL",
    );

    assert.ok(progression);
    assert.ok(cadence);

    const result = buildCadencedProgression(progression!, cadence!, 8);

    assert.strictEqual(result.length, 8);
    assert.deepStrictEqual(result.slice(-cadence!.degrees.length), cadence!.degrees);
  });

  test("should default level 1 keys to C, G, and F major", () => {
    assert.deepStrictEqual(getDefaultKeyPoolForLevel(1), [
      "C Major",
      "G Major",
      "F Major",
    ]);
  });

  test("should add A minor and E minor to the level 2 default key pool", () => {
    assert.deepStrictEqual(getDefaultKeyPoolForLevel(2), [
      "C Major",
      "G Major",
      "F Major",
      "A Minor",
      "E Minor",
    ]);
  });
});
