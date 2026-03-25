import type {
  SightReadingExercise,
  DifficultyLevel,
  MusicalKey,
  GenerationSettings,
} from "../types.ts";
import {
  buildCadencedProgression,
  getCadenceWeight,
  getEligibleCadences,
  getEligibleProgressions,
  INTERNAL_PROFILES,
  getProgressionWeight,
  getSettingsForLevel,
  KEY_MAP,
  NOTES,
  SCALES,
  RHYTHM_PATTERNS,
} from "../utils/musicTheory.ts";
import { getRandomElement, getWeightedRandomElement } from "../utils/random.ts";
import type {
  CadenceTemplate,
  ProgressionTemplate,
  ScoreStructure,
  Measure,
  NoteToken,
  InternalDifficultyProfile,
} from "../utils/musicTheory.ts";

/**
 * Generates sight-reading exercises entirely from local rules and music-theory
 * primitives. The pipeline is intentionally staged so each part of the score
 * can be reasoned about independently:
 *
 * 1. Resolve user-facing settings and normalize difficulty-specific behavior.
 * 2. Build a harmonic skeleton for the full exercise.
 * 3. Generate rhythmic motifs and a melodic source line.
 * 4. Derive the right-hand and left-hand parts from the source material.
 * 5. Apply expressive markings such as dynamics.
 * 6. Engrave the internal score representation into ABC notation.
 *
 * The result is deterministic only at the structural level; musical variety
 * comes from controlled randomness within the chosen difficulty profile.
 */

/**
 * Maps the public difficulty level to a smaller set of internal composition
 * profiles. Several adjacent levels intentionally share the same profile so
 * the musical vocabulary grows in broader tiers rather than one level at a time.
 */
const getInternalProfile = (
  level: DifficultyLevel,
): InternalDifficultyProfile => {
  if (level === 1) return INTERNAL_PROFILES[1];
  if (level === 2) return INTERNAL_PROFILES[2];
  if (level <= 4) return INTERNAL_PROFILES[3];
  if (level <= 7) return INTERNAL_PROFILES[5];
  return INTERNAL_PROFILES[8];
};

/** Resolves the randomized coordination option into a concrete composition mode. */
const resolveHandCoordination = (
  coordination: GenerationSettings["handCoordination"],
): Exclude<GenerationSettings["handCoordination"], "RANDOM"> => {
  if (coordination === "RANDOM") {
    return Math.random() < 0.5 ? "SEPARATE" : "PARALLEL";
  }

  return coordination;
};

/** Restricts early difficulties to a small set of pedagogically safe random keys. */
const resolveSelectedKey = (
  difficulty: DifficultyLevel,
  selectedKey: MusicalKey,
): MusicalKey => {
  if (selectedKey !== "Random") {
    return selectedKey;
  }

  const validKeys =
    difficulty <= 2
      ? ["C Major", "G Major", "F Major", "A Minor"]
      : Object.keys(KEY_MAP);

  return getRandomElement(validKeys) as MusicalKey;
};

/**
 * Plans which hand carries the melody in each measure.
 *
 * Separate mode alternates short phrases between hands, while all other modes
 * keep the melodic source anchored in the right hand so the accompaniment layer
 * can derive the left-hand material independently.
 */
const planHandAssignments = (
  numMeasures: number,
  coordination: Exclude<GenerationSettings["handCoordination"], "RANDOM">,
): ("RH" | "LH")[] => {
  if (coordination !== "SEPARATE") {
    return Array.from({ length: numMeasures }, () => "RH");
  }

  const assignments: ("RH" | "LH")[] = [];
  let currentHand: "RH" | "LH" = "RH";
  let barsRemainingInPhrase = 0;

  for (let index = 0; index < numMeasures; index++) {
    if (barsRemainingInPhrase === 0) {
      if (index > 0) {
        currentHand = currentHand === "RH" ? "LH" : "RH";
      }

      barsRemainingInPhrase = Math.random() > 0.5 ? 4 : 2;
    }

    assignments.push(currentHand);
    barsRemainingInPhrase--;
  }

  return assignments;
};

/** Formats the resolved hand-coordination mode for the exercise summary. */
const formatCoordinationLabel = (
  coordination: Exclude<GenerationSettings["handCoordination"], "RANDOM">,
): string => `${coordination.charAt(0)}${coordination.slice(1).toLowerCase()}`;

/** Builds the short user-facing description shown alongside the rendered score. */
const buildExerciseDescription = (
  coordination: Exclude<GenerationSettings["handCoordination"], "RANDOM">,
  rhythmComplexity: DifficultyLevel,
): string =>
  `${formatCoordinationLabel(
    coordination,
  )} Motion - Level ${rhythmComplexity} Rhythm`;

// --- STAGE 2: GENERATORS ---
/**
 * Produces measure-level rhythm patterns from the pre-defined rhythm library.
 *
 * The generator balances repetition and novelty by creating two anchor motifs,
 * then reusing or replacing them according to the requested variance. The last
 * measure is forced to a long value to create a stable cadence.
 */
