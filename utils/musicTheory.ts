import type {
  ConcreteMusicalKey,
  DifficultyLevel,
  GenerationSettings,
} from "../types.ts";

/**
 * MUSIC THEORY ENGINE & RULES
 */

// --- STAGE 1: REPRESENTATION (Data Structures) ---

export type NoteType = "note" | "rest";

export interface NoteToken {
  type: NoteType;
  pitch: number | number[]; // MIDI number (60 = Middle C) or Array for chords
  duration: number; // In beats (1 = quarter note)
  velocity?: number; // 0-127
  dynamic?: string; // 'pp', 'p', 'mp', 'mf', 'f', 'ff'
  beamBreakAfter?: boolean;
}

export interface Measure {
  tokens: NoteToken[];
  chordDegree: number; // The harmonic root of this measure (0-6)
  isStrong: boolean; // Is this a structurally important measure?
}

interface Part {
  name: string;
  clef: "treble" | "bass";
  measures: Measure[];
}

export interface ScoreStructure {
  title: string;
  key: string;
  timeSignature: string;
  tempo: number;
  parts: Part[];
}

// --- CONSTANTS & THEORY ---

export const NOTES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

// Scale steps in semitones
export const SCALES = {
  MAJOR: [0, 2, 4, 5, 7, 9, 11],
  MINOR_NATURAL: [0, 2, 3, 5, 7, 8, 10],
  MINOR_HARMONIC: [0, 2, 3, 5, 7, 8, 11],
};

export type KeySonority = "MAJOR" | "MINOR";
export type ProgressionSonority = KeySonority | "BOTH";
export type CadenceFamily = "AUTHENTIC" | "PLAGAL" | "HALF" | "DECEPTIVE";

export interface ProgressionTemplate {
  id: string;
  degrees: number[];
  sonority: ProgressionSonority;
  complexity: DifficultyLevel;
  cadenceFamilies: CadenceFamily[];
}

export interface CadenceTemplate {
  id: string;
  degrees: number[];
  sonority: ProgressionSonority;
  family: CadenceFamily;
  minDifficulty: DifficultyLevel;
  maxDifficulty?: DifficultyLevel;
  weight: number;
}

// Chord Progressions (0-indexed degrees)
export const PROGRESSION_TEMPLATES: readonly ProgressionTemplate[] = [
  {
    id: "BASIC",
    degrees: [0, 3, 4, 0],
    sonority: "BOTH",
    complexity: 1,
    cadenceFamilies: ["AUTHENTIC", "PLAGAL", "HALF"],
  },
  {
    id: "CLASSICAL",
    degrees: [0, 3, 0, 4, 0],
    sonority: "BOTH",
    complexity: 2,
    cadenceFamilies: ["AUTHENTIC", "PLAGAL", "HALF"],
  },
  {
    id: "SUBDOM_PREP",
    degrees: [0, 3, 1, 4],
    sonority: "MAJOR",
    complexity: 2,
    cadenceFamilies: ["AUTHENTIC", "PLAGAL", "HALF"],
  },
  {
    id: "NEIGHBOR_BASS",
    degrees: [0, 1, 3, 4],
    sonority: "BOTH",
    complexity: 2,
    cadenceFamilies: ["AUTHENTIC", "PLAGAL", "HALF"],
  },
  {
    id: "POP",
    degrees: [0, 4, 5, 3],
    sonority: "MAJOR",
    complexity: 3,
    cadenceFamilies: ["AUTHENTIC", "HALF", "DECEPTIVE"],
  },
  {
    id: "TURNAROUND",
    degrees: [0, 5, 1, 4],
    sonority: "MAJOR",
    complexity: 3,
    cadenceFamilies: ["AUTHENTIC", "HALF", "DECEPTIVE"],
  },
  {
    id: "MINOR_SAD",
    degrees: [0, 5, 3, 4],
    sonority: "MINOR",
    complexity: 2,
    cadenceFamilies: ["AUTHENTIC", "PLAGAL", "HALF"],
  },
  {
    id: "MINOR_PLAGAL",
    degrees: [0, 3, 0, 4],
    sonority: "MINOR",
    complexity: 2,
    cadenceFamilies: ["AUTHENTIC", "PLAGAL", "HALF"],
  },
  {
    id: "MINOR_TURNAROUND",
    degrees: [0, 5, 2, 4],
    sonority: "MINOR",
    complexity: 3,
    cadenceFamilies: ["AUTHENTIC", "HALF", "DECEPTIVE"],
  },
  {
    id: "PACHELBEL",
    degrees: [0, 4, 5, 2, 3, 0, 3, 4],
    sonority: "MAJOR",
    complexity: 4,
    cadenceFamilies: ["AUTHENTIC", "HALF"],
  },
  {
    id: "ASCENDING",
    degrees: [0, 1, 2, 3, 4, 4, 0],
    sonority: "BOTH",
    complexity: 4,
    cadenceFamilies: ["AUTHENTIC", "HALF"],
  },
  {
    id: "ANDALUSIAN",
    degrees: [0, 6, 5, 4],
    sonority: "MINOR",
    complexity: 4,
    cadenceFamilies: ["AUTHENTIC", "HALF"],
  },
  {
    id: "CIRCLE",
    degrees: [0, 3, 6, 2, 5, 1, 4, 0],
    sonority: "BOTH",
    complexity: 5,
    cadenceFamilies: ["AUTHENTIC", "HALF"],
  },
];

