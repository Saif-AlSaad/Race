import { useState, useEffect, useCallback } from "react";
import {
  Trophy, Star, Lock, Play, ArrowLeft, Sun, Moon, CloudRain,
  Flame, Flag, Zap, Crown, Check, Wrench
} from "lucide-react";
import {
  CAREER_TIERS, type CareerEvent, type CareerProgress,
  type DifficultyLevel, DIFFICULTIES, DIFFICULTY_LEVELS,
  type WeatherMode
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

// Tier icons mapping
const TIER_META: Record<number, { icon: typeof Flag; label: string; color: string; glow: string }> = {
  1: { icon: Flag, label: "ROOKIE", color: "text-amber-400", glow: "rgba(245, 158, 11, 0.4)" },
  2: { icon: Zap, label: "PRO", color: "text-cyan-400", glow: "rgba(6, 182, 212, 0.4)" },
  3: { icon: Flame, label: "ELITE", color: "text-rose-400", glow: "rgba(244, 63, 94, 0.4)" },
  4: { icon: Crown, label: "MASTER", color: "text-purple-400", glow: "rgba(168, 85, 247, 0.4)" },
};

// Weather icon helper
function WeatherBadge({ weather }: { weather: WeatherMode }) {
  if (weather === "night") {
    return (
      <div className="flex items-center gap-1 rounded-md bg-cyan-950/70 border border-cyan-400/40 px-2 py-0.5 text-cyan-300 text-[10px] font-mono shadow-[0_0_8px_rgba(6,182,212,0.3)]">
        <Moon className="h-3 w-3 text-cyan-400" />
        <span>NIGHT</span>
      </div>
    );
  }
  if (weather === "rain") {
    return (
      <div className="flex items-center gap-1 rounded-md bg-sky-950/70 border border-sky-400/40 px-2 py-0.5 text-sky-300 text-[10px] font-mono shadow-[0_0_8px_rgba(14,165,233,0.3)]">
        <CloudRain className="h-3 w-3 text-sky-400" />
        <span>STORM</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 rounded-md bg-amber-950/70 border border-amber-400/40 px-2 py-0.5 text-amber-300 text-[10px] font-mono shadow-[0_0_8px_rgba(245,158,11,0.3)]">
      <Sun className="h-3 w-3 text-amber-400" />
      <span>SUNSET</span>
    </div>
  );
}

// Lightweight reusable Tooltip component
function Tooltip({ content, children }: { content: React.ReactNode; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 rounded-md border border-white/20 bg-night-950/95 px-2.5 py-1 text-[11px] font-mono font-medium text-white shadow-2xl backdrop-blur-md whitespace-nowrap animate-fade-up">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-night-950/95" />
        </div>
      )}
    </div>
  );
}