class RhythmGenerator {
  /**
   * Builds one rhythm pattern per measure.
   *
   * @param measures Number of measures to generate.
   * @param timeSig Meter used to choose compatible rhythm cells.
   * @param complexity Rhythm difficulty bucket.
   * @param variance Probability of using rarer or newly selected patterns.
   */
  static generate(
    measures: number,
    timeSig: "4/4" | "3/4",
    complexity: number,
    variance: number,
  ): number[][] {
    const levelPatterns = RHYTHM_PATTERNS[timeSig]?.[complexity] ||
      RHYTHM_PATTERNS[timeSig]?.[1] || { common: [[1]], rare: [[1]] };

    const rhythmStream: number[][] = [];

    // Helper to pick pattern based on variance
    const getPattern = () => {
      const useRare = Math.random() < variance;
      let source = useRare ? levelPatterns.rare : levelPatterns.common;

      // Fallback to the other array if the chosen one is invalid
      if (!Array.isArray(source) || source.length === 0) {
        source = useRare ? levelPatterns.common : levelPatterns.rare;
      }

      // Ultimate fallback
      const safeSource =
        Array.isArray(source) && source.length > 0 ? source : [[1]];
      return getRandomElement(safeSource);
    };

    const motifA = getPattern();
    let motifB = getPattern();

    // Ensure motifs are distinct
    let attempts = 0;
    while (JSON.stringify(motifA) === JSON.stringify(motifB) && attempts < 10) {
      motifB = getPattern();
      attempts++;
    }

    for (let i = 0; i < measures; i++) {
      if (i === measures - 1) {
        rhythmStream.push([parseInt(timeSig[0])]); // End on long note
      } else if (i % 4 === 3) {
        rhythmStream.push(motifB); // Cadence
      } else {
        const useNewPattern = Math.random() < variance;
        if (useNewPattern) {
          rhythmStream.push(getPattern());
        } else {
          const useA = Math.random() > 0.3;
          rhythmStream.push(useA ? motifA : motifB);
        }
      }
    }
    return rhythmStream;
  }
}

/**
 * Encapsulates key-aware harmonic and melodic decisions.
 *
 * This engine precomputes the usable scale tones across the full MIDI range and
 * exposes helpers for chord construction and melody pitch selection. The melody
 * solver uses a cost function rather than strict rules so the output remains
 * musical while still respecting pedagogical constraints.
 */
class HarmonicEngine {
  public profile: InternalDifficultyProfile;
  public settings: GenerationSettings;
  public keyRoot: number;
  public keyType: "MAJOR" | "MINOR";
  public scaleNotes: number[];
  private scaleIntervals: number[];

  /**
   * @param profile Internal tuning values for penalties, ranges, and harmony.
   * @param settings User-visible generation settings after difficulty expansion.
   * @param keyRoot MIDI pitch class anchor for the selected key.
   * @param keyType Major or minor mode for scale and accidental logic.
   */
  constructor(
    profile: InternalDifficultyProfile,
    settings: GenerationSettings,
    keyRoot: number,
    keyType: "MAJOR" | "MINOR",
  ) {
    this.profile = profile;
    this.settings = settings;
    this.keyRoot = keyRoot;
    this.keyType = keyType;

    this.scaleIntervals =
      keyType === "MAJOR" ? SCALES.MAJOR : SCALES.MINOR_NATURAL;
    this.scaleNotes = [];
    for (let m = 21; m <= 108; m++) {
      if (this.scaleIntervals.includes((m - keyRoot + 1200) % 12)) {
        this.scaleNotes.push(m);
      }
    }
  }

  /**
   * Returns a close-position triad for the given scale degree around a target
   * octave. Minor-mode dominant harmony raises the leading tone when needed.
   */
  public getChordTones(degree: number, baseOctave: number): number[] {
    const triadIndices = [degree, degree + 2, degree + 4];
    const chordMidi: number[] = [];
    const targetBase = (baseOctave + 1) * 12 + (this.keyRoot % 12);

    triadIndices.forEach((scaleIndex) => {
      const normIndex = scaleIndex % 7;
      let semitone = this.scaleIntervals[normIndex];
      if (this.keyType === "MINOR" && degree === 4 && normIndex === 6) {
        semitone = 11;
      }
      let note = this.keyRoot + semitone;
      while (note < targetBase - 6) note += 12;
      while (note > targetBase + 6) note -= 12;

      chordMidi.push(note);
    });

    return chordMidi.sort((a, b) => a - b);
  }

  /**
   * Chooses the next melody note by minimizing a weighted musical cost.
   *
   * The cost function favors small intervals, discourages repeated large leaps,
   * prefers chord tones on strong beats, and respects the configured maximum
   * interval and hand range.
   */
  public solveMelodyPitch(
    currentMeasureChord: number,
    prevPitch: number,
    prevInterval: number,
    range: [number, number],
    isStrongBeat: boolean,
  ): number {
    const candidates = this.getMelodyCandidates(range);
    if (candidates.length === 0) return prevPitch;

    let bestNote = candidates[0];
    let minCost = Infinity;

    const chordTones = this.getChordTones(currentMeasureChord, 4);

    for (const candidate of candidates) {
      const cost = this.calculateMelodyCandidateCost(
        candidate,
        prevPitch,
        prevInterval,
        chordTones,
        isStrongBeat,
      );

      if (cost < minCost) {
        minCost = cost;
        bestNote = candidate;
      }
    }

    return this.applyMinorDominantAdjustment(bestNote, currentMeasureChord);
  }