export const PROGRESSIONS = Object.fromEntries(
  PROGRESSION_TEMPLATES.map((template) => [template.id, template.degrees]),
) as Record<string, number[]>;

export const CADENCE_TEMPLATES: readonly CadenceTemplate[] = [
  {
    id: "AUTHENTIC",
    degrees: [4, 0],
    sonority: "BOTH",
    family: "AUTHENTIC",
    minDifficulty: 1,
    weight: 10,
  },
  {
    id: "PLAGAL",
    degrees: [3, 0],
    sonority: "BOTH",
    family: "PLAGAL",
    minDifficulty: 1,
    weight: 4,
  },
  {
    id: "HALF_OPEN",
    degrees: [0, 4],
    sonority: "BOTH",
    family: "HALF",
    minDifficulty: 2,
    weight: 3,
  },
  {
    id: "HALF_PREDOM",
    degrees: [1, 4],
    sonority: "MAJOR",
    family: "HALF",
    minDifficulty: 4,
    weight: 2,
  },
  {
    id: "HALF_MINOR_PREDOM",
    degrees: [3, 4],
    sonority: "MINOR",
    family: "HALF",
    minDifficulty: 2,
    weight: 4,
  },
  {
    id: "DECEPTIVE",
    degrees: [4, 5],
    sonority: "BOTH",
    family: "DECEPTIVE",
    minDifficulty: 5,
    weight: 2,
  },
];

export const isCompatibleWithSonority = (
  sonority: ProgressionSonority,
  keyType: KeySonority,
): boolean => sonority === "BOTH" || sonority === keyType;

/**
 * Biases progression selection toward material near the requested difficulty.
 *
 * Simpler progressions stay available at higher levels so easier harmonic loops
 * can still appear, while denser progressions enter gradually rather than as a
 * hard on/off gate.
 */
export const getProgressionWeight = (
  progression: ProgressionTemplate,
  difficulty: DifficultyLevel,
): number => {
  const complexityGap = progression.complexity - difficulty;

  if (complexityGap <= -2) return 12;
  if (complexityGap === -1) return 10;
  if (complexityGap === 0) return 8;
  if (complexityGap === 1) return 4;
  if (complexityGap === 2) return 2;
  return 1;
};

/**
 * Returns the effective cadence weight for the requested difficulty.
 *
 * Cadences outside their supported difficulty window are excluded entirely.
 * Eligible cadences get a small boost as the player advances so late-game
 * cadence variety increases without discarding the base template weights.
 */
