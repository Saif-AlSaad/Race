import { useMemo } from "react";
import {
  Flag, Gauge, Play, Timer, Trophy, Volume2, VolumeX, Wind, Zap,
  Music, Sun, Moon, CloudRain, Settings, Sparkles, ShieldCheck, Flame
} from "lucide-react";
import {
  CARS, GAME_SUB, GAME_TITLE, TRACK_NAME, formatTime, type WeatherMode,
  type DifficultyLevel, DIFFICULTIES, DIFFICULTY_LEVELS, type CareerProgress, DEFAULT_UPGRADES,
  CUSTOM_PAINTS
} from "../game/constants";
import { carPreview } from "../game/sprites";
import { cn } from "../utils/cn";

interface MenuProps {
  carId: string;
  onSelectCar: (id: string) => void;
  weather: WeatherMode;
  onSelectWeather: (w: WeatherMode) => void;
  onStart: () => void;
  onOpenSettings: () => void;
  onOpenCareer: () => void;
  onOpenGarage: () => void;
  career: CareerProgress;
  difficulty: DifficultyLevel;
  onSelectDifficulty: (d: DifficultyLevel) => void;
  bestLap: number | null;
  muted: boolean;
  onToggleMute: () => void;
  musicOn: boolean;
  onToggleMusic: () => void;
}

