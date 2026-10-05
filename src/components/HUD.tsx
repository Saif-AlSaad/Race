import { useEffect, useRef, useState } from "react";
import { Flame, Gauge, Route, Zap, Sun, Moon, CloudRain, ShieldCheck, Wind } from "lucide-react";
import type { RaceEngine, HudState } from "../game/engine";
import { TRACK_NAME, formatTime, ordinal, DIFFICULTIES } from "../game/constants";
import { cn } from "../utils/cn";

export default function HUD({
  engine,
  onCycleWeather,
}: {
  engine: RaceEngine;
  onCycleWeather?: () => void;
}) {
  const [hud, setHud] = useState<HudState>(() => engine.hud());
  const mapRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (t - last < 35) return;
      last = t;
      setHud(engine.hud());
      drawMap(engine, mapRef.current);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [engine]);

  const mph = hud.mph.toString().padStart(3, "0");
  const boostFull = hud.boost > 97;
  const diffConfig = DIFFICULTIES[hud.difficulty] || DIFFICULTIES.medium;

  // Shift LED colors: 0..7
  // 1, 2: Green
  // 3, 4: Amber
  // 5, 6: Red
  // 7: Flashing Magenta/Redline
  const shiftLevel = hud.shiftLights;
  const isRedline = shiftLevel >= 7;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 select-none overflow-hidden">
      {/* ---- TOP CENTER: F1 / GT3 LED SHIFT STRIP & LAP PROGRESS ---- */}
      <div className="absolute left-1/2 top-3 sm:top-5 -translate-x-1/2 flex flex-col items-center gap-1.5">
        {/* GT3 Shift Bar */}
        <div className="flex items-center gap-1 px-3 py-1 rounded bg-black/60 border border-white/10 backdrop-blur-md shadow-2xl">
          <div className="flex items-center gap-1">
            {[1, 2].map((lvl) => (
              <div
                key={lvl}
                className={cn(
                  "h-2 w-4 sm:w-5 skew-x-[-15deg] rounded-xs transition-all duration-75",
                  shiftLevel >= lvl
                    ? "bg-emerald-400 shadow-[0_0_10px_#34d399]"
                    : "bg-emerald-950/40 border border-emerald-900/30",
                )}
              />
            ))}
            {[3, 4].map((lvl) => (
              <div
                key={lvl}
                className={cn(
                  "h-2 w-4 sm:w-5 skew-x-[-15deg] rounded-xs transition-all duration-75",
                  shiftLevel >= lvl
                    ? "bg-amber-400 shadow-[0_0_10px_#fbbf24]"
                    : "bg-amber-950/40 border border-amber-900/30",
                )}
              />
            ))}
            {[5, 6].map((lvl) => (
              <div
                key={lvl}
                className={cn(
                  "h-2 w-4 sm:w-5 skew-x-[-15deg] rounded-xs transition-all duration-75",
                  shiftLevel >= lvl
                    ? "bg-rose-500 shadow-[0_0_10px_#f43f5e]"
                    : "bg-rose-950/40 border border-rose-900/30",
                )}
              />
            ))}
            <div
              className={cn(
                "h-2 w-5 sm:w-6 skew-x-[-15deg] rounded-xs transition-all duration-75",
                isRedline
                  ? "bg-purple-400 shadow-[0_0_14px_#c084fc] animate-pulse"
                  : "bg-purple-950/30 border border-purple-900/20",
              )}
            />
          </div>
          <span className={cn(
            "ml-2 text-[9px] font-mono font-bold tracking-wider",
            isRedline ? "text-purple-300 animate-blink" : "text-white/40"
          )}>
            {isRedline ? "SHIFT" : `${hud.rpmRaw} RPM`}
          </span>
        </div>

        {/* Lap Pill */}
        <div className="panel px-4 py-1.5 text-center flex flex-col items-center">
          <div className="font-display text-xs tracking-[0.28em] text-white/90">
            LAP <span className="text-ember-400 font-bold">{hud.lap}</span>
            <span className="text-white/40"> / {hud.totalLaps}</span>
          </div>
          <div className="mt-1 h-1 w-36 sm:w-48 overflow-hidden bg-white/10 rounded-full">
            <div
              className="h-full bg-gradient-to-r from-ember-600 via-amber-400 to-amber-300 transition-[width] duration-200 ease-linear"
              style={{ width: `${hud.lapProgress * 100}%` }}
            />
          </div>
        </div>

        {/* Weather switcher */}
        {onCycleWeather && (
          <button
            type="button"
            onClick={onCycleWeather}
            className="pointer-events-auto panel flex items-center gap-1.5 px-2.5 py-0.5 text-[9px] font-display tracking-[0.2em] transition-all hover:border-ember-400/60"
            title="Click or press [V] to cycle Atmosphere"
          >
            {hud.weather === "sunset" && (
              <>
                <Sun className="h-2.5 w-2.5 text-amber-400" />
                <span className="text-amber-200">GOLDEN HOUR</span>
              </>
            )}
            {hud.weather === "night" && (
              <>
                <Moon className="h-2.5 w-2.5 text-cyan-400" />
                <span className="text-cyan-300">NEON NIGHT</span>
              </>
            )}
            {hud.weather === "rain" && (
              <>
                <CloudRain className="h-2.5 w-2.5 text-sky-400" />
                <span className="text-sky-300">CYBER STORM</span>
              </>
            )}
            <span className="ml-0.5 font-mono text-[8px] text-white/40">[V]</span>
          </button>
        )}
      </div>

      {/* ---- TOP LEFT: POSITION & SECTOR DELTA ---- */}
      <div className="absolute left-4 top-4 sm:left-6 sm:top-6">
        <div className="panel corner-frame px-4 py-3">
          <div className="flex items-baseline gap-2">
            <span className={cn(
              "font-display text-5xl italic leading-none sm:text-6xl tracking-tight",
              hud.position === 1 ? "text-ember-400 glow-amber" : "text-white hud-shadow"
            )}>
              P{hud.position}
            </span>
            <span className="font-display text-lg text-white/40">/{hud.racers}</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-[0.25em] text-ember-300/90">
              {hud.position === 1 ? "LEADER" : hud.gapAhead ? `${hud.gapAhead}s TO P${hud.position - 1}` : `${ordinal(hud.position)} PLACE`}
            </span>
            <span
              className={cn(
                "text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 border rounded flex items-center gap-1",
                hud.difficulty === "grandmaster"
                  ? "border-rose-400/60 text-rose-300 bg-rose-500/20 shadow-[0_0_8px_rgba(244,63,94,0.45)]"
                  : hud.difficulty === "pro"
                  ? "border-amber-400/50 text-amber-300 bg-amber-500/20"
                  : hud.difficulty === "medium"
                  ? "border-sky-400/50 text-sky-300 bg-sky-500/20"
                  : "border-emerald-400/50 text-emerald-300 bg-emerald-500/20"
              )}
            >
              {diffConfig.label} • {diffConfig.cashMult}X
            </span>
          </div>
        </div>
      </div>

      {/* ---- TOP RIGHT: TELEMETRY TIMINGS ---- */}
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <div className="panel corner-frame px-4 py-3 font-mono text-right text-[11px] leading-relaxed tracking-wider">
          <TimeRow label="RACE" value={formatTime(hud.raceTime)} strong />
          <TimeRow label="LAP" value={formatTime(hud.lapTime)} />
          {hud.lastLap > 0 && <TimeRow label="LAST" value={formatTime(hud.lastLap)} dim />}
          {hud.bestLap > 0 && <TimeRow label="BEST" value={formatTime(hud.bestLap)} accent />}
        </div>
      </div>

      {/* ---- BOTTOM LEFT: MINIMAP & LIVE G-FORCE METER ---- */}
      <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 flex items-end gap-3">
        {/* Track minimap */}
        <div className="panel corner-frame p-2 hidden sm:block">
          <canvas ref={mapRef} width={128} height={128} className="block" />
          <div className="mt-1 flex items-center gap-1.5 px-0.5 text-[9px] font-bold tracking-[0.2em] text-white/50">
            <Route className="h-3 w-3 text-ember-400" />
            {TRACK_NAME}
          </div>
        </div>

        {/* Realistic G-Force Lateral Vector Pod */}
        <div className="panel px-3 py-2.5 flex items-center gap-2.5 border border-white/10 backdrop-blur-md">
          {/* Circular G-Force crosshair */}
          <div className="relative h-11 w-11 rounded-full border border-white/20 bg-black/40 flex items-center justify-center">
            {/* crosshairs */}
            <div className="absolute h-full w-[1px] bg-white/10" />
            <div className="absolute w-full h-[1px] bg-white/10" />
            <div className="absolute h-6 w-6 rounded-full border border-white/15" />
            {/* G vector dot */}
            <div
              className="absolute h-2.5 w-2.5 rounded-full bg-ember-400 shadow-[0_0_8px_#ff9e3d] transition-all duration-75"
              style={{
                transform: `translate(${Math.min(18, hud.lateralG * 10) * (hud.drifting ? 1 : 0.8)}px, 0px)`,
              }}
            />
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] font-mono uppercase tracking-[0.2em] text-white/40">LATERAL G</span>
            <span className="font-mono text-sm font-bold text-white/95">
              {hud.lateralG.toFixed(2)} <span className="text-[10px] text-ember-400">G</span>
            </span>
            {hud.cleanRace ? (
              <span className="flex items-center gap-1 text-[8px] text-emerald-400 font-semibold tracking-wider">
                <ShieldCheck className="h-2.5 w-2.5" /> CLEAN BONUS
              </span>
            ) : (
              <span className="text-[8px] text-amber-500/70 font-mono tracking-wider">
                INCIDENT
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ---- BOTTOM RIGHT: SPEEDOMETER, GEAR & NITROUS CLUSTER ---- */}
      <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6">
        <div className="panel corner-frame px-5 py-4">
          <div className="flex items-end justify-end gap-3">
            {/* Status chips */}
            <div className="mb-2 flex flex-col items-end gap-1">
              {hud.drafting && hud.draftFactor > 0.08 && (
                <div className="flex flex-col items-end gap-0.5">
                  <span className="flex items-center gap-1.5 bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-300 px-2 py-0.5 text-[10px] font-black tracking-widest text-black shadow-[0_0_14px_rgba(56,189,248,0.9)] animate-pulse">
                    <Wind className="h-3 w-3 fill-black text-black" />
                    SLIPSTREAM {hud.draftRival ? `[${hud.draftRival}]` : ""} +{Math.round(hud.draftFactor * 14)} MPH
                  </span>
                  <div className="h-1 w-28 bg-white/10 overflow-hidden rounded-full">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-[width] duration-75 shadow-[0_0_8px_#38bdf8]"
                      style={{ width: `${Math.min(100, Math.round(hud.draftFactor * 100))}%` }}
                    />
                  </div>
                </div>
              )}
              {hud.boosting && (
                <span className="flex items-center gap-1 bg-gradient-to-r from-ember-500 to-amber-400 px-2 py-0.5 text-[10px] font-black tracking-widest text-black shadow-[0_0_12px_rgba(255,158,61,0.8)] animate-pulse">
                  <Zap className="h-3 w-3 fill-black" /> NITROUS
                </span>
              )}
              {hud.drifting && (
                <div className="flex flex-col items-end gap-0.5">
                  <span className={cn(
                    "flex items-center gap-1 px-2 py-0.5 text-[10px] font-black tracking-widest text-black shadow-[0_0_12px_rgba(56,189,248,0.8)]",
                    hud.driftTier === 3
                      ? "bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-300 shadow-[0_0_16px_#c084fc] animate-pulse"
                      : hud.driftTier === 2
                      ? "bg-gradient-to-r from-amber-400 to-yellow-300 shadow-[0_0_12px_#fbbf24]"
                      : hud.driftTier === 1
                      ? "bg-gradient-to-r from-sky-400 to-cyan-300 shadow-[0_0_10px_#38bdf8]"
                      : "bg-sky-400/80 text-black"
                  )}>
                    <Flame className="h-3 w-3 fill-black" />
                    {hud.driftTier === 3 ? "MINI-TURBO MAX" : hud.driftTier === 2 ? "BOOST TIER 2" : hud.driftTier === 1 ? "BOOST TIER 1" : "DRIFTING"}
                  </span>
                  <div className="h-1 w-24 bg-white/10 overflow-hidden rounded-full">
                    <div
                      className={cn(
                        "h-full transition-[width] duration-75",
                        hud.driftTier === 3 ? "bg-gradient-to-r from-purple-400 to-pink-400" : hud.driftTier === 2 ? "bg-amber-400" : "bg-sky-400"
                      )}
                      style={{ width: `${Math.round(hud.driftCharge * 100)}%` }}
                    />
                  </div>
                </div>
              )}
              {hud.airbrakeActive && (
                <span className="flex items-center gap-1 bg-gradient-to-r from-rose-600 to-red-500 px-2 py-0.5 text-[10px] font-black tracking-widest text-white shadow-[0_0_12px_rgba(244,63,94,0.7)] animate-pulse">
                  AIRBRAKE
                </span>
              )}
              {hud.drsActive && !hud.boosting && (
                <span className="flex items-center gap-1 bg-gradient-to-r from-emerald-500 to-teal-400 px-2 py-0.5 text-[10px] font-black tracking-widest text-black shadow-[0_0_10px_rgba(52,211,153,0.7)]">
                  DRS OPEN
                </span>
              )}
              {hud.offroad && (
                <span className="bg-red-500/90 px-2 py-0.5 text-[10px] font-black tracking-widest text-white shadow-[0_0_10px_rgba(239,68,68,0.6)]">
                  OFF ROAD
                </span>
              )}
            </div>

            {/* Speed digits */}
            <div className="flex items-baseline gap-1.5">
              <span className={cn(
                "font-display text-6xl italic leading-none sm:text-7xl tracking-tighter",
                hud.boosting ? "text-amber-300 glow-amber" : "text-white hud-shadow"
              )}>
                {mph}
              </span>
              <span className="font-display text-sm text-ember-300/90 font-bold">{hud.speedUnit}</span>
            </div>
          </div>

          {/* Gear + RPM Bar */}
          <div className="mt-2 flex items-center gap-2">
            <div className={cn(
              "grid h-8 w-8 place-items-center border bg-black/60 font-display text-lg font-bold transition-colors",
              isRedline ? "border-rose-500 text-rose-400 animate-pulse" : "border-ember-400/50 text-ember-400"
            )}>
              {hud.gear}
            </div>
            <div className="h-3.5 flex-1 skew-x-[-12deg] overflow-hidden bg-white/10 p-[1px]">
              <div
                className={cn(
                  "h-full transition-[width] duration-75",
                  isRedline
                    ? "bg-gradient-to-r from-amber-400 via-rose-500 to-purple-500 shadow-[0_0_12px_#f43f5e]"
                    : hud.rpm > 0.82
                    ? "bg-gradient-to-r from-ember-500 to-rose-500"
                    : "bg-gradient-to-r from-emerald-500 via-amber-400 to-ember-400",
                )}
                style={{ width: `${hud.rpm * 100}%` }}
              />
            </div>
            <Gauge className="h-3.5 w-3.5 text-white/35" />
          </div>

          {/* Nitro Gauge */}
          <div className="mt-2.5 flex items-center gap-2">
            <Zap className={cn("h-4 w-4", boostFull ? "animate-blink text-ember-300" : "text-white/35", hud.boosting && "text-ember-400 fill-ember-400")} />
            <div className="flex flex-1 gap-0.5">
              {Array.from({ length: 20 }).map((_, i) => {
                const on = hud.boost >= (i + 1) * 5;
                return (
                  <div
                    key={i}
                    className={cn(
                      "h-2.5 flex-1 skew-x-[-16deg] transition-all",
                      on
                        ? hud.boosting || boostFull
                          ? "bg-gradient-to-t from-ember-600 via-amber-400 to-amber-300 shadow-[0_0_8px_rgba(255,158,61,0.8)]"
                          : "bg-ember-500/70"
                        : "bg-white/10",
                    )}
                  />
                );
              })}
            </div>
            <span className={cn(
              "w-16 text-right text-[9px] font-black tracking-[0.2em] font-mono",
              hud.boosting ? "text-amber-300" : boostFull ? "text-ember-300" : "text-white/40"
            )}>
              {hud.boosting ? "BOOST" : boostFull ? "OVERCHARGE" : "NITRO"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimeRow({ label, value, dim, accent, strong }: { label: string; value: string; dim?: boolean; accent?: boolean; strong?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-4", dim && "opacity-55")}>
      <span className={cn("text-[9px] font-bold tracking-[0.25em]", accent ? "text-ember-300" : "text-white/40")}>{label}</span>
      <span className={cn(strong ? "text-white" : "text-white/80", accent && "text-ember-300")}>{value}</span>
    </div>
  );
}

function drawMap(engine: RaceEngine, canvas: HTMLCanvasElement | null) {
  if (!canvas) return;
  const g = canvas.getContext("2d");
  if (!g) return;
  const W = canvas.width;
  const data = engine.minimap();
  g.clearRect(0, 0, W, W);
  // outline
  g.strokeStyle = "rgba(255,255,255,0.28)";
  g.lineWidth = 5;
  g.lineJoin = "round";
  g.beginPath();
  data.outline.forEach((p, i) => {
    const x = p.x * W, y = p.y * W;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  });
  g.closePath();
  g.stroke();
  g.strokeStyle = "rgba(255,195,110,0.85)";
  g.lineWidth = 1.6;
  g.stroke();
  // dots
  for (const d of data.dots) {
    g.fillStyle = d.color;
    g.beginPath();
    g.arc(d.x * W, d.y * W, d.player ? 4.5 : 2.6, 0, Math.PI * 2);
    g.fill();
    if (d.player) {
      g.strokeStyle = "rgba(255,158,61,0.5)";
      g.lineWidth = 2;
      g.beginPath();
      g.arc(d.x * W, d.y * W, 7.5, 0, Math.PI * 2);
      g.stroke();
    }
  }
}
