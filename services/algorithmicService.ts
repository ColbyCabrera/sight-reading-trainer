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

// --- HELPERS ---
/** Returns an integer in the inclusive range [min, max]. */
const getRandomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

/** Returns a random element from a non-empty array. */
const getRandomElement = <T>(arr: T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

/** Selects one item using positive weights while keeping low-probability items possible. */
const getWeightedRandomElement = <T>(
  arr: T[],
  getWeight: (item: T) => number,
): T => {
  if (arr.length === 0) {
    throw new Error("Cannot select from an empty weighted collection.");
  }

  const weightedItems = arr.map((item) => ({ item, weight: Math.max(0, getWeight(item)) }));
  const totalWeight = weightedItems.reduce((sum, entry) => sum + entry.weight, 0);

  if (totalWeight <= 0) {
    return arr[0];
  }

  let threshold = Math.random() * totalWeight;
  for (const entry of weightedItems) {
    threshold -= entry.weight;
    if (threshold <= 0) return entry.item;
  }

  return weightedItems[weightedItems.length - 1].item;
};

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
    const candidates = this.scaleNotes.filter(
      (n) => n >= range[0] && n <= range[1],
    );
    if (candidates.length === 0) return prevPitch;

    let bestNote = candidates[0];
    let minCost = Infinity;

    const chordTones = this.getChordTones(currentMeasureChord, 4);

    for (const candidate of candidates) {
      let cost = 0;
      const interval = candidate - prevPitch;
      const absInterval = Math.abs(interval);

      // Use User Setting for Max Interval
      if (absInterval > this.settings.maxInterval) cost += 1000;
      cost += absInterval * 1.5;

      if (absInterval > 4) cost += this.profile.costs.leapPenalty;

      const isChordTone = chordTones.some((ct) => ct % 12 === candidate % 12);

      if (isStrongBeat && !isChordTone) {
        cost += this.profile.costs.dissonancePenalty;
      }

      if (Math.abs(prevInterval) > 4) {
        if (Math.sign(interval) === Math.sign(prevInterval)) {
          cost += 200;
        } else {
          cost -= this.profile.costs.directionChangeBonus;
        }
      }

      if (absInterval === 0) cost += this.profile.costs.repetitionPenalty;

      cost += Math.random() * 10;

      if (cost < minCost) {
        minCost = cost;
        bestNote = candidate;
      }
    }

    if (this.keyType === "MINOR" && currentMeasureChord === 4) {
      const semitoneFromRoot = (bestNote - this.keyRoot + 1200) % 12;
      if (semitoneFromRoot === 10) bestNote += 1;
    }

    return bestNote;
  }
}

/**
 * Converts the source melody and harmonic plan into a left-hand part.
 *
 * Depending on hand coordination, the output ranges from simple mirrored motion
 * to a fully independent accompaniment pattern selected from several styles.
 */
class AccompanimentGenerator {
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

      // STRATEGY: PARALLEL MOTION (Level 2)
      if (settings.handCoordination === "PARALLEL") {
        const rhMeasure = sourceMeasures[mIdx];
        rhMeasure.tokens.forEach((t) => {
          let newPitch: number | number[] = 60;
          if (Array.isArray(t.pitch)) {
            newPitch = t.pitch.map((p) => p - 12);
          } else {
            newPitch = t.pitch - 12;
          }
          tokens.push({ ...t, pitch: newPitch, dynamic: undefined }); // Strip dynamic from LH copy
        });
        lhMeasures.push({ tokens, chordDegree, isStrong: true });
        return;
      }

      // STRATEGY: SEPARATE (Level 1)
      if (settings.handCoordination === "SEPARATE") {
        const currentHand = handAssignments[mIdx];

        if (currentHand === "RH") {
          // LH Rests
          tokens.push({
            type: "rest",
            pitch: 0,
            duration: timeSig === "4/4" ? 4 : 3,
          });
        } else {
          // LH Plays Melody (Source is already generated in correct register for LH)
          const sourceMeasure = sourceMeasures[mIdx];
          tokens = [...sourceMeasure.tokens];
        }
        lhMeasures.push({ tokens, chordDegree, isStrong: true });
        return;
      }

