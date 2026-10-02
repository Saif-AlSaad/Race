import { ChevronLeft, Flag, RotateCcw, Trophy } from "lucide-react";
import type { RaceResult } from "../game/engine";
import { formatTime, ordinal, TOTAL_LAPS } from "../game/constants";
import { cn } from "../utils/cn";

interface ResultsProps {
  result: RaceResult;
  isRecord: boolean;
  onRestart: () => void;
  onMenu: () => void;
}

export default function Results({ result, isRecord, onRestart, onMenu }: ResultsProps) {
  const won = result.position === 1;
  return (
    <div className="absolute inset-0 z-30 grid place-items-center overflow-y-auto bg-night-900/40 p-4 backdrop-blur-[3px]">
      <div className="animate-fade-up w-full max-w-xl">
        <div className="mb-4 text-center">
          <div className="text-[10px] font-bold tracking-[0.5em] text-ember-300">RACE COMPLETE</div>
          <div
            className={cn("font-display text-[26vw] italic leading-none sm:text-9xl", won ? "glow-amber" : "hud-shadow")}
            style={
              won
                ? {
                    backgroundImage: "linear-gradient(175deg,#fff6e8 10%,#ffc36e 40%,#ff7b1c 75%)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                  }
                : { color: "rgba(255,255,255,0.92)" }
            }
          >
            {ordinal(result.position)}
          </div>
          {won && (
            <div className="mt-1 flex items-center justify-center gap-2 text-sm font-bold tracking-[0.3em] text-ember-300">
              <Trophy className="h-4 w-4" /> GRAND PRIX CHAMPION
            </div>
          )}
          {isRecord && (
            <div className="mx-auto mt-2 w-max bg-ember-500/90 px-3 py-1 text-[10px] font-black tracking-[0.3em] text-night-900">
              NEW LAP RECORD
            </div>
          )}
        </div>

        {/* stats */}
        <div className="panel corner-frame grid grid-cols-3 divide-x divide-white/10">
          <StatCell label="TOTAL TIME" value={formatTime(result.totalTime)} />
          <StatCell label="BEST LAP" value={result.bestLap > 0 ? formatTime(result.bestLap) : "—"} accent />
          <StatCell label="LAPS" value={`${result.laps.length}/${TOTAL_LAPS}`} />
        </div>

        {/* lap chips */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {result.laps.map((l, i) => (
            <span
              key={i}
              className={cn(
                "border px-2 py-1 font-mono text-[11px] tracking-wider",
                l === result.bestLap ? "border-ember-400/60 text-ember-300" : "border-white/10 text-white/55",
              )}
            >
              L{i + 1} {formatTime(l)}
            </span>
          ))}
        </div>

        {/* standings */}
        <div className="panel mt-3 max-h-48 overflow-y-auto">
          {result.standings.map((s, i) => (
            <div
              key={s.name + i}
              className={cn(
                "flex items-center gap-3 border-b border-white/5 px-4 py-2 text-sm last:border-0",
                s.isPlayer && "bg-ember-500/12",
              )}
            >
              <span className={cn("w-8 font-display text-lg italic", i === 0 ? "text-ember-400" : i < 3 ? "text-white/85" : "text-white/40")}>
                {i + 1}
              </span>
              <span className={cn("flex-1 font-bold tracking-[0.2em]", s.isPlayer ? "text-ember-300" : "text-white/75")}>
                {s.name}
                {s.isPlayer && <span className="ml-2 text-[9px] text-white/40">YOU</span>}
              </span>
              {i === 0 && <Flag className="h-3.5 w-3.5 text-ember-400" />}
              <span className="font-mono text-[11px] tracking-wider text-white/50">{s.gap}</span>
            </div>
          ))}
        </div>

        {/* actions */}
        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            onClick={onMenu}
            className="flex items-center gap-2 border border-white/20 px-6 py-3 font-display text-sm tracking-wider text-white/80 transition-colors hover:border-white/50 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" /> PADDOCK
          </button>
          <button
            onClick={onRestart}
            className="group relative flex items-center gap-2 overflow-hidden bg-gradient-to-r from-ember-600 to-ember-400 px-8 py-3 font-display text-sm tracking-wider text-night-900 shadow-[0_0_40px_rgba(255,123,28,0.4)] transition-transform hover:scale-105 active:scale-95"
          >
            <RotateCcw className="h-4 w-4" /> RACE AGAIN
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="px-3 py-4 text-center">
      <div className="text-[9px] font-bold tracking-[0.3em] text-white/40">{label}</div>
      <div className={cn("mt-1 font-mono text-lg tracking-wider sm:text-xl", accent ? "text-ember-300" : "text-white")}>{value}</div>
    </div>
  );
}
