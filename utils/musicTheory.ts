
import { GenerationSettings, DifficultyLevel } from "../types";

/**
 * MUSIC THEORY ENGINE & RULES
 */

// --- STAGE 1: REPRESENTATION (Data Structures) ---

export type NoteType = 'note' | 'rest';

export interface NoteToken {
  type: NoteType;
  pitch: number | number[];      // MIDI number (60 = Middle C) or Array for chords
  duration: number;   // In beats (1 = quarter note)
  velocity?: number;  // 0-127
  dynamic?: string;   // 'pp', 'p', 'mp', 'mf', 'f', 'ff'
}

export interface Measure {
  tokens: NoteToken[];
  chordDegree: number; // The harmonic root of this measure (0-6)
  isStrong: boolean;   // Is this a structurally important measure?
}

export interface Part {
  name: string;
  clef: 'treble' | 'bass';
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

export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Scale steps in semitones
export const SCALES = {
  MAJOR: [0, 2, 4, 5, 7, 9, 11],
  MINOR_NATURAL: [0, 2, 3, 5, 7, 8, 10],
  MINOR_HARMONIC: [0, 2, 3, 5, 7, 8, 11],
};

// Chord Progressions (0-indexed degrees)
export const PROGRESSIONS = {
  BASIC: [0, 3, 4, 0], // I - IV - V - I
  POP: [0, 4, 5, 3],   // I - V - vi - IV
  CLASSICAL: [0, 3, 0, 4, 0], // I - IV - I - V - I
  MINOR_SAD: [0, 3, 4, 0], // i - iv - V - i
  CIRCLE: [0, 3, 6, 2, 5, 1, 4, 0], // Circle of 5ths segment
  ASCENDING: [0, 1, 2, 3, 4, 4, 0], // Stepwise bass
  PACHELBEL: [0, 4, 5, 2, 3, 0, 3, 4], // Canon-esque
};

// Rhythmic Templates (Duration in beats)
// Organized by Time Signature -> Level (1-10) -> { common: [], rare: [] }
export const RHYTHM_PATTERNS: Record<string, Record<number, { common: number[][], rare: number[][] }>> = {
  '4/4': {
    1: { // Whole notes, Half notes
      common: [[4], [2, 2]],
      rare: [[2, 1, 1], [1, 1, 2]]
    },
    2: { // Quarter notes introduced
      common: [[1, 1, 1, 1], [1, 1, 2]],
      rare: [[2, 1, 1], [2, 2], [4]]
    },
    3: { // Dotted half
      common: [[3, 1], [1, 3]],
      rare: [[1, 1, 1, 1], [2, 1, 1]]
    },
    4: { // Eighth notes (pairs)
      common: [[1, 1, 1, 1], [2, 1, 1]],
      rare: [[1, 1, 0.5, 0.5, 1], [0.5, 0.5, 1, 2]]
    },
    5: { // Dotted quarter + eighth
      common: [[1.5, 0.5, 2], [2, 1.5, 0.5]],
      rare: [[1.5, 0.5, 1, 1], [1, 1, 1.5, 0.5]]
    },
    6: { // Syncopation basics
      common: [[0.5, 1, 0.5, 2], [1, 1.5, 0.5, 1]],
      rare: [[0.5, 1, 1, 1, 0.5], [1.5, 1.5, 1]]
    },
    7: { // More eighths
      common: [[0.5, 0.5, 0.5, 0.5, 1, 1], [1, 0.5, 0.5, 0.5, 0.5, 1]],
      rare: [[0.5, 0.5, 1, 0.5, 0.5, 1], [0.75, 0.25, 1, 2]]
    },
    8: { // Sixteenths introduced (simple)
      common: [[1, 1, 0.25, 0.25, 0.25, 0.25, 1], [0.25, 0.25, 0.25, 0.25, 1, 2]],
      rare: [[0.75, 0.25, 1, 1, 1], [1, 0.75, 0.25, 2]]
    },
    9: { // Complex syncopation & 16ths
      common: [[0.75, 0.25, 0.5, 0.5, 1, 1], [0.5, 1, 0.5, 0.25, 0.25, 0.25, 0.25, 0.5, 0.5]],
      rare: [[0.25, 0.5, 0.25, 1, 1, 1], [1.5, 0.25, 0.25, 2]]
    },
    10: { // Very complex
      common: [[0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 1, 1], [0.75, 0.25, 0.75, 0.25, 0.75, 0.25, 1]],
      rare: [[0.25, 0.75, 0.25, 0.75, 1, 1], [0.5, 0.25, 0.25, 0.5, 0.25, 0.25, 1, 1]]
    }
  },
  '3/4': {
    1: { common: [[3], [2, 1]], rare: [[1, 2], [1, 1, 1]] },
    2: { common: [[1, 1, 1], [2, 1]], rare: [[1, 2], [1, 1, 1]] },
    3: { common: [[1.5, 0.5, 1], [1, 1.5, 0.5]], rare: [[0.5, 0.5, 1, 1]] },
    4: { common: [[1, 0.5, 0.5, 1], [0.5, 0.5, 1, 1]], rare: [[1.5, 0.5, 1]] },
    5: { common: [[1.5, 0.5, 1], [0.5, 1, 0.5, 1]], rare: [[1, 0.5, 0.5, 0.5, 0.5]] },
    6: { common: [[0.5, 0.5, 0.5, 0.5, 1], [1.5, 1.5]], rare: [[0.5, 1, 1.5]] },
    7: { common: [[0.75, 0.25, 1, 1], [1, 0.75, 0.25, 1]], rare: [[0.25, 0.25, 0.25, 0.25, 1, 1]] },
    8: { common: [[0.25, 0.25, 0.25, 0.25, 1, 1], [0.5, 0.5, 0.25, 0.25, 0.25, 0.25, 1]], rare: [[0.75, 0.25, 0.75, 0.25, 1]] },
    9: { common: [[0.25, 0.5, 0.25, 1, 1], [1, 0.25, 0.5, 0.25, 1]], rare: [[0.5, 0.25, 0.25, 0.5, 0.25, 0.25, 1]] },
    10: { common: [[0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 1], [0.75, 0.25, 0.75, 0.25, 0.75, 0.25]], rare: [[0.25, 0.75, 0.25, 0.75, 1]] }
  }
};

// --- STAGE 3 PARAMETERS: DIFFICULTY CONSTRAINTS ---

export interface InternalDifficultyProfile {
  rangeLH: [number, number];
  rangeRH: [number, number];
  maxLeapProb: number;      // Probability of allowing a leap > 3rd
  syncopationProb: number;  // Probability of off-beat rhythms
  accidentalsAllowed: boolean;
  chordComplexity: 'TRIAD' | 'SHELL' | 'FULL' | 'INVERSION';
  costs: {
    leapPenalty: number;    // Cost added per semitone of leap
    dissonancePenalty: number; // Cost for non-chord tones on strong beats
    directionChangeBonus: number; // Bonus for resolving a leap (Gap-Fill)
    repetitionPenalty: number; // Cost for repeating the same note
  }
}

// Base internal configs that don't change with user sliders
export const INTERNAL_PROFILES: Record<number, InternalDifficultyProfile> = {
  1: { // Level 1
    rangeLH: [43, 60], rangeRH: [59, 79],
    maxLeapProb: 0.1, syncopationProb: 0,
    accidentalsAllowed: false,
    chordComplexity: 'SHELL',
    costs: { leapPenalty: 30, dissonancePenalty: 100, directionChangeBonus: 5, repetitionPenalty: 16 }
  },
  2: { // Level 2
    rangeLH: [48, 60], rangeRH: [60, 76],
    maxLeapProb: 0.3, syncopationProb: 0,
    accidentalsAllowed: false,
    chordComplexity: 'SHELL',
    costs: { leapPenalty: 20, dissonancePenalty: 100, directionChangeBonus: 10, repetitionPenalty: 15 }
  },
  3: { // Level 3-4
    rangeLH: [41, 62], rangeRH: [60, 77],
    maxLeapProb: 0.2, syncopationProb: 0.05,
    accidentalsAllowed: true,
    chordComplexity: 'TRIAD',
    costs: { leapPenalty: 20, dissonancePenalty: 60, directionChangeBonus: 20, repetitionPenalty: 10 }
  },
  5: { // Level 5-7
    rangeLH: [36, 64], rangeRH: [60, 81], // RH min set to 60 (Middle C) to avoid crossing bass
    maxLeapProb: 0.5, syncopationProb: 0.3,
    accidentalsAllowed: true,
    chordComplexity: 'FULL',
    costs: { leapPenalty: 10, dissonancePenalty: 40, directionChangeBonus: 40, repetitionPenalty: 20 }
  },
  8: { // Level 8-10
    rangeLH: [36, 67], rangeRH: [55, 88], // RH min set to 60
    maxLeapProb: 0.8, syncopationProb: 0.6,
    accidentalsAllowed: true,
    chordComplexity: 'INVERSION',
    costs: { leapPenalty: 5, dissonancePenalty: 20, directionChangeBonus: 50, repetitionPenalty: 30 }
  }
};

// Helper to map the Slider Level to the granular Settings
export const getSettingsForLevel = (level: DifficultyLevel): GenerationSettings => {
  // Level 1: Hands Separate (Alternating), Simple Rhythm, 5-finger
  if (level === 1) return {
    maxInterval: 2,
    rhythmComplexity: 1,
    rhythmVariance: 0.8,
    handCoordination: 'SEPARATE',
    accompanimentStyle: ['NONE'],
    playability: '5-FINGER'
  };

  // Level 2: Add Parallel Motion (Hands locked), Simple Rhythm
  if (level === 2) return {
    maxInterval: 3,
    rhythmComplexity: 2,
    rhythmVariance: 0.3,
    handCoordination: 'RANDOM',
    accompanimentStyle: ['NONE'],
    playability: '5-FINGER'
  };

  // Level 3: First Hands Together (Independent), Simple Block Chords
  if (level === 3) return {
    maxInterval: 4,
    rhythmComplexity: 3,
    rhythmVariance: 0.4,
    handCoordination: 'RANDOM',
    accompanimentStyle: ['BLOCK', 'BROKEN'],
    playability: 'OCTAVE'
  };

  if (level === 4) return {
    maxInterval: 4,
    rhythmComplexity: 3,
    rhythmVariance: 0.3,
    handCoordination: 'INDEPENDENT',
    accompanimentStyle: ['BLOCK', 'BROKEN'],
    playability: '5-FINGER'
  };

  if (level === 5) return {
    maxInterval: 5,
    rhythmComplexity: 4,
    rhythmVariance: 0.4,
    handCoordination: 'INDEPENDENT',
    accompanimentStyle: ['BROKEN'], // Simple broken chords
    playability: 'OCTAVE'
  };

  // Level 5: More variation
  if (level === 6) return {
    maxInterval: 6,
    rhythmComplexity: 5,
    rhythmVariance: 0.5,
    handCoordination: 'INDEPENDENT',
    accompanimentStyle: ['WALTZ'],
    playability: 'OCTAVE'
  };

  // Level 6-7
  if (level <= 7) return {
    maxInterval: 8,
    rhythmComplexity: level as DifficultyLevel,
    rhythmVariance: 0.6,
    handCoordination: 'INDEPENDENT',
    accompanimentStyle: ['ALBERTI'],
    playability: 'OCTAVE'
  };

  // Level 8+
  return {
    maxInterval: 12,
    rhythmComplexity: level as DifficultyLevel,
    rhythmVariance: 0.7,
    handCoordination: 'INDEPENDENT',
    accompanimentStyle: ['STRIDE'],
    playability: 'LARGE'
  };
};

export const KEY_MAP: Record<string, { root: number, type: 'MAJOR' | 'MINOR', flats?: number, sharps?: number }> = {
  'C Major': { root: 60, type: 'MAJOR', sharps: 0 },
  'G Major': { root: 67, type: 'MAJOR', sharps: 1 },
  'D Major': { root: 62, type: 'MAJOR', sharps: 2 },
  'A Major': { root: 69, type: 'MAJOR', sharps: 3 },
  'F Major': { root: 65, type: 'MAJOR', flats: 1 },
  'Bb Major': { root: 70, type: 'MAJOR', flats: 2 },
  'Eb Major': { root: 63, type: 'MAJOR', flats: 3 },

  'A Minor': { root: 57, type: 'MINOR', sharps: 0 },
  'E Minor': { root: 64, type: 'MINOR', sharps: 1 },
  'B Minor': { root: 71, type: 'MINOR', sharps: 2 },
  'F# Minor': { root: 66, type: 'MINOR', sharps: 3 },
  'D Minor': { root: 62, type: 'MINOR', flats: 1 },
  'G Minor': { root: 67, type: 'MINOR', flats: 2 },
  'C Minor': { root: 60, type: 'MINOR', flats: 3 },
};