      // STRATEGY: INDEPENDENT (Level 3+)

      if (style === "MIXED") style = timeSig === "3/4" ? "WALTZ" : "BROKEN";
      if (style === "NONE") style = "BLOCK"; // Fallback if independent but style is none
      if (isFinalMeasure) style = "BLOCK";

      // DYNAMIC OCTAVE ADJUSTMENT
      // Ensure the accompaniment doesn't go too high into treble territory
      let octave = 3;
      const keyOffset = this.engine.keyRoot % 12;
      const basePitch = (octave + 1) * 12 + keyOffset; // e.g., 48 + keyOffset
      // If base pitch is > 55 (G3), drop an octave to keep LH in proper bass register
      if (basePitch > 55) octave = 2;

      const triad = this.engine.getChordTones(chordDegree, octave);
      const [root, third, fifth] = triad;

      switch (style) {
        case "BLOCK":
          const notes =
            internalProfile.chordComplexity === "SHELL"
              ? [root, fifth]
              : [root, third, fifth];
          tokens.push({
            type: "note",
            pitch: notes,
            duration: timeSig === "4/4" ? 4 : 3,
          });
          break;

        case "WALTZ":
          if (timeSig === "3/4") {
            tokens.push({ type: "note", pitch: root, duration: 1 });
            tokens.push({ type: "note", pitch: [third, fifth], duration: 1 });
            tokens.push({ type: "note", pitch: [third, fifth], duration: 1 });
          } else {
            tokens.push({
              type: "note",
              pitch: [root, third, fifth],
              duration: 4,
            });
          }
          break;

        case "ALBERTI":
          if (timeSig === "4/4") {
            const pattern = [
              root,
              fifth,
              third,
              fifth,
              root,
              fifth,
              third,
              fifth,
            ];
            pattern.forEach((p) =>
              tokens.push({ type: "note", pitch: p, duration: 0.5 }),
            );
          } else {
            const pattern = [root, fifth, third, fifth, third, fifth];
            pattern.forEach((p) =>
              tokens.push({ type: "note", pitch: p, duration: 0.5 }),
            );
          }
          break;

        case "BROKEN":
          if (timeSig === "4/4") {
            tokens.push({ type: "note", pitch: root, duration: 1 });
            tokens.push({ type: "note", pitch: third, duration: 1 });
            tokens.push({ type: "note", pitch: fifth, duration: 1 });
            tokens.push({ type: "note", pitch: root + 12, duration: 1 });
          } else {
            tokens.push({ type: "note", pitch: root, duration: 1 });
            tokens.push({ type: "note", pitch: third, duration: 1 });
            tokens.push({ type: "note", pitch: fifth, duration: 1 });
          }
          break;

        case "STRIDE":
          const lowRoot = root - 12;
          const highChord = [third, fifth, root + 12];
          if (timeSig === "4/4") {
            tokens.push({ type: "note", pitch: lowRoot, duration: 1 });
            tokens.push({ type: "note", pitch: highChord, duration: 1 });
            tokens.push({ type: "note", pitch: fifth - 12, duration: 1 });
            tokens.push({ type: "note", pitch: highChord, duration: 1 });
          } else {
            tokens.push({ type: "note", pitch: lowRoot, duration: 1 });
            tokens.push({ type: "note", pitch: highChord, duration: 1 });
            tokens.push({ type: "note", pitch: highChord, duration: 1 });
          }
          break;

        default:
          tokens.push({
            type: "note",
            pitch: [root, fifth],
            duration: timeSig === "4/4" ? 4 : 3,
          });
      }
      lhMeasures.push({ tokens, chordDegree, isStrong: true });
    });

    return lhMeasures;
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
            // Render rest
            let durStr = "";
            if (token.duration === 4) durStr = "4";
            else if (token.duration === 3) durStr = "3";
            else if (token.duration === 2) durStr = "2";
            else if (token.duration === 1) durStr = "";

            partString += "z" + durStr;
            currentBeat += token.duration;
          } else {
            // Render dynamic if present
            if (token.dynamic) {
              partString += `!${token.dynamic}!`;
            }

            // Render note
            let noteName = "";
            if (Array.isArray(token.pitch)) {
              const sorted = [...token.pitch].sort((a, b) => a - b);
              const abcNotes = sorted.map((p) =>
                AbcEngraver.midiToAbcToken(p, score.key),
              );
              noteName = `[${abcNotes.join("")}]`;
            } else {
              noteName = AbcEngraver.midiToAbcToken(
                token.pitch as number,
                score.key,
              );
            }

            let durStr = "";
            if (Math.abs(token.duration - 0.75) < 1e-6) durStr = "3/4";
            else if (token.duration === 0.5) durStr = "/2";
            else if (token.duration === 0.25) durStr = "/4";
            else if (token.duration === 1.5) durStr = "3/2";
            else if (token.duration === 2) durStr = "2";
            else if (token.duration === 3) durStr = "3";
            else if (token.duration === 4) durStr = "4";

            partString += noteName + durStr;
            currentBeat += token.duration;
          }

          if (currentBeat % 1 === 0) partString += " ";
        });

        partString += mIdx === part.measures.length - 1 ? "|]" : "| ";
        if ((mIdx + 1) % 4 === 0 && mIdx !== part.measures.length - 1)
          partString += "\n";
      });

      abc += partString + "\n";
    });

    return abc;
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

    // Memoize both diatonic maps per key to avoid recalculating and reallocating.
    if (!this.diatonicCache[keyName]) {
      const forwardMap = this.getDiatonicPitchClasses(keyName);
      const reverseMap: Record<number, string> = {};
      for (const noteName in forwardMap) {
        reverseMap[forwardMap[noteName]] = noteName;
      }
      this.diatonicCache[keyName] = {
        forward: forwardMap,
        reverse: reverseMap,
      };
    }

    const { forward: diatonicMap, reverse: reverseDiatonicMap } =
      this.diatonicCache[keyName];
    const keyData = KEY_MAP[keyName] || KEY_MAP["C Major"];

    let matchedLetter = reverseDiatonicMap[pc];
    let acc = "";
    let baseLetter = matchedLetter;
    let accShift = 0;

    if (!baseLetter) {
      let isRaisedMinor = false;

      // Check if this note is the raised 6th or 7th in a minor key
      if (keyData.type === "MINOR") {
        const rootPC = keyData.root % 12;
        const raised6th = (rootPC + SCALES.MAJOR[5]) % 12;
        const raised7th = (rootPC + SCALES.MAJOR[6]) % 12;
        if (pc === raised6th || pc === raised7th) {
          isRaisedMinor = true;
        }
      }

      const naturalMatch = this.standardReverseMap[pc];

      // We only apply a natural match immediately if it is NOT a raised minor degree
      // that should be forced to be spelled as a sharp.
      if (naturalMatch && diatonicMap[naturalMatch] !== pc && !isRaisedMinor) {
        acc = "=";
        baseLetter = naturalMatch;
        accShift = 0;
      } else {
        let useFlats = (keyData.flats || 0) > 0;

        // Override for raised minor 6th/7th
        if (isRaisedMinor) {
          useFlats = false;
        }

        if (useFlats) {
          const nextPC = (pc + 1) % 12;
          const nextLetter = this.standardReverseMap[nextPC];
          if (nextLetter) {
            acc = "_";
            baseLetter = nextLetter;
            accShift = -1;
          } else if (naturalMatch && diatonicMap[naturalMatch] !== pc) {
            acc = "=";
            baseLetter = naturalMatch;
            accShift = 0;
          }
        } else {
          const prevPC = (pc - 1 + 12) % 12;
          const prevLetter = this.standardReverseMap[prevPC];
          if (prevLetter) {
            acc = "^";
            baseLetter = prevLetter;
            accShift = 1;
          } else if (naturalMatch && diatonicMap[naturalMatch] !== pc) {
            acc = "=";
            baseLetter = naturalMatch;
            accShift = 0;
          }
        }
      }
    }

    if (!baseLetter) baseLetter = "C";
    const baseMidi = midi - accShift;
    const octave = Math.floor(baseMidi / 12) - 1;
    let abcStr = baseLetter!;
    if (octave === 2) {
      abcStr = abcStr + ",,";
    } else if (octave === 3) {
      abcStr = abcStr + ",";
    } else if (octave === 4) {
      abcStr = abcStr;
    } else if (octave === 5) {
      abcStr = abcStr.toLowerCase();
    } else if (octave === 6) {
      abcStr = abcStr.toLowerCase() + "'";
    }
    return acc + abcStr;
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

  // Resolve RANDOM coordination
  let effectiveCoordination = settings.handCoordination;
  if (effectiveCoordination === "RANDOM") {
    effectiveCoordination = Math.random() < 0.5 ? "SEPARATE" : "PARALLEL";
  }

  const internalProfile = getInternalProfile(difficulty);

  let keyName = selectedKey;
  if (keyName === "Random") {
    const validKeys =
      difficulty <= 2
        ? ["C Major", "G Major", "F Major", "A Minor"]
        : Object.keys(KEY_MAP);
    keyName = getRandomElement(validKeys) as MusicalKey;
  }

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
  // Determine which hand plays the melody (relevant for Separate, Parallel, Independent)
  const handAssignments: ("RH" | "LH")[] = [];

  if (effectiveCoordination === "SEPARATE") {
    // In Separate mode, we alternate who has the melody, the other hand rests.
    let currentHand: "RH" | "LH" = "RH"; // Start with RH usually
    let barsRemainingInPhrase = 0;

    for (let i = 0; i < numMeasures; i++) {
      if (barsRemainingInPhrase === 0) {
        if (i > 0) {
          // Switch hands
          currentHand = currentHand === "RH" ? "LH" : "RH";
        }
        // Choose length: 2 or 4 bars
        const nextPhraseLen = Math.random() > 0.5 ? 4 : 2;
        barsRemainingInPhrase = nextPhraseLen;
      }
      handAssignments.push(currentHand);
      barsRemainingInPhrase--;
    }
  } else {
    // For INDEPENDENT, PARALLEL, etc., the "Melody" generator should strictly target the Right Hand range.
    // The Accompaniment generator will handle the Left Hand.
    for (let i = 0; i < numMeasures; i++) {
      handAssignments.push("RH");
    }
  }

  // 5. GENERATE PARTS

  // FIRST: Generate the Melodic Material (Abstract Source)
  // This is "Context Aware" - if it's LH turn, we generate specifically for Bass clef range

  const melodySourceMeasures: Measure[] = [];
  const rhMeasures: Measure[] = []; // Final RH part

  // Generate abstract rhythm & pitch stream first
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

    // Populate RH Part
    if (effectiveCoordination === "SEPARATE" && activeHand === "LH") {
      // RH takes a rest here
      rhMeasures.push({
        tokens: [
          { type: "rest", pitch: 0, duration: timeSignature === "4/4" ? 4 : 3 },
        ],
        chordDegree: chord,
        isStrong: mIdx % 4 === 0,
      });
    } else {
      // RH plays the melody (Always true for Independent/Parallel, or if it's RH turn in Separate)
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
    description: `${
      effectiveCoordination.charAt(0) +
      effectiveCoordination.slice(1).toLowerCase()
    } Motion - Level ${settings.rhythmComplexity} Rhythm`,
    abcNotation: AbcEngraver.render(score),
  };
};