  /** Limits melody candidates to the active hand range. */
  private getMelodyCandidates(range: [number, number]): number[] {
    return this.scaleNotes.filter(
      (note) => note >= range[0] && note <= range[1],
    );
  }

  /** Computes the full weighted cost for one melody candidate. */
  private calculateMelodyCandidateCost(
    candidate: number,
    prevPitch: number,
    prevInterval: number,
    chordTones: number[],
    isStrongBeat: boolean,
  ): number {
    const interval = candidate - prevPitch;
    const absInterval = Math.abs(interval);

    let cost = 0;
    cost += this.getIntervalRangeCost(absInterval);
    cost += this.getLeapCost(absInterval);
    cost += this.getChordToneCost(candidate, chordTones, isStrongBeat);
    cost += this.getLeapResolutionCost(interval, prevInterval);
    cost += this.getRepetitionCost(absInterval);
    cost += this.getTieBreakerCost();

    return cost;
  }

  /** Penalizes large intervals and hard-rejects notes outside the configured maximum leap. */
  private getIntervalRangeCost(absInterval: number): number {
    let cost = absInterval * 1.5;

    if (absInterval > this.settings.maxInterval) {
      cost += 1000;
    }

    return cost;
  }

  /** Applies the profile leap penalty once a melodic move exceeds a fourth. */
  private getLeapCost(absInterval: number): number {
    return absInterval > 4 ? this.profile.costs.leapPenalty : 0;
  }

  /** Prefers chord tones on strong beats to keep the melody harmonically grounded. */
  private getChordToneCost(
    candidate: number,
    chordTones: number[],
    isStrongBeat: boolean,
  ): number {
    if (!isStrongBeat) {
      return 0;
    }

    const isChordTone = chordTones.some(
      (chordTone) => chordTone % 12 === candidate % 12,
    );

    return isChordTone ? 0 : this.profile.costs.dissonancePenalty;
  }

  /** Rewards direction changes after a leap and penalizes repeating the same leap direction. */
  private getLeapResolutionCost(
    interval: number,
    prevInterval: number,
  ): number {
    if (Math.abs(prevInterval) <= 4) {
      return 0;
    }

    if (Math.sign(interval) === Math.sign(prevInterval)) {
      return 200;
    }

    return -this.profile.costs.directionChangeBonus;
  }

  /** Discourages immediate note repetition when other options are available. */
  private getRepetitionCost(absInterval: number): number {
    return absInterval === 0 ? this.profile.costs.repetitionPenalty : 0;
  }

  /** Adds a small random offset so tied costs do not always pick the same note. */
  private getTieBreakerCost(): number {
    return Math.random() * 10;
  }

  /** Raises the subtonic to the leading tone over minor-key dominant harmony. */
  private applyMinorDominantAdjustment(
    note: number,
    currentMeasureChord: number,
  ): number {
    if (this.keyType !== "MINOR" || currentMeasureChord !== 4) {
      return note;
    }

    const semitoneFromRoot = (note - this.keyRoot + 1200) % 12;
    return semitoneFromRoot === 10 ? note + 1 : note;
  }
}

/**
 * Converts the source melody and harmonic plan into a left-hand part.
 *
 * Depending on hand coordination, the output ranges from simple mirrored motion
 * to a fully independent accompaniment pattern selected from several styles.
 */
class AccompanimentGenerator {
  private static readonly MAX_BASS_REGISTER_PITCH = 55;

  private engine: HarmonicEngine;
  constructor(engine: HarmonicEngine) {
    this.engine = engine;
  }

  /**
   * Builds the final left-hand measures for the score.
   *
   * @param sourceMeasures Melody-first measure data used as accompaniment input.
   * @param measures Total number of measures in the piece.
   * @param progression Harmonic degree for each measure.
   * @param timeSig Active time signature.
   * @param settings Resolved generation settings.
   * @param handAssignments Measure-by-measure melody hand ownership.
   */
  public generate(
    sourceMeasures: Measure[],
    measures: number,
    progression: number[],
    timeSig: "4/4" | "3/4",
    settings: GenerationSettings,
    handAssignments: ("RH" | "LH")[],
  ): Measure[] {
    const lhMeasures: Measure[] = [];
    const internalProfile = this.engine.profile;

    let style = getRandomElement(settings.accompanimentStyle);

    progression.forEach((chordDegree, mIdx) => {
      const isFinalMeasure = mIdx === measures - 1;
      let tokens: NoteToken[] = [];

      if (settings.handCoordination === "PARALLEL") {
        tokens = this.buildParallelTokens(sourceMeasures[mIdx]);
        lhMeasures.push({ tokens, chordDegree, isStrong: true });
        return;
      }

      if (settings.handCoordination === "SEPARATE") {
        tokens = this.buildSeparateTokens(
          sourceMeasures[mIdx],
          handAssignments[mIdx],
          timeSig,
        );
        lhMeasures.push({ tokens, chordDegree, isStrong: true });
        return;
      }

      style = this.resolveIndependentStyle(style, timeSig, isFinalMeasure);
      const triad = this.getAccompanimentTriad(chordDegree);
      tokens = this.buildIndependentTokens(
        style,
        triad,
        timeSig,
        internalProfile,
      );

      lhMeasures.push({ tokens, chordDegree, isStrong: true });
    });

    return lhMeasures;
  }