export const getCadenceWeight = (
  cadence: CadenceTemplate,
  difficulty: DifficultyLevel,
): number => {
  if (difficulty < cadence.minDifficulty) return 0;
  if (
    cadence.maxDifficulty !== undefined &&
    difficulty > cadence.maxDifficulty
  ) {
    return 0;
  }

  return cadence.weight + Math.min(3, difficulty - cadence.minDifficulty);
};

/**
 * Filters progression templates down to harmonically compatible, selectable
 * options for the active key type and difficulty.
 */
export const getEligibleProgressions = (
  keyType: KeySonority,
  difficulty: DifficultyLevel,
): ProgressionTemplate[] =>
  PROGRESSION_TEMPLATES.filter(
    (progression) =>
      isCompatibleWithSonority(progression.sonority, keyType) &&
      getProgressionWeight(progression, difficulty) > 0,
  );

/**
 * Filters cadence templates to the families supported by the chosen progression
 * and removes any cadence that is out of range for the current difficulty.
 */
export const getEligibleCadences = (
  keyType: KeySonority,
  difficulty: DifficultyLevel,
  cadenceFamilies: CadenceFamily[],
): CadenceTemplate[] =>
  CADENCE_TEMPLATES.filter(
    (cadence) =>
      cadenceFamilies.includes(cadence.family) &&
      isCompatibleWithSonority(cadence.sonority, keyType) &&
      getCadenceWeight(cadence, difficulty) > 0,
  );

/**
 * Builds a full progression that reserves the ending bars for a cadence.
 *
 * The repeating body is filled first, then the cadence replaces the final bars.
 * If the last body chord would duplicate the cadence entry chord, the function
 * tries to substitute the preceding progression step to avoid a static handoff.
 */
export const buildCadencedProgression = (
  progression: ProgressionTemplate,
  cadence: CadenceTemplate,
  measures: number,
): number[] => {
  const cadenceLength = Math.min(measures, cadence.degrees.length);
  const bodyLength = Math.max(0, measures - cadenceLength);
  const body: number[] = [];

  for (let i = 0; i < bodyLength; i++) {
    body.push(progression.degrees[i % progression.degrees.length]);
  }

  if (
    body.length > 1 &&
    cadence.degrees.length > 0 &&
    body[body.length - 1] === cadence.degrees[0]
  ) {
    const replacement =
      progression.degrees[
        (body.length - 2 + progression.degrees.length) %
          progression.degrees.length
      ];

    if (replacement !== cadence.degrees[0]) {
      body[body.length - 1] = replacement;
    }
  }

  return [...body, ...cadence.degrees.slice(-cadenceLength)];
};

// Rhythmic Templates (Duration in beats)
// Organized by Time Signature -> Level (1-10) -> { common: [], rare: [] }
export const RHYTHM_PATTERNS: Record<
  string,
  Record<number, { common: number[][]; rare: number[][] }>