export default function Menu({
  carId,
  onSelectCar,
  weather,
  onSelectWeather,
  onStart,
  onOpenSettings,
  onOpenCareer,
  onOpenGarage,
  career,
  difficulty,
  onSelectDifficulty,
  bestLap,
  muted,
  onToggleMute,
  musicOn,
  onToggleMusic,
}: MenuProps) {
  const previews = useMemo(() => {
    let savedPaints: Record<string, string> = {};
    try {
      const p = localStorage.getItem("apex.garage_paints");
      if (p) savedPaints = JSON.parse(p);
    } catch {}
    return CARS.map((c) => {
      const paintId = savedPaints[c.id];
      const cp = paintId && paintId !== "factory" ? CUSTOM_PAINTS.find((p) => p.id === paintId) : null;
      const finalCar = cp ? { ...c, base: cp.base, dark: cp.dark, light: cp.light, accent: cp.accent } : c;
      return { id: c.id, url: carPreview(finalCar, weather, career.upgrades[c.id]) };
    });
  }, [weather, career.upgrades]);

  const atmoName = weather === "night" ? "NEON MIDNIGHT" : weather === "rain" ? "CYBER STORM" : "GOLDEN HOUR";
  const diffCfg = DIFFICULTIES[difficulty] || DIFFICULTIES.medium;
  const ticker = `${TRACK_NAME} — 3 LAPS — 7 RIVALS — ${atmoName} — DIFFICULTY: ${diffCfg.label} (${diffCfg.cashMult}X PRIZE) — NITRO BOOST`;
  const totalStars = Object.values(career.stars).reduce((a, b) => a + b, 0);

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between overflow-hidden">
      {/* Cinematic gradient vignette to give rich contrast to UI */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-night-950/80 via-transparent to-night-950/90" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-96 bg-gradient-to-t from-night-950/95 via-night-900/60 to-transparent" />

      {/* Top Header */}
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-3 px-6 pt-5 sm:px-10 animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center border border-ember-400/40 bg-night-900/80 backdrop-blur-md">
            <Flag className="h-4 w-4 text-ember-400" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-[11px] tracking-[0.3em] text-ember-300">APX SERIES</div>
            <div className="text-[10px] tracking-[0.22em] text-white/50">COASTLINE CIRCUIT // RD 07</div>
          </div>
        </div>

        {/* Central Mode Switcher Tabs */}
        <div className="flex items-center gap-1 rounded-lg border border-white/15 bg-black/60 p-1 backdrop-blur-md shadow-2xl">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded bg-ember-500/20 border border-ember-400/80 px-3.5 py-1 text-xs font-display font-black tracking-wider text-ember-300 shadow-[0_0_12px_rgba(255,158,61,0.3)]"
          >
            <Zap className="h-3.5 w-3.5 fill-ember-400 text-ember-400" /> QUICK RACE
          </button>
          <button
            type="button"
            onClick={onOpenCareer}
            className="flex items-center gap-1.5 rounded px-3.5 py-1 text-xs font-display font-bold tracking-wider text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            <Trophy className="h-3.5 w-3.5 text-amber-400" /> CAREER
          </button>
          <button
            type="button"
            onClick={onOpenGarage}
            className="flex items-center gap-1.5 rounded px-3.5 py-1 text-xs font-display font-bold tracking-wider text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            <Gauge className="h-3.5 w-3.5 text-sky-400" /> GARAGE
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Wallet and Star count */}
          <div className="hidden sm:flex items-center gap-3 border border-white/15 bg-night-900/80 px-3 py-1 text-xs font-mono backdrop-blur-md rounded">
            <span className="text-amber-400 font-bold flex items-center gap-1">
              ★ {totalStars}
            </span>
            <span className="text-white/20">|</span>
            <span className="text-emerald-400 font-bold">
              ${career.credits.toLocaleString()}
            </span>
          </div>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 border border-white/15 bg-night-900/70 px-3 py-1.5 text-white/70 backdrop-blur-md transition-all hover:border-ember-400/50 hover:text-ember-300 active:scale-95"
            title="Open Settings"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden font-display text-[10px] tracking-[0.2em] sm:inline">SETTINGS</span>
          </button>

          {/* Music Toggle */}
          <button
            onClick={onToggleMusic}
            className={cn(
              "grid h-8.5 w-8.5 place-items-center border backdrop-blur-md transition-all active:scale-95",
              musicOn ? "border-ember-400/50 bg-ember-500/10 text-ember-300" : "border-white/15 bg-night-900/70 text-white/35",
            )}
            title="Toggle Music"
          >
            <Music className="h-4 w-4" />
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleMute}
            className={cn(
              "grid h-8.5 w-8.5 place-items-center border backdrop-blur-md transition-all active:scale-95",
              !muted ? "border-ember-400/50 bg-ember-500/10 text-ember-300" : "border-white/15 bg-night-900/70 text-white/35",
            )}
            title="Toggle Sound FX"
          >
            {!muted ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* Hero Title Section */}
      <div className="relative z-10 flex flex-col items-center px-6 text-center -mt-2 sm:mt-1">
        <div
          className="animate-fade-up inline-flex items-center gap-2 border border-ember-400/30 bg-night-950/70 px-3.5 py-1 text-[10px] font-semibold tracking-[0.45em] text-ember-300/90 backdrop-blur-md sm:text-xs"
          style={{ animationDelay: "0.05s" }}
        >
          <Sparkles className="h-3 w-3 text-ember-400" />
          {GAME_SUB}
        </div>

        <h1
          className="animate-fade-up font-display text-[13vw] leading-[0.92] tracking-tight text-transparent italic sm:text-[6.5rem] lg:text-[7.5rem]"
          style={{
            animationDelay: "0.12s",
            backgroundImage: "linear-gradient(175deg, #ffffff 10%, #ffe3a8 30%, #ff8e24 60%, #a83808 90%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            filter: "drop-shadow(0 6px 35px rgba(255,123,28,0.4)) drop-shadow(0 2px 10px rgba(0,0,0,0.85))",
          }}
        >
          {GAME_TITLE}
        </h1>

        {/* Clean Glass Ticker Pill */}
        <div
          className="animate-fade-up mt-2 w-full max-w-lg overflow-hidden border border-white/12 bg-night-950/75 py-1 px-4 backdrop-blur-md"
          style={{ animationDelay: "0.18s" }}
        >
          <div className="flex w-max animate-marquee whitespace-nowrap text-[9px] font-semibold tracking-[0.3em] text-ember-200/80">
            <span className="pr-8">{ticker}</span>
            <span className="pr-8">{ticker}</span>
          </div>
        </div>
      </div>

      {/* Bottom Hub: Atmosphere + Car Select + Launch */}
      <div className="relative z-10 px-4 pb-4 sm:px-10 sm:pb-6">
        {/* Atmosphere & Record Header */}
        <div className="animate-fade-up mb-3 flex flex-wrap items-center justify-between gap-3" style={{ animationDelay: "0.24s" }}>
          <div className="flex items-center gap-2.5">
            <span className="font-display text-[10px] tracking-[0.3em] text-white/50">ATMOSPHERE:</span>
            <div className="inline-flex border border-white/15 bg-night-950/80 p-0.5 backdrop-blur-md shadow-lg">
              <button
                type="button"
                onClick={() => onSelectWeather("sunset")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 font-display text-[10px] tracking-[0.16em] transition-all",
                  weather === "sunset"
                    ? "bg-gradient-to-r from-amber-600 to-amber-500 font-bold text-night-900 shadow-[0_0_18px_rgba(245,158,11,0.5)]"
                    : "text-white/60 hover:bg-white/5 hover:text-white",
                )}
              >
                <Sun className="h-3 w-3" />
                GOLDEN HOUR
              </button>
              <button
                type="button"
                onClick={() => onSelectWeather("night")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 font-display text-[10px] tracking-[0.16em] transition-all",
                  weather === "night"
                    ? "bg-gradient-to-r from-cyan-500 via-sky-500 to-fuchsia-600 font-bold text-white shadow-[0_0_20px_rgba(0,229,255,0.6)]"
                    : "text-white/60 hover:bg-white/5 hover:text-white",
                )}
              >
                <Moon className="h-3 w-3" />
                NEON NIGHT
              </button>
              <button
                type="button"
                onClick={() => onSelectWeather("rain")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 font-display text-[10px] tracking-[0.16em] transition-all",
                  weather === "rain"
                    ? "bg-gradient-to-r from-blue-600 to-cyan-400 font-bold text-white shadow-[0_0_20px_rgba(56,189,248,0.55)]"
                    : "text-white/60 hover:bg-white/5 hover:text-white",
                )}
              >
                <CloudRain className="h-3 w-3" />
                CYBER STORM
              </button>
            </div>
          </div>

          {/* Difficulty Preset Pill Selector */}
          <div className="flex items-center gap-2">
            <span className="font-display text-[10px] tracking-[0.3em] text-white/50">DIFFICULTY:</span>
            <div className="inline-flex border border-white/15 bg-night-950/80 p-0.5 backdrop-blur-md shadow-lg rounded">
              {DIFFICULTY_LEVELS.map((d) => {
                const cfg = DIFFICULTIES[d];
                const active = difficulty === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onSelectDifficulty(d)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 sm:px-3 py-1 font-display text-[10px] tracking-[0.16em] transition-all rounded-xs",
                      active
                        ? d === "grandmaster"
                          ? "bg-gradient-to-r from-rose-500 via-fuchsia-500 to-purple-600 font-extrabold text-white shadow-[0_0_20px_rgba(244,63,94,0.85)] ring-1 ring-rose-300/40"
                          : d === "pro"
                          ? "bg-gradient-to-r from-amber-500 to-ember-500 font-bold text-night-900 shadow-[0_0_16px_rgba(255,158,61,0.6)]"
                          : d === "medium"
                          ? "bg-gradient-to-r from-sky-500 to-cyan-400 font-bold text-night-900 shadow-[0_0_16px_rgba(14,165,233,0.6)]"
                          : "bg-emerald-500 font-bold text-night-900 shadow-[0_0_16px_rgba(16,185,129,0.6)]"
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                    )}
                    title={`${cfg.label} (${cfg.cashMult}X Payout) — ${cfg.desc}`}
                  >
                    {d === "noob" && <ShieldCheck className="h-3 w-3" />}
                    {d === "medium" && <Gauge className="h-3 w-3" />}
                    {d === "pro" && <Flame className="h-3 w-3" />}
                    {d === "grandmaster" && <Zap className="h-3 w-3 fill-current" />}
                    <span>{cfg.label}</span>
                    <span
                      className={cn(
                        "font-mono text-[9px] px-1 py-0.2 rounded font-bold",
                        active
                          ? d === "grandmaster"
                            ? "bg-white/20 text-white"
                            : "bg-night-950/40 text-night-900"
                          : "bg-white/10 text-white/70"
                      )}
                    >
                      {cfg.cashMult}X
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {bestLap !== null && (
            <div className="flex items-center gap-2 border border-ember-400/30 bg-night-950/70 px-3 py-1 text-[11px] font-semibold tracking-widest text-ember-300 backdrop-blur-md">
              <Trophy className="h-3.5 w-3.5" />
              LAP RECORD {formatTime(bestLap)}
            </div>
          )}
        </div>

        {/* Machine Selection Grid */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" style={{ animationDelay: "0.32s" }}>
          {CARS.map((car, i) => {
            const active = car.id === carId;
            const preview = previews.find((p) => p.id === car.id)?.url;
            const upgrades = career.upgrades[car.id] || DEFAULT_UPGRADES;
            const totalStages = Object.values(upgrades).reduce((a, b) => a + b, 0);
            const tunedBhp = car.bhp + (upgrades.engine || 0) * 28;

            return (
              <button
                key={car.id}
                onClick={() => onSelectCar(car.id)}
                className={cn(
                  "animate-fade-up group relative overflow-hidden border text-left transition-all duration-300 rounded-lg",
                  active
                    ? "corner-frame border-ember-400/80 bg-night-800/95 shadow-[0_0_35px_rgba(255,123,28,0.25)] ring-1 ring-ember-400/40"
                    : "border-white/12 bg-night-900/85 backdrop-blur-md hover:border-white/30 hover:bg-night-800/90",
                )}
                style={{ animationDelay: `${0.32 + i * 0.05}s` }}
              >
                {/* Turntable Preview Container */}
                <div className="relative overflow-hidden bg-night-950">
                  {preview && (
                    <img
                      src={preview}
                      alt={car.name}
                      className={cn(
                        "h-28 w-full object-contain sm:h-32 transition-transform duration-500",
                        active ? "scale-105" : "group-hover:scale-[1.03]"
                      )}
                      draggable={false}
                    />
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-night-900/90 via-transparent to-transparent" />
                  <div className="absolute left-2.5 top-2 flex flex-wrap items-center gap-1">
                    <span
                      className={cn(
                        "px-1.5 py-0.5 text-[8px] font-bold tracking-[0.16em] border rounded",
                        active
                          ? "border-ember-400 bg-ember-500 text-night-900 font-black shadow-[0_0_10px_rgba(255,158,61,0.5)]"
                          : "border-white/15 bg-night-900/80 text-white/60"
                      )}
                    >
                      {car.cls.split("//")[0].trim()}
                    </span>
                    {totalStages > 0 && (
                      <span className="px-1.5 py-0.5 text-[8px] font-mono font-bold bg-amber-400/20 border border-amber-400/50 text-amber-300 rounded">
                        STG {totalStages}
                      </span>
                    )}
                  </div>
                </div>

                {/* Specs and details */}
                <div className="space-y-1.5 p-3 bg-gradient-to-b from-transparent to-night-950/70">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className={cn("font-display text-base italic tracking-wide", active ? "text-ember-300" : "text-white/90")}>
                        {car.name}
                      </div>
                      <div className="text-[9px] font-mono text-white/40 truncate">
                        {tunedBhp} BHP // {car.weightKg} KG
                      </div>
                    </div>
                    {active && (
                      <span className="font-display text-[8px] tracking-widest text-ember-400 font-bold animate-pulse">
                        READY
                      </span>
                    )}
                  </div>
                  <Stat
                    icon={<Gauge className="h-3 w-3" />}
                    label="TOP"
                    value={Math.min(1, car.statTop + (upgrades.engine || 0) * 0.05)}
                    active={active}
                  />
                  <Stat
                    icon={<Zap className="h-3 w-3" />}
                    label="ACC"
                    value={Math.min(1, car.statAcc + (upgrades.trans || 0) * 0.05)}
                    active={active}
                  />
                  <Stat
                    icon={<Wind className="h-3 w-3" />}
                    label="GRIP"
                    value={Math.min(1, car.statGrip + (upgrades.tires || 0) * 0.05)}
                    active={active}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* CTA Launch + Controls Bar */}
        <div className="animate-fade-up mt-4 flex flex-col items-center gap-3 sm:mt-5 sm:flex-row sm:justify-between" style={{ animationDelay: "0.5s" }}>
          <div className="hidden flex-wrap items-center gap-x-3.5 gap-y-1 text-[10px] font-semibold tracking-[0.16em] text-white/45 sm:flex">
            <span><Kbd>↑ / W</Kbd> ACCEL</span>
            <span><Kbd>↓ / S</Kbd> BRAKE</span>
            <span><Kbd>← → / A D</Kbd> STEER</span>
            <span><Kbd>SHIFT</Kbd> NITRO</span>
            <span><Kbd>SPACE</Kbd> DRIFT</span>
            <span><Kbd>V</Kbd> LIGHTING</span>
            <span><Kbd>O</Kbd> SETTINGS</span>
            <span><Kbd>ESC</Kbd> PAUSE</span>
          </div>

          <button
            onClick={onStart}
            className="group relative flex items-center gap-3 overflow-hidden bg-gradient-to-r from-ember-600 via-ember-500 to-ember-400 px-10 py-3.5 font-display text-lg italic tracking-wider text-night-900 shadow-[0_0_55px_rgba(255,123,28,0.45)] transition-transform duration-200 hover:scale-[1.04] active:scale-95"
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
      <span className="text-[9px] font-mono text-white/40">{Math.round(value * 100)}%</span>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="mx-0.5 inline-block border border-white/20 bg-white/5 px-1.5 py-0.5 font-bold text-white/70">{children}</span>
  );
}
