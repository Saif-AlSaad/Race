import { useCallback, useEffect, useRef, useState } from "react";
import { CARS, STORAGE_BEST, STORAGE_CAR, STORAGE_WEATHER, TOTAL_LAPS, formatTime, type WeatherMode } from "./game/constants";
import { RaceEngine, type RaceResult } from "./game/engine";
import { getAudio } from "./game/audio";
import { useInput } from "./hooks/useInput";
import Menu from "./components/Menu";
import HUD from "./components/HUD";
import Countdown from "./components/Countdown";
import Results from "./components/Results";
import TouchControls from "./components/TouchControls";
import { ChevronLeft, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { cn } from "./utils/cn";

type Phase = "menu" | "countdown" | "racing" | "paused" | "finished";

interface Toast {
  id: number;
  title: string;
  sub?: string;
  tone: "amber" | "sky" | "red";
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [engine, setEngine] = useState<RaceEngine | null>(null);
  const engineRef = useRef<RaceEngine | null>(null);
  const [phase, setPhase] = useState<Phase>("menu");
  const phaseRef = useRef<Phase>("menu");
  phaseRef.current = phase;

  const [carId, setCarId] = useState<string>(() => localStorage.getItem(STORAGE_CAR) ?? CARS[0].id);
  const [weather, setWeatherState] = useState<WeatherMode>(
    () => (localStorage.getItem(STORAGE_WEATHER) as WeatherMode) ?? "night",
  );
  const [muted, setMuted] = useState(false);
  const [musicOn, setMusicOn] = useState(true);
  const [countdownN, setCountdownN] = useState<number | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);
  const [result, setResult] = useState<RaceResult | null>(null);
  const [bestLap, setBestLap] = useState<number | null>(() => {
    const v = localStorage.getItem(STORAGE_BEST);
    return v ? Number(v) : null;
  });
  const [isRecord, setIsRecord] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const timers = useRef<number[]>([]);

  const [isTouch] = useState(
    () => typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0),
  );

  const pushToast = useCallback((title: string, sub: string | undefined, tone: Toast["tone"]) => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, title, sub, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2400);
  }, []);

  // ---- engine lifecycle ----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const audio = getAudio();
    const eng = new RaceEngine(canvas, audio, weather);
    const car = CARS.find((c) => c.id === (localStorage.getItem(STORAGE_CAR) ?? CARS[0].id)) ?? CARS[0];
    eng.setCar(car);
    eng.onLap = (lap, lapMs) => {
      if (lap === TOTAL_LAPS) pushToast("FINAL LAP", formatTime(lapMs), "amber");
      else pushToast(`LAP ${lap}`, formatTime(lapMs), "amber");
    };
    eng.onOvertake = (pos, gained) => {
      if (gained) pushToast(`OVERTAKE — P${pos}`, undefined, "sky");
      else pushToast(`POSITION LOST — P${pos}`, undefined, "red");
    };
    eng.onFinish = (r) => {
      setResult(r);
      setIsRecord(false);
      if (r.bestLap > 0) {
        setBestLap((prev) => {
          if (prev === null || r.bestLap < prev) {
            localStorage.setItem(STORAGE_BEST, String(r.bestLap));
            setIsRecord(true);
            return r.bestLap;
          }
          return prev;
        });
      }
      setPhase("finished");
    };
    engineRef.current = eng;
    setEngine(eng);
    return () => {
      eng.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearTimers = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  // ---- race flow ----
  const startRace = useCallback(() => {
    const eng = engineRef.current;
    if (!eng) return;
    const audio = getAudio();
    audio.ensure();
    clearTimers();
    const car = CARS.find((c) => c.id === carId) ?? CARS[0];
    eng.setCar(car);
    eng.startGrid();
    setIsRecord(false);
    setResult(null);
    setPhase("countdown");
    setCountdownN(3);
    audio.beep(392, 0.16);
    timers.current.push(window.setTimeout(() => { setCountdownN(2); audio.beep(392, 0.16); }, 1000));
    timers.current.push(window.setTimeout(() => { setCountdownN(1); audio.beep(392, 0.16); }, 2000));
    timers.current.push(
      window.setTimeout(() => {
        setCountdownN(0);
        audio.beep(784, 0.5);
        const perfect = eng.beginRace();
        setPhase("racing");
        setShowHint(true);
        timers.current.push(window.setTimeout(() => setShowHint(false), 6000));
        if (perfect) pushToast("PERFECT LAUNCH", "nitro +25", "amber");
        timers.current.push(window.setTimeout(() => setCountdownN(null), 800));
      }, 3000),
    );
  }, [carId, pushToast]);

  const goMenu = useCallback(() => {
    clearTimers();
    setCountdownN(null);
    engineRef.current?.toAttract();
    setResult(null);
    setPhase("menu");
  }, []);

  const onEscape = useCallback(() => {
    const eng = engineRef.current;
    const p = phaseRef.current;
    if (!eng) return;
    if (p === "racing") {
      eng.setPaused(true);
      setPhase("paused");
    } else if (p === "paused") {
      eng.setPaused(false);
      setPhase("racing");
    } else if (p === "countdown") {
      goMenu();
    }
  }, [goMenu]);

  const selectWeather = useCallback((w: WeatherMode) => {
    setWeatherState(w);
    localStorage.setItem(STORAGE_WEATHER, w);
    engineRef.current?.setWeather(w);
  }, []);

  const cycleWeather = useCallback(() => {
    const modes: WeatherMode[] = ["sunset", "night", "rain"];
    setWeatherState((curr) => {
      const next = modes[(modes.indexOf(curr) + 1) % modes.length];
      localStorage.setItem(STORAGE_WEATHER, next);
      engineRef.current?.setWeather(next);
      const labels: Record<WeatherMode, string> = {
        sunset: "GOLDEN HOUR",
        night: "NEON NIGHT",
        rain: "CYBER STORM",
      };
      pushToast("ATMOSPHERE", labels[next], "sky");
      return next;
    });
  }, [pushToast]);

  useInput(() => engineRef.current, onEscape, cycleWeather);

  // auto-pause on tab switch
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && phaseRef.current === "racing") {
        engineRef.current?.setPaused(true);
        setPhase("paused");
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const toggleMute = () => {
    const audio = getAudio();
    audio.ensure();
    audio.setMuted(!muted);
    setMuted(!muted);
  };
  const toggleMusic = () => {
    const audio = getAudio();
    audio.ensure();
    audio.setMusicOn(!musicOn);
    setMusicOn(!musicOn);
  };
  const selectCar = (id: string) => {
    setCarId(id);
    localStorage.setItem(STORAGE_CAR, id);
    const car = CARS.find((c) => c.id === id);
    if (car) engineRef.current?.setCar(car);
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-night-900">
      {/* game canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* cinematic overlays per weather */}
      {weather === "sunset" && <div className="pointer-events-none absolute inset-0 z-[5] sun-glow" />}
      {weather === "night" && <div className="pointer-events-none absolute inset-0 z-[5] night-glow" />}
      {weather === "rain" && <div className="pointer-events-none absolute inset-0 z-[5] rain-overlay" />}
      <div className="pointer-events-none absolute inset-0 z-[5] vignette" />

      {/* in-race chrome */}
      {engine && (phase === "racing" || phase === "paused" || phase === "countdown") && (
        <HUD engine={engine} onCycleWeather={cycleWeather} />
      )}
      {engine && isTouch && phase === "racing" && <TouchControls engine={engine} />}

      {/* controls hint */}
      {!isTouch && phase === "racing" && showHint && (
        <div className="pointer-events-none absolute bottom-24 left-1/2 z-10 -translate-x-1/2 animate-fade-up whitespace-nowrap border border-white/10 bg-night-900/60 px-4 py-1.5 text-[10px] font-bold tracking-[0.25em] text-white/55 backdrop-blur-sm">
          <span className="text-ember-300">SHIFT</span> NITRO · <span className="text-ember-300">SPACE</span> DRIFT · <span className="text-ember-300">V</span> LIGHTING · <span className="text-ember-300">ESC</span> PAUSE
        </div>
      )}

      {/* sound toggle during race */}
      {phase !== "menu" && (
        <button
          onClick={toggleMute}
          className="absolute right-4 top-44 z-40 grid h-9 w-9 place-items-center border border-white/15 bg-night-900/60 text-white/60 backdrop-blur-sm transition-colors hover:text-ember-300 sm:right-6"
        >
          {!muted ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
      )}

      {/* toasts */}
      <div className="pointer-events-none absolute left-1/2 top-[86px] z-50 flex -translate-x-1/2 flex-col items-center gap-1.5">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "animate-fade-up border px-4 py-1.5 text-center font-display text-sm tracking-[0.25em]",
              t.tone === "amber" && "border-ember-400/50 bg-night-900/70 text-ember-300",
              t.tone === "sky" && "border-sky-400/50 bg-night-900/70 text-sky-300",
              t.tone === "red" && "border-red-400/50 bg-night-900/70 text-red-300",
            )}
          >
            {t.title}
            {t.sub && <span className="ml-2 font-mono text-xs tracking-normal text-white/55">{t.sub}</span>}
          </div>
        ))}
      </div>

      {/* countdown */}
      {phase === "countdown" && countdownN !== null && <Countdown n={countdownN} />}
      {phase === "racing" && countdownN === 0 && <Countdown n={0} />}

      {/* pause */}
      {phase === "paused" && (
        <div className="absolute inset-0 z-40 grid place-items-center bg-night-900/55 backdrop-blur-[3px]">
          <div className="animate-fade-up flex w-full max-w-xs flex-col items-stretch gap-2 p-4">
            <div className="mb-2 flex items-center justify-center gap-3 font-display text-3xl italic tracking-wider text-white">
              <Pause className="h-6 w-6 text-ember-400" /> PAUSED
            </div>
            <PauseBtn
              onClick={() => { engineRef.current?.setPaused(false); setPhase("racing"); }}
              primary
            >
              <Play className="h-4 w-4" /> RESUME
            </PauseBtn>
            <PauseBtn onClick={startRace}>
              <RotateCcw className="h-4 w-4" /> RESTART RACE
            </PauseBtn>
            <PauseBtn onClick={goMenu}>
              <ChevronLeft className="h-4 w-4" /> BACK TO PADDOCK
            </PauseBtn>
          </div>
        </div>
      )}

      {/* results */}
      {phase === "finished" && result && (
        <Results result={result} isRecord={isRecord} onRestart={startRace} onMenu={goMenu} />
      )}

      {/* menu */}
      {phase === "menu" && (
        <Menu
          carId={carId}
          onSelectCar={selectCar}
          weather={weather}
          onSelectWeather={selectWeather}
          onStart={startRace}
          bestLap={bestLap}
          muted={muted}
          onToggleMute={toggleMute}
          musicOn={musicOn}
          onToggleMusic={toggleMusic}
        />
      )}
    </div>
  );
}

function PauseBtn({ children, onClick, primary }: { children: React.ReactNode; onClick: () => void; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 px-6 py-3 font-display text-sm tracking-[0.2em] transition-all",
        primary
          ? "bg-gradient-to-r from-ember-600 to-ember-400 text-night-900 shadow-[0_0_40px_rgba(255,123,28,0.35)] hover:scale-[1.02]"
          : "border border-white/20 text-white/75 hover:border-white/50 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}
