
import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { ControlPanel } from './components/ControlPanel';
import { ScoreDisplay } from './components/ScoreDisplay';
import { generateSheetMusic } from './services/geminiService';
import { generateAlgorithmicSheetMusic } from './services/algorithmicService';
import { SightReadingExercise, DifficultyLevel, LoadingState, MusicalKey, GenerationMode, GenerationSettings } from './types';
import { getSettingsForLevel } from './utils/musicTheory';

const App: React.FC = () => {
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(1);
  const [selectedKey, setSelectedKey] = useState<MusicalKey>('Random');
  const [generationMode, setGenerationMode] = useState<GenerationMode>('Algorithm');

  // Initialize settings based on default difficulty 1
  const [settings, setSettings] = useState<GenerationSettings>(getSettingsForLevel(1));

  const [exercise, setExercise] = useState<SightReadingExercise | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<SightReadingExercise[]>([]);

  const handleGenerate = useCallback(async (
    level: DifficultyLevel,
    key: MusicalKey,
    mode: GenerationMode,
    currentSettings: GenerationSettings
  ) => {
    setLoadingState('generating');
    setExercise(null);
    setError(null);
    try {
      let newExercise: SightReadingExercise;

      if (mode === 'Algorithm') {
        // Simulate async delay for UI consistency
        await new Promise(resolve => setTimeout(resolve, 600));
        // Pass the current granular settings
        newExercise = generateAlgorithmicSheetMusic(level, key, currentSettings);
      } else {
        newExercise = await generateSheetMusic(level, key);
      }

      setExercise(newExercise);
      setHistory(prev => [newExercise, ...prev].slice(0, 10));
      setLoadingState('idle');
    } catch (err) {
      console.error(err);
      setError("Failed to compose a new piece. Please check your connection and try again.");
      setLoadingState('error');
    }
  }, []);

  // Initial generation
  useEffect(() => {
    handleGenerate(1, 'Random', 'Algorithm', getSettingsForLevel(1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDifficultyChange = (newLevel: DifficultyLevel) => {
    setDifficulty(newLevel);
    // Reset settings to defaults for this level when using main slider
    setSettings(getSettingsForLevel(newLevel));
  };

  const handleKeyChange = (newKey: MusicalKey) => {
    setSelectedKey(newKey);
  };

  const handleModeChange = (newMode: GenerationMode) => {
    setGenerationMode(newMode);
  };

  const handleSettingsChange = (newSettings: GenerationSettings) => {
    setSettings(newSettings);
  };

  return (
    <div className="min-h-screen flex flex-col font-body transition-colors duration-300">
      <Header />

      <main className="flex-grow container mx-auto px-6 py-10 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Sidebar / Controls */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            <ControlPanel
              difficulty={difficulty}
              selectedKey={selectedKey}
              generationMode={generationMode}
              loadingState={loadingState}
              settings={settings}
              onDifficultyChange={handleDifficultyChange}
              onKeyChange={handleKeyChange}
              onModeChange={handleModeChange}
              onSettingsChange={handleSettingsChange}
              onGenerate={() => handleGenerate(difficulty, selectedKey, generationMode, settings)}
            />

            {/* Mini History / Stats */}
            <div className="soft-surface p-6 hidden lg:block border border-black/5">
              <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-4">Recent Sessions</h3>
              {history.length === 0 ? (
                <p className="text-stone-400 text-sm italic">No pieces generated yet.</p>
              ) : (
                <ul className="space-y-3">
                  {history.map((item, idx) => (
                    <li key={idx} className="text-sm text-stone-600 flex justify-between items-center">
                      <span className="truncate max-w-[100px]">{item.title}</span>
                      <div className="flex gap-1">
                        <span className="text-xs bg-stone-100 px-1.5 py-0.5 rounded text-stone-500">{item.key}</span>
                        <span className="text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-semibold">Lvl {item.difficulty}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Main Content / Score */}
          <div className="lg:col-span-9">
            <div className="soft-surface min-h-[600px] flex flex-col relative overflow-hidden border border-black/5">

              {loadingState === 'generating' && (
                <div className="absolute inset-0 z-20 bg-white/50 backdrop-blur-md flex flex-col items-center justify-center text-stone-700">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mb-4 drop-shadow-[0_0_10px_rgba(217,119,6,0.5)]"></div>
                  <p className="font-heading text-xl animate-pulse text-amber-900 tracking-wide">
                    {generationMode === 'AI' ? 'Composing new piece...' : 'Calculating notes...'}
                  </p>
                </div>
              )}

              {error && (
                <div className="absolute inset-0 z-20 bg-white flex items-center justify-center p-8 text-center">
                  <div className="max-w-md">
                    <div className="text-red-500 text-5xl mb-4">⚠️</div>
                    <h3 className="text-xl font-bold text-stone-800 mb-2">Composition Error</h3>
                    <p className="text-stone-600 mb-6">{error}</p>
                    <button
                      onClick={() => handleGenerate(difficulty, selectedKey, generationMode, settings)}
                      className="px-6 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              )}

              {/* Top Bar of Score Area */}
              <div className="px-8 py-6 border-b border-black/5 flex justify-between items-center bg-white/50 backdrop-blur-sm">
                <div>
                  <h2 className="text-3xl font-heading font-bold text-slate-800 tracking-tight">
                    {exercise ? exercise.title : "Ready to Practice"}
                  </h2>
                  <p className="text-slate-500 text-sm mt-2 font-medium">
                    {exercise ? exercise.description : "Select a difficulty level and key, then click Generate."}
                  </p>
                </div>
                {exercise && (
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-amber-50 text-amber-800 text-xs font-semibold rounded-full uppercase tracking-wide">
                      {exercise.key}
                    </span>
                    <span className="px-3 py-1 border border-stone-200 text-stone-600 text-xs font-semibold rounded-full uppercase tracking-wide">
                      {exercise.timeSignature}
                    </span>
                  </div>
                )}
              </div>

              {/* Actual Music Sheet */}
              <div className="flex-grow p-4 sm:p-8 flex flex-col items-center justify-start overflow-auto music-container bg-transparent relative">
                {/* Subtle paper grain effect overlay */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-multiply bg-[url('/cream-paper.png')]"></div>

                {exercise && (
                  <div className="w-full relative z-10 filter drop-shadow-sm transition-opacity duration-500">
                    <ScoreDisplay abcNotation={exercise.abcNotation} />
                  </div>
                )}

                {!exercise && loadingState === 'idle' && !error && (
                  <div className="flex flex-col items-center justify-center h-full text-slate-300 relative z-10">
                    <svg className="w-24 h-24 mb-6 opacity-30 drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                    </svg>
                    <p className="font-heading text-xl text-slate-400">Music notation will appear here</p>
                  </div>
                )}
              </div>

              {/* Audio Control Placeholder */}
              {exercise && (
                <div id="audio-controls" className="p-4 border-t border-[#E8DEC1] bg-[#FDFBF7]/80 backdrop-blur-sm flex justify-center z-10 relative">
                  <div id="midi-player" className="w-full max-w-3xl px-4"></div>
                </div>
              )}

            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
