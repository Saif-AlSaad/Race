import { useEffect } from "react";
import { ChevronLeft, Flag, RotateCcw, Trophy, Star, DollarSign, Wrench, Sparkles } from "lucide-react";
import type { RaceResult } from "../game/engine";
import { formatTime, ordinal, type CareerEvent, DIFFICULTIES } from "../game/constants";
import { cn } from "../utils/cn";
import { getAudio } from "../game/audio";

export interface RacePayout {
  basePurse: number;
  cleanBonus: number;
  difficultyMult: number;
  totalPurse: number;
  starsEarned: number;
}

interface ResultsProps {
  result: RaceResult;
  isRecord: boolean;
  careerEvent?: CareerEvent | null;
  payout?: RacePayout | null;
  onRestart: () => void;
  onMenu: () => void;
  onOpenGarage?: () => void;
  onNextCareerEvent?: () => void;
}

export default function Results({
  result,
  isRecord,
  careerEvent,
  payout,
  onRestart,
  onMenu,
  onOpenGarage,
  onNextCareerEvent,
}: ResultsProps) {
  const won = result.position === 1;
  const audio = getAudio();
  const diffConfig = DIFFICULTIES[result.difficulty || "pro"];

  useEffect(() => {
    if (payout && payout.totalPurse > 0) {
      const timer = setTimeout(() => {
        audio.cash(2);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [payout, audio]);

  return (
    <div className="absolute inset-0 z-30 grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-md select-none">
      <div className="animate-fade-up w-full max-w-xl my-auto py-4">
        {/* Header with Position */}
        <div className="mb-4 text-center">
          <div className="text-[10px] font-bold tracking-[0.5em] text-ember-300">
            {careerEvent ? `${careerEvent.name} // EVENT COMPLETE` : "RACE COMPLETE"}
          </div>
          <div
            className={cn(
              "font-display text-[24vw] italic leading-none sm:text-8xl tracking-tight",
              won ? "glow-amber" : "hud-shadow"
            )}
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
              <Trophy className="h-4 w-4" /> RACE WINNER
            </div>
          )}
          {isRecord && (
            <div className="mx-auto mt-2 w-max bg-ember-500 px-3 py-0.5 text-[10px] font-black tracking-[0.3em] text-night-900 rounded">
              NEW LAP RECORD
            </div>
          )}
        </div>

        {/* Career Stars Banner */}
        {careerEvent && payout && (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-center backdrop-blur-md shadow-[0_0_24px_rgba(251,191,36,0.15)]">
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3].map((starNum) => {
                const filled = payout.starsEarned >= starNum;
                return (
                  <Star
                    key={starNum}
                    className={cn(
                      "h-8 w-8 transition-transform duration-300",
                      filled
                        ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.9)] scale-110"
                        : "text-white/20 fill-white/5 scale-90"
                    )}
                  />
                );
              })}
            </div>
            <div className="mt-2 font-display text-sm font-black tracking-widest text-amber-300">
              {payout.starsEarned === 3 && "PERFECT VICTORY // 3 STARS EARNED"}
              {payout.starsEarned === 2 && "PODIUM FINISH // 2 STARS EARNED"}
              {payout.starsEarned === 1 && "POINTS SCORER // 1 STAR EARNED"}
              {payout.starsEarned === 0 && "UNPLACED // NO STARS AWARDED"}
            </div>
          </div>
        )}

        {/* Prize Purse & Difficulty Bonus Breakdown */}
        {payout && payout.totalPurse > 0 && (
          <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-4 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
              <span className="flex items-center gap-1.5 font-display text-xs font-bold tracking-widest text-emerald-300">
                <DollarSign className="h-4 w-4" /> PRIZE PURSE PAYOUT
              </span>
              <span className="font-mono text-xs font-bold text-emerald-400">
                +${payout.totalPurse.toLocaleString()} CREDITS
              </span>
            </div>
            <div className="mt-2.5 grid grid-cols-3 gap-2 font-mono text-xs text-white/70">
              <div>
                <span className="text-[9px] text-white/40 block">BASE PURSE</span>
                <span className="font-bold text-white">${payout.basePurse.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[9px] text-white/40 block">CLEAN DRIVING</span>
                <span className={cn("font-bold", payout.cleanBonus > 0 ? "text-emerald-400" : "text-white/40")}>
                  {payout.cleanBonus > 0 ? `+$${payout.cleanBonus.toLocaleString()}` : "INCIDENTS"}
                </span>
              </div>
              <div>
                <span className="text-[9px] text-white/40 block">DIFFICULTY</span>
                <span className="font-bold text-ember-400">{diffConfig.label} ({payout.difficultyMult}x)</span>
              </div>
            </div>
          </div>
        )}

        {/* Timing Stats Cells */}
        <div className="panel corner-frame grid grid-cols-3 divide-x divide-white/10">
          <StatCell label="TOTAL TIME" value={formatTime(result.totalTime)} />
          <StatCell label="BEST LAP" value={result.bestLap > 0 ? formatTime(result.bestLap) : "—"} accent />
          <StatCell label="LAPS COMPLETED" value={`${result.laps.length}`} />
        </div>

        {/* Lap Times Chips */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {result.laps.map((l, i) => (
            <span
              key={i}
              className={cn(
                "border px-2.5 py-1 font-mono text-[11px] tracking-wider rounded",
                l === result.bestLap ? "border-ember-400/60 text-ember-300 bg-ember-500/10" : "border-white/10 text-white/55",
              )}
            >
              L{i + 1}: {formatTime(l)}
            </span>
          ))}
        </div>

        {/* Standings Table */}
        <div className="panel mt-3 max-h-40 overflow-y-auto">
          {result.standings.map((s, i) => (
            <div
              key={s.name + i}
              className={cn(
                "flex items-center gap-3 border-b border-white/5 px-4 py-1.5 text-xs last:border-0",
                s.isPlayer && "bg-ember-500/15",
              )}
            >
              <span className={cn("w-6 font-display text-sm italic font-bold", i === 0 ? "text-ember-400" : i < 3 ? "text-white/85" : "text-white/40")}>
                P{i + 1}
              </span>
              <span className={cn("flex-1 font-bold tracking-[0.15em]", s.isPlayer ? "text-ember-300" : "text-white/75")}>
                {s.name}
                {s.isPlayer && <span className="ml-2 text-[9px] text-white/40 font-normal">YOU</span>}
              </span>
              {i === 0 && <Flag className="h-3 w-3 text-ember-400" />}
              <span className="font-mono text-[11px] tracking-wider text-white/50">{s.gap}</span>
            </div>
          ))}
        </div>

        {/* Actions Buttons */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onMenu}
            className="flex items-center gap-2 rounded border border-white/20 bg-white/5 px-5 py-2.5 font-display text-xs font-bold tracking-wider text-white/80 transition-all hover:border-white hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" /> MAIN MENU
          </button>

          {onOpenGarage && (
            <button
              type="button"
              onClick={onOpenGarage}
              className="flex items-center gap-2 rounded border border-ember-400/40 bg-ember-500/10 px-5 py-2.5 font-display text-xs font-bold tracking-wider text-ember-300 transition-all hover:bg-ember-500/20 hover:border-ember-400"
            >
              <Wrench className="h-4 w-4" /> TUNING GARAGE
            </button>
          )}

          <button
            type="button"
            onClick={onRestart}
            className="group relative flex items-center gap-2 overflow-hidden rounded bg-gradient-to-r from-ember-600 to-amber-400 px-6 py-2.5 font-display text-xs font-black tracking-wider text-night-950 shadow-[0_0_24px_rgba(255,158,61,0.4)] transition-all hover:scale-105 active:scale-95"
          >
            <RotateCcw className="h-4 w-4 fill-night-950" /> RACE AGAIN
          </button>

          {onNextCareerEvent && (
            <button
              type="button"
              onClick={onNextCareerEvent}
              className="flex items-center gap-2 rounded bg-white px-6 py-2.5 font-display text-xs font-black tracking-wider text-black shadow-lg hover:bg-amber-300 transition-all hover:scale-105"
            >
              <Sparkles className="h-4 w-4 fill-black" /> NEXT EVENT &rarr;
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="px-3 py-3 text-center">
      <div className="text-[9px] font-bold tracking-[0.25em] text-white/40">{label}</div>
      <div className={cn("mt-1 font-mono text-base tracking-wider sm:text-lg font-bold", accent ? "text-ember-300" : "text-white")}>{value}</div>
    </div>
  );
}
