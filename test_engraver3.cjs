const fs = require('fs');

const content = fs.readFileSync('services/algorithmicService.ts', 'utf8');
const match = content.match(/class AbcEngraver \{[\s\S]*?\n\}/);
if (match) {
  let code = match[0].replace(/private static/g, 'static');

  // Create a minimal mock of dependencies
  const mockContext = `
    const KEY_MAP = {
      'F# Minor': { root: 66, type: 'MINOR', sharps: 3 },
      'G Minor': { root: 67, type: 'MINOR', flats: 2 },
      'C Minor': { root: 60, type: 'MINOR', flats: 3 },
      'D Minor': { root: 62, type: 'MINOR', flats: 1 },
      'C Major': { root: 60, type: 'MAJOR', sharps: 0 },
    };
    const SCALES = {
      MAJOR: [0, 2, 4, 5, 7, 9, 11]
    };
  `;

  const testScript = `
    ${mockContext}
    ${code}

    console.log('F# Minor raised 7th (MIDI 65 - F):', AbcEngraver.midiToAbcToken(65, 'F# Minor')); // Should be ^E
    console.log('G Minor raised 6th (MIDI 64 - E):', AbcEngraver.midiToAbcToken(64, 'G Minor'));   // Should be =E
    console.log('G Minor raised 7th (MIDI 66 - F#):', AbcEngraver.midiToAbcToken(66, 'G Minor'));  // Should be ^F
    console.log('C Minor raised 6th (MIDI 69 - A):', AbcEngraver.midiToAbcToken(69, 'C Minor'));   // Should be =A
    console.log('C Minor raised 7th (MIDI 71 - B):', AbcEngraver.midiToAbcToken(71, 'C Minor'));   // Should be =B
    console.log('D Minor raised 6th (MIDI 71 - B):', AbcEngraver.midiToAbcToken(71, 'D Minor'));   // Should be =B
    console.log('D Minor raised 7th (MIDI 73 - C#):', AbcEngraver.midiToAbcToken(73, 'D Minor'));  // Should be ^c
  `;

  fs.writeFileSync('run_test3.cjs', testScript);
}
