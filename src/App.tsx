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
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isAutoGenerating, setIsAutoGenerating] = useState<boolean>(false);
  const [lastTrigger, setLastTrigger] = useState<number>(Date.now());
  const wakeLockRef = useRef<any>(null);
  
  // Wake Lock logic to prevent screen sleep
  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        console.log('Wake Lock is active');
      } catch (err: any) {
        console.error(`${err.name}, ${err.message}`);
      }
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current !== null) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log('Wake Lock released');
      } catch (err: any) {
        console.error(`${err.name}, ${err.message}`);
      }
    }
  }, []);

  useEffect(() => {
    if (isAutoGenerating) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        setIsAutoGenerating(false);
      } else if (isAutoGenerating && document.visibilityState === 'visible') {
        await requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [isAutoGenerating, requestWakeLock, releaseWakeLock]);

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
    if (currentTimer > 0 && !isAutoGenerating) {
      setIsAutoGenerating(true);
    }
    generateNumber();
  };

  const handleStopGenerating = () => {
    setIsAutoGenerating(false);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 font-sans text-white">
      <div className="bg-black rounded-[2rem] shadow-2xl shadow-zinc-800/20 border border-zinc-800 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-zinc-900 text-white p-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Random</h1>
        </div>
        
        {/* Display Area */}
        <div className="p-8 flex flex-col items-center justify-center border-b border-zinc-800 bg-black min-h-[280px]">
          <div 
            className={`text-9xl font-bold tracking-tighter transition-transform duration-150 ${
              isGenerating ? 'scale-95 text-zinc-400' : 'scale-100 text-white'
            }`}
          >
            {currentNumber !== null ? currentNumber : '?'}
          </div>
        </div>
        
        {/* Controls */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-4 gap-3">
            {/* Min */}
            <div className="space-y-2">
              <label className="block text-center text-xs font-bold text-zinc-500 uppercase tracking-wider">Min</label>
              <input 
                type="number" 
                value={min}
                onChange={(e) => setMin(e.target.value === '' ? '' : parseInt(e.target.value))}
                className="w-full bg-zinc-900 border-2 border-transparent focus:bg-zinc-800 focus:border-green-500 focus:ring-4 focus:ring-green-500/10 rounded-2xl px-2 py-3 text-lg font-semibold text-center transition-all outline-none text-white"
              />
            </div>
            
            {/* Max */}
            <div className="space-y-2">
              <label className="block text-center text-xs font-bold text-zinc-500 uppercase tracking-wider">Max</label>
              <input 
                type="number" 
                value={max}
                onChange={(e) => setMax(e.target.value === '' ? '' : parseInt(e.target.value))}
                className="w-full bg-zinc-900 border-2 border-transparent focus:bg-zinc-800 focus:border-green-500 focus:ring-4 focus:ring-green-500/10 rounded-2xl px-2 py-3 text-lg font-semibold text-center transition-all outline-none text-white"
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
                className="w-full bg-zinc-900 border-2 border-transparent focus:bg-zinc-800 focus:border-green-500 focus:ring-4 focus:ring-green-500/10 rounded-2xl px-2 py-3 text-lg font-semibold text-center transition-all outline-none text-white"
              />
            </div>

            {/* Audio Toggle */}
            <div className="space-y-2">
              <label className="block text-center text-xs font-bold text-zinc-500 uppercase tracking-wider">Audio</label>
              <button
                onClick={() => setAudioEnabled(!audioEnabled)}
                className={`w-full h-[56px] flex items-center justify-center rounded-2xl transition-all border-2 border-transparent ${
                  audioEnabled 
                    ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50' 
                    : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'
                }`}
                title={audioEnabled ? "Disable Audio" : "Enable Audio"}
              >
                {audioEnabled ? <Volume2 size={22} strokeWidth={2.5} /> : <VolumeX size={22} strokeWidth={2.5} />}
              </button>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex flex-col gap-4 pt-2">
            <button
              onClick={handleManualGenerate}
              className={`w-full rounded-2xl py-4 px-6 font-bold text-lg flex items-center justify-center gap-3 transition-all bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20 active:scale-[0.98] ${
                isGenerating && (typeof timer !== 'number' || timer === 0) ? 'bg-green-700 shadow-inner scale-[0.98]' : ''
              }`}
            >
              <RefreshCw size={22} strokeWidth={2.5} className={isGenerating ? 'animate-spin' : ''} />
              Generate Random
            </button>

            <button
              onClick={handleStopGenerating}
              disabled={!isAutoGenerating}
              className={`w-full rounded-2xl py-4 px-6 font-bold text-lg flex items-center justify-center gap-3 transition-all ${
                isAutoGenerating
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/20 active:scale-[0.98]'
                  : 'bg-zinc-900 text-zinc-600 cursor-not-allowed opacity-50'
              }`}
            >
              Stop Generating
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
