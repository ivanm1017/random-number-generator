import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Volume2, VolumeX, RefreshCw } from 'lucide-react';

// Shared AudioContext to prevent hitting browser limits
let audioCtx: AudioContext | null = null;

const playBeep = () => {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
    
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.1);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  } catch (err) {
    console.error("Audio playback failed", err);
  }
};

export default function App() {
  const [min, setMin] = useState<number | ''>(1);
  const [max, setMax] = useState<number | ''>(10);
  const [timer, setTimer] = useState<number | ''>(0);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isAutoGenerating, setIsAutoGenerating] = useState<boolean>(false);
  const [lastTrigger, setLastTrigger] = useState<number>(Date.now());
  
  // We use a ref to track the latest values without triggering re-renders in the timeout
  const stateRef = useRef({ min, max, audioEnabled, currentNumber });
  
  useEffect(() => {
    stateRef.current = { min, max, audioEnabled, currentNumber };
  }, [min, max, audioEnabled, currentNumber]);

  const generateNumber = useCallback(() => {
    setIsGenerating(true);
    
    const { min: stateMin, max: stateMax, audioEnabled: currentAudio, currentNumber: prevNum } = stateRef.current;
    
    const currentMin = typeof stateMin === 'number' ? stateMin : 0;
    const currentMax = typeof stateMax === 'number' ? stateMax : 0;
    
    // Ensure min is less than or equal to max
    const actualMin = Math.min(currentMin, currentMax);
    const actualMax = Math.max(currentMin, currentMax);
    
    let randomNum;
    if (actualMin === actualMax) {
      randomNum = actualMin;
    } else {
      do {
        randomNum = Math.floor(Math.random() * (actualMax - actualMin + 1)) + actualMin;
      } while (randomNum === prevNum);
    }
    
    setCurrentNumber(randomNum);
    
    if (currentAudio) {
      playBeep();
    }
    
    setLastTrigger(Date.now()); // Reset the timer delay
    
    // Small animation delay reset
    setTimeout(() => setIsGenerating(false), 150);
  }, []);

  // Timer logic
  useEffect(() => {
    const currentTimer = typeof timer === 'number' ? timer : 0;
    
    if (currentTimer <= 0) {
      if (isAutoGenerating) setIsAutoGenerating(false);
      return;
    }
    
    if (!isAutoGenerating) return;
    
    const timeoutId = setTimeout(() => {
      generateNumber();
    }, currentTimer * 1000);
    
    return () => clearTimeout(timeoutId);
  }, [timer, lastTrigger, generateNumber, isAutoGenerating]);

  const handleManualGenerate = () => {
    const currentTimer = typeof timer === 'number' ? timer : 0;
    if (currentTimer > 0) {
      if (isAutoGenerating) {
        setIsAutoGenerating(false);
      } else {
        setIsAutoGenerating(true);
        generateNumber();
      }
    } else {
      generateNumber();
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-4 font-sans text-zinc-900">
      <div className="bg-white rounded-[2rem] shadow-2xl shadow-zinc-200/50 border border-zinc-200/60 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-zinc-900 text-white p-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Random Number</h1>
          <p className="text-zinc-400 text-sm mt-1">Generate numbers on demand or with a delay</p>
        </div>
        
        {/* Display Area */}
        <div className="p-8 flex flex-col items-center justify-center border-b border-zinc-100 bg-zinc-50/50 min-h-[280px]">
          <div 
            className={`text-9xl font-bold tracking-tighter transition-transform duration-150 ${
              isGenerating ? 'scale-95 text-indigo-500' : 'scale-100 text-zinc-900'
            }`}
          >
            {currentNumber !== null ? currentNumber : '-'}
          </div>
        </div>
        
        {/* Controls */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            {/* Min */}
            <div className="space-y-2">
              <label className="block text-center text-xs font-bold text-zinc-500 uppercase tracking-wider">Min</label>
              <input 
                type="number" 
                value={min}
                onChange={(e) => setMin(e.target.value === '' ? '' : parseInt(e.target.value))}
                className="w-full bg-zinc-100 border-2 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl px-4 py-3 text-lg font-semibold text-center transition-all outline-none"
              />
            </div>
            
            {/* Max */}
            <div className="space-y-2">
              <label className="block text-center text-xs font-bold text-zinc-500 uppercase tracking-wider">Max</label>
              <input 
                type="number" 
                value={max}
                onChange={(e) => setMax(e.target.value === '' ? '' : parseInt(e.target.value))}
                className="w-full bg-zinc-100 border-2 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl px-4 py-3 text-lg font-semibold text-center transition-all outline-none"
              />
            </div>
            
            {/* Timer */}
            <div className="space-y-2">
              <label className="block text-center text-xs font-bold text-zinc-500 uppercase tracking-wider" title="Frequency in seconds (0 = manual)">Delay</label>
              <input 
                type="number" 
                min="0"
                step="0.5"
                value={timer}
                onChange={(e) => setTimer(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full bg-zinc-100 border-2 border-transparent focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl px-4 py-3 text-lg font-semibold text-center transition-all outline-none"
              />
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={`flex items-center justify-center p-4 rounded-2xl transition-all ${
                audioEnabled 
                  ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' 
                  : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
              }`}
              title={audioEnabled ? "Disable Audio" : "Enable Audio"}
            >
              {audioEnabled ? <Volume2 size={28} strokeWidth={2.5} /> : <VolumeX size={28} strokeWidth={2.5} />}
            </button>
            
            <button
              onClick={handleManualGenerate}
              className={`flex-1 rounded-2xl py-4 px-6 font-bold text-lg flex items-center justify-center gap-3 transition-all ${
                isAutoGenerating || ((typeof timer !== 'number' || timer === 0) && isGenerating)
                  ? 'bg-zinc-800 text-zinc-300 shadow-inner scale-[0.98]'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-white shadow-lg shadow-zinc-900/20 active:scale-[0.98]'
              }`}
            >
              <RefreshCw size={22} strokeWidth={2.5} className={isAutoGenerating || isGenerating ? 'animate-spin' : ''} />
              {isAutoGenerating ? 'Stop Generating' : 'Generate Random'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
