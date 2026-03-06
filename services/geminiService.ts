import { GoogleGenAI, Type } from "@google/genai";
import type { SightReadingExercise, DifficultyLevel, MusicalKey } from "../types.ts";

const getSystemInstruction = () => `
You are a world-class composer and piano pedagogue. Your goal is to generate specific, high-quality piano sight-reading exercises in ABC notation.

### 1. Music Theory & Composition Guidelines
**Harmony & Structure:**
*   **Form:** Use standard binary (AB) or ternary (ABA) forms to create musical coherence.
*   **Progression:** Use functional harmony (Tonic -> Subdominant -> Dominant -> Tonic).
*   **Cadences:** Ensure phrases end with clear cadences (Half Cadence for mid-point, Authentic Cadence V-I for end).
*   **Voice Leading:** Avoid parallel 5ths and 8ves (except in Level 1 parallel motion). Resolve leading tones. Avoid unresolved dissonances.

**Playability & Voicing:**
*   **Bass Clef:** Do not write close triads below C3 (Low C) to avoid muddiness. Use open intervals (5ths, 8ves) in the low register.
*   **Hand Span:** Maximum reach of a 7th for levels 1-5, Octave for 6-8, 9th+ for 9-10.
*   **Melody:** Focus on step-wise motion with occasional leaps that resolve in the opposite direction. Create a singable, pleasing melody.

### 2. Difficulty Matrix (Strictly Adhere to this)

**Level 1-2 (Beginner)**
*   **Texture:** 5-finger positions (Pentachords). No hand shifting.
*   **Hands:** Melody in RH, simple whole/half note bass in LH (or parallel motion).
*   **Rhythm:** Whole, Half, Quarter notes only. 4/4 or 3/4 time.
*   **Theory:** Simple I and V chords.
*   **Keys:** C Major, G Major, F Major, A Minor.

**Level 3-4 (Early Intermediate)**
*   **Texture:** Hands play together independently. Small hand position shifts allowed.
*   **Hands:** LH uses Alberti bass, waltz patterns (root-chord-chord), or broken chords.
*   **Rhythm:** Eighth notes introduced. Dotted half notes.
*   **Theory:** I, IV, V, V7 chords.
*   **Keys:** Add D Major, Bb Major, E Minor, D Minor.

**Level 5-6 (Intermediate)**
*   **Texture:** Extension of hand position (scales, arpeggios). Two-part inventions.
*   **Rhythm:** 6/8 compound time, triplets, dotted rhythms (dotted quarter + eighth).
*   **Theory:** Secondary dominants, inversions, simple modulations.
*   **Dynamics:** Implied dynamics through texture density.

**Level 7-8 (Advanced)**
*   **Texture:** 3-4 voice texture (Polyphony). Syncopated accompaniments.
*   **Technique:** Octaves, larger leaps, faster tempo indications.
*   **Theory:** Modulations to relative major/minor. Diminished 7th chords.

**Level 9-10 (Virtuoso)**
*   **Texture:** Dense chords, rapid passage work, chromaticism, double thirds.
*   **Rhythm:** Complex meters (5/4, 7/8), polyrhythms, frequent syncopation.
*   **Theory:** Advanced chromatic harmony (Neapolitan 6th, Augmented 6th), rapid modulations.

### 3. Conflict Resolution
*   If the user selects a **High Difficulty Key** (e.g., F# Minor) for a **Low Difficulty Level** (e.g., Level 1):
    *   Keep the Key Signature as requested.
    *   Drastically simplify the rhythm and texture to compensate (e.g., stick to a fixed 5-finger position in F# minor).

### 4. ABC Notation Rules
*   Headers: X:1, T:[Title], M:[Meter], L:1/8, Q:1/4=[Tempo], K:[Key]
*   Staves: Use V:1 (Treble) and V:2 (Bass).
*   **CRITICAL**: Ensure V:1 and V:2 have the EXACT same number of measures and beat count.
*   Use " | " for bar lines.
`;

export const generateSheetMusic = async (difficulty: DifficultyLevel, key: MusicalKey = 'Random'): Promise<SightReadingExercise> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY is not defined");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  let keyInstruction = "";
  if (key !== 'Random') {
    keyInstruction = `The piece MUST be in the key of ${key}.`;
  } else {
    keyInstruction = `Select a key strictly appropriate for Level ${difficulty} (e.g., C/G/F for Lvl 1).`;
  }

  const prompt = `
    Compose a piano sight-reading piece.
    Difficulty Level: ${difficulty}/10.
    ${keyInstruction}
    
    **Priorities:**
    1. **Musicality**: The piece must sound good. Use proper voice leading and functional harmony.
    2. **Structure**: Create a logical phrase structure (Question & Answer).
    3. **Playability**: Respect the hand limits for Level ${difficulty}.
    4. **Length**: 8 to 16 bars.
    
    Return JSON format:
    {
      "title": "Creative Title",
      "key": "Key Signature (e.g. C Major)",
      "timeSignature": "Time Signature (e.g. 4/4)",
      "description": "Brief explanation of the theory/technical focus",
      "abcNotation": "Valid ABC string with V:1 and V:2 staves"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: getSystemInstruction(),
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            key: { type: Type.STRING },
            timeSignature: { type: Type.STRING },
            description: { type: Type.STRING },
            abcNotation: { type: Type.STRING },
          },
          required: ["title", "key", "timeSignature", "description", "abcNotation"],
        },
      },
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("Empty response from Gemini");
    }

    const data = JSON.parse(jsonText);

    // Sanitize ABC notation
    let cleanAbc = data.abcNotation.trim();
    cleanAbc = cleanAbc.replace(/^```abc\n?/, '').replace(/```$/, '');

    return {
      difficulty,
      title: data.title,
      key: data.key,
      timeSignature: data.timeSignature,
      description: data.description,
      abcNotation: cleanAbc
    };

  } catch (error) {
    console.error("Gemini generation error:", error);
    throw error;
  }
};