> = {
  "4/4": {
    1: {
      // Whole notes, Half notes
      common: [[4], [2, 2]],
      rare: [
        [2, 1, 1],
        [1, 1, 2],
      ],
    },
    2: {
      // Quarter notes introduced
      common: [
        [1, 1, 1, 1],
        [1, 1, 2],
      ],
      rare: [[2, 1, 1], [2, 2], [4]],
    },
    3: {
      // Add dotted half notes and dotted quarter notes
      common: [
        [3, 1],
        [1, 1, 1, 1],
        [2, 1, 1],
      ],
      rare: [
        [1.5, 0.5, 2],
        [1, 1, 2],
        [1, 3],
        [1, 1.5, 0.5, 1],
      ],
    },
    4: {
      // Eighth notes (pairs)
      common: [
        [1, 1, 1, 1],
        [2, 1, 1],
      ],
      rare: [
        [1, 1, 0.5, 0.5, 1],
        [0.5, 0.5, 1, 2],
        [2, 1.5, 0.5],
      ],
    },
    5: {
      // Dotted quarter + eighth
      common: [
        [1.5, 0.5, 2],
        [2, 1.5, 0.5],
      ],
      rare: [
        [1.5, 0.5, 1, 1],
        [1, 1, 1.5, 0.5],
      ],
    },
    6: {
      // Syncopation basics
      common: [
        [0.5, 1, 0.5, 2],
        [1, 1.5, 0.5, 1],
      ],
      rare: [
        [0.5, 1, 1, 1, 0.5],
        [1.5, 1.5, 1],
      ],
    },
    7: {
      // More eighths
      common: [
        [0.5, 0.5, 0.5, 0.5, 1, 1],
        [1, 0.5, 0.5, 0.5, 0.5, 1],
      ],
      rare: [
        [0.5, 0.5, 1, 0.5, 0.5, 1],
        [0.75, 0.25, 1, 2],
      ],
    },
    8: {
      // Sixteenths introduced (simple)
      common: [
        [1, 1, 0.25, 0.25, 0.25, 0.25, 1],
        [0.25, 0.25, 0.25, 0.25, 1, 2],
      ],
      rare: [
        [0.75, 0.25, 1, 1, 1],
        [1, 0.75, 0.25, 2],
      ],
    },
    9: {
      // Complex syncopation & 16ths
      common: [
        [0.75, 0.25, 0.5, 0.5, 1, 1],
        [0.5, 1, 0.5, 0.25, 0.25, 0.25, 0.25, 0.5, 0.5],
      ],
      rare: [
        [0.25, 0.5, 0.25, 1, 1, 1],
        [1.5, 0.25, 0.25, 2],
      ],
    },
    10: {
      // Very complex
      common: [
        [0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 1, 1],
        [0.75, 0.25, 0.75, 0.25, 0.75, 0.25, 1],
      ],
      rare: [
        [0.25, 0.75, 0.25, 0.75, 1, 1],
        [0.5, 0.25, 0.25, 0.5, 0.25, 0.25, 1, 1],
      ],
    },
  },
  "3/4": {
    1: {
      common: [[3], [2, 1]],
      rare: [
        [1, 2],
        [1, 1, 1],
      ],
    },
    2: {
      common: [
        [1, 1, 1],
        [2, 1],
      ],
      rare: [
        [1, 2],
        [1, 1, 1],
      ],
    },
    3: {
      common: [
        [1.5, 0.5, 1],
        [1, 1.5, 0.5],
      ],
      rare: [[0.5, 0.5, 1, 1]],
    },
    4: {
      common: [
        [1, 0.5, 0.5, 1],
        [0.5, 0.5, 1, 1],
      ],
      rare: [[1.5, 0.5, 1]],
    },
    5: {
      common: [
        [1.5, 0.5, 1],
        [0.5, 1, 0.5, 1],
      ],
      rare: [[1, 0.5, 0.5, 0.5, 0.5]],
    },
    6: {
      common: [
        [0.5, 0.5, 0.5, 0.5, 1],
        [1.5, 1.5],
      ],
      rare: [[0.5, 1, 1.5]],
    },
    7: {
      common: [
        [0.75, 0.25, 1, 1],
        [1, 0.75, 0.25, 1],
      ],
      rare: [[0.25, 0.25, 0.25, 0.25, 1, 1]],
    },
    8: {
      common: [
        [0.25, 0.25, 0.25, 0.25, 1, 1],
        [0.5, 0.5, 0.25, 0.25, 0.25, 0.25, 1],
      ],
      rare: [[0.75, 0.25, 0.75, 0.25, 1]],
    },
    9: {
      common: [
        [0.25, 0.5, 0.25, 1, 1],
        [1, 0.25, 0.5, 0.25, 1],
      ],
      rare: [[0.5, 0.25, 0.25, 0.5, 0.25, 0.25, 1]],
    },
    10: {
      common: [
        [0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 1],
        [0.75, 0.25, 0.75, 0.25, 0.75, 0.25],
      ],
      rare: [[0.25, 0.75, 0.25, 0.75, 1]],
    },
  },
};