  /** Mirrors the right-hand measure down an octave for locked parallel motion. */
  private buildParallelTokens(sourceMeasure: Measure): NoteToken[] {
    return sourceMeasure.tokens.map((token) => ({
      ...token,
      pitch: this.shiftPitchDownOctave(token.pitch),
      dynamic: undefined,
    }));
  }

  /** Either rests or reuses the source melody when hands alternate ownership. */
  private buildSeparateTokens(
    sourceMeasure: Measure,
    currentHand: "RH" | "LH",
    timeSig: "4/4" | "3/4",
  ): NoteToken[] {
    if (currentHand === "LH") {
      return [...sourceMeasure.tokens];
    }

    return [
      {
        type: "rest",
        pitch: 0,
        duration: timeSig === "4/4" ? 4 : 3,
      },
    ];
  }

  /** Normalizes mixed and fallback accompaniment modes to a concrete style. */
  private resolveIndependentStyle(
    style: GenerationSettings["accompanimentStyle"][number],
    timeSig: "4/4" | "3/4",
    isFinalMeasure: boolean,
  ): Exclude<
    GenerationSettings["accompanimentStyle"][number],
    "MIXED" | "NONE"
  > {
    if (isFinalMeasure) {
      return "BLOCK";
    }

    if (style === "MIXED") {
      return timeSig === "3/4" ? "WALTZ" : "BROKEN";
    }

    if (style === "NONE") {
      return "BLOCK";
    }

    return style;
  }

  /** Keeps the accompaniment triad in a bass-friendly register for the left hand. */
  private getAccompanimentTriad(chordDegree: number): [number, number, number] {
    const octave = this.getAccompanimentOctave();
    return this.engine.getChordTones(chordDegree, octave) as [
      number,
      number,
      number,
    ];
  }

  /** Chooses an octave that keeps the generated bass below the treble crossover. */
  private getAccompanimentOctave(): number {
    const defaultOctave = 3;
    const keyOffset = this.engine.keyRoot % 12;
    const basePitch = (defaultOctave + 1) * 12 + keyOffset;

    return basePitch > AccompanimentGenerator.MAX_BASS_REGISTER_PITCH
      ? 2
      : defaultOctave;
  }

  /** Dispatches independent accompaniment generation to the concrete style helper. */
  private buildIndependentTokens(
    style: Exclude<
      GenerationSettings["accompanimentStyle"][number],
      "MIXED" | "NONE"
    >,
    triad: [number, number, number],
    timeSig: "4/4" | "3/4",
    profile: InternalDifficultyProfile,
  ): NoteToken[] {
    switch (style) {
      case "BLOCK":
        return this.buildBlockChordTokens(triad, timeSig, profile);
      case "WALTZ":
        return this.buildWaltzTokens(triad, timeSig);
      case "ALBERTI":
        return this.buildAlbertiTokens(triad, timeSig);
      case "BROKEN":
        return this.buildBrokenChordTokens(triad, timeSig);
      case "STRIDE":
        return this.buildStrideTokens(triad, timeSig);
      default:
        return this.buildFallbackTokens(triad, timeSig);
    }
  }

  /** Builds sustained block or shell chords for the left hand. */
  private buildBlockChordTokens(
    triad: [number, number, number],
    timeSig: "4/4" | "3/4",
    profile: InternalDifficultyProfile,
  ): NoteToken[] {
    const [root, third, fifth] = triad;
    const notes =
      profile.chordComplexity === "SHELL"
        ? [root, fifth]
        : [root, third, fifth];

    return [
      {
        type: "note",
        pitch: notes,
        duration: timeSig === "4/4" ? 4 : 3,
      },
    ];
  }

  /** Builds a waltz bass pattern or falls back to a sustained chord in 4/4. */
  private buildWaltzTokens(
    triad: [number, number, number],
    timeSig: "4/4" | "3/4",
  ): NoteToken[] {
    const [root, third, fifth] = triad;

    if (timeSig === "3/4") {
      return [
        { type: "note", pitch: root, duration: 1 },
        { type: "note", pitch: [third, fifth], duration: 1 },
        { type: "note", pitch: [third, fifth], duration: 1 },
      ];
    }

    return [{ type: "note", pitch: [root, third, fifth], duration: 4 }];
  }

  /** Builds the alternating low-high Alberti accompaniment pattern. */
  private buildAlbertiTokens(
    triad: [number, number, number],
    timeSig: "4/4" | "3/4",
  ): NoteToken[] {
    const [root, third, fifth] = triad;
    const pattern =
      timeSig === "4/4"
        ? [root, fifth, third, fifth, root, fifth, third, fifth]
        : [root, fifth, third, fifth, third, fifth];

    return pattern.map((pitch, index) => ({
      type: "note",
      pitch,
      duration: 0.5,
      beamBreakAfter: timeSig === "4/4" ? index === 3 || index === 7 : undefined,
    }));
  }

