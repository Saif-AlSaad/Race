import { Zap } from "lucide-react";
import { cn } from "../utils/cn";

export default function Countdown({ n }: { n: number }) {
  const go = n === 0;
  return (
    <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center">
      <div className="flex flex-col items-center">
        <div
          key={n}
          className={cn(
            "animate-count-pop font-display italic leading-none",
            go ? "glow-amber text-[26vw] text-ember-400 sm:text-[13rem]" : "text-[22vw] text-white hud-shadow sm:text-[11rem]",
          )}
          style={
            go
              ? undefined
              : {
                  textShadow: "0 0 60px rgba(255,158,61,0.4), 0 6px 24px rgba(0,0,0,0.7)",
                }
          }
        >
          {go ? "GO!" : n}
        </div>
        {!go && (
          <div className="mt-2 flex items-center gap-2 border border-white/15 bg-night-900/70 px-4 py-2 text-[10px] font-bold tracking-[0.3em] text-white/60 backdrop-blur-sm">
            <Zap className="h-3.5 w-3.5 text-ember-400" />
            HOLD <span className="text-ember-300">↑ / W</span> AT GREEN FOR A PERFECT LAUNCH
          </div>
        )}
      </div>
    </div>
  );
}
