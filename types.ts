export type DifficultyLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type MusicalKey =
  | "Random"
  | "C Major"
  | "G Major"
  | "D Major"
  | "A Major"
  | "E Major"
  | "B Major"
  | "F# Major"
  | "C# Major"
  | "F Major"
  | "Bb Major"
  | "Eb Major"
  | "Ab Major"
  | "Db Major"
  | "Gb Major"
  | "Cb Major"
  | "A Minor"
  | "E Minor"
  | "B Minor"
  | "F# Minor"
  | "D Minor"
  | "G Minor"
  | "C Minor";

export type GenerationMode = "AI" | "Algorithm";

export interface GenerationSettings {
  maxInterval: number;
  rhythmComplexity: DifficultyLevel;
  rhythmVariance: number; // 0 to 1, probability of selecting 'rare' patterns
  handCoordination: "SEPARATE" | "PARALLEL" | "INDEPENDENT" | "RANDOM";
  accompanimentStyle: (
    | "BLOCK"
    | "BROKEN"
    | "ALBERTI"
    | "WALTZ"
    | "STRIDE"
    | "MIXED"
    | "NONE"
  )[];
  playability: "5-FINGER" | "OCTAVE" | "LARGE";
}

export interface SightReadingExercise {
  title: string;
  difficulty: DifficultyLevel;
  key: string;
  timeSignature: string;
  description: string;
  abcNotation: string; // The raw ABC string to be rendered
}

export type LoadingState = "idle" | "generating" | "error";

export interface AbcjsVisualObject {
  readonly __brand?: "AbcjsVisualObject";
}

export interface AbcjsSynthController {
  load(
    container: HTMLElement,
    cursorControl: unknown,
    options: {
      displayLoop: boolean;
      displayRestart: boolean;
      displayPlay: boolean;
      displayProgress: boolean;
      displayWarp: boolean;
    },
  ): void;
  setTune(
    visualObject: AbcjsVisualObject,
    userAction: boolean,
    options: {
      chordsOff: boolean;
      midiVol: number;
    },
  ): Promise<void>;
  disable(reset?: boolean): void;
}

export interface AbcjsCreateSynth {
  init(options: { visualObj: AbcjsVisualObject }): Promise<void>;
  stop(): void;
}

export interface AbcjsApi {
  renderAbc(
    container: HTMLElement,
    abcNotation: string,
    options: {
      responsive: "resize";
      scale: number;
      add_classes: boolean;
      staffwidth: number;
      paddingbottom: number;
      paddingtop: number;
      paddingright: number;
      paddingleft: number;
    },
  ): AbcjsVisualObject[];
  synth?: {
    supportsAudio(): boolean;
    SynthController: new () => AbcjsSynthController;
    CreateSynth: new () => AbcjsCreateSynth;
  };
}

// Declare the global ABCJS object loaded via CDN
declare global {
  interface Window {
    ABCJS?: AbcjsApi;
  }
}
