import { useEffect, useRef } from "react";
import type {
  AbcjsCreateSynth,
  AbcjsSynthController,
  AbcjsVisualObject,
} from "../types";

interface ScoreDisplayProps {
  abcNotation: string;
}

export function ScoreDisplay({ abcNotation }: ScoreDisplayProps) {
  const scoreRef = useRef<HTMLDivElement>(null);
  const synthControlRef = useRef<AbcjsSynthController | null>(null);
  const createSynthRef = useRef<AbcjsCreateSynth | null>(null);

  const getMidiContainer = () => document.getElementById("midi-player");

  const clearMidiContainer = () => {
    const midiContainer = getMidiContainer();
    if (midiContainer) {
      midiContainer.replaceChildren();
    }
  };

  const markTempoInputAccessible = (midiContainer: HTMLElement) => {
    const tempoInput =
      midiContainer.querySelector<HTMLInputElement>(".abcjs-midi-tempo");
    if (tempoInput && !tempoInput.id) {
      tempoInput.id = "abcjs-tempo-input";
    }
  };

  const showAudioUnsupportedMessage = (midiContainer: HTMLElement) => {
    const errorDiv = document.createElement("div");
    errorDiv.className = "text-xs text-red-400";
    errorDiv.textContent = "Audio not supported in this browser.";
    midiContainer.replaceChildren(errorDiv);
  };

  const cleanupAudio = () => {
    if (createSynthRef.current) {
      try {
        createSynthRef.current.stop();
      } catch (error) {
        console.warn("Failed to stop synth:", error);
      }
    }

    if (synthControlRef.current) {
      try {
        synthControlRef.current.disable(true);
      } catch (error) {
        console.warn("Failed to disable synth control:", error);
      }
    }

    createSynthRef.current = null;
    synthControlRef.current = null;
    clearMidiContainer();
  };

  const initializeAudioPlayer = async (
    midiContainer: HTMLElement,
    visualObject: AbcjsVisualObject,
  ) => {
    const abcjs = window.ABCJS;
    const synthApi = abcjs?.synth;

    if (!synthApi) {
      return;
    }

    if (!synthApi.supportsAudio()) {
      showAudioUnsupportedMessage(midiContainer);
      return;
    }

    midiContainer.replaceChildren();
    const synthControl = new synthApi.SynthController();
    const createSynth = new synthApi.CreateSynth();

    synthControlRef.current = synthControl;
    createSynthRef.current = createSynth;

    synthControl.load(midiContainer, null, {
      displayLoop: true,
      displayRestart: true,
      displayPlay: true,
      displayProgress: true,
      displayWarp: true,
    });

    await createSynth.init({ visualObj: visualObject });
    await synthControl.setTune(visualObject, false, {
      chordsOff: true,
      midiVol: 100,
    });
    markTempoInputAccessible(midiContainer);
  };

  useEffect(() => {
    const abcjs = window.ABCJS;
    const scoreElement = scoreRef.current;
    if (!abcjs || !scoreElement) {
      return cleanupAudio;
    }

    const [visualObject] = abcjs.renderAbc(scoreElement, abcNotation, {
      responsive: "resize",
      scale: 1.2,
      add_classes: true,
      staffwidth: 740,
      paddingbottom: 30,
      paddingtop: 10,
      paddingright: 20,
      paddingleft: 20,
    });

    const midiContainer = getMidiContainer();
    if (midiContainer && visualObject) {
      initializeAudioPlayer(midiContainer, visualObject).catch(
        (error: unknown) => {
          console.warn("Audio problem:", error);
        },
      );
    }

    return cleanupAudio;
  }, [abcNotation]);

  return (
    <div className="w-full flex flex-col items-center">
      <div ref={scoreRef} className="w-full text-center min-h-[300px]" />
    </div>
  );
}