  /** Builds a simple arpeggiated broken-chord accompaniment. */
  private buildBrokenChordTokens(
    triad: [number, number, number],
    timeSig: "4/4" | "3/4",
  ): NoteToken[] {
    const [root, third, fifth] = triad;

    if (timeSig === "4/4") {
      return [
        { type: "note", pitch: root, duration: 1 },
        { type: "note", pitch: third, duration: 1 },
        { type: "note", pitch: fifth, duration: 1 },
        { type: "note", pitch: root + 12, duration: 1 },
      ];
    }

    return [
      { type: "note", pitch: root, duration: 1 },
      { type: "note", pitch: third, duration: 1 },
      { type: "note", pitch: fifth, duration: 1 },
    ];
  }

  /** Builds a stride-style bass leap between low single notes and upper chords. */
  private buildStrideTokens(
    triad: [number, number, number],
    timeSig: "4/4" | "3/4",
  ): NoteToken[] {
    const [root, third, fifth] = triad;
    const lowRoot = root - 12;
    const highChord = [third, fifth, root + 12];

    if (timeSig === "4/4") {
      return [
        { type: "note", pitch: lowRoot, duration: 1 },
        { type: "note", pitch: highChord, duration: 1 },
        { type: "note", pitch: fifth - 12, duration: 1 },
        { type: "note", pitch: highChord, duration: 1 },
      ];
    }

    return [
      { type: "note", pitch: lowRoot, duration: 1 },
      { type: "note", pitch: highChord, duration: 1 },
      { type: "note", pitch: highChord, duration: 1 },
    ];
  }

  /** Preserves the existing shell-chord fallback for unexpected style values. */
  private buildFallbackTokens(
    triad: [number, number, number],
    timeSig: "4/4" | "3/4",
  ): NoteToken[] {
    const [root, , fifth] = triad;

    return [
      {
        type: "note",
        pitch: [root, fifth],
        duration: timeSig === "4/4" ? 4 : 3,
      },
    ];
  }

  /** Shifts a copied melody token down one octave for parallel-motion accompaniment. */
  private shiftPitchDownOctave(pitch: number | number[]): number | number[] {
    if (Array.isArray(pitch)) {
      return pitch.map((note) => note - 12);
    }

    return pitch - 12;
  }
}

/**
 * Applies simple phrase-level dynamic contrast after pitches and rhythms have
 * already been generated. This keeps expression independent from note choice.
 */
class DynamicsGenerator {
  /**
   * Adds starting and contrast dynamics to the first playable token in the
   * relevant hand at a few structural points in the exercise.
   */
  static apply(
    rhMeasures: Measure[],
    lhMeasures: Measure[],
    difficulty: DifficultyLevel,
  ) {
    // Simple rule-based dynamics
    const dynamicPalette = difficulty <= 2 ? ["mf"] : ["p", "mp", "mf", "f"];

    // Set initial dynamic
    const startDyn = "mf";
    if (rhMeasures[0]?.tokens[0]) rhMeasures[0].tokens[0].dynamic = startDyn;
    // If RH is resting (Hands Separate), apply to LH
    else if (lhMeasures[0]?.tokens[0])
      lhMeasures[0].tokens[0].dynamic = startDyn;

    if (difficulty >= 3) {
      // Add contrast at B section (usually measure 4 or 8)
      const contrastMeasure = Math.floor(rhMeasures.length / 2);
      const endMeasure = rhMeasures.length - 2;

      const midDyn = getRandomElement(["p", "f"]);
      const endDyn = midDyn === "p" ? "mf" : "f";

      if (rhMeasures[contrastMeasure]?.tokens[0]) {
        rhMeasures[contrastMeasure].tokens[0].dynamic = midDyn;
      } else if (lhMeasures[contrastMeasure]?.tokens[0]) {
        lhMeasures[contrastMeasure].tokens[0].dynamic = midDyn;
      }

      if (rhMeasures[endMeasure]?.tokens[0]) {
        rhMeasures[endMeasure].tokens[0].dynamic = endDyn;
      } else if (lhMeasures[endMeasure]?.tokens[0]) {
        lhMeasures[endMeasure].tokens[0].dynamic = endDyn;
      }
    }
  }
}

/**
 * Renders the internal score structure into ABC notation.
 *
 * ABC is the interchange format consumed by the rest of the app for display and
 * playback. This class is responsible for preserving meter, key, note spelling,
 * chords, rests, dynamics, and octave placement.
 */
class AbcEngraver {
  /** Converts a fully assembled score object into an ABC document string. */
  static render(score: ScoreStructure): string {
    let abc = `X:1\n`;
    abc += `T:${score.title}\n`;
    abc += `C:a computer\n`;
    abc += `M:${score.timeSignature}\n`;
    abc += `L:1/4\n`;
    abc += `Q:1/4=${score.tempo}\n`;
    const keyString = score.key.replace(" Major", "").replace(" Minor", "m");
    abc += `K:${keyString}\n`;

    score.parts.forEach((part, index) => {
      abc += `V:${index + 1} clef=${part.clef}\n`;

      let partString = "";
      part.measures.forEach((measure, mIdx) => {
        let currentBeat = 0;

        measure.tokens.forEach((token) => {
          if (token.type === "rest") {
            partString += AbcEngraver.renderRestToken(token);
            currentBeat += token.duration;
          } else {
            partString += AbcEngraver.renderNoteToken(token, score.key);
            currentBeat += token.duration;
          }

          if (
            token.beamBreakAfter ??
            currentBeat % 1 === 0
          ) {
            partString += " ";
          }
        });

        partString += mIdx === part.measures.length - 1 ? "|]" : "| ";
        if ((mIdx + 1) % 4 === 0 && mIdx !== part.measures.length - 1) {
          partString += "\n";
        }
      });

      abc += partString + "\n";
    });

    return abc;
  }

