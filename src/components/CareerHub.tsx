import { useState } from "react";
import {
  Trophy, Star, Lock, Play, ArrowLeft, Sun, Moon, CloudRain,
  Flame, Award, CheckCircle2, DollarSign
} from "lucide-react";
import {
  CAREER_TIERS, type CareerEvent, type CareerProgress,
  type DifficultyLevel, DIFFICULTIES, DIFFICULTY_LEVELS
} from "../game/constants";
import { cn } from "../utils/cn";
import { getAudio } from "../game/audio";

interface CareerHubProps {
  career: CareerProgress;
  selectedDifficulty: DifficultyLevel;
  onSelectDifficulty: (d: DifficultyLevel) => void;
  onStartEvent: (event: CareerEvent) => void;
  onOpenGarage: () => void;
  onBack: () => void;
}

export default function CareerHub({
  career,
  selectedDifficulty,
  onSelectDifficulty,
  onStartEvent,
  onOpenGarage,
  onBack,
}: CareerHubProps) {
  const [selectedTierId, setSelectedTierId] = useState<number>(1);
  const audio = getAudio();

  // Total stars calculation
  const totalStars = Object.values(career.stars).reduce((sum, s) => sum + s, 0);
  const maxPossibleStars = CAREER_TIERS.reduce((sum, t) => sum + t.events.length * 3, 0);

  const currentTier = CAREER_TIERS.find((t) => t.id === selectedTierId) || CAREER_TIERS[0];
  const isTierUnlocked = totalStars >= currentTier.starsRequired;
  const diffConfig = DIFFICULTIES[selectedDifficulty];

  const handleSelectTier = (id: number) => {
    audio.beep(480, 0.08);
    setSelectedTierId(id);
  };

  const handleSelectDifficulty = (d: DifficultyLevel) => {
    audio.beep(600, 0.08);
    onSelectDifficulty(d);
  };

  return (
    <div className="relative flex h-full w-full flex-col justify-between overflow-y-auto px-4 py-6 sm:px-10 sm:py-8 text-white select-none">
      {/* Background ambient gradient */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-ember-950/20 via-black/80 to-night-950" />

      {/* ---- TOP BAR: HEADER, CREDITS, DIFFICULTY, GARAGE SHORTCUT ---- */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              audio.beep(360, 0.08);
              onBack();
            }}
            className="flex items-center gap-2 rounded border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-display tracking-widest text-white/80 transition-all hover:border-ember-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> MAIN MENU
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-ember-400" />
              <h1 className="font-display text-2xl font-black italic tracking-wider sm:text-3xl">
                CAREER CHAMPIONSHIP
              </h1>
            </div>
            <p className="text-xs text-white/50 tracking-wider">
              Conquer 4 competitive tiers, earn championship stars, and unlock elite payouts
            </p>
          </div>
        </div>

        {/* Stats & Wallet */}
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Total Stars */}
          <div className="flex items-center gap-2 rounded border border-amber-400/30 bg-amber-950/30 px-3.5 py-1.5 backdrop-blur-md">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <div className="flex flex-col">
              <span className="text-[9px] font-mono uppercase tracking-wider text-amber-300/70">CHAMPION STARS</span>
              <span className="font-display text-base font-bold text-amber-300 leading-none">
                {totalStars} <span className="text-xs text-white/40">/ {maxPossibleStars}</span>
              </span>
            </div>
          </div>

          {/* Credits Balance */}
          <div className="flex items-center gap-2 rounded border border-emerald-400/30 bg-emerald-950/30 px-3.5 py-1.5 backdrop-blur-md">
            <DollarSign className="h-4 w-4 text-emerald-400" />
            <div className="flex flex-col">
              <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-300/70">CREDITS</span>
              <span className="font-mono text-base font-bold text-emerald-300 leading-none">
                ${career.credits.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Garage Tuning Button */}
          <button
            type="button"
            onClick={() => {
              audio.beep(520, 0.08);
              onOpenGarage();
            }}
            className="flex items-center gap-2 rounded border border-ember-400/50 bg-ember-500/20 px-4 py-2 font-display text-xs font-bold tracking-widest text-ember-300 transition-all hover:bg-ember-500 hover:text-black hover:shadow-[0_0_15px_rgba(255,158,61,0.6)]"
          >
            <Flame className="h-4 w-4" /> TUNING GARAGE
          </button>
        </div>
      </div>

      {/* ---- TIER SELECTOR TABS & DIFFICULTY PRESET ---- */}
      <div className="relative z-10 my-4 flex flex-col gap-4 sm:my-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Tier Pills */}
          <div className="flex flex-wrap gap-2">
            {CAREER_TIERS.map((tier) => {
              const unlocked = totalStars >= tier.starsRequired;
              const active = tier.id === selectedTierId;
              const tierStars = tier.events.reduce((acc, ev) => acc + (career.stars[ev.id] || 0), 0);
              const maxTierStars = tier.events.length * 3;

              return (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => handleSelectTier(tier.id)}
                  className={cn(
                    "relative flex items-center gap-2.5 rounded-lg border px-4 py-2.5 text-left transition-all",
                    active
                      ? "border-ember-400 bg-ember-500/20 shadow-[0_0_16px_rgba(255,158,61,0.3)] text-white"
                      : "border-white/10 bg-white/5 text-white/60 hover:border-white/30 hover:text-white",
                    !unlocked && "opacity-60"
                  )}
                >
                  {!unlocked ? (
                    <Lock className="h-4 w-4 text-white/40" />
                  ) : (
                    <Award className={cn("h-4 w-4", active ? "text-ember-400" : "text-white/40")} />
                  )}
                  <div>
                    <div className="font-display text-xs font-black tracking-wider">
                      TIER {tier.id}
                    </div>
                    <div className="text-[10px] text-white/40 font-mono">
                      {unlocked ? `${tierStars}/${maxTierStars} ★` : `Requires ${tier.starsRequired} ★`}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Difficulty Preset Picker */}
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 p-1.5 backdrop-blur-md">
            <span className="px-2 text-[10px] font-mono tracking-widest text-white/40 uppercase">
              RACE DIFFICULTY:
            </span>
            {DIFFICULTY_LEVELS.map((d) => {
              const cfg = DIFFICULTIES[d];
              const active = selectedDifficulty === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleSelectDifficulty(d)}
                  className={cn(
                    "rounded px-3 py-1 font-display text-xs font-black tracking-widest transition-all",
                    active
                      ? d === "grandmaster"
                        ? "bg-gradient-to-r from-rose-500 via-fuchsia-500 to-purple-600 text-white shadow-[0_0_14px_rgba(244,63,94,0.8)]"
                        : d === "pro"
                        ? "bg-gradient-to-r from-amber-500 to-ember-500 text-black shadow-[0_0_12px_#ff9e3d]"
                        : d === "medium"
                        ? "bg-gradient-to-r from-sky-500 to-cyan-400 text-black shadow-[0_0_12px_#0ea5e9]"
                        : "bg-emerald-500 text-black shadow-[0_0_12px_#10b981]"
                      : "text-white/50 hover:bg-white/10 hover:text-white"
                  )}
                  title={cfg.desc}
                >
                  {cfg.label} <span className="font-mono text-[9px] opacity-80">({cfg.cashMult}x)</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tier Info Banner */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-r from-white/5 via-white/[0.02] to-transparent p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-lg font-black tracking-widest text-ember-400">
                {currentTier.title}
              </span>
              <span className="text-xs text-white/40">// {currentTier.subtitle}</span>
            </div>
            <p className="text-xs text-white/60 tracking-wide mt-0.5">{currentTier.tagline}</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-amber-300/80 bg-amber-950/40 border border-amber-500/20 px-3 py-1.5 rounded-lg">
            <Trophy className="h-4 w-4 text-amber-400" />
            <span>TROPHY: {currentTier.trophyName}</span>
          </div>
        </div>
      </div>

      {/* ---- EVENT CARDS GRID ---- */}
      <div className="relative z-10 grid grid-cols-1 gap-4 md:grid-cols-3">
        {currentTier.events.map((ev, index) => {
          const starsEarned = career.stars[ev.id] || 0;
          const bestPos = career.bestPositions[ev.id];
          const isUnlocked = isTierUnlocked && totalStars >= ev.starsRequired;
          const prizeCalculated = Math.round(ev.basePurse * diffConfig.cashMult);

          return (
            <div
              key={ev.id}
              className={cn(
                "group relative flex flex-col justify-between overflow-hidden rounded-xl border p-5 transition-all duration-300",
                isUnlocked
                  ? "border-white/15 bg-white/5 hover:border-ember-400/80 hover:bg-white/10 hover:shadow-[0_0_24px_rgba(255,158,61,0.2)]"
                  : "border-white/5 bg-black/50 opacity-60"
              )}
            >
              {/* Event Weather Backdrop Hue */}
              <div
                className={cn(
                  "pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full blur-3xl transition-opacity",
                  ev.weather === "night"
                    ? "bg-cyan-500/10 group-hover:bg-cyan-500/20"
                    : ev.weather === "rain"
                    ? "bg-sky-500/10 group-hover:bg-sky-500/20"
                    : "bg-amber-500/10 group-hover:bg-amber-500/20"
                )}
              />

              {/* Event Header */}
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] tracking-widest text-white/40">
                    ROUND 0{index + 1}
                  </span>
                  {/* Weather tag */}
                  <div className="flex items-center gap-1 rounded bg-black/40 px-2 py-0.5 text-[9px] font-mono text-white/70 border border-white/10">
                    {ev.weather === "sunset" && <Sun className="h-3 w-3 text-amber-400" />}
                    {ev.weather === "night" && <Moon className="h-3 w-3 text-cyan-400" />}
                    {ev.weather === "rain" && <CloudRain className="h-3 w-3 text-sky-400" />}
                    <span className="uppercase">{ev.weather}</span>
                  </div>
                </div>

                <h3 className="mt-2 font-display text-xl font-black italic tracking-wide text-white group-hover:text-ember-300 transition-colors">
                  {ev.name}
                </h3>
                <p className="text-xs text-white/50 tracking-wider font-mono mt-0.5">{ev.sub}</p>

                {/* Stars earned slots */}
                <div className="mt-4 flex items-center gap-1.5">
                  {[1, 2, 3].map((starNum) => {
                    const filled = starsEarned >= starNum;
                    return (
                      <Star
                        key={starNum}
                        className={cn(
                          "h-5 w-5 transition-transform",
                          filled
                            ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)] scale-110"
                            : "text-white/20 fill-white/5"
                        )}
                      />
                    );
                  })}
                  <span className="ml-2 text-xs font-mono text-white/60">
                    {starsEarned > 0 ? `${starsEarned}/3 Stars` : "Not completed"}
                  </span>
                </div>
              </div>

              {/* Event Specs & Purse */}
              <div className="mt-6 border-t border-white/10 pt-4">
                <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-4">
                  <div>
                    <span className="text-[9px] text-white/40 block">DISTANCE</span>
                    <span className="font-bold text-white/90">{ev.laps} LAPS</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-white/40 block">PRIZE PURSE ({diffConfig.cashMult}X)</span>
                    <span className="font-bold text-emerald-400">${prizeCalculated.toLocaleString()}</span>
                  </div>
                </div>

                {/* Action button */}
                {isUnlocked ? (
                  <button
                    type="button"
                    onClick={() => {
                      audio.beep(660, 0.12);
                      onStartEvent(ev);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-ember-500 to-amber-400 px-4 py-2.5 font-display text-xs font-black tracking-widest text-night-950 transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(255,158,61,0.6)]"
                  >
                    <Play className="h-4 w-4 fill-night-950" />
                    {bestPos ? `RE-RACE (BEST P${bestPos})` : "START EVENT"}
                  </button>
                ) : (
                  <div className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 font-display text-xs font-bold tracking-widest text-white/40">
                    <Lock className="h-3.5 w-3.5" />
                    <span>LOCKED // {ev.starsRequired} ★ REQUIRED</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ---- BOTTOM FOOTER: HINTS & DIFFICULTY REMINDER ---- */}
      <div className="relative z-10 mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs text-white/40 font-mono">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>Finish 1st for 3 Stars, Top 3 for 2 Stars, Top 5 for 1 Star. Clean driving earns cash bonus.</span>
        </div>
        <div>
          <span>ACTIVE DIFFICULTY: </span>
          <span className="font-bold text-ember-400">{diffConfig.label} ({diffConfig.cashMult}x Multiplier)</span>
        </div>
      </div>
    </div>
  );
}