// --- STAGE 3 PARAMETERS: DIFFICULTY CONSTRAINTS ---

export interface InternalDifficultyProfile {
  rangeLH: [number, number];
  rangeRH: [number, number];
  maxLeapProb: number; // Probability of allowing a leap > 3rd
  syncopationProb: number; // Probability of off-beat rhythms
  accidentalsAllowed: boolean;
  chordComplexity: "TRIAD" | "SHELL" | "FULL" | "INVERSION";
  costs: {
    leapPenalty: number; // Flat cost applied when a melodic move exceeds a fourth
    dissonancePenalty: number; // Cost for non-chord tones on strong beats
    directionChangeBonus: number; // Bonus for resolving a leap by changing direction
    repetitionPenalty: number; // Cost for repeating the same note
  };
}

// Base internal configs that don't change with user sliders
export const INTERNAL_PROFILES: Record<number, InternalDifficultyProfile> = {
  1: {
    // Level 1
    rangeLH: [43, 60],
    rangeRH: [59, 79],
    maxLeapProb: 0.1,
    syncopationProb: 0,
    accidentalsAllowed: false,
    chordComplexity: "SHELL",
    costs: {
      leapPenalty: 30,
      dissonancePenalty: 100,
      directionChangeBonus: 5,
      repetitionPenalty: 16,
    },
  },
  2: {
    // Level 2
    rangeLH: [48, 60],
    rangeRH: [60, 76],
    maxLeapProb: 0.3,
    syncopationProb: 0,
    accidentalsAllowed: false,
    chordComplexity: "SHELL",
    costs: {
      leapPenalty: 20,
      dissonancePenalty: 100,
      directionChangeBonus: 10,
      repetitionPenalty: 15,
    },
  },
  3: {
    // Level 3
    rangeLH: [41, 62],
    rangeRH: [60, 77],
    maxLeapProb: 0.5,
    syncopationProb: 0.05,
    accidentalsAllowed: true,
    chordComplexity: "SHELL",
    costs: {
      leapPenalty: 5,
      dissonancePenalty: 60,
      directionChangeBonus: 30,
      repetitionPenalty: 25,
    },
  },
  4: {
    // Level 4 uses reduced complexity so hands together transition is easier
    rangeLH: [41, 62],
    rangeRH: [60, 77],
    maxLeapProb: 0.2,
    syncopationProb: 0.05,
    accidentalsAllowed: true,
    chordComplexity: "SHELL",
    costs: {
      leapPenalty: 15,
      dissonancePenalty: 60,
      directionChangeBonus: 10,
      repetitionPenalty: 15,
    },
  },
  5: {
    // Level 5 - More variation, less constraints
    rangeLH: [40, 64],
    rangeRH: [60, 81], // RH min set to 60 (Middle C) to avoid crossing bass
    maxLeapProb: 0.5,
    syncopationProb: 0.3,
    accidentalsAllowed: true,
    chordComplexity: "FULL",
    costs: {
      leapPenalty: 20,
      dissonancePenalty: 40,
      directionChangeBonus: 40,
      repetitionPenalty: 20,
    },
  },
  8: {
    // Level 8-10
    rangeLH: [36, 67],
    rangeRH: [55, 88], // RH min set to 60
    maxLeapProb: 0.8,
    syncopationProb: 0.6,
    accidentalsAllowed: true,
    chordComplexity: "INVERSION",
    costs: {
      leapPenalty: 5,
      dissonancePenalty: 20,
      directionChangeBonus: 50,
      repetitionPenalty: 30,
    },
  },
};

/**
 * Expands the public difficulty slider into concrete generation defaults.
 *
 * The mapping intentionally grows in broad pedagogical phases rather than by
 * changing every parameter on every level. Adjacent levels often share the same
 * coordination model while rhythm, reach, and accompaniment vocabulary advance.
 */
