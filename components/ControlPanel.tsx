
import React, { useState } from 'react';
import { DifficultyLevel, LoadingState, MusicalKey, GenerationMode, GenerationSettings } from '../types';
import { getSettingsForLevel } from '../utils/musicTheory';

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
  'Random',
  'C Major', 'A Minor',
  'G Major', 'E Minor',
  'F Major', 'D Minor',
  'D Major', 'B Minor',
  'Bb Major', 'G Minor',
  'A Major', 'F# Minor',
  'Eb Major', 'C Minor'
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
  onGenerate
}) => {

  const [showAdvanced, setShowAdvanced] = useState(false);
  const isLoading = loadingState === 'generating';

  // Handler to update a single setting
  const updateSetting = (key: keyof GenerationSettings, value: any) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
      <h2 className="text-lg font-bold text-stone-800 mb-6 font-serif">Settings</h2>

      {/* Mode Selection */}
      <div className="mb-6 bg-stone-100 p-1 rounded-lg flex">
        <button
          onClick={() => onModeChange('AI')}
          className={`flex-1 py-2 px-3 rounded-md text-xs font-bold transition-all ${generationMode === 'AI'
            ? 'bg-white text-indigo-600 shadow-sm'
            : 'text-stone-500 hover:text-stone-700'
            }`}
        >
          Gemini AI
        </button>
        <button
          onClick={() => onModeChange('Algorithm')}
          className={`flex-1 py-2 px-3 rounded-md text-xs font-bold transition-all ${generationMode === 'Algorithm'
            ? 'bg-white text-indigo-600 shadow-sm'
            : 'text-stone-500 hover:text-stone-700'
            }`}
        >
          Algorithm
        </button>
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-end mb-2">
          <label className="text-sm font-semibold text-stone-600">Difficulty Level</label>
          <span className="text-2xl font-bold text-indigo-600 font-serif">{difficulty}</span>
        </div>

        <input
          type="range"
          min="1"
          max="10"
          step="1"
          value={difficulty}
          onChange={(e) => onDifficultyChange(Number(e.target.value) as DifficultyLevel)}
          className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          disabled={isLoading}
        />

        <div className="flex justify-between text-xs text-stone-400 mt-2 px-1">
          <span>Beginner</span>
          <span>Advanced</span>
          <span>Virtuoso</span>
        </div>
      </div>

      {/* Advanced Settings Toggle */}
      {generationMode === 'Algorithm' && (
        <div className="mb-6 border-t border-stone-100 pt-4">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-xs font-bold text-stone-500 uppercase hover:text-indigo-600 transition-colors"
          >
            <span>{showAdvanced ? 'Hide' : 'Show'} Custom Settings</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-3 h-3 transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {showAdvanced && (
            <div className="mt-4 space-y-4 bg-stone-50 p-4 rounded-lg border border-stone-200 animate-in slide-in-from-top-2 duration-200">

              {/* Hand Coordination */}
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Hand Coordination</label>
                <select
                  value={settings.handCoordination}
                  onChange={(e) => updateSetting('handCoordination', e.target.value)}
                  className="w-full text-xs p-2 rounded border border-stone-300"
                >
                  <option value="SEPARATE">Hands Separate (Alternating)</option>
                  <option value="PARALLEL">Parallel Motion (Hands Locked)</option>
                  <option value="INDEPENDENT">Independent (Hands Together)</option>
                  <option value="RANDOM">Random (Parallel / Separate)</option>
                </select>
              </div>

              {/* Rhythm */}
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Rhythm Complexity</label>
                <div className="flex gap-1">
                  {['SIMPLE', 'INTERMEDIATE', 'COMPLEX'].map((r) => (
                    <button
                      key={r}
                      onClick={() => updateSetting('rhythmComplexity', r)}
                      className={`flex-1 py-1 text-[10px] rounded border ${settings.rhythmComplexity === r
                        ? 'bg-indigo-100 border-indigo-300 text-indigo-700 font-bold'
                        : 'bg-white border-stone-200 text-stone-500'
                        }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Max Interval */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-stone-600">Max Leap Interval</span>
                  <span className="text-stone-500">{settings.maxInterval} semitones</span>
                </div>
                <input
                  type="range" min="1" max="12" step="1"
                  value={settings.maxInterval}
                  onChange={(e) => updateSetting('maxInterval', Number(e.target.value))}
                  className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-stone-500"
                />
              </div>

              {/* Accompaniment Style */}
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">Accompaniment Style</label>
                <select
                  value={settings.accompanimentStyle}
                  onChange={(e) => updateSetting('accompanimentStyle', e.target.value)}
                  disabled={settings.handCoordination !== 'INDEPENDENT'}
                  className="w-full text-xs p-2 rounded border border-stone-300 disabled:opacity-50"
                >
                  <option value="BLOCK">Block Chords</option>
                  <option value="BROKEN">Broken Chords</option>
                  <option value="ALBERTI">Alberti Bass</option>
                  <option value="WALTZ">Waltz (Oom-pah)</option>
                  <option value="STRIDE">Stride</option>
                </select>
              </div>

            </div>
          )}
        </div>
      )}

      <div className="mb-8">
        <label className="block text-sm font-semibold text-stone-600 mb-2">Musical Key</label>
        <select
          value={selectedKey}
          onChange={(e) => onKeyChange(e.target.value as MusicalKey)}
          disabled={isLoading}
          className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        >
          {KEYS.map(k => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
      </div>

      <button
        onClick={onGenerate}
        disabled={isLoading}
        className={`w-full py-4 px-6 rounded-lg font-semibold text-white shadow-md transition-all transform active:scale-95
          ${isLoading
            ? 'bg-stone-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-indigo-200'
          }
        `}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Composing...
          </span>
        ) : (
          "Generate New Piece"
        )}
      </button>

      <div className="mt-6 text-xs text-stone-400 text-center">
        {generationMode === 'Algorithm'
          ? 'Using Procedural Generation'
          : 'Using Google Gemini 2.5 Flash'}
      </div>
    </div>
  );
};
