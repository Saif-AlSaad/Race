import { useEffect, useRef, useState } from "react";
import { Flame, Gauge, Route, Zap } from "lucide-react";
import type { RaceEngine, HudState } from "../game/engine";
import { TRACK_NAME, formatTime, ordinal } from "../game/constants";
import { cn } from "../utils/cn";

export default function HUD({ engine }: { engine: RaceEngine }) {
  const [hud, setHud] = useState<HudState>(() => engine.hud());
  const mapRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (t - last < 45) return;
      last = t;
      setHud(engine.hud());
      drawMap(engine, mapRef.current);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [engine]);

  const mph = hud.mph.toString().padStart(3, "0");
  const boostFull = hud.boost > 97;

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {/* ---- top left: position ---- */}
      <div className="absolute left-4 top-4 sm:left-6 sm:top-6">
        <div className="panel corner-frame px-4 py-3">
          <div className="flex items-baseline gap-2">
            <span className={cn("font-display text-5xl italic leading-none sm:text-6xl", hud.position === 1 ? "text-ember-400 glow-amber" : "text-white hud-shadow")}>
              P{hud.position}
            </span>
            <span className="font-display text-lg text-white/40">/{hud.racers}</span>
          </div>
          <div className="mt-1 text-[10px] font-bold tracking-[0.25em] text-ember-300/80">
            {hud.position === 1 ? "RACE LEADER" : hud.gapAhead ? `${hud.gapAhead}s TO P${hud.position - 1}` : `${ordinal(hud.position)} PLACE`}
          </div>
        </div>
      </div>

      {/* ---- top center: lap ---- */}
      <div className="absolute left-1/2 top-4 -translate-x-1/2 sm:top-6">
        <div className="panel px-5 py-2.5 text-center">
          <div className="font-display text-sm tracking-[0.3em] text-white/85">
            LAP <span className="text-ember-400">{hud.lap}</span>
            <span className="text-white/40"> / {hud.totalLaps}</span>
          </div>
          <div className="mt-1.5 h-1 w-40 overflow-hidden bg-white/10 sm:w-52">
            <div
              className="h-full bg-gradient-to-r from-ember-600 to-ember-300 transition-[width] duration-200 ease-linear"
              style={{ width: `${hud.lapProgress * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* ---- top right: times ---- */}
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <div className="panel corner-frame px-4 py-3 font-mono text-right text-[11px] leading-relaxed tracking-wider">
          <TimeRow label="RACE" value={formatTime(hud.raceTime)} strong />
          <TimeRow label="LAP" value={formatTime(hud.lapTime)} />
          {hud.lastLap > 0 && <TimeRow label="LAST" value={formatTime(hud.lastLap)} dim />}
          {hud.bestLap > 0 && <TimeRow label="BEST" value={formatTime(hud.bestLap)} accent />}
        </div>
      </div>

      {/* ---- bottom left: minimap ---- */}
      <div className="absolute bottom-4 left-4 hidden sm:bottom-6 sm:left-6 sm:block">
        <div className="panel corner-frame p-2">
          <canvas ref={mapRef} width={132} height={132} className="block" />
          <div className="mt-1 flex items-center gap-1.5 px-0.5 text-[9px] font-bold tracking-[0.22em] text-white/50">
            <Route className="h-3 w-3 text-ember-400" />
            {TRACK_NAME}
          </div>
        </div>
      </div>

      {/* ---- bottom right: speedo ---- */}
      <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6">
        <div className="panel corner-frame px-5 py-4">
          <div className="flex items-end justify-end gap-3">
            {/* status chips */}
            <div className="mb-2 flex flex-col items-end gap-1">
              {hud.boosting && (
                <span className="flex items-center gap-1 bg-ember-500/90 px-2 py-0.5 text-[10px] font-black tracking-widest text-night-900">
                  <Zap className="h-3 w-3 fill-night-900" /> NITRO
                </span>
              )}
              {hud.drifting && (
                <span className="flex items-center gap-1 bg-sky-400/90 px-2 py-0.5 text-[10px] font-black tracking-widest text-night-900">
                  <Flame className="h-3 w-3" /> DRIFT +
                </span>
              )}
              {hud.offroad && (
                <span className="bg-red-500/85 px-2 py-0.5 text-[10px] font-black tracking-widest text-night-900">OFF ROAD</span>
              )}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-6xl italic leading-none text-white hud-shadow sm:text-7xl">{mph}</span>
              <span className="font-display text-sm text-ember-300/90">MPH</span>
            </div>
          </div>

          {/* gear + rpm */}
          <div className="mt-2 flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center border border-ember-400/50 bg-night-900/70 font-display text-lg text-ember-400">
              {hud.gear}
            </div>
            <div className="h-3 flex-1 skew-x-[-12deg] overflow-hidden bg-white/10">
              <div
                className={cn("h-full transition-[width] duration-75", hud.rpm > 0.88 ? "bg-gradient-to-r from-ember-500 to-red-500" : "bg-gradient-to-r from-ember-600 to-ember-300")}
                style={{ width: `${hud.rpm * 100}%` }}
              />
            </div>
            <Gauge className="h-3.5 w-3.5 text-white/35" />
          </div>

          {/* nitro */}
          <div className="mt-2 flex items-center gap-2">
            <Zap className={cn("h-4 w-4", boostFull ? "animate-blink text-ember-300" : "text-white/35", hud.boosting && "text-ember-400")} />
            <div className="flex flex-1 gap-0.5">
              {Array.from({ length: 20 }).map((_, i) => {
                const on = hud.boost >= (i + 1) * 5;
                return (
                  <div
                    key={i}
                    className={cn(
                      "h-2.5 flex-1 skew-x-[-16deg]",
                      on
                        ? hud.boosting || boostFull
                          ? "bg-gradient-to-t from-ember-600 to-ember-300 shadow-[0_0_8px_rgba(255,158,61,0.7)]"
                          : "bg-ember-500/60"
                        : "bg-white/10",
                    )}
                  />
                );
              })}
            </div>
            <span className={cn("w-14 text-right text-[9px] font-black tracking-[0.2em]", boostFull ? "text-ember-300" : "text-white/35")}>
              {hud.boosting ? "BURN" : boostFull ? "READY" : "NITRO"}
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
