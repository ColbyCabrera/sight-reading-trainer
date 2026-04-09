import { useId, useState, type ChangeEvent, type CSSProperties } from "react";
import {
  type ConcreteMusicalKey,
  type DifficultyLevel,
  type LoadingState,
  type GenerationSettings,
} from "../types";

import { KeyAccompanimentDialog } from "./KeyAccompanimentDialog";

const MEASURE_OPTIONS = [4, 8, 12, 16, 20, 24] as const;

interface ControlPanelProps {
  difficulty: DifficultyLevel;
  selectedKeys: ConcreteMusicalKey[];
  loadingState: LoadingState;
  settings: GenerationSettings;
  onDifficultyChange: (level: DifficultyLevel) => void;
  onKeyPoolChange: (keys: ConcreteMusicalKey[]) => void;
  onSettingsChange: (settings: GenerationSettings) => void;
  onGenerate: () => void;
}

export function ControlPanel({
  difficulty,
  selectedKeys,
  loadingState,
  settings,
  onDifficultyChange,
  onKeyPoolChange,
  onSettingsChange,
  onGenerate,
}: ControlPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
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
              } as CSSProperties
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

      <div className="mb-8 border-t border-[#E8DEC1] pt-5">
        <div className="flex justify-between items-end mb-3">
          <label
            htmlFor="maxMeasures"
            className="text-sm font-semibold text-stone-600"
          >
            Max Measures
          </label>
          <span className="text-sm font-bold text-amber-700 font-heading leading-none">
            {settings.maxMeasures} bars
          </span>
        </div>

        <select
          id="maxMeasures"
          value={settings.maxMeasures}
          onChange={(e) => updateSetting("maxMeasures", Number(e.target.value))}
          className="w-full text-sm p-3 rounded-lg border border-[#E8DEC1] bg-white text-stone-700 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2378716c' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: `right 0.5rem center`,
            backgroundRepeat: `no-repeat`,
            backgroundSize: `1.5em 1.5em`,
            paddingRight: `2.5rem`,
          }}
          disabled={isLoading}
        >
          {MEASURE_OPTIONS.map((measureCount) => (
            <option key={measureCount} value={measureCount}>
              Up to {measureCount} measures
            </option>
          ))}
        </select>
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
                } as CSSProperties
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
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                updateSetting("rhythmVariance", Number(e.target.value))
              }
              className="range-slider-sm"
              style={
                {
                  "--fill": `${settings.rhythmVariance * 100}%`,
                } as CSSProperties
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
                } as CSSProperties
              }
            />
          </div>

          {/* Keys & Accompaniment Dialog Trigger */}
          <div>
            <button
              type="button"
              onClick={() => setShowKeyDialog(true)}
              disabled={isLoading}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-[#E8DEC1] bg-white text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-amber-500/20 focus-visible:border-amber-500"
            >
              <div className="flex flex-col items-start gap-0.5">
                <span className="text-[11px] text-left font-bold text-stone-500 uppercase tracking-widest">
                  Keys & Accompaniment
                </span>
                <span className="text-xs text-amber-700 font-semibold">
                  {selectedKeys.length} key
                  {selectedKeys.length !== 1 ? "s" : ""} ·{" "}
                  {settings.accompanimentStyle.length} style
                  {settings.accompanimentStyle.length !== 1 ? "s" : ""}
                </span>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-4 h-4 text-stone-400"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 4.5l7.5 7.5-7.5 7.5"
                />
              </svg>
            </button>
          </div>

          <KeyAccompanimentDialog
            open={showKeyDialog}
            onClose={() => setShowKeyDialog(false)}
            difficulty={difficulty}
            selectedKeys={selectedKeys}
            settings={settings}
            isLoading={isLoading}
            onKeyPoolChange={onKeyPoolChange}
            onAccompanimentChange={(styles) =>
              updateSetting("accompanimentStyle", styles)
            }
          />
        </div>
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
}
