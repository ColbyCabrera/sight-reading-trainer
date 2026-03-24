import React, { useState, useId } from "react";
import {
  DifficultyLevel,
  LoadingState,
  MusicalKey,
  GenerationSettings,
} from "../types";

interface ControlPanelProps {
  difficulty: DifficultyLevel;
  selectedKey: MusicalKey;
  loadingState: LoadingState;
  settings: GenerationSettings;
  onDifficultyChange: (level: DifficultyLevel) => void;
  onKeyChange: (key: MusicalKey) => void;
  onSettingsChange: (settings: GenerationSettings) => void;
  onGenerate: () => void;
}

const KEY_GROUPS: { label: string; keys: MusicalKey[] }[] = [
  {
    label: "Major Keys",
    keys: [
      "C Major",
      "G Major",
      "D Major",
      "A Major",
      "E Major",
      "B Major",
      "F# Major",
      "C# Major",
      "F Major",
      "Bb Major",
      "Eb Major",
      "Ab Major",
      "Db Major",
      "Gb Major",
      "Cb Major",
    ],
  },
  {
    label: "Minor Keys",
    keys: [
      "A Minor",
      "E Minor",
      "B Minor",
      "F# Minor",
      "D Minor",
      "G Minor",
      "C Minor",
    ],
  },
];

export const ControlPanel: React.FC<ControlPanelProps> = ({
  difficulty,
  selectedKey,
  loadingState,
  settings,
  onDifficultyChange,
  onKeyChange,
  onSettingsChange,
  onGenerate,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const isLoading = loadingState === "generating";
  const advancedPanelId = useId();

  /** Updates one generation setting while preserving the rest. */
  const updateSetting = <K extends keyof GenerationSettings>(
    key: K,
    value: GenerationSettings[K],
  ) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <div className="soft-surface p-6 border border-black/5">
      <h2 className="text-xl font-bold text-slate-800 mb-6 font-heading tracking-tight">
        Settings
      </h2>

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
            className="range-slider"
            style={
              {
                "--fill": `${((difficulty - 1) / 9) * 100}%`,
              } as React.CSSProperties
            }
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
      <div className="mb-8 border-t border-[#E8DEC1] pt-5">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          aria-expanded={showAdvanced}
          aria-controls={advancedPanelId}
          className="flex items-center gap-2 text-xs font-bold text-stone-500 uppercase tracking-wide hover:text-amber-700 transition-colors w-full justify-between rounded-md outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
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

        <div
          id={advancedPanelId}
          className={`mt-5 space-y-5 soft-surface bg-[#FDFBF7] p-5 border border-[#E8DEC1] transition-all duration-300 ${
            showAdvanced
              ? "opacity-100 max-h-[1000px] visible"
              : "opacity-0 max-h-0 hidden p-0 border-0 overflow-hidden"
          }`}
          aria-hidden={!showAdvanced}
        >
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
              className="range-slider-sm"
              style={
                {
                  "--fill": `${((settings.rhythmComplexity - 1) / 9) * 100}%`,
                } as React.CSSProperties
              }
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
              className="range-slider-sm"
              style={
                {
                  "--fill": `${settings.rhythmVariance * 100}%`,
                } as React.CSSProperties
              }
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
              className="range-slider-sm neutral"
              style={
                {
                  "--fill": `${((settings.maxInterval - 1) / 11) * 100}%`,
                } as React.CSSProperties
              }
            />
          </div>

          {/* Accompaniment Style */}
          <div>
            <div className="block text-[11px] font-bold text-stone-500 uppercase tracking-widest mb-3">
              Accompaniment Pools
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["BLOCK", "BROKEN", "ALBERTI", "WALTZ", "STRIDE"] as const).map(
                (style) => {
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
                },
              )}
            </div>
          </div>
        </div>
      </div>

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
          <option value="Random">Random</option>
          {KEY_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.keys.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <button
        onClick={onGenerate}
        disabled={isLoading}
        aria-busy={isLoading}
        className={`btn-generate w-full py-4 px-4 rounded-xl font-bold text-sm leading-tight text-center transition-all duration-300 group outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2
          ${
            isLoading
              ? "bg-stone-200 text-stone-400 border border-stone-300 cursor-not-allowed"
              : "bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800 hover:from-amber-500 hover:via-amber-600 hover:to-amber-700 text-white shadow-[0_4px_14px_0_rgba(180,83,9,0.39)] hover:shadow-[0_6px_20px_rgba(180,83,9,0.23)] hover:-translate-y-[1px] active:translate-y-[1px] active:shadow-[0_2px_8px_rgba(180,83,9,0.3)] border border-amber-500/30"
          }
        `}
      >
        {/* Shine sweep on hover */}
        {!isLoading && <div className="shine" />}

        <div className="relative z-10">
          {isLoading ? (
            <div className="flex items-center justify-center gap-3">
              <div className="note-bounce flex gap-1 text-base">
                <span>♩</span>
                <span>♪</span>
                <span>♫</span>
              </div>
              <span>Composing...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <svg
                className="w-5 h-5 shrink-0 transition-transform group-hover:-rotate-12 group-hover:scale-110 duration-300"
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
    </div>
  );
};
