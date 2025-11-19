
import { SightReadingExercise, DifficultyLevel, MusicalKey, GenerationSettings } from "../types";
import {
  INTERNAL_PROFILES,
  getSettingsForLevel,
  KEY_MAP,
  NOTES,
  PROGRESSIONS,
  SCALES,
  RHYTHM_PATTERNS,
  ScoreStructure,
  Measure,
  NoteToken,
  InternalDifficultyProfile
} from "../utils/musicTheory";

/**
 * ALGORITHMIC COMPOSITION PIPELINE
 */

// --- HELPERS ---
const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const getInternalProfile = (level: DifficultyLevel): InternalDifficultyProfile => {
  if (level == 1) return INTERNAL_PROFILES[1];
  if (level == 2) return INTERNAL_PROFILES[2];
  if (level <= 4) return INTERNAL_PROFILES[3];
  if (level <= 7) return INTERNAL_PROFILES[5];
  return INTERNAL_PROFILES[8];
};

// --- STAGE 2: GENERATORS ---

class RhythmGenerator {
  static generate(measures: number, timeSig: '4/4' | '3/4', complexity: 'SIMPLE' | 'INTERMEDIATE' | 'COMPLEX'): number[][] {
    const patterns = RHYTHM_PATTERNS[timeSig][complexity];

    const rhythmStream: number[][] = [];

    const motifA = getRandomElement(patterns);
    const motifB = getRandomElement(patterns);

    for (let i = 0; i < measures; i++) {
      if (i === measures - 1) {
        rhythmStream.push([parseInt(timeSig[0])]); // End on long note
      } else if (i % 4 === 3) {
        rhythmStream.push(motifB); // Cadence
      } else {
        const useA = Math.random() > 0.3;
        rhythmStream.push(useA ? motifA : motifB);
      }
    }
    return rhythmStream;
  }
}

class HarmonicEngine {
  public profile: InternalDifficultyProfile;
  public settings: GenerationSettings;
  public keyRoot: number;
  public keyType: 'MAJOR' | 'MINOR';
  public scaleNotes: number[];
  private scaleIntervals: number[];

  constructor(profile: InternalDifficultyProfile, settings: GenerationSettings, keyRoot: number, keyType: 'MAJOR' | 'MINOR') {
    this.profile = profile;
    this.settings = settings;
    this.keyRoot = keyRoot;
    this.keyType = keyType;

    this.scaleIntervals = keyType === 'MAJOR' ? SCALES.MAJOR : SCALES.MINOR_NATURAL;
    this.scaleNotes = [];
    for (let m = 21; m <= 108; m++) {
      if (this.scaleIntervals.includes((m - keyRoot + 1200) % 12)) {
        this.scaleNotes.push(m);
      }
    }
  }

  public getChordTones(degree: number, baseOctave: number): number[] {
    const triadIndices = [degree, degree + 2, degree + 4];
    const chordMidi: number[] = [];
    const targetBase = (baseOctave + 1) * 12 + this.keyRoot % 12;

    triadIndices.forEach(scaleIndex => {
      const normIndex = scaleIndex % 7;
      let semitone = this.scaleIntervals[normIndex];
      if (this.keyType === 'MINOR' && degree === 4 && normIndex === 6) {
        semitone = 11;
      }
      let note = this.keyRoot + semitone;
      while (note < targetBase - 6) note += 12;
      while (note > targetBase + 6) note -= 12;

      chordMidi.push(note);
    });

    return chordMidi.sort((a, b) => a - b);
  }

  public solveMelodyPitch(
    currentMeasureChord: number,
    prevPitch: number,
    prevInterval: number,
    range: [number, number],
    isStrongBeat: boolean
  ): number {

    const candidates = this.scaleNotes.filter(n => n >= range[0] && n <= range[1]);
    if (candidates.length === 0) return prevPitch;

    let bestNote = candidates[0];
    let minCost = Infinity;

    for (const candidate of candidates) {
      let cost = 0;
      const interval = candidate - prevPitch;
      const absInterval = Math.abs(interval);

      // Use User Setting for Max Interval
      if (absInterval > this.settings.maxInterval) cost += 1000;
      cost += absInterval * 1.5;

      if (absInterval > 4) cost += this.profile.costs.leapPenalty;

      const chordTones = this.getChordTones(currentMeasureChord, 4);
      const isChordTone = chordTones.some(ct => (ct % 12) === (candidate % 12));

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

    if (this.keyType === 'MINOR' && currentMeasureChord === 4) {
      const semitoneFromRoot = (bestNote - this.keyRoot + 1200) % 12;
      if (semitoneFromRoot === 10) bestNote += 1;
    }

    return bestNote;
  }
}

class AccompanimentGenerator {
  constructor(private engine: HarmonicEngine) { }

