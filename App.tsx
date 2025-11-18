
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
    <div className="min-h-screen flex flex-col bg-stone-50">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8 max-w-6xl">
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
            <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200 hidden lg:block">
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
                        <span className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-semibold">Lvl {item.difficulty}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Main Content / Score */}
          <div className="lg:col-span-9">
            <div className="bg-white rounded-2xl shadow-lg border border-stone-200 min-h-[600px] flex flex-col relative overflow-hidden">
              
              {loadingState === 'generating' && (
                <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center text-stone-600">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                  <p className="font-serif text-lg animate-pulse">
                    {generationMode === 'AI' ? 'AI Composer is Thinking...' : 'Algorithm is Calculating...'}
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
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              )}

              {/* Top Bar of Score Area */}
              <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
                <div>
                  <h2 className="text-2xl font-serif text-stone-800">
                    {exercise ? exercise.title : "Ready to Practice"}
                  </h2>
                  <p className="text-stone-500 text-sm mt-1">
                    {exercise ? exercise.description : "Select a difficulty level and key, then click Generate."}
                  </p>
                </div>
                {exercise && (
                   <div className="flex gap-2">
                     <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full uppercase tracking-wide">
                       {exercise.key}
                     </span>
                     <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full uppercase tracking-wide">
                       {exercise.timeSignature}
                     </span>
                   </div>
                )}
              </div>

              {/* Actual Music Sheet */}
              <div className="flex-grow p-4 sm:p-8 flex flex-col items-center justify-start overflow-auto music-container bg-white">
                 {exercise && <ScoreDisplay abcNotation={exercise.abcNotation} />}
                 {!exercise && !loadingState && !error && (
                   <div className="flex flex-col items-center justify-center h-full text-stone-300">
                     <svg className="w-24 h-24 mb-4 opacity-20" fill="currentColor" viewBox="0 0 24 24">
                       <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                     </svg>
                     <p>Music notation will appear here</p>
                   </div>
                 )}
              </div>

              {/* Audio Control Placeholder */}
              {exercise && (
                 <div id="audio-controls" className="p-4 border-t border-stone-100 bg-stone-50 flex justify-center">
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