  /** Renders a rest token with the ABC duration suffix expected by the score. */
  private static renderRestToken(token: NoteToken): string {
    return `z${this.getRestDurationSuffix(token.duration)}`;
  }

  /** Renders a note or chord token including any prefixed dynamic markings. */
  private static renderNoteToken(token: NoteToken, keyName: string): string {
    const dynamicPrefix = token.dynamic ? `!${token.dynamic}!` : "";
    return `${dynamicPrefix}${this.renderPitchToken(
      token.pitch,
      keyName,
    )}${this.getDurationSuffix(token.duration)}`;
  }

  /** Renders either a single pitch or a chord into ABC note syntax. */
  private static renderPitchToken(
    pitch: NoteToken["pitch"],
    keyName: string,
  ): string {
    if (Array.isArray(pitch)) {
      const sorted = [...pitch].sort((a, b) => a - b);
      const abcNotes = sorted.map((note) => this.midiToAbcToken(note, keyName));
      return `[${abcNotes.join("")}]`;
    }

    return this.midiToAbcToken(pitch, keyName);
  }

  /** Maps note durations to the ABC suffixes used for notes and chords. */
  private static getDurationSuffix(duration: number): string {
    if (Math.abs(duration - 0.75) < 1e-6) return "3/4";
    if (duration === 0.5) return "/2";
    if (duration === 0.25) return "/4";
    if (duration === 1.5) return "3/2";
    if (duration === 2) return "2";
    if (duration === 3) return "3";
    if (duration === 4) return "4";
    return "";
  }

  /** Restricts rest rendering to the whole-beat values currently emitted upstream. */
  private static getRestDurationSuffix(duration: number): string {
    if (duration === 2) return "2";
    if (duration === 3) return "3";
    if (duration === 4) return "4";
    return "";
  }

  /**
   * Builds the diatonic pitch-class map for a key signature after applying all
   * sharps or flats from the signature itself.
   */
  private static getDiatonicPitchClasses(
    keyName: string,
  ): Record<string, number> {
    const map: Record<string, number> = {
      C: 0,
      D: 2,
      E: 4,
      F: 5,
      G: 7,
      A: 9,
      B: 11,
    };
    const keyData = KEY_MAP[keyName] || KEY_MAP["C Major"];

    const sharpOrder = ["F", "C", "G", "D", "A", "E", "B"];
    const flatOrder = ["B", "E", "A", "D", "G", "C", "F"];

    if (keyData.sharps) {
      for (let i = 0; i < keyData.sharps; i++) {
        const note = sharpOrder[i];
        map[note] = (map[note] + 1) % 12;
      }
    } else if (keyData.flats) {
      for (let i = 0; i < keyData.flats; i++) {
        const note = flatOrder[i];
        map[note] = (map[note] - 1 + 12) % 12;
      }
    }
    return map;
  }

  /**
   * Per-key cache of pitch spelling data used during engraving.
   *
   * `forward` maps note letters to pitch classes in the active key signature.
   * `reverse` maps pitch classes back to their preferred diatonic letters.
   */
  private static diatonicCache: Record<
    string,
    {
      forward: Record<string, number>;
      reverse: Record<number, string>;
    }
  > = {};

  /**
   * Default pitch-class-to-letter mapping that prefers natural note names.
   * This is used as a fallback when the active key signature does not directly
   * contain the required pitch spelling.
   */
  private static standardReverseMap: Record<number, string> = NOTES.reduce<
    Record<number, string>
  >((map, note, pitchClass) => {
    if (!note.includes("#")) {
      map[pitchClass] = note;
    }
    return map;
  }, {});

  /**
   * Converts a MIDI note number into an ABC note token with key-aware spelling.
   *
   * The method first tries the diatonic spelling implied by the key signature,
   * then falls back to an explicit accidental strategy. Minor-mode raised scale
   * degrees are spelled with sharps to avoid incorrect flat-based notation.
   */
  private static midiToAbcToken(midi: number, keyName: string): string {
    const pc = midi % 12;

    const { forward: diatonicMap, reverse: reverseDiatonicMap } =
      this.getDiatonicMaps(keyName);

    let matchedLetter = reverseDiatonicMap[pc];
    let acc = "";
    let baseLetter = matchedLetter;
    let accShift = 0;

    if (!baseLetter) {
      ({ acc, baseLetter, accShift } = this.resolveChromaticSpelling(
        pc,
        diatonicMap,
        keyName,
      ));
    } else {
      accShift = this.getKeySignatureAccidentalShift(baseLetter, diatonicMap);
    }

    if (!baseLetter) baseLetter = "C";
    return acc + this.renderOctave(baseLetter, midi - accShift);
  }

  /** Returns cached diatonic spelling maps for the requested key signature. */
  private static getDiatonicMaps(keyName: string): {
    forward: Record<string, number>;
    reverse: Record<number, string>;
  } {
    if (!this.diatonicCache[keyName]) {
      const forwardMap = this.getDiatonicPitchClasses(keyName);
      this.diatonicCache[keyName] = {
        forward: forwardMap,
        reverse: this.createReversePitchClassMap(forwardMap),
      };
    }

    return this.diatonicCache[keyName];
  }