export default function CareerHub({
  career,
  selectedDifficulty,
  onSelectDifficulty,
  onStartEvent,
  onOpenGarage,
  onBack,
}: CareerHubProps) {
  const [selectedTierId, setSelectedTierId] = useState<number>(() => {
    // Automatically open the highest unlocked tier that is not yet fully completed
    const stars = Object.values(career.stars).reduce((sum, s) => sum + s, 0);
    for (let i = CAREER_TIERS.length - 1; i >= 0; i--) {
      const tier = CAREER_TIERS[i];
      if (stars >= tier.starsRequired) {
        return tier.id;
      }
    }
    return 1;
  });

  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const audio = getAudio();

  // Total stars calculations
  const totalStars = Object.values(career.stars).reduce((sum, s) => sum + s, 0);
  const maxPossibleStars = CAREER_TIERS.reduce((sum, t) => sum + t.events.length * 3, 0);

  const currentTier = CAREER_TIERS.find((t) => t.id === selectedTierId) || CAREER_TIERS[0];
  const isCurrentTierUnlocked = totalStars >= currentTier.starsRequired;
  const diffConfig = DIFFICULTIES[selectedDifficulty] || DIFFICULTIES.medium;

  // Star stats for current tier
  const tierStars = currentTier.events.reduce((sum, ev) => sum + (career.stars[ev.id] || 0), 0);
  const maxTierStars = currentTier.events.length * 3;
  const isTierFullyMastered = tierStars === maxTierStars;

  const handleSelectTier = useCallback((id: number) => {
    const tier = CAREER_TIERS.find((t) => t.id === id);
    if (!tier) return;
    if (totalStars < tier.starsRequired) {
      audio.thud(0.4);
      return;
    }
    audio.beep(480, 0.08);
    setSelectedTierId(id);
  }, [audio, totalStars]);

  const handleSelectDifficulty = useCallback((d: DifficultyLevel) => {
    audio.beep(600, 0.08);
    onSelectDifficulty(d);
  }, [audio, onSelectDifficulty]);

  const handleStartRace = useCallback((ev: CareerEvent) => {
    audio.beep(660, 0.12);
    onStartEvent(ev);
  }, [audio, onStartEvent]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "Escape") {
        audio.beep(360, 0.08);
        onBack();
      } else if (e.key === "1") {
        handleSelectTier(1);
      } else if (e.key === "2") {
        handleSelectTier(2);
      } else if (e.key === "3") {
        handleSelectTier(3);
      } else if (e.key === "4") {
        handleSelectTier(4);
      } else if (e.key.toLowerCase() === "g") {
        audio.beep(520, 0.08);
        onOpenGarage();
      } else if (e.key === "Enter" && !e.repeat) {
        // Start first available unlocked event in current tier
        const firstUnlocked = currentTier.events.find(
          (ev) => isCurrentTierUnlocked && totalStars >= ev.starsRequired
        );
        if (firstUnlocked) {
          handleStartRace(firstUnlocked);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [audio, onBack, onOpenGarage, handleSelectTier, currentTier, isCurrentTierUnlocked, totalStars, handleStartRace]);

  return (
    <div className="relative flex h-full w-full flex-col justify-between overflow-y-auto lg:overflow-hidden px-4 py-4 sm:px-8 sm:py-5 text-white select-none">
      {/* Background ambient lighting vignette */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-ember-950/25 via-night-950/90 to-night-950" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px] opacity-25" />

      {/* ================= 1. TOP NAVIGATION ================= */}
      <header className="relative z-10 flex items-center justify-between gap-4 border-b border-white/10 pb-3">
        {/* Left: Back Button & Career Pill */}
        <div className="flex items-center gap-3">
          <Tooltip content="Back to Menu [ESC]">
            <button
              type="button"
              onClick={() => {
                audio.beep(360, 0.08);
                onBack();
              }}
              className="group flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/5 transition-all hover:border-ember-400 hover:bg-ember-500/15 hover:text-white cursor-pointer active:scale-95 shadow-md"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            </button>
          </Tooltip>

          <div className="flex items-center gap-2">
            <span className="font-display text-[10px] tracking-[0.3em] text-ember-400 font-bold px-2 py-0.5 rounded bg-ember-500/10 border border-ember-400/20">
              CAREER
            </span>
            <span className="font-mono text-xs text-white/50 tracking-wider hidden sm:inline">
              CHAMPIONSHIP
            </span>
          </div>
        </div>

        {/* Center: Current Tier Name Display */}
        <div className="flex items-center gap-2">
          <span className="font-display text-sm sm:text-base font-black italic tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-200 to-ember-400">
            TIER 0{currentTier.id} // {currentTier.subtitle}
          </span>
        </div>

        {/* Right: Stars, Credits, and Garage Icon Button */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* Total Stars Counter */}
          <Tooltip content={`Total Championship Stars (${totalStars}/${maxPossibleStars})`}>
            <div className="flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-950/40 px-2.5 py-1 backdrop-blur-md shadow-[0_0_14px_rgba(251,191,36,0.15)]">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
              <span className="font-display text-xs sm:text-sm font-bold text-amber-300">
                {totalStars}
                <span className="text-[10px] font-mono text-white/40 ml-1">/ {maxPossibleStars}</span>
              </span>
            </div>
          </Tooltip>

          {/* Credits Balance Pill */}
          <Tooltip content="Available Motorsport Credits">
            <div className="flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-950/40 px-2.5 py-1 backdrop-blur-md shadow-[0_0_14px_rgba(16,185,129,0.15)]">
              <span className="text-emerald-400 font-bold">◈</span>
              <span className="font-mono text-xs sm:text-sm font-bold text-emerald-300">
                ${career.credits.toLocaleString()}
              </span>
            </div>
          </Tooltip>

          {/* Compact Garage Icon Button */}
          <Tooltip content="Open Tuning Garage [G]">
            <button
              type="button"
              onClick={() => {
                audio.beep(520, 0.08);
                onOpenGarage();
              }}
              className="group flex h-9 w-9 items-center justify-center rounded-lg border border-ember-400/40 bg-ember-500/15 text-ember-300 transition-all hover:bg-ember-500 hover:text-night-950 hover:shadow-[0_0_16px_rgba(255,158,61,0.6)] cursor-pointer active:scale-95"
            >
              <Wrench className="h-4 w-4 transition-transform group-hover:rotate-45" />
            </button>
          </Tooltip>
        </div>
      </header>

      {/* ================= 2. CHAMPIONSHIP PROGRESSION TIMELINE ================= */}
      <nav className="relative z-10 my-3 flex flex-col items-center">
        {/* Connecting Progress Track Bar */}
        <div className="relative flex w-full max-w-3xl items-center justify-between px-6 sm:px-12">
          {/* Background Connecting Rail */}
          <div className="absolute left-10 right-10 top-1/2 -translate-y-1/2 h-1 bg-white/10 rounded-full" />

          {/* Active Fill Track */}
          <div
            className="absolute left-10 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-amber-500 via-ember-400 to-amber-300 rounded-full transition-all duration-500"
            style={{
              width: `calc(${((selectedTierId - 1) / (CAREER_TIERS.length - 1)) * 100}% - 20px)`,
            }}
          />

          {/* 4 Interactive Tier Progression Nodes */}
          {CAREER_TIERS.map((tier) => {
            const isUnlocked = totalStars >= tier.starsRequired;
            const isActive = tier.id === selectedTierId;
            const tierStarsEarned = tier.events.reduce((sum, ev) => sum + (career.stars[ev.id] || 0), 0);
            const isCompleted = tierStarsEarned === tier.events.length * 3;
            const meta = TIER_META[tier.id] || TIER_META[1];
            const TierIcon = meta.icon;

            return (
              <div key={tier.id} className="relative z-10 flex flex-col items-center">
                <Tooltip
                  content={
                    !isUnlocked
                      ? `Locked // ${tier.starsRequired} ★ Required`
                      : isCompleted
                      ? `Tier Mastered // 9/9 ★ Earned`
                      : `Tier 0${tier.id} // ${meta.label} (${tierStarsEarned}/9 ★)`
                  }
                >
                  <button
                    type="button"
                    onClick={() => handleSelectTier(tier.id)}
                    className={cn(
                      "group relative flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl border-2 transition-all duration-300 cursor-pointer",
                      isActive
                        ? "border-ember-400 bg-gradient-to-br from-amber-500/30 to-ember-600/30 shadow-[0_0_24px_rgba(255,158,61,0.6)] scale-110 ring-2 ring-ember-400/40"
                        : isUnlocked
                        ? "border-white/20 bg-black/60 hover:border-white/50 hover:scale-105"
                        : "border-white/5 bg-black/80 opacity-50 cursor-not-allowed"
                    )}
                  >
                    {!isUnlocked ? (
                      <Lock className="h-5 w-5 text-white/40" />
                    ) : isCompleted ? (
                      <Check className="h-5 w-5 text-amber-300 stroke-[3]" />
                    ) : (
                      <TierIcon
                        className={cn(
                          "h-5 w-5 sm:h-6 sm:w-6 transition-transform group-hover:scale-110",
                          isActive ? meta.color : "text-white/60"
                        )}
                      />
                    )}

                    {/* Small Tier Number Pip */}
                    <span
                      className={cn(
                        "absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full font-mono text-[9px] font-bold border",
                        isActive
                          ? "bg-ember-500 text-night-950 border-ember-300"
                          : "bg-black/90 text-white/60 border-white/20"
                      )}
                    >
                      {tier.id}
                    </span>
                  </button>
                </Tooltip>

                {/* Short Label Underneath */}
                <div className="mt-1.5 flex flex-col items-center">
                  <span
                    className={cn(
                      "font-display text-[10px] sm:text-xs font-black tracking-wider transition-colors",
                      isActive ? "text-amber-300" : isUnlocked ? "text-white/70" : "text-white/30"
                    )}
                  >
                    {meta.label}
                  </span>
                  <span className="font-mono text-[9px] text-white/40">
                    {isUnlocked ? `${tierStarsEarned}/9 ★` : `${tier.starsRequired} ★`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </nav>

      {/* ================= 3. CURRENT TIER COMPACT HEADER ================= */}
      <section className="relative z-10 my-2 flex items-center justify-between rounded-xl border border-white/10 bg-black/40 px-4 py-2 backdrop-blur-md">
        {/* Left: Tier Name & Star Ratio */}
        <div className="flex items-center gap-3">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-xs font-bold text-ember-400">TIER 0{currentTier.id}</span>
            <span className="font-display text-sm sm:text-base font-black italic tracking-wide text-white">
              {currentTier.title.split("//")[1]?.trim() || currentTier.title}
            </span>
          </div>

          <span className="text-white/20">|</span>

          <div className="flex items-center gap-1.5 text-xs font-mono">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="font-bold text-amber-300">{tierStars}</span>
            <span className="text-white/40">/ {maxTierStars}</span>
          </div>
        </div>

        {/* Right: Trophy Icon & Name */}
        <div className="flex items-center gap-2">
          <Trophy className={cn("h-4 w-4", isTierFullyMastered ? "text-amber-400 animate-bounce" : "text-amber-400/80")} />
          <span className="font-mono text-xs font-bold text-amber-300/90 tracking-wide hidden sm:inline">
            {currentTier.trophyName}
          </span>
          {isTierFullyMastered && (
            <span className="rounded bg-amber-400/20 px-1.5 py-0.2 text-[9px] font-mono font-bold text-amber-300 border border-amber-400/40">
              UNLOCKED
            </span>
          )}
        </div>
      </section>

      {/* ================= 4. LARGE VISUAL EVENT CARDS ================= */}
      <main className="relative z-10 my-2 grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0 items-stretch">
        {currentTier.events.map((ev, index) => {
          const starsEarned = career.stars[ev.id] || 0;
          const bestPos = career.bestPositions[ev.id];
          const isEventUnlocked = isCurrentTierUnlocked && totalStars >= ev.starsRequired;
          const isCompleted = starsEarned === 3 || bestPos === 1;
          const prizeCalculated = Math.round(ev.basePurse * diffConfig.cashMult);
          const isHovered = hoveredEventId === ev.id;

          return (
            <div
              key={ev.id}
              onMouseEnter={() => setHoveredEventId(ev.id)}
              onMouseLeave={() => setHoveredEventId(null)}
              className={cn(
                "group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-4 sm:p-5 transition-all duration-300 select-none",
                !isEventUnlocked
                  ? "border-white/5 bg-black/60 opacity-60 cursor-not-allowed"
                  : isHovered
                  ? "border-ember-400 bg-gradient-to-b from-black/80 via-night-950/90 to-night-900 shadow-[0_0_30px_rgba(255,158,61,0.3)] scale-[1.02]"
                  : "border-white/15 bg-black/70 hover:border-white/30 backdrop-blur-xl"
              )}
            >
              {/* Atmospheric Weather Background Halo */}
              <div
                className={cn(
                  "pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full blur-3xl transition-opacity duration-500",
                  ev.weather === "night"
                    ? "bg-cyan-500/15"
                    : ev.weather === "rain"
                    ? "bg-sky-500/15"
                    : "bg-amber-500/15"
                )}
              />

              {/* Top Row: Event Number Pill, Weather Icon & Laps */}
              <div className="relative z-10 flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold tracking-widest text-white/50 border border-white/10 rounded px-2 py-0.5 bg-black/40">
                  EVENT 0{index + 1}
                </span>

                <div className="flex items-center gap-2">
                  <WeatherBadge weather={ev.weather} />
                  <span className="font-mono text-[10px] text-white/60 bg-black/40 px-2 py-0.5 rounded border border-white/10">
                    {ev.laps} LAPS
                  </span>
                </div>
              </div>

              {/* Center Content: Event Name, Star Visuals, & Status */}
              <div className="relative z-10 my-auto flex flex-col items-center text-center py-4">
                <h3 className="font-display text-xl sm:text-2xl font-black italic tracking-wide text-white group-hover:text-ember-300 transition-colors">
                  {ev.name}
                </h3>

                {/* Subtitle / Discipline indicator */}
                <span className="font-mono text-[11px] text-white/40 tracking-wider mt-1">
                  {ev.sub.split("//")[0]?.trim() || ev.circuit}
                </span>

                {/* Big Star Visuals: ★ ★ ★ */}
                <div className="my-3 flex items-center justify-center gap-2">
                  {[1, 2, 3].map((starNum) => {
                    const isEarned = starsEarned >= starNum;
                    return (
                      <Star
                        key={starNum}
                        className={cn(
                          "h-6 w-6 sm:h-7 sm:w-7 transition-all duration-300",
                          isEarned
                            ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.9)] scale-110"
                            : "text-white/20 fill-white/5"
                        )}
                      />
                    );
                  })}
                </div>

                {/* Best Position Pill if Attempted */}
                {bestPos !== undefined && (
                  <div className="flex items-center gap-1.5 font-mono text-[10px] text-white/60">
                    <span className="text-white/40">BEST RESULT:</span>
                    <span
                      className={cn(
                        "font-bold px-1.5 py-0.2 rounded border",
                        bestPos === 1
                          ? "bg-amber-400/20 text-amber-300 border-amber-400/40"
                          : "bg-white/10 text-white/80 border-white/15"
                      )}
                    >
                      P{bestPos}
                    </span>
                  </div>
                )}
              </div>

              {/* Bottom Action Area: 3 Clear States */}
              <div className="relative z-10 border-t border-white/10 pt-3">
                {/* 1. LOCKED STATE */}
                {!isEventUnlocked ? (
                  <div className="flex flex-col items-center gap-1 py-1">
                    <div className="flex items-center gap-1.5 text-white/40 font-mono text-xs font-bold">
                      <Lock className="h-4 w-4 animate-pulse" />
                      <span>{ev.starsRequired} ★ REQUIRED</span>
                    </div>
                    <span className="text-[10px] font-mono text-white/30">
                      Earn {Math.max(0, ev.starsRequired - totalStars)} more stars to unlock
                    </span>
                  </div>
                ) : (
                  /* 2. AVAILABLE / COMPLETED STATE */
                  <div className="flex items-center justify-between gap-3">
                    {/* Prize Purse Indicator */}
                    <div className="flex flex-col">
                      <span className="text-[8px] font-mono uppercase tracking-wider text-white/40">PRIZE PURSE</span>
                      <div className="flex items-center gap-1 text-emerald-400 font-mono font-bold text-xs sm:text-sm">
                        <span>◈</span>
                        <span>${prizeCalculated.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Prominent Circular Play Action Button */}
                    <button
                      type="button"
                      onClick={() => handleStartRace(ev)}
                      className={cn(
                        "group/btn relative flex items-center gap-2 rounded-xl px-4 py-2 font-display text-xs font-black tracking-wider transition-all duration-200 cursor-pointer active:scale-95 shadow-lg",
                        isCompleted
                          ? "bg-gradient-to-r from-amber-500 to-ember-500 text-night-950 hover:shadow-[0_0_20px_rgba(255,158,61,0.6)]"
                          : "bg-gradient-to-r from-ember-500 via-amber-400 to-amber-300 text-night-950 hover:scale-105 hover:shadow-[0_0_24px_rgba(255,158,61,0.7)]"
                      )}
                    >
                      <span>{isCompleted ? "RE-RACE" : "START"}</span>
                      <div className="grid h-6 w-6 place-items-center rounded-full bg-night-950 text-amber-300 transition-transform group-hover/btn:scale-110">
                        <Play className="h-3 w-3 fill-amber-300 ml-0.5" />
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </main>

      {/* ================= 5. FOOTER: DIFFICULTY SELECTOR & HOTKEY HINTS ================= */}
      <footer className="relative z-10 mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-2.5">
        {/* Minimal Hotkey Hints */}
        <div className="flex items-center gap-2 text-[10px] font-mono text-white/40">
          <span className="border border-white/15 px-1 rounded">[1-4] TIERS</span>
          <span className="border border-white/15 px-1 rounded">[G] GARAGE</span>
          <span className="border border-white/15 px-1 rounded">[ESC] BACK</span>
          <span className="border border-white/15 px-1 rounded">[ENTER] RACE</span>
        </div>

        {/* Compact Icon/Badge Difficulty Selector (Section 11) */}
        <div className="flex items-center gap-2">
          <span className="font-display text-[10px] tracking-[0.2em] text-white/50 hidden sm:inline">
            DIFFICULTY:
          </span>
          <div className="inline-flex rounded-lg border border-white/15 bg-black/60 p-0.5 backdrop-blur-md">
            {DIFFICULTY_LEVELS.map((d) => {
              const cfg = DIFFICULTIES[d];
              const active = selectedDifficulty === d;

              return (
                <Tooltip
                  key={d}
                  content={
                    <div>
                      <div className="font-bold text-amber-300">{cfg.label} // {cfg.cashMult}X PURSE</div>
                      <div className="text-[10px] text-white/70">{cfg.desc}</div>
                    </div>
                  }
                >
                  <button
                    type="button"
                    onClick={() => handleSelectDifficulty(d)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-display font-bold tracking-wider transition-all cursor-pointer",
                      active
                        ? d === "grandmaster"
                          ? "bg-gradient-to-r from-rose-500 to-purple-600 font-black text-white shadow-[0_0_12px_rgba(244,63,94,0.7)]"
                          : d === "pro"
                          ? "bg-gradient-to-r from-amber-500 to-ember-500 font-black text-night-950 shadow-[0_0_12px_rgba(255,158,61,0.6)]"
                          : d === "medium"
                          ? "bg-gradient-to-r from-sky-500 to-cyan-400 font-black text-night-950 shadow-[0_0_12px_rgba(14,165,233,0.6)]"
                          : "bg-emerald-500 font-black text-night-950 shadow-[0_0_12px_rgba(16,185,129,0.6)]"
                        : "text-white/60 hover:text-white hover:bg-white/10"
                    )}
                  >
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        d === "grandmaster"
                          ? "bg-rose-400 shadow-[0_0_6px_#f43f5e]"
                          : d === "pro"
                          ? "bg-amber-400 shadow-[0_0_6px_#fbbf24]"
                          : d === "medium"
                          ? "bg-sky-400 shadow-[0_0_6px_#38bdf8]"
                          : "bg-emerald-400 shadow-[0_0_6px_#34d399]"
                      )}
                    />
                    <span>{cfg.label}</span>
                    <span className="font-mono text-[9px] opacity-75">{cfg.cashMult}X</span>
                  </button>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </footer>
    </div>
  );
}
