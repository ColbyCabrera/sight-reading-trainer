import assert from "node:assert";
import { test, describe } from "node:test";
import { generateAlgorithmicSheetMusic } from "./algorithmicService.ts";
import { getDefaultKeyPoolForLevel } from "../utils/musicTheory.ts";
import type { GenerationSettings } from "../types.ts";

const withMockedRandom = <T>(value: number, fn: () => T): T => {
  const originalRandom = Math.random;
  Math.random = () => value;

  try {
    return fn();
  } finally {
    Math.random = originalRandom;
  }
};

const getVoiceBody = (
  abcNotation: string,
  voice: "treble" | "bass",
): string => {
  if (voice === "treble") {
    const match = abcNotation.match(/V:1 clef=treble\n([\s\S]*?)\nV:2 clef=bass\n/);
    return match?.[1] ?? "";
  }

  const match = abcNotation.match(/V:2 clef=bass\n([\s\S]*)$/);
  return match?.[1] ?? "";
};

describe("generateAlgorithmicSheetMusic", () => {
  test("should generate a valid exercise for difficulty level 1", () => {
    const result = generateAlgorithmicSheetMusic(1, "C Major");

    assert.strictEqual(result.difficulty, 1);
    assert.strictEqual(result.key, "C Major");
    assert.ok(
      result.title.includes("C Major") ||
        result.title.includes("C") ||
        result.title.includes("Cm"),
    );
    assert.ok(result.abcNotation.includes("X:1"));
    assert.ok(result.abcNotation.includes("T:"));
    assert.ok(result.abcNotation.includes("M:4/4"));
    assert.ok(result.abcNotation.includes("K:C"));
    assert.ok(result.abcNotation.includes("V:1 clef=treble"));
    assert.ok(result.abcNotation.includes("V:2 clef=bass"));
  });

  test("should generate a valid exercise for high difficulty (level 8)", () => {
    const result = generateAlgorithmicSheetMusic(8, "G Major");

    assert.strictEqual(result.difficulty, 8);
    assert.strictEqual(result.key, "G Major");
    assert.ok(result.abcNotation.includes("K:G"));
    // High difficulty might have 3/4 or 4/4
    assert.ok(
      result.abcNotation.includes("M:3/4") ||
        result.abcNotation.includes("M:4/4"),
    );
  });

  test('should handle "Random" key', () => {
    const result = generateAlgorithmicSheetMusic(1, "Random");

    const validKeys = getDefaultKeyPoolForLevel(1);
    assert.ok(validKeys.includes(result.key as (typeof validKeys)[number]));
    assert.ok(
      result.abcNotation.includes(
        `K:${result.key.replace(" Major", "").replace(" Minor", "m")}`,
      ),
    );
  });

  test("should choose from the provided key pool", () => {
    const result = withMockedRandom(0.999999, () =>
      generateAlgorithmicSheetMusic(2, ["C Major", "E Minor"])
    );

    assert.strictEqual(result.key, "E Minor");
    assert.ok(result.abcNotation.includes("K:Em"));
  });

  test("should respect custom settings", () => {
    const customSettings: GenerationSettings = {
      maxInterval: 4,
      rhythmComplexity: 5,
      rhythmVariance: 0.5,
      handCoordination: "PARALLEL",
      accompanimentStyle: ["NONE"],
      playability: "5-FINGER",
    };

    const result = generateAlgorithmicSheetMusic(5, "D Major", customSettings);

    assert.strictEqual(result.difficulty, 5);
    assert.strictEqual(result.key, "D Major");
    // We can't easily check internal state, but we can check if it runs without error
    assert.ok(result.abcNotation.length > 0);
    assert.ok(result.description.includes("Parallel Motion"));
  });

  test("should generate different results on subsequent calls due to randomness", () => {
    const result1 = generateAlgorithmicSheetMusic(3, "C Major");
    const result2 = generateAlgorithmicSheetMusic(3, "C Major");

    assert.notStrictEqual(result1.abcNotation, result2.abcNotation);
  });

  test("should handle minor keys correctly in ABC notation", () => {
    const result = generateAlgorithmicSheetMusic(3, "A Minor");
    assert.strictEqual(result.key, "A Minor");
    assert.ok(result.abcNotation.includes("K:Am"));
  });

  test("should alternate rests between hands in separate mode", () => {
    const customSettings: GenerationSettings = {
      maxInterval: 2,
      rhythmComplexity: 1,
      rhythmVariance: 0,
      handCoordination: "SEPARATE",
      accompanimentStyle: ["NONE"],
      playability: "5-FINGER",
    };

    const result = withMockedRandom(0, () =>
      generateAlgorithmicSheetMusic(1, "C Major", customSettings)
    );

    const trebleVoice = getVoiceBody(result.abcNotation, "treble");
    const bassVoice = getVoiceBody(result.abcNotation, "bass");

    assert.ok(result.description.includes("Separate Motion"));
    assert.ok(trebleVoice.includes("z"));
    assert.ok(bassVoice.includes("z"));
  });

  test("should mirror the melody without rests in parallel mode", () => {
    const customSettings: GenerationSettings = {
      maxInterval: 4,
      rhythmComplexity: 3,
      rhythmVariance: 0,
      handCoordination: "PARALLEL",
      accompanimentStyle: ["NONE"],
      playability: "5-FINGER",
    };

    const result = withMockedRandom(0, () =>
      generateAlgorithmicSheetMusic(5, "D Major", customSettings)
    );

    const bassVoice = getVoiceBody(result.abcNotation, "bass");

    assert.ok(result.description.includes("Parallel Motion"));
    assert.ok(!bassVoice.includes("z"));
  });

  test("should preserve upper-register key-signature spellings in Gb major parallel mode", () => {
    const customSettings: GenerationSettings = {
      maxInterval: 6,
      rhythmComplexity: 3,
      rhythmVariance: 0.6,
      handCoordination: "PARALLEL",
      accompanimentStyle: ["NONE"],
      playability: "OCTAVE",
    };

    const result = withMockedRandom(0, () =>
      generateAlgorithmicSheetMusic(3, "Gb Major", customSettings)
    );

    const trebleVoice = getVoiceBody(result.abcNotation, "treble");

    assert.ok(trebleVoice.includes("c3/2B/2 c2"));
    assert.ok(!trebleVoice.includes("C3/2B/2 C2"));
  });

  test("should group 4/4 Alberti bass into two eighth-note beams per measure", () => {
    const customSettings: GenerationSettings = {
      maxInterval: 5,
      rhythmComplexity: 3,
      rhythmVariance: 0,
      handCoordination: "INDEPENDENT",
      accompanimentStyle: ["ALBERTI"],
      playability: "OCTAVE",
    };

    const result = withMockedRandom(0, () =>
      generateAlgorithmicSheetMusic(5, "C Major", customSettings)
    );

    const bassVoice = getVoiceBody(result.abcNotation, "bass");
    const firstMeasure = bassVoice.split("|")[0].trimEnd();
    const beamBreaks = (firstMeasure.match(/ /g) ?? []).length;

    assert.strictEqual(beamBreaks, 1);
  });

  test("should fall back to block chords when independent mode receives NONE", () => {
    const customSettings: GenerationSettings = {
      maxInterval: 5,
      rhythmComplexity: 3,
      rhythmVariance: 0,
      handCoordination: "INDEPENDENT",
      accompanimentStyle: ["NONE"],
      playability: "OCTAVE",
    };

    const result = withMockedRandom(0, () =>
      generateAlgorithmicSheetMusic(5, "C Major", customSettings)
    );

    const bassVoice = getVoiceBody(result.abcNotation, "bass");

    assert.ok(result.description.includes("Independent Motion"));
    assert.ok(bassVoice.includes("["));
    assert.ok(!bassVoice.includes("z"));
  });
});