export const getSettingsForLevel = (
  level: DifficultyLevel,
): GenerationSettings => {
  // Level 1: Hands Separate (Alternating), Simple Rhythm, 5-finger
  if (level === 1)
    return {
      maxInterval: 2,
      rhythmComplexity: 1,
      rhythmVariance: 0.8,
      handCoordination: "SEPARATE",
      accompanimentStyle: ["NONE"],
      playability: "5-FINGER",
    };

  // Level 2: Add Parallel Motion (Hands locked), Simple Rhythm
  if (level === 2)
    return {
      maxInterval: 3,
      rhythmComplexity: 2,
      rhythmVariance: 0.3,
      handCoordination: "RANDOM",
      accompanimentStyle: ["NONE"],
      playability: "5-FINGER",
    };

  // Level 3: add more complexity
  if (level === 3)
    return {
      maxInterval: 6,
      rhythmComplexity: 3,
      rhythmVariance: 0.6,
      handCoordination: "RANDOM",
      accompanimentStyle: ["NONE"],
      playability: "OCTAVE",
    };

  // Level 4: First Hands Together (Independent), Simple Block Chords
  if (level === 4)
    return {
      maxInterval: 4,
      rhythmComplexity: 2,
      rhythmVariance: 0.3,
      handCoordination: "INDEPENDENT",
      accompanimentStyle: ["BLOCK", "BROKEN"],
      playability: "5-FINGER",
    };

  // Level 5: More variation and complexity
  if (level === 5)
    return {
      maxInterval: 5,
      rhythmComplexity: 3,
      rhythmVariance: 0.4,
      handCoordination: "INDEPENDENT",
      accompanimentStyle: ["MIXED", "BLOCK", "ALBERTI"],
      playability: "OCTAVE",
    };

  // Level 6: More variation
  if (level === 6)
    return {
      maxInterval: 6,
      rhythmComplexity: 5,
      rhythmVariance: 0.5,
      handCoordination: "INDEPENDENT",
      accompanimentStyle: ["WALTZ"],
      playability: "OCTAVE",
    };

  // Level 7
  if (level <= 7)
    return {
      maxInterval: 8,
      rhythmComplexity: level as DifficultyLevel,
      rhythmVariance: 0.6,
      handCoordination: "INDEPENDENT",
      accompanimentStyle: ["ALBERTI"],
      playability: "OCTAVE",
    };

  // Level 8+
  return {
    maxInterval: 12,
    rhythmComplexity: level as DifficultyLevel,
    rhythmVariance: 0.7,
    handCoordination: "INDEPENDENT",
    accompanimentStyle: ["STRIDE"],
    playability: "LARGE",
  };
};

export const KEY_GROUPS: { label: string; keys: ConcreteMusicalKey[] }[] = [
  {
    label: "Major Keys",
    keys: [
      "C Major",
      "G Major",
      "D Major",
      "A Major",
      "E Major",
      "B Major",
      "F# Major",
      "C# Major",
      "F Major",
      "Bb Major",
      "Eb Major",
      "Ab Major",
      "Db Major",
      "Gb Major",
      "Cb Major",
    ],
  },
  {
    label: "Minor Keys",
    keys: [
      "A Minor",
      "E Minor",
      "B Minor",
      "F# Minor",
      "D Minor",
      "G Minor",
      "C Minor",
    ],
  },
];

export const ALL_CONCRETE_KEYS: ConcreteMusicalKey[] = KEY_GROUPS.flatMap(
  (group) => group.keys,
);