  /** Inverts the per-letter pitch-class map so chromatic lookup can stay O(1). */
  private static createReversePitchClassMap(
    forwardMap: Record<string, number>,
  ): Record<number, string> {
    const reverseMap: Record<number, string> = {};
    for (const noteName in forwardMap) {
      reverseMap[forwardMap[noteName]] = noteName;
    }
    return reverseMap;
  }

  /** Converts a key-signature letter spelling back to its natural-note octave anchor. */
  private static getKeySignatureAccidentalShift(
    baseLetter: string,
    diatonicMap: Record<string, number>,
  ): number {
    const naturalPitchClass = NOTES.indexOf(baseLetter);
    const signaturePitchClass = diatonicMap[baseLetter];

    if (naturalPitchClass < 0 || signaturePitchClass === undefined) {
      return 0;
    }

    let shift = signaturePitchClass - naturalPitchClass;
    if (shift > 6) shift -= 12;
    if (shift < -6) shift += 12;

    return shift;
  }

  /** Detects the raised sixth and seventh scale degrees used in minor-key spelling. */
  private static isRaisedMinorPitchClass(pc: number, keyName: string): boolean {
    const keyData = KEY_MAP[keyName] || KEY_MAP["C Major"];
    if (keyData.type !== "MINOR") {
      return false;
    }

    const rootPC = keyData.root % 12;
    const raised6th = (rootPC + SCALES.MAJOR[5]) % 12;
    const raised7th = (rootPC + SCALES.MAJOR[6]) % 12;
    return pc === raised6th || pc === raised7th;
  }

  /** Chooses accidental spelling for pitch classes outside the key's diatonic map. */
  private static resolveChromaticSpelling(
    pc: number,
    diatonicMap: Record<string, number>,
    keyName: string,
  ): { acc: string; baseLetter?: string; accShift: number } {
    const keyData = KEY_MAP[keyName] || KEY_MAP["C Major"];
    const naturalMatch = this.standardReverseMap[pc];
    const isRaisedMinor = this.isRaisedMinorPitchClass(pc, keyName);

    if (naturalMatch && diatonicMap[naturalMatch] !== pc && !isRaisedMinor) {
      return { acc: "=", baseLetter: naturalMatch, accShift: 0 };
    }

    if ((keyData.flats || 0) > 0 && !isRaisedMinor) {
      return this.resolveFlatSpelling(pc, diatonicMap, naturalMatch);
    }

    return this.resolveSharpSpelling(pc, diatonicMap, naturalMatch);
  }

  /** Prefers flat spellings in flat keys when a pitch is not already diatonic. */
  private static resolveFlatSpelling(
    pc: number,
    diatonicMap: Record<string, number>,
    naturalMatch?: string,
  ): { acc: string; baseLetter?: string; accShift: number } {
    const nextPC = (pc + 1) % 12;
    const nextLetter = this.standardReverseMap[nextPC];

    if (nextLetter) {
      return { acc: "_", baseLetter: nextLetter, accShift: -1 };
    }

    if (naturalMatch && diatonicMap[naturalMatch] !== pc) {
      return { acc: "=", baseLetter: naturalMatch, accShift: 0 };
    }

    return { acc: "", accShift: 0 };
  }

  /** Prefers sharp spellings in sharp keys and for raised minor inflections. */
  private static resolveSharpSpelling(
    pc: number,
    diatonicMap: Record<string, number>,
    naturalMatch?: string,
  ): { acc: string; baseLetter?: string; accShift: number } {
    const prevPC = (pc - 1 + 12) % 12;
    const prevLetter = this.standardReverseMap[prevPC];

    if (prevLetter) {
      return { acc: "^", baseLetter: prevLetter, accShift: 1 };
    }

    if (naturalMatch && diatonicMap[naturalMatch] !== pc) {
      return { acc: "=", baseLetter: naturalMatch, accShift: 0 };
    }

    return { acc: "", accShift: 0 };
  }

  /** Formats octave markers according to ABC pitch casing rules. */
  private static renderOctave(baseLetter: string, baseMidi: number): string {
    const octave = Math.floor(baseMidi / 12) - 1;

    if (octave === 2) return `${baseLetter},,`;
    if (octave === 3) return `${baseLetter},`;
    if (octave === 4) return baseLetter;
    if (octave === 5) return baseLetter.toLowerCase();
    if (octave === 6) return `${baseLetter.toLowerCase()}'`;

    return baseLetter;
  }
}

// --- MAIN PIPELINE ORCHESTRATOR ---

/**
 * Generates a complete sight-reading exercise and returns both metadata and the
 * engraved ABC notation consumed by the UI.
 *
 * @param difficulty Public difficulty level selected by the user.
 * @param selectedKey Specific key or `Random` for weighted random selection.
 * @param customSettings Optional overrides for the default level settings.
 */
