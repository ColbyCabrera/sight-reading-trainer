import React, { useState } from "react";
import {
  DifficultyLevel,
  LoadingState,
  MusicalKey,
  GenerationMode,
  GenerationSettings,
} from "../types";
import { getSettingsForLevel } from "../utils/musicTheory";

interface ControlPanelProps {
  difficulty: DifficultyLevel;
  selectedKey: MusicalKey;
  generationMode: GenerationMode;
  loadingState: LoadingState;
  settings: GenerationSettings;
  onDifficultyChange: (level: DifficultyLevel) => void;
  onKeyChange: (key: MusicalKey) => void;
  onModeChange: (mode: GenerationMode) => void;
  onSettingsChange: (settings: GenerationSettings) => void;
  onGenerate: () => void;
}

const KEYS: MusicalKey[] = [
  "Random",
  "C Major",
  "A Minor",
  "G Major",
  "E Minor",
  "F Major",
  "D Minor",
  "D Major",
  "B Minor",
  "Bb Major",
  "G Minor",
  "A Major",
  "F# Minor",
  "Eb Major",
  "C Minor",
];

export const ControlPanel: React.FC<ControlPanelProps> = ({
  difficulty,
  selectedKey,
  generationMode,
  loadingState,
  settings,
  onDifficultyChange,
  onKeyChange,
  onModeChange,
  onSettingsChange,
  onGenerate,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const isLoading = loadingState === "generating";

  // Handler to update a single setting
  const updateSetting = <K extends keyof GenerationSettings>(
    key: K,
    value: GenerationSettings[K],
  ) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <div className="soft-surface p-8 border border-black/5">
      <h2 className="text-xl font-bold text-slate-800 mb-6 font-heading tracking-tight">
        Settings
      </h2>

      {/* Mode Selection */}
      <div className="mb-8 soft-element p-1.5 flex gap-1 bg-stone-100/50">
        <button
          onClick={() => onModeChange("AI")}
          className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-smooth ${
            generationMode === "AI"
              ? "bg-white text-amber-700 shadow-sm border border-[#E8DEC1]"
              : "text-stone-500 hover:text-stone-700 hover:bg-stone-200/50"
          }`}
        >
          Gemini AI
        </button>
        <button
          onClick={() => onModeChange("Algorithm")}
          className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-smooth ${
            generationMode === "Algorithm"
              ? "bg-white text-amber-700 shadow-sm border border-[#E8DEC1]"
              : "text-stone-500 hover:text-stone-700 hover:bg-stone-200/50"
          }`}
        >
          Algorithm
        </button>
      </div>

      <div className="mb-8">
        <div className="flex justify-between items-end mb-3">
          <label
            htmlFor="difficulty"
            className="text-sm font-semibold text-stone-600"
          >
            Difficulty Level
          </label>
          <span className="text-3xl font-bold text-amber-700 font-heading leading-none">
            {difficulty}
          </span>
        </div>

        <div className="relative pt-1">
          <input
            id="difficulty"
            type="range"
            min="1"
            max="10"
            step="1"
            value={difficulty}
            onChange={(e) =>
              onDifficultyChange(Number(e.target.value) as DifficultyLevel)
            }
            className="w-full h-2 rounded-lg appearance-none cursor-pointer focus:outline-none [&::-webkit-slider-runnable-track]:bg-[#E8DEC1] [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-amber-600 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:mt-[-6px]"
            disabled={isLoading}
          />
        </div>

        <div className="flex justify-between text-xs font-medium text-stone-400 mt-3 px-1">
          <span>Beginner</span>
          <span>Advanced</span>
          <span>Virtuoso</span>
        </div>
      </div>

      {/* Advanced Settings Toggle */}
      {generationMode === "Algorithm" && (
        <div className="mb-8 border-t border-[#E8DEC1] pt-5">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-xs font-bold text-stone-500 uppercase tracking-wide hover:text-amber-700 transition-colors w-full justify-between"
          >
            <span>{showAdvanced ? "Hide" : "Show"} Custom Settings</span>
            <div className="p-1.5 bg-stone-50 rounded-md">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                className={`w-3.5 h-3.5 transform transition-transform duration-300 ${
                  showAdvanced ? "rotate-180" : ""
                }`}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                />
              </svg>
            </div>
          </button>

          {showAdvanced && (
            <div className="mt-5 space-y-5 soft-surface bg-[#FDFBF7] p-5 border border-[#E8DEC1] animate-in slide-in-from-top-2 duration-200">
              {/* Hand Coordination */}
              <div>
                <label
                  htmlFor="handCoordination"
                  className="block text-[11px] font-bold text-stone-500 uppercase tracking-widest mb-2"
                >
                  Hand Coordination
                </label>
                <select
                  id="handCoordination"
                  value={settings.handCoordination}
                  onChange={(e) =>
                    updateSetting(
                      "handCoordination",
                      e.target.value as GenerationSettings["handCoordination"],
                    )
                  }
                  className="w-full text-sm p-3 rounded-lg border border-[#E8DEC1] bg-white text-stone-700 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium appearance-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2378716c' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: `right 0.5rem center`,
                    backgroundRepeat: `no-repeat`,
                    backgroundSize: `1.5em 1.5em`,
                    paddingRight: `2.5rem`,
                  }}
                >
                  <option value="SEPARATE">Hands Separate (Alternating)</option>
                  <option value="PARALLEL">Parallel Motion (Locked)</option>
                  <option value="INDEPENDENT">Independent (Together)</option>
                  <option value="RANDOM">Random Mix</option>
                </select>
              </div>

              {/* Rhythm */}
              <div>
                <div className="flex justify-between text-[11px] mb-2">
                  <label
                    htmlFor="rhythmComplexity"
                    className="font-bold text-stone-500 uppercase tracking-widest"
                  >
                    Rhythm Complexity
                  </label>
                  <span className="text-amber-700 font-bold">
                    Lvl {settings.rhythmComplexity}
                  </span>
                </div>
                <input
                  id="rhythmComplexity"
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={settings.rhythmComplexity}
                  onChange={(e) =>
                    updateSetting(
                      "rhythmComplexity",
                      Number(e.target.value) as DifficultyLevel,
                    )
                  }
                  className="w-full h-1.5 rounded-lg appearance-none cursor-pointer outline-none [&::-webkit-slider-runnable-track]:bg-[#E8DEC1] [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-amber-600 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:mt-[-5px]"
                />
              </div>

              {/* Rhythm Variance */}
              <div>
                <div className="flex justify-between text-[11px] mb-2">
                  <label
                    htmlFor="rhythmVariance"
                    className="font-bold text-stone-500 uppercase tracking-widest"
                  >
                    Rhythm Variance
                  </label>
                  <span className="text-amber-700 font-bold">
                    {Math.round(settings.rhythmVariance * 100)}%
                  </span>
                </div>
                <input
                  id="rhythmVariance"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.rhythmVariance}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateSetting("rhythmVariance", Number(e.target.value))
                  }
                  className="w-full h-1.5 rounded-lg appearance-none cursor-pointer outline-none [&::-webkit-slider-runnable-track]:bg-[#E8DEC1] [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-amber-600 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:mt-[-5px]"
                />
              </div>

              {/* Max Interval */}
              <div>
                <div className="flex justify-between text-[11px] mb-2">
                  <label
                    htmlFor="maxInterval"
                    className="font-bold text-stone-500 uppercase tracking-widest"
                  >
                    Max Leap Interval
                  </label>
                  <span className="text-stone-600 font-bold">
                    {settings.maxInterval} semi
                  </span>
                </div>
                <input
                  id="maxInterval"
                  type="range"
                  min="1"
                  max="12"
                  step="1"
                  value={settings.maxInterval}
                  onChange={(e) =>
                    updateSetting("maxInterval", Number(e.target.value))
                  }
                  className="w-full h-1.5 rounded-lg appearance-none cursor-pointer outline-none [&::-webkit-slider-runnable-track]:bg-[#E8DEC1] [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-stone-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:mt-[-5px]"
                />
              </div>

              {/* Accompaniment Style */}
              <div>
                <div className="block text-[11px] font-bold text-stone-500 uppercase tracking-widest mb-3">
                  Accompaniment Pools
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    ["BLOCK", "BROKEN", "ALBERTI", "WALTZ", "STRIDE"] as const
                  ).map((style) => {
                    const currentStyles = settings.accompanimentStyle;
                    return (
                      <label
                        key={style}
                        className={`flex items-center gap-2 text-[13px] font-medium p-2 rounded-md border transition-colors cursor-pointer
                      ${
                        settings.handCoordination !== "INDEPENDENT"
                          ? "opacity-50 cursor-not-allowed bg-stone-50/50"
                          : "hover:bg-[#FDFBF7]"
                      }
                      ${
                        currentStyles.includes(style)
                          ? "border-amber-200 bg-amber-50/50 text-amber-800"
                          : "border-[#E8DEC1] text-stone-600"
                      }
                    `}
                      >
                        <input
                          type="checkbox"
                          checked={currentStyles.includes(style)}
                          onChange={(e) => {
                            let newStyles: typeof currentStyles;
                            if (e.target.checked) {
                              newStyles = [...currentStyles, style];
                            } else {
                              newStyles = currentStyles.filter(
                                (s) => s !== style,
                              );
                            }
                            if (newStyles.length === 0) newStyles = ["BLOCK"];
                            updateSetting("accompanimentStyle", newStyles);
                          }}
                          disabled={settings.handCoordination !== "INDEPENDENT"}
                          className="rounded border-[#E8DEC1] text-amber-600 focus:ring-amber-500 w-4 h-4"
                        />
                        {style.charAt(0) + style.slice(1).toLowerCase()}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mb-10">
        <label
          htmlFor="musicalKey"
          className="block text-[11px] font-bold text-stone-500 uppercase tracking-widest mb-2"
        >
          Musical Key
        </label>
        <select
          id="musicalKey"
          value={selectedKey}
          onChange={(e) => onKeyChange(e.target.value as MusicalKey)}
          disabled={isLoading}
          className="w-full p-3 bg-white border border-[#E8DEC1] rounded-lg text-stone-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all font-medium appearance-none shadow-sm"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2378716c' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: `right 0.75rem center`,
            backgroundRepeat: `no-repeat`,
            backgroundSize: `1.5em 1.5em`,
            paddingRight: `2.5rem`,
          }}
        >
          {KEYS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={onGenerate}
        disabled={isLoading}
        className={`w-full py-4 px-4 rounded-xl font-bold text-sm leading-tight text-center transition-all duration-300 group relative overflow-hidden outline-none
          ${
            isLoading
              ? "bg-stone-200 text-stone-400 border border-stone-300"
              : "bg-gradient-to-br from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-white shadow-[0_4px_14px_0_rgba(180,83,9,0.39)] hover:shadow-[0_6px_20px_rgba(180,83,9,0.23)] hover:-translate-y-[1px] active:translate-y-[1px] border border-amber-500/30"
          }
        `}
      >
        {/* Shine sweep on hover */}
        {!isLoading && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-700 ease-in-out z-0" />
        )}

        <div className="relative z-10">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>Composing...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <svg
                className="w-5 h-5 shrink-0 transition-transform group-hover:-rotate-12 duration-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                />
              </svg>
              <span className="truncate">Generate Score</span>
            </div>
          )}
        </div>
      </button>

      <div className="mt-5 text-[10px] font-bold uppercase tracking-widest text-stone-400 text-center flex items-center justify-center gap-2">
        <span className="w-4 h-[1px] bg-stone-200"></span>
        {generationMode === "Algorithm"
          ? "Procedural Generation Engine"
          : "Google Gemini 2.5 AI"}
        <span className="w-4 h-[1px] bg-stone-200"></span>
      </div>
    </div>
  );
};