const LEVEL_DEFAULT_KEY_POOLS: Record<DifficultyLevel, ConcreteMusicalKey[]> = {
  1: ["C Major", "G Major", "F Major"],
  2: ["C Major", "G Major", "F Major", "A Minor", "E Minor"],
  3: [
    "C Major",
    "G Major",
    "F Major",
    "A Minor",
    "E Minor",
    "D Major",
    "Bb Major",
  ],
  4: [
    "C Major",
    "G Major",
    "F Major",
    "A Minor",
    "E Minor",
    "D Major",
    "Bb Major",
    "D Minor",
    "A Major",
  ],
  5: [
    "C Major",
    "G Major",
    "F Major",
    "A Minor",
    "E Minor",
    "D Major",
    "Bb Major",
    "D Minor",
    "A Major",
    "E Major",
    "B Minor",
    "G Minor",
  ],
  6: [
    "C Major",
    "G Major",
    "F Major",
    "A Minor",
    "E Minor",
    "D Major",
    "Bb Major",
    "D Minor",
    "A Major",
    "E Major",
    "B Minor",
    "G Minor",
    "B Major",
    "F# Minor",
  ],
  7: [
    "C Major",
    "G Major",
    "F Major",
    "A Minor",
    "E Minor",
    "D Major",
    "Bb Major",
    "D Minor",
    "A Major",
    "E Major",
    "B Minor",
    "G Minor",
    "B Major",
    "F# Minor",
    "Eb Major",
    "Ab Major",
    "C Minor",
  ],
  8: [
    "C Major",
    "G Major",
    "F Major",
    "A Minor",
    "E Minor",
    "D Major",
    "Bb Major",
    "D Minor",
    "A Major",
    "E Major",
    "B Minor",
    "G Minor",
    "B Major",
    "F# Minor",
    "Eb Major",
    "Ab Major",
    "C Minor",
    "F# Major",
    "Db Major",
  ],
  9: [
    "C Major",
    "G Major",
    "F Major",
    "A Minor",
    "E Minor",
    "D Major",
    "Bb Major",
    "D Minor",
    "A Major",
    "E Major",
    "B Minor",
    "G Minor",
    "B Major",
    "F# Minor",
    "Eb Major",
    "Ab Major",
    "C Minor",
    "F# Major",
    "Db Major",
    "Gb Major",
    "Cb Major",
  ],
  10: ALL_CONCRETE_KEYS,
};

export const getDefaultKeyPoolForLevel = (
  level: DifficultyLevel,
): ConcreteMusicalKey[] => [...LEVEL_DEFAULT_KEY_POOLS[level]];

export const KEY_MAP: Record<
  string,
  { root: number; type: "MAJOR" | "MINOR"; flats?: number; sharps?: number }
> = {
  "C Major": { root: 60, type: "MAJOR", sharps: 0 },
  "G Major": { root: 67, type: "MAJOR", sharps: 1 },
  "D Major": { root: 62, type: "MAJOR", sharps: 2 },
  "A Major": { root: 69, type: "MAJOR", sharps: 3 },
  "E Major": { root: 64, type: "MAJOR", sharps: 4 },
  "B Major": { root: 71, type: "MAJOR", sharps: 5 },
  "F# Major": { root: 66, type: "MAJOR", sharps: 6 },
  "C# Major": { root: 61, type: "MAJOR", sharps: 7 },
  "F Major": { root: 65, type: "MAJOR", flats: 1 },
  "Bb Major": { root: 70, type: "MAJOR", flats: 2 },
  "Eb Major": { root: 63, type: "MAJOR", flats: 3 },
  "Ab Major": { root: 68, type: "MAJOR", flats: 4 },
  "Db Major": { root: 61, type: "MAJOR", flats: 5 },
  "Gb Major": { root: 66, type: "MAJOR", flats: 6 },
  "Cb Major": { root: 59, type: "MAJOR", flats: 7 },

  "A Minor": { root: 57, type: "MINOR", sharps: 0 },
  "E Minor": { root: 64, type: "MINOR", sharps: 1 },
  "B Minor": { root: 71, type: "MINOR", sharps: 2 },
  "F# Minor": { root: 66, type: "MINOR", sharps: 3 },
  "D Minor": { root: 62, type: "MINOR", flats: 1 },
  "G Minor": { root: 67, type: "MINOR", flats: 2 },
  "C Minor": { root: 60, type: "MINOR", flats: 3 },
};
