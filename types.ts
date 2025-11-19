
export type DifficultyLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type MusicalKey = 'Random' | 'C Major' | 'A Minor' | 'G Major' | 'E Minor' | 'F Major' | 'D Minor' | 'D Major' | 'B Minor' | 'Bb Major' | 'G Minor' | 'A Major' | 'F# Minor' | 'Eb Major' | 'C Minor';

export type GenerationMode = 'AI' | 'Algorithm';

export interface GenerationSettings {
  maxInterval: number;
  rhythmComplexity: DifficultyLevel;
  rhythmVariance: number; // 0 to 1, probability of selecting 'rare' patterns
  handCoordination: 'SEPARATE' | 'PARALLEL' | 'INDEPENDENT' | 'RANDOM';
  accompanimentStyle: ('BLOCK' | 'BROKEN' | 'ALBERTI' | 'WALTZ' | 'STRIDE' | 'MIXED' | 'NONE')[];
  playability: '5-FINGER' | 'OCTAVE' | 'LARGE';
}

export interface SightReadingExercise {
  title: string;
  difficulty: DifficultyLevel;
  key: string;
  timeSignature: string;
  description: string;
  abcNotation: string; // The raw ABC string to be rendered
}

export type LoadingState = 'idle' | 'generating' | 'error';

// Declare the global ABCJS object loaded via CDN
declare global {
  interface Window {
    ABCJS: any;
  }
}
