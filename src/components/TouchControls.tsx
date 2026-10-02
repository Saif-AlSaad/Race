import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Flame, Zap } from "lucide-react";
import type { RaceEngine } from "../game/engine";
import { cn } from "../utils/cn";

/** On-screen driving controls for touch devices. */
export default function TouchControls({ engine }: { engine: RaceEngine }) {
  const bind = (key: "left" | "right" | "up" | "down" | "boost" | "drift") => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      engine.touch[key] = true;
    },
    onPointerUp: (e: React.PointerEvent) => {
      e.preventDefault();
      engine.touch[key] = false;
    },
    onPointerCancel: () => { engine.touch[key] = false; },
    onPointerLeave: () => { engine.touch[key] = false; },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between p-4 sm:hidden">
      {/* steering */}
      <div className="flex gap-3">
        <Pad {...bind("left")} className="h-20 w-20">
          <ChevronLeft className="h-10 w-10" />
        </Pad>
        <Pad {...bind("right")} className="h-20 w-20">
          <ChevronRight className="h-10 w-10" />
        </Pad>
      </div>
      {/* actions */}
      <div className="flex flex-col items-end gap-3">
        <div className="flex gap-3">
          <Pad {...bind("drift")} className="h-14 w-14 text-sky-300">
            <Flame className="h-6 w-6" />
          </Pad>
          <Pad {...bind("boost")} className="h-14 w-14 text-ember-300">
            <Zap className="h-6 w-6" />
          </Pad>
        </div>
        <div className="flex gap-3">
          <Pad {...bind("down")} className="h-20 w-20">
            <ChevronDown className="h-10 w-10" />
          </Pad>
          <Pad {...bind("up")} className="h-20 w-20">
            <ChevronUp className="h-10 w-10" />
          </Pad>
        </div>
      </div>
    </div>
  );
}

function Pad({ children, className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={cn(
        "pointer-events-auto grid touch-none select-none place-items-center border border-white/25 bg-night-900/55 text-white/85 backdrop-blur-sm active:bg-ember-500/50 active:text-white",
        className,
      )}
    >
      {children}
    </div>
  );
}