  public generate(
    sourceMeasures: Measure[], // Now accepting source measures (always has notes)
    measures: number,
    progression: number[],
    timeSig: '4/4' | '3/4',
    settings: GenerationSettings,
    handAssignments: ('RH' | 'LH')[]
  ): Measure[] {
    const lhMeasures: Measure[] = [];
    const internalProfile = this.engine.profile;

    let style = getRandomElement(settings.accompanimentStyle);

    progression.forEach((chordDegree, mIdx) => {
      const isFinalMeasure = mIdx === measures - 1;
      let tokens: NoteToken[] = [];

      // STRATEGY: PARALLEL MOTION (Level 2)
      if (settings.handCoordination === 'PARALLEL') {
        const rhMeasure = sourceMeasures[mIdx];
        rhMeasure.tokens.forEach(t => {
          let newPitch: number | number[] = 60;
          if (Array.isArray(t.pitch)) {
            newPitch = t.pitch.map(p => p - 12);
          } else {
            newPitch = t.pitch - 12;
          }
          tokens.push({ ...t, pitch: newPitch, dynamic: undefined }); // Strip dynamic from LH copy
        });
        lhMeasures.push({ tokens, chordDegree, isStrong: true });
        return;
      }

      // STRATEGY: SEPARATE (Level 1)
      if (settings.handCoordination === 'SEPARATE') {
        const currentHand = handAssignments[mIdx];

        if (currentHand === 'RH') {
          // LH Rests
          tokens.push({ type: 'rest', pitch: 0, duration: timeSig === '4/4' ? 4 : 3 });
        } else {
          // LH Plays Melody (Source is already generated in correct register for LH)
          const sourceMeasure = sourceMeasures[mIdx];
          tokens = [...sourceMeasure.tokens];
        }
        lhMeasures.push({ tokens, chordDegree, isStrong: true });
        return;
      }

      // STRATEGY: INDEPENDENT (Level 3+)

      if (style === 'MIXED') style = timeSig === '3/4' ? 'WALTZ' : 'BROKEN';
      if (style === 'NONE') style = 'BLOCK'; // Fallback if independent but style is none
      if (isFinalMeasure) style = 'BLOCK';

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
        case 'BLOCK':
          const notes = (internalProfile.chordComplexity === 'SHELL') ? [root, fifth] : [root, third, fifth];
          tokens.push({ type: 'note', pitch: notes, duration: timeSig === '4/4' ? 4 : 3 });
          break;

        case 'WALTZ':
          if (timeSig === '3/4') {
            tokens.push({ type: 'note', pitch: root, duration: 1 });
            tokens.push({ type: 'note', pitch: [third, fifth], duration: 1 });
            tokens.push({ type: 'note', pitch: [third, fifth], duration: 1 });
          } else {
            tokens.push({ type: 'note', pitch: [root, third, fifth], duration: 4 });
          }
          break;

        case 'ALBERTI':
          if (timeSig === '4/4') {
            const pattern = [root, fifth, third, fifth, root, fifth, third, fifth];
            pattern.forEach(p => tokens.push({ type: 'note', pitch: p, duration: 0.5 }));
          } else {
            const pattern = [root, fifth, third, fifth, root, third];
            pattern.forEach(p => tokens.push({ type: 'note', pitch: p, duration: 0.5 }));
          }
          break;

        case 'BROKEN':
          if (timeSig === '4/4') {
            tokens.push({ type: 'note', pitch: root, duration: 1 });
            tokens.push({ type: 'note', pitch: third, duration: 1 });
            tokens.push({ type: 'note', pitch: fifth, duration: 1 });
            tokens.push({ type: 'note', pitch: root + 12, duration: 1 });
          } else {
            tokens.push({ type: 'note', pitch: root, duration: 1 });
            tokens.push({ type: 'note', pitch: third, duration: 1 });
            tokens.push({ type: 'note', pitch: fifth, duration: 1 });
          }
          break;

        case 'STRIDE':
          const lowRoot = root - 12;
          const highChord = [third, fifth, root + 12];
          if (timeSig === '4/4') {
            tokens.push({ type: 'note', pitch: lowRoot, duration: 1 });
            tokens.push({ type: 'note', pitch: highChord, duration: 1 });
            tokens.push({ type: 'note', pitch: fifth - 12, duration: 1 });
            tokens.push({ type: 'note', pitch: highChord, duration: 1 });
          } else {
            tokens.push({ type: 'note', pitch: lowRoot, duration: 1 });
            tokens.push({ type: 'note', pitch: highChord, duration: 1 });
            tokens.push({ type: 'note', pitch: highChord, duration: 1 });
          }
          break;

        default:
          tokens.push({ type: 'note', pitch: [root, fifth], duration: timeSig === '4/4' ? 4 : 3 });
      }
      lhMeasures.push({ tokens, chordDegree, isStrong: true });
    });

