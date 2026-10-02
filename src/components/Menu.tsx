import { useMemo } from "react";
import { Flag, Gauge, Play, Timer, Trophy, Volume2, VolumeX, Wind, Zap, Music } from "lucide-react";
import { CARS, GAME_SUB, GAME_TITLE, TRACK_NAME, formatTime } from "../game/constants";
import { carPreview } from "../game/sprites";
import { cn } from "../utils/cn";

interface MenuProps {
  carId: string;
  onSelectCar: (id: string) => void;
  onStart: () => void;
  bestLap: number | null;
  muted: boolean;
  onToggleMute: () => void;
  musicOn: boolean;
  onToggleMusic: () => void;
}

const TICKER = `${TRACK_NAME} — 3 LAPS — 7 RIVALS — GOLDEN HOUR — NITRO ENABLED — DRIFT TO CHARGE — `;

export default function Menu({
  carId, onSelectCar, onStart, bestLap, muted, onToggleMute, musicOn, onToggleMusic,
}: MenuProps) {
  const previews = useMemo(() => CARS.map((c) => ({ id: c.id, url: carPreview(c) })), []);

  return (
    <div className="absolute inset-0 z-20 flex flex-col overflow-hidden">
      {/* top shade */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-night-900/90 via-night-900/40 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-night-900/95 via-night-900/50 to-transparent" />

      {/* header */}
      <header className="relative z-10 flex items-center justify-between px-6 pt-5 sm:px-10 animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center border border-ember-400/40 bg-night-800/70">
            <Flag className="h-4 w-4 text-ember-400" />
          </div>
          <div className="leading-none">
            <div className="font-display text-[11px] tracking-[0.3em] text-ember-300">APX SERIES</div>
            <div className="text-[10px] tracking-[0.24em] text-white/45">ROUND 07 // SEASIDE</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleMusic}
            className={cn(
              "grid h-9 w-9 place-items-center border transition-colors",
              musicOn ? "border-ember-400/50 text-ember-300" : "border-white/15 text-white/35",
            )}
            title="Music"
          >
            <Music className="h-4 w-4" />
          </button>
          <button
            onClick={onToggleMute}
            className={cn(
              "grid h-9 w-9 place-items-center border transition-colors",
              !muted ? "border-ember-400/50 text-ember-300" : "border-white/15 text-white/35",
            )}
            title="Sound"
          >
            {!muted ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* hero */}
      <div className="relative z-10 mt-4 flex flex-col items-center px-6 text-center sm:mt-7">
        <div className="animate-fade-up text-[10px] font-semibold tracking-[0.55em] text-ember-300/90 sm:text-xs" style={{ animationDelay: "0.05s" }}>
          {GAME_SUB}
        </div>
        <h1
          className="animate-fade-up font-display text-[13vw] leading-[0.95] tracking-tight text-transparent italic sm:text-[7.5rem] lg:text-[8.5rem]"
          style={{
            animationDelay: "0.12s",
            backgroundImage: "linear-gradient(175deg, #fff6e8 12%, #ffc36e 38%, #ff7b1c 62%, #a83c10 88%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            filter: "drop-shadow(0 6px 30px rgba(255,123,28,0.35)) drop-shadow(0 2px 6px rgba(0,0,0,0.6))",
          }}
        >
          {GAME_TITLE}
        </h1>
        {/* ticker */}
        <div className="animate-fade-up mt-3 w-full max-w-2xl overflow-hidden border-y border-ember-400/20 py-1.5" style={{ animationDelay: "0.2s" }}>
          <div className="flex w-max animate-marquee whitespace-nowrap text-[10px] font-semibold tracking-[0.35em] text-ember-200/70">
            <span className="pr-4">{TICKER}</span>
            <span className="pr-4">{TICKER}</span>
          </div>
        </div>
      </div>

      {/* car select */}
      <div className="relative z-10 mt-auto px-4 pb-4 sm:px-10 sm:pb-8">
        <div className="animate-fade-up mb-3 flex items-end justify-between" style={{ animationDelay: "0.28s" }}>
          <div className="font-display text-xs tracking-[0.3em] text-white/70">SELECT MACHINE</div>
          {bestLap !== null && (
            <div className="flex items-center gap-2 text-[11px] font-semibold tracking-widest text-ember-300">
              <Trophy className="h-3.5 w-3.5" />
              LAP RECORD {formatTime(bestLap)}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" style={{ animationDelay: "0.34s" }}>
          {CARS.map((car, i) => {
            const active = car.id === carId;
            const preview = previews.find((p) => p.id === car.id)?.url;
            return (
              <button
                key={car.id}
                onClick={() => onSelectCar(car.id)}
                className={cn(
                  "animate-fade-up group relative overflow-hidden border text-left transition-all duration-300",
                  active
                    ? "corner-frame border-ember-400/70 bg-night-800/80 shadow-[0_0_50px_rgba(255,123,28,0.22)]"
                    : "border-white/10 bg-night-900/55 hover:border-white/25 hover:bg-night-800/70",
                )}
                style={{ animationDelay: `${0.34 + i * 0.07}s` }}
              >
                <div className="relative">
                  {preview && (
                    <img src={preview} alt={car.name} className={cn("h-28 w-full object-cover transition-transform duration-500 sm:h-32", active ? "scale-105" : "group-hover:scale-[1.03]")} draggable={false} />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-night-900 via-transparent to-transparent" />
                  <div className={cn("absolute left-3 top-2 px-1.5 py-0.5 text-[9px] font-bold tracking-[0.2em]", active ? "bg-ember-500/90 text-night-900" : "bg-white/10 text-white/60")}>
                    {car.cls}
                  </div>
                </div>
                <div className="space-y-1.5 p-3">
                  <div className={cn("font-display text-lg italic tracking-wide", active ? "text-ember-300" : "text-white/85")}>{car.name}</div>
                  <Stat icon={<Gauge className="h-3 w-3" />} label="TOP" value={car.statTop} active={active} />
                  <Stat icon={<Zap className="h-3 w-3" />} label="ACC" value={car.statAcc} active={active} />
                  <Stat icon={<Wind className="h-3 w-3" />} label="GRIP" value={car.statGrip} active={active} />
                </div>
                {active && <div className="pointer-events-none absolute inset-0 animate-pulse-ring border border-ember-400/50" />}
              </button>
            );
          })}
        </div>

        {/* CTA + controls */}
        <div className="animate-fade-up mt-4 flex flex-col items-center gap-3 sm:mt-5 sm:flex-row sm:justify-between" style={{ animationDelay: "0.55s" }}>
          <div className="hidden flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-semibold tracking-[0.18em] text-white/45 sm:flex">
            <span><Kbd>↑</Kbd> THROTTLE</span>
            <span><Kbd>↓</Kbd> BRAKE</span>
            <span><Kbd>←</Kbd><Kbd>→</Kbd> STEER</span>
            <span><Kbd>SHIFT</Kbd> NITRO</span>
            <span><Kbd>SPACE</Kbd> DRIFT</span>
            <span><Kbd>ESC</Kbd> PAUSE</span>
          </div>
          <button
            onClick={onStart}
            className="group relative flex items-center gap-3 overflow-hidden bg-gradient-to-r from-ember-600 via-ember-500 to-ember-400 px-10 py-4 font-display text-xl italic tracking-wider text-night-900 shadow-[0_0_60px_rgba(255,123,28,0.45)] transition-transform duration-200 hover:scale-[1.04] active:scale-95"
          >
            <Timer className="h-5 w-5" />
            START RACE
            <Play className="h-5 w-5 fill-night-900" />
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, active }: { icon: React.ReactNode; label: string; value: number; active: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={active ? "text-ember-400" : "text-white/40"}>{icon}</span>
      <span className="w-8 text-[9px] font-bold tracking-[0.2em] text-white/50">{label}</span>
      <div className="h-1 flex-1 overflow-hidden bg-white/10">
        <div
          className={cn("h-full transition-all duration-500", active ? "bg-gradient-to-r from-ember-600 to-ember-300" : "bg-white/30")}
          style={{ width: `${value * 100}%` }}
        />
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="mx-0.5 inline-block border border-white/20 bg-white/5 px-1.5 py-0.5 font-bold text-white/70">{children}</span>
  );
}