export const generateAlgorithmicSheetMusic = (
  difficulty: DifficultyLevel,
  selectedKey: MusicalKey,
  customSettings?: GenerationSettings,
): SightReadingExercise => {
  // 1. CONFIGURATION
  const settings = customSettings || getSettingsForLevel(difficulty);
  const effectiveCoordination = resolveHandCoordination(
    settings.handCoordination,
  );
  const internalProfile = getInternalProfile(difficulty);
  const keyName = resolveSelectedKey(difficulty, selectedKey);
  const keyData = KEY_MAP[keyName] || KEY_MAP["C Major"];
  const timeSignature = difficulty >= 3 && Math.random() > 0.6 ? "3/4" : "4/4";
  const numMeasures = difficulty <= 2 ? 8 : 16;
  const tempo = difficulty > 5 ? 110 : 80;

  // 2. HARMONIC SKELETON
  const progressionOptions = getEligibleProgressions(keyData.type, difficulty);
  const selectedProgression = getWeightedRandomElement<ProgressionTemplate>(
    progressionOptions,
    (progression) => getProgressionWeight(progression, difficulty),
  );

  const cadenceOptions = getEligibleCadences(
    keyData.type,
    difficulty,
    selectedProgression.cadenceFamilies,
  );
  const selectedCadence = getWeightedRandomElement<CadenceTemplate>(
    cadenceOptions,
    (cadence) => getCadenceWeight(cadence, difficulty),
  );

  const chordProgression = buildCadencedProgression(
    selectedProgression,
    selectedCadence,
    numMeasures,
  );

  // 3. INSTANTIATE GENERATORS
  const harmonicEngine = new HarmonicEngine(
    internalProfile,
    settings,
    keyData.root,
    keyData.type,
  );
  const accompanimentGen = new AccompanimentGenerator(harmonicEngine);

  // 4. PLAN HAND ASSIGNMENTS
  const handAssignments = planHandAssignments(
    numMeasures,
    effectiveCoordination,
  );

  // 5. GENERATE PARTS
  // Generate the source melody first, adapting the target range when melody duty switches hands.

  const melodySourceMeasures: Measure[] = [];
  const rhMeasures: Measure[] = [];

  // Build the rhythmic skeleton that the melodic solver will populate with pitches.
  const rhRhythms = RhythmGenerator.generate(
    numMeasures,
    timeSignature,
    settings.rhythmComplexity,
    settings.rhythmVariance,
  );

  let prevPitch = keyData.root + 12; // Start around C5
  let prevInterval = 0;

  rhRhythms.forEach((rhythmPattern, mIdx) => {
    const chord = chordProgression[mIdx];
    const currentMelodyTokens: NoteToken[] = [];
    let currentBeat = 0;

    const activeHand = handAssignments[mIdx];
    // Detect hand switch to reset pitch anchor (smoothing the jump between staves)
    if (mIdx > 0 && handAssignments[mIdx] !== handAssignments[mIdx - 1]) {
      if (activeHand === "LH") prevPitch = keyData.root; // Reset to ~C4/C3 area
      else prevPitch = keyData.root + 12; // Reset to ~C5 area
    }

    const targetRange =
      activeHand === "LH" ? internalProfile.rangeLH : internalProfile.rangeRH;

    // Solve pitches for this measure
    rhythmPattern.forEach((dur) => {
      const isStrong =
        currentBeat === 0 || (timeSignature === "4/4" && currentBeat === 2);
      const pitch = harmonicEngine.solveMelodyPitch(
        chord,
        prevPitch,
        prevInterval,
        targetRange,
        isStrong,
      );
      currentMelodyTokens.push({ type: "note", pitch, duration: dur });
      prevInterval = pitch - prevPitch;
      prevPitch = pitch;
      currentBeat += dur;
    });

    const melodyMeasure = {
      tokens: currentMelodyTokens,
      chordDegree: chord,
      isStrong: mIdx % 4 === 0,
    };
    melodySourceMeasures.push(melodyMeasure);

    // Derive the rendered right-hand part from the source melody.
    if (effectiveCoordination === "SEPARATE" && activeHand === "LH") {
      rhMeasures.push({
        tokens: [
          { type: "rest", pitch: 0, duration: timeSignature === "4/4" ? 4 : 3 },
        ],
        chordDegree: chord,
        isStrong: mIdx % 4 === 0,
      });
    } else {
      rhMeasures.push(melodyMeasure);
    }
  });

  // -- Left Hand (Accompaniment) --
  const resolvedSettings = {
    ...settings,
    handCoordination: effectiveCoordination,
  };
  const lhMeasures = accompanimentGen.generate(
    melodySourceMeasures,
    numMeasures,
    chordProgression,
    timeSignature,
    resolvedSettings,
    handAssignments,
  );

  // 6. APPLY DYNAMICS
  DynamicsGenerator.apply(rhMeasures, lhMeasures, difficulty);

  // 7. ASSEMBLE SCORE STRUCTURE
  const score: ScoreStructure = {
    title: `Etude in ${keyName.replace(" Major", "").replace(" Minor", "m")}`,
    key: keyName,
    timeSignature,
    tempo,
    parts: [
      { name: "Right Hand", clef: "treble", measures: rhMeasures },
      { name: "Left Hand", clef: "bass", measures: lhMeasures },
    ],
  };

  return {
    title: score.title,
    difficulty,
    key: keyName,
    timeSignature,
    description: buildExerciseDescription(
      effectiveCoordination,
      settings.rhythmComplexity,
    ),
    abcNotation: AbcEngraver.render(score),
  };
};
