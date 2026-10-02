import { useEffect, useRef } from "react";
import type { RaceEngine } from "../game/engine";

/** Binds keyboard controls into the engine's input state. */
export function useInput(
  getEngine: () => RaceEngine | null,
  onEscape: () => void,
  onWeatherCycle?: () => void,
) {
  const escRef = useRef(onEscape);
  escRef.current = onEscape;
  const weatherRef = useRef(onWeatherCycle);
  weatherRef.current = onWeatherCycle;
  const engineRefFn = useRef(getEngine);
  engineRefFn.current = getEngine;

  useEffect(() => {
    const set = (code: string, v: boolean): boolean => {
      const eng = engineRefFn.current();
      if (!eng) return false;
      switch (code) {
        case "ArrowLeft":
        case "KeyA": eng.input.left = v; return true;
        case "ArrowRight":
        case "KeyD": eng.input.right = v; return true;
        case "ArrowUp":
        case "KeyW": eng.input.up = v; return true;
        case "ArrowDown":
        case "KeyS": eng.input.down = v; return true;
        case "ShiftLeft":
        case "ShiftRight": eng.input.boost = v; return true;
        case "Space": eng.input.drift = v; return true;
        default: return false;
      }
    };

    const down = (e: KeyboardEvent) => {
      if (e.code === "Escape" && e.type === "keydown") {
        escRef.current();
        return;
      }
      if (e.code === "KeyV" && e.type === "keydown") {
        weatherRef.current?.();
        return;
      }
      if (set(e.code, true)) e.preventDefault();
      // audio unlock on any key
    };
    const up = (e: KeyboardEvent) => {
      if (set(e.code, false)) e.preventDefault();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);
}