    return lhMeasures;
  }
}

class DynamicsGenerator {
  static apply(rhMeasures: Measure[], lhMeasures: Measure[], difficulty: DifficultyLevel) {
    // Simple rule-based dynamics
    const dynamicPalette = difficulty <= 2 ? ['mf'] : ['p', 'mp', 'mf', 'f'];

    // Set initial dynamic
    const startDyn = 'mf';
    if (rhMeasures[0]?.tokens[0]) rhMeasures[0].tokens[0].dynamic = startDyn;
    // If RH is resting (Hands Separate), apply to LH
    else if (lhMeasures[0]?.tokens[0]) lhMeasures[0].tokens[0].dynamic = startDyn;

    if (difficulty >= 3) {
      // Add contrast at B section (usually measure 4 or 8)
      const contrastMeasure = Math.floor(rhMeasures.length / 2);
      const endMeasure = rhMeasures.length - 2;

      const midDyn = getRandomElement(['p', 'f']);
      const endDyn = midDyn === 'p' ? 'mf' : 'f';

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

class AbcEngraver {
  static render(score: ScoreStructure): string {
    let abc = `X:1\n`;
    abc += `T:${score.title}\n`;
    abc += `C:Virtuoso AI\n`;
    abc += `M:${score.timeSignature}\n`;
    abc += `L:1/4\n`;
    abc += `Q:1/4=${score.tempo}\n`;
    const keyString = score.key.replace(' Major', '').replace(' Minor', 'm');
    abc += `K:${keyString}\n`;

    score.parts.forEach((part, index) => {
      abc += `V:${index + 1} clef=${part.clef}\n`;

      let partString = "";
      part.measures.forEach((measure, mIdx) => {
        let currentBeat = 0;

        measure.tokens.forEach(token => {
          if (token.type === 'rest') {
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
              const abcNotes = sorted.map(p => AbcEngraver.midiToAbcToken(p, score.key));
              noteName = `[${abcNotes.join("")}]`;
            } else {
              noteName = AbcEngraver.midiToAbcToken(token.pitch as number, score.key);
            }

            let durStr = "";
            if (token.duration === 0.5) durStr = "/2";
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

        partString += "| ";
        if ((mIdx + 1) % 4 === 0 && mIdx !== part.measures.length - 1) partString += "\n";
      });

      abc += partString + "]\n";
    });

    return abc;
  }

  private static getDiatonicPitchClasses(keyName: string): Record<string, number> {
    const map: Record<string, number> = { 'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11 };
    const keyData = KEY_MAP[keyName] || KEY_MAP['C Major'];

    const sharpOrder = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
    const flatOrder = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

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

  private static midiToAbcToken(midi: number, keyName: string): string {
    const pc = midi % 12;
    const diatonicMap = this.getDiatonicPitchClasses(keyName);
    const keyData = KEY_MAP[keyName] || KEY_MAP['C Major'];
    const standardMap: Record<string, number> = { 'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11 };

    let matchedLetter = Object.keys(diatonicMap).find(k => diatonicMap[k] === pc);
    let acc = "";
    let baseLetter = matchedLetter;
    let accShift = 0;

    if (!baseLetter) {
      const naturalMatch = Object.keys(standardMap).find(k => standardMap[k] === pc);
      if (naturalMatch && diatonicMap[naturalMatch] !== pc) {
        acc = "=";
        baseLetter = naturalMatch;
        accShift = 0;
      } else {
        const useFlats = (keyData.flats || 0) > 0 || keyName.includes('F Major') || keyName.includes('D Minor');
        if (useFlats) {
          const nextPC = (pc + 1) % 12;
          const nextLetter = Object.keys(standardMap).find(k => standardMap[k] === nextPC);
          if (nextLetter) { acc = "_"; baseLetter = nextLetter; accShift = -1; }
        } else {
          const prevPC = (pc - 1 + 12) % 12;
          const prevLetter = Object.keys(standardMap).find(k => standardMap[k] === prevPC);
          if (prevLetter) { acc = "^"; baseLetter = prevLetter; accShift = 1; }
        }
      }
    }

    if (!baseLetter) baseLetter = "C";
    const baseMidi = midi - accShift;
    const octave = Math.floor(baseMidi / 12) - 1;
    let abcStr = baseLetter!;
    if (octave === 2) { abcStr = abcStr + ",,"; }
    else if (octave === 3) { abcStr = abcStr + ","; }
    else if (octave === 4) { abcStr = abcStr; }
    else if (octave === 5) { abcStr = abcStr.toLowerCase(); }
    else if (octave === 6) { abcStr = abcStr.toLowerCase() + "'"; }
    return acc + abcStr;
  }
}

// --- MAIN PIPELINE ORCHESTRATOR ---

export const generateAlgorithmicSheetMusic = (
  difficulty: DifficultyLevel,
  selectedKey: MusicalKey,
  customSettings?: GenerationSettings
): SightReadingExercise => {

  // 1. CONFIGURATION
  const settings = customSettings || getSettingsForLevel(difficulty);

  // Resolve RANDOM coordination
  let effectiveCoordination = settings.handCoordination;
  if (effectiveCoordination === 'RANDOM') {
    effectiveCoordination = Math.random() < 0.5 ? 'SEPARATE' : 'PARALLEL';
  }

  const internalProfile = getInternalProfile(difficulty);

  let keyName = selectedKey;
  if (keyName === 'Random') {
    const validKeys = difficulty <= 2
      ? ['C Major', 'G Major', 'F Major', 'A Minor']
      : Object.keys(KEY_MAP);
    keyName = getRandomElement(validKeys) as MusicalKey;
  }

  const keyData = KEY_MAP[keyName] || KEY_MAP['C Major'];
  const timeSignature = (difficulty >= 3 && Math.random() > 0.6) ? '3/4' : '4/4';
  const numMeasures = difficulty <= 2 ? 8 : 16;
  const tempo = difficulty > 5 ? 110 : 80;

  // 2. HARMONIC SKELETON
  const progTemplate = keyData.type === 'MINOR' ? PROGRESSIONS.MINOR_SAD : PROGRESSIONS.BASIC;
  const chordProgression: number[] = [];
  for (let i = 0; i < numMeasures; i++) {
    if (i === numMeasures - 1) chordProgression.push(0);
    else if (i === numMeasures - 2) chordProgression.push(4);
    else chordProgression.push(progTemplate[i % progTemplate.length]);
  }

  // 3. INSTANTIATE GENERATORS
  const harmonicEngine = new HarmonicEngine(internalProfile, settings, keyData.root, keyData.type);
  const accompanimentGen = new AccompanimentGenerator(harmonicEngine);

  // 4. PLAN HAND ASSIGNMENTS
  // Determine which hand plays the melody (relevant for Separate, Parallel, Independent)
  const handAssignments: ('RH' | 'LH')[] = [];

  if (effectiveCoordination === 'SEPARATE') {
    // In Separate mode, we alternate who has the melody, the other hand rests.
    let currentHand: 'RH' | 'LH' = 'RH'; // Start with RH usually
    let barsRemainingInPhrase = 0;

    for (let i = 0; i < numMeasures; i++) {
      if (barsRemainingInPhrase === 0) {
        if (i > 0) {
          // Switch hands
          currentHand = currentHand === 'RH' ? 'LH' : 'RH';
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
      handAssignments.push('RH');
    }
  }

  // 5. GENERATE PARTS

  // FIRST: Generate the Melodic Material (Abstract Source)
  // This is "Context Aware" - if it's LH turn, we generate specifically for Bass clef range

  const melodySourceMeasures: Measure[] = [];
  const rhMeasures: Measure[] = []; // Final RH part

  // Generate abstract rhythm & pitch stream first
  const rhRhythms = RhythmGenerator.generate(numMeasures, timeSignature, settings.rhythmComplexity);

  let prevPitch = keyData.root + 12; // Start around C5
  let prevInterval = 0;

  rhRhythms.forEach((rhythmPattern, mIdx) => {
    const chord = chordProgression[mIdx];
    const currentMelodyTokens: NoteToken[] = [];
    let currentBeat = 0;

    const activeHand = handAssignments[mIdx];
    // Detect hand switch to reset pitch anchor (smoothing the jump between staves)
    if (mIdx > 0 && handAssignments[mIdx] !== handAssignments[mIdx - 1]) {
      if (activeHand === 'LH') prevPitch = keyData.root; // Reset to ~C4/C3 area
      else prevPitch = keyData.root + 12; // Reset to ~C5 area
    }

    const targetRange = activeHand === 'LH' ? internalProfile.rangeLH : internalProfile.rangeRH;

    // Solve pitches for this measure
    rhythmPattern.forEach(dur => {
      const isStrong = currentBeat === 0 || (timeSignature === '4/4' && currentBeat === 2);
      const pitch = harmonicEngine.solveMelodyPitch(
        chord,
        prevPitch,
        prevInterval,
        targetRange,
        isStrong
      );
      currentMelodyTokens.push({ type: 'note', pitch, duration: dur });
      prevInterval = pitch - prevPitch;
      prevPitch = pitch;
      currentBeat += dur;
    });

    const melodyMeasure = { tokens: currentMelodyTokens, chordDegree: chord, isStrong: mIdx % 4 === 0 };
    melodySourceMeasures.push(melodyMeasure);

    // Populate RH Part
    if (effectiveCoordination === 'SEPARATE' && activeHand === 'LH') {
      // RH takes a rest here
      rhMeasures.push({
        tokens: [{ type: 'rest', pitch: 0, duration: timeSignature === '4/4' ? 4 : 3 }],
        chordDegree: chord,
        isStrong: mIdx % 4 === 0
      });
    } else {
      // RH plays the melody (Always true for Independent/Parallel, or if it's RH turn in Separate)
      rhMeasures.push(melodyMeasure);
    }
  });

  // -- Left Hand (Accompaniment) --
  const resolvedSettings = { ...settings, handCoordination: effectiveCoordination };
  const lhMeasures = accompanimentGen.generate(
    melodySourceMeasures,
    numMeasures,
    chordProgression,
    timeSignature,
    resolvedSettings,
    handAssignments
  );

  // 6. APPLY DYNAMICS
  DynamicsGenerator.apply(rhMeasures, lhMeasures, difficulty);

  // 7. ASSEMBLE SCORE STRUCTURE
  const score: ScoreStructure = {
    title: `Etude in ${keyName.replace(' Major', '').replace(' Minor', 'm')}`,
    key: keyName,
    timeSignature,
    tempo,
    parts: [
      { name: 'Right Hand', clef: 'treble', measures: rhMeasures },
      { name: 'Left Hand', clef: 'bass', measures: lhMeasures }
    ]
  };

  return {
    title: score.title,
    difficulty,
    key: keyName,
    timeSignature,
    description: `${effectiveCoordination} Motion - ${settings.rhythmComplexity} Rhythm`,
    abcNotation: AbcEngraver.render(score)
  };
};
