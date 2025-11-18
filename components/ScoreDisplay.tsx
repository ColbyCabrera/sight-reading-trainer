
import React, { useEffect, useRef } from 'react';

interface ScoreDisplayProps {
  abcNotation: string;
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ abcNotation }) => {
  const scoreRef = useRef<HTMLDivElement>(null);
  // Refs to keep track of ABCJS instances for cleanup
  const synthControlRef = useRef<any>(null);
  const createSynthRef = useRef<any>(null);

  useEffect(() => {
    if (window.ABCJS && scoreRef.current) {
      // Render Visual
      const visualObj = window.ABCJS.renderAbc(scoreRef.current, abcNotation, {
        responsive: 'resize',
        scale: 1.2,
        add_classes: true,
        staffwidth: 740, // Force a reasonable width for readability
        paddingbottom: 30,
        paddingtop: 10,
        paddingright: 20,
        paddingleft: 20,
      });

      // Render Audio Player if midi element exists
      // We look for the midi-player element which is in the parent App component
      const midiContainer = document.getElementById('midi-player');
      if (midiContainer && window.ABCJS.synth) {
        // Clear previous player content to avoid duplicates
        midiContainer.innerHTML = "";

        if (window.ABCJS.synth.supportsAudio()) {
          const synthControl = new window.ABCJS.synth.SynthController();
          synthControlRef.current = synthControl;

          synthControl.load(midiContainer, null, {
             displayLoop: true,
             displayRestart: true,
             displayPlay: true,
             displayProgress: true,
             displayWarp: true
          });
          
          const createSynth = new window.ABCJS.synth.CreateSynth();
          createSynthRef.current = createSynth;

          createSynth.init({ visualObj: visualObj[0] }).then(() => {
            // chordsOff: true prevents ABCJS from playing chord symbols (C, G7) automatically
            // if they existed in the text, but we generate notes explicitly so this is safe.
            synthControl.setTune(visualObj[0], false, { 
              chordsOff: true,
              midiVol: 100 // Ensure dynamics are audible
            });
          }).catch((error: any) => {
            console.warn("Audio problem:", error);
          });
        } else {
            midiContainer.innerHTML = "<div class='text-xs text-red-400'>Audio not supported in this browser.</div>";
        }
      }
    }

    // CLEANUP: Stop audio when component unmounts or updates
    return () => {
      if (createSynthRef.current) {
        try {
          createSynthRef.current.stop();
        } catch (e) {
          console.warn("Failed to stop synth:", e);
        }
      }
      if (synthControlRef.current) {
        try {
          synthControlRef.current.disable(true);
        } catch (e) {
          console.warn("Failed to disable synth control:", e);
        }
      }
      // Explicitly clear the container to ensure buttons are removed
      const midiContainer = document.getElementById('midi-player');
      if (midiContainer) midiContainer.innerHTML = "";
    };
  }, [abcNotation]);

  return (
    <div className="w-full flex flex-col items-center">
      <div 
        ref={scoreRef} 
        className="w-full text-center min-h-[300px]" 
      />
    </div>
  );
};
