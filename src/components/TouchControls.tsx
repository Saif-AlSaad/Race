import { useState, useCallback } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Flame, Zap } from "lucide-react";
import type { RaceEngine } from "../game/engine";
import { cn } from "../utils/cn";

interface TouchControlsProps {
  engine: RaceEngine;
}

type ControlKey = "left" | "right" | "up" | "down" | "boost" | "drift";

/** Ergonomic on-screen driving controls for touch screens and mobile devices. */
export default function TouchControls({ engine }: TouchControlsProps) {
  const [activeKeys, setActiveKeys] = useState<Record<ControlKey, boolean>>({
    left: false,
    right: false,
    up: false,
    down: false,
    boost: false,
    drift: false,
  });

  const handlePointerDown = useCallback(
    (key: ControlKey) => (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // pointer capture fallback
      }
      engine.touch[key] = true;
      setActiveKeys((prev) => ({ ...prev, [key]: true }));
    },
    [engine]
  );

  const handlePointerUp = useCallback(
    (key: ControlKey) => (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      engine.touch[key] = false;
      setActiveKeys((prev) => ({ ...prev, [key]: false }));
    },
    [engine]
  );

  const handlePointerCancel = useCallback(
    (key: ControlKey) => () => {
      engine.touch[key] = false;
      setActiveKeys((prev) => ({ ...prev, [key]: false }));
    },
    [engine]
  );

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex items-end justify-between px-4 pb-4 pt-10 select-none">
      {/* Left side: Ergonomic Steering Pads */}
      <div className="pointer-events-auto flex items-center gap-3">
        {/* Steer Left */}
        <button
          type="button"
          onPointerDown={handlePointerDown("left")}
          onPointerUp={handlePointerUp("left")}
          onPointerCancel={handlePointerCancel("left")}
          onLostPointerCapture={handlePointerCancel("left")}
          onContextMenu={(e) => e.preventDefault()}
          aria-label="Steer Left"
          className={cn(
            "grid h-20 w-20 sm:h-24 sm:w-24 place-items-center rounded-xl border backdrop-blur-md transition-all duration-75 active:scale-95 touch-none",
            activeKeys.left
              ? "border-ember-400 bg-ember-500/35 text-white shadow-[0_0_30px_rgba(255,123,28,0.5)] scale-95"
              : "border-white/20 bg-night-900/65 text-white/80 hover:border-white/40"
          )}
        >
          <ChevronLeft className="h-10 w-10 sm:h-12 sm:w-12" />
        </button>

        {/* Steer Right */}
        <button
          type="button"
          onPointerDown={handlePointerDown("right")}
          onPointerUp={handlePointerUp("right")}
          onPointerCancel={handlePointerCancel("right")}
          onLostPointerCapture={handlePointerCancel("right")}
          onContextMenu={(e) => e.preventDefault()}
          aria-label="Steer Right"
          className={cn(
            "grid h-20 w-20 sm:h-24 sm:w-24 place-items-center rounded-xl border backdrop-blur-md transition-all duration-75 active:scale-95 touch-none",
            activeKeys.right
              ? "border-ember-400 bg-ember-500/35 text-white shadow-[0_0_30px_rgba(255,123,28,0.5)] scale-95"
              : "border-white/20 bg-night-900/65 text-white/80 hover:border-white/40"
          )}
        >
          <ChevronRight className="h-10 w-10 sm:h-12 sm:w-12" />
        </button>
      </div>

      {/* Right side: Pedals and Actions */}
      <div className="pointer-events-auto flex flex-col items-end gap-3">
        {/* Action row: Drift & Nitro */}
        <div className="flex items-center gap-3">
          {/* Drift Button */}
          <button
            type="button"
            onPointerDown={handlePointerDown("drift")}
            onPointerUp={handlePointerUp("drift")}
            onPointerCancel={handlePointerCancel("drift")}
            onLostPointerCapture={handlePointerCancel("drift")}
            onContextMenu={(e) => e.preventDefault()}
            aria-label="Drift"
            className={cn(
              "flex h-14 w-16 sm:h-16 sm:w-20 flex-col items-center justify-center rounded-lg border backdrop-blur-md transition-all duration-75 active:scale-95 touch-none",
              activeKeys.drift
                ? "border-sky-400 bg-sky-500/35 text-white shadow-[0_0_25px_rgba(56,189,248,0.5)] scale-95"
                : "border-sky-500/30 bg-night-900/65 text-sky-300 hover:border-sky-400/50"
            )}
          >
            <Flame className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className="mt-0.5 text-[9px] font-bold tracking-widest">DRIFT</span>
          </button>

          {/* Nitro / Boost Button */}
          <button
            type="button"
            onPointerDown={handlePointerDown("boost")}
            onPointerUp={handlePointerUp("boost")}
            onPointerCancel={handlePointerCancel("boost")}
            onLostPointerCapture={handlePointerCancel("boost")}
            onContextMenu={(e) => e.preventDefault()}
            aria-label="Nitro Boost"
            className={cn(
              "flex h-14 w-16 sm:h-16 sm:w-20 flex-col items-center justify-center rounded-lg border backdrop-blur-md transition-all duration-75 active:scale-95 touch-none",
              activeKeys.boost
                ? "border-amber-400 bg-amber-500/35 text-white shadow-[0_0_25px_rgba(251,191,36,0.5)] scale-95"
                : "border-amber-500/30 bg-night-900/65 text-amber-300 hover:border-amber-400/50"
            )}
          >
            <Zap className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className="mt-0.5 text-[9px] font-bold tracking-widest">NITRO</span>
          </button>
        </div>

        {/* Pedals row: Brake on left, Throttle on right */}
        <div className="flex items-center gap-3">
          {/* Brake Pedal */}
          <button
            type="button"
            onPointerDown={handlePointerDown("down")}
            onPointerUp={handlePointerUp("down")}
            onPointerCancel={handlePointerCancel("down")}
            onLostPointerCapture={handlePointerCancel("down")}
            onContextMenu={(e) => e.preventDefault()}
            aria-label="Brake or Reverse"
            className={cn(
              "flex h-20 w-20 sm:h-24 sm:w-24 flex-col items-center justify-center rounded-xl border backdrop-blur-md transition-all duration-75 active:scale-95 touch-none",
              activeKeys.down
                ? "border-red-400 bg-red-500/35 text-white shadow-[0_0_30px_rgba(239,68,68,0.5)] scale-95"
                : "border-red-500/25 bg-night-900/65 text-red-300 hover:border-red-400/40"
            )}
          >
            <ChevronDown className="h-7 w-7 sm:h-8 sm:w-8" />
            <span className="mt-0.5 text-[10px] font-bold tracking-widest text-red-200">BRAKE</span>
          </button>

          {/* Throttle (Gas) Pedal */}
          <button
            type="button"
            onPointerDown={handlePointerDown("up")}
            onPointerUp={handlePointerUp("up")}
            onPointerCancel={handlePointerCancel("up")}
            onLostPointerCapture={handlePointerCancel("up")}
            onContextMenu={(e) => e.preventDefault()}
            aria-label="Accelerate"
            className={cn(
              "flex h-20 w-24 sm:h-24 sm:w-28 flex-col items-center justify-center rounded-xl border backdrop-blur-md transition-all duration-75 active:scale-95 touch-none",
              activeKeys.up
                ? "border-emerald-400 bg-emerald-500/35 text-white shadow-[0_0_30px_rgba(52,211,153,0.5)] scale-95"
                : "border-emerald-500/30 bg-night-900/65 text-emerald-300 hover:border-emerald-400/50"
            )}
          >
            <ChevronUp className="h-8 w-8 sm:h-9 sm:w-9" />
            <span className="mt-0.5 text-[11px] font-bold tracking-widest text-emerald-200">GAS</span>
          </button>
        </div>
      </div>
    </div>
  );
}
