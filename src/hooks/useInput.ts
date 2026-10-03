import { useEffect, useRef } from "react";
import type { RaceEngine } from "../game/engine";

interface GamepadButtonsState {
  startJustPressed: boolean;
}

/** Binds keyboard and gamepad controls into the engine's input state. */
export function useInput(
  getEngine: () => RaceEngine | null,
  onEscape: () => void,
  onWeatherCycle?: () => void,
  onSettings?: () => void,
  onGamepadStatus?: (name: string | null) => void,
) {
  const escRef = useRef(onEscape);
  escRef.current = onEscape;
  const weatherRef = useRef(onWeatherCycle);
  weatherRef.current = onWeatherCycle;
  const settingsRef = useRef(onSettings);
  settingsRef.current = onSettings;
  const engineRefFn = useRef(getEngine);
  engineRefFn.current = getEngine;
  const padStatusRef = useRef(onGamepadStatus);
  padStatusRef.current = onGamepadStatus;

  useEffect(() => {
    // Track physical keys held down
    const heldKeys = new Set<string>();

    const evaluateKeys = () => {
      const eng = engineRefFn.current();
      if (!eng) return;

      const has = (...keys: string[]) => keys.some((k) => heldKeys.has(k.toLowerCase()));

      // Steer Left: ArrowLeft, A, Q (AZERTY)
      const keyLeft = has("arrowleft", "keya", "keyq", "a", "q");
      // Steer Right: ArrowRight, D
      const keyRight = has("arrowright", "keyd", "d");
      // Accelerate: ArrowUp, W, Z (AZERTY)
      const keyUp = has("arrowup", "keyw", "keyz", "w", "z");
      // Brake/Reverse: ArrowDown, S
      const keyDown = has("arrowdown", "keys", "s");
      // Nitro / Boost: Shift, N, E, X, B
      const keyBoost = has("shiftleft", "shiftright", "keyn", "keye", "keyx", "keyb", "n", "b");
      // Handbrake / Drift: Space, C, J
      const keyDrift = has("space", "keyc", "keyj", "c");

      // Merge into engine input without clobbering gamepad unless keyboard is active
      eng.input.left = keyLeft;
      eng.input.right = keyRight;
      eng.input.up = keyUp;
      eng.input.down = keyDown;
      eng.input.boost = keyBoost;
      eng.input.drift = keyDrift;

      if (keyLeft || keyRight) {
        eng.input.steerAnalog = keyLeft ? -1 : 1;
      } else if (!eng.input.steerAnalog || Math.abs(eng.input.steerAnalog) === 1) {
        eng.input.steerAnalog = 0;
      }
    };

    const isRecognizedControlKey = (code: string, key: string): boolean => {
      const c = code.toLowerCase();
      const k = key.toLowerCase();
      return [
        "arrowleft", "arrowright", "arrowup", "arrowdown",
        "keya", "keyd", "keyw", "keys", "keyq", "keyz",
        "shiftleft", "shiftright", "space", "keyn", "keye", "keyx", "keyc", "keyb", "keyj"
      ].includes(c) || ["arrowleft", "arrowright", "arrowup", "arrowdown", " ", "w", "a", "s", "d", "q", "z"].includes(k);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      if (e.code === "Escape" || e.code === "KeyP") {
        escRef.current();
        e.preventDefault();
        return;
      }
      if (e.code === "KeyV") {
        weatherRef.current?.();
        e.preventDefault();
        return;
      }
      if (e.code === "KeyO") {
        settingsRef.current?.();
        e.preventDefault();
        return;
      }

      if (isRecognizedControlKey(e.code, e.key)) {
        heldKeys.add(e.code.toLowerCase());
        heldKeys.add(e.key.toLowerCase());
        evaluateKeys();
        e.preventDefault();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      heldKeys.delete(e.code.toLowerCase());
      heldKeys.delete(e.key.toLowerCase());
      evaluateKeys();
      if (isRecognizedControlKey(e.code, e.key)) {
        e.preventDefault();
      }
    };

    // Auto-clear held keys when window blurs / loses focus to prevent stuck acceleration/steering
    const onBlur = () => {
      heldKeys.clear();
      const eng = engineRefFn.current();
      if (eng) {
        eng.clearInputs();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    // -------------------------------------------------------------
    // GAMEPAD API INTEGRATION
    // -------------------------------------------------------------
    let rafId = 0;
    const padState: GamepadButtonsState = { startJustPressed: false };

    const onPadConnected = (e: GamepadEvent) => {
      const name = e.gamepad.id ? e.gamepad.id.replace(/\(.*\)/, "").trim() : "Controller";
      padStatusRef.current?.(name);
    };

    const onPadDisconnected = () => {
      padStatusRef.current?.(null);
    };

    window.addEventListener("gamepadconnected", onPadConnected);
    window.addEventListener("gamepaddisconnected", onPadDisconnected);

    const pollGamepad = () => {
      const eng = engineRefFn.current();
      const gamepads = typeof navigator.getGamepads === "function" ? navigator.getGamepads() : [];

      let activePad: Gamepad | null = null;
      for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i] && gamepads[i]!.connected) {
          activePad = gamepads[i];
          break;
        }
      }

      if (eng && activePad) {
        const axes = activePad.axes || [];
        const buttons = activePad.buttons || [];

        // Left Stick X-axis with standard deadzone
        const stickX = axes[0] ?? 0;
        const deadzone = 0.14;
        let padSteer = 0;
        if (Math.abs(stickX) > deadzone) {
          padSteer = (stickX - Math.sign(stickX) * deadzone) / (1 - deadzone);
        }

        // D-Pad Left/Right fallback
        const dpadLeft = buttons[14]?.pressed ?? false;
        const dpadRight = buttons[15]?.pressed ?? false;
        if (dpadLeft) padSteer = -1;
        if (dpadRight) padSteer = 1;

        // Triggers and face buttons for Throttle & Brake
        // RT: Button 7, A: Button 0, D-Pad Up: Button 12
        const rtVal = buttons[7]?.value ?? (buttons[7]?.pressed ? 1 : 0);
        const aPressed = buttons[0]?.pressed ?? false;
        const dpadUp = buttons[12]?.pressed ?? false;
        const throttleAnalog = Math.max(rtVal, aPressed || dpadUp ? 1 : 0);

        // LT: Button 6, X: Button 2, D-Pad Down: Button 13
        const ltVal = buttons[6]?.value ?? (buttons[6]?.pressed ? 1 : 0);
        const xPressed = buttons[2]?.pressed ?? false;
        const dpadDown = buttons[13]?.pressed ?? false;
        const brakeAnalog = Math.max(ltVal, xPressed || dpadDown ? 1 : 0);

        // Nitro/Boost: RB (Button 5) or Y (Button 3)
        const rbPressed = buttons[5]?.pressed ?? false;
        const yPressed = buttons[3]?.pressed ?? false;
        const padBoost = rbPressed || yPressed;

        // Handbrake/Drift: LB (Button 4) or B (Button 1)
        const lbPressed = buttons[4]?.pressed ?? false;
        const bPressed = buttons[1]?.pressed ?? false;
        const padDrift = lbPressed || bPressed;

        // Pause/Start button edge detection: Button 9
        const startPressed = buttons[9]?.pressed ?? false;
        if (startPressed && !padState.startJustPressed) {
          padState.startJustPressed = true;
          escRef.current();
        } else if (!startPressed) {
          padState.startJustPressed = false;
        }

        // Combine with keyboard input state:
        const hasKeyLeft = heldKeys.has("arrowleft") || heldKeys.has("keya") || heldKeys.has("keyq") || heldKeys.has("a") || heldKeys.has("q");
        const hasKeyRight = heldKeys.has("arrowright") || heldKeys.has("keyd") || heldKeys.has("d");
        const hasKeyUp = heldKeys.has("arrowup") || heldKeys.has("keyw") || heldKeys.has("keyz") || heldKeys.has("w") || heldKeys.has("z");
        const hasKeyDown = heldKeys.has("arrowdown") || heldKeys.has("keys") || heldKeys.has("s");
        const hasKeyBoost = heldKeys.has("shiftleft") || heldKeys.has("shiftright") || heldKeys.has("keyn") || heldKeys.has("keye") || heldKeys.has("keyx") || heldKeys.has("keyb") || heldKeys.has("n");
        const hasKeyDrift = heldKeys.has("space") || heldKeys.has("keyc") || heldKeys.has("keyj") || heldKeys.has("c");

        eng.input.left = hasKeyLeft || padSteer < -0.2;
        eng.input.right = hasKeyRight || padSteer > 0.2;
        eng.input.up = hasKeyUp || throttleAnalog > 0.15;
        eng.input.down = hasKeyDown || brakeAnalog > 0.15;
        eng.input.boost = hasKeyBoost || padBoost;
        eng.input.drift = hasKeyDrift || padDrift;

        if (hasKeyLeft) eng.input.steerAnalog = -1;
        else if (hasKeyRight) eng.input.steerAnalog = 1;
        else eng.input.steerAnalog = padSteer;

        eng.input.throttleAnalog = hasKeyUp ? 1 : throttleAnalog;
        eng.input.brakeAnalog = hasKeyDown ? 1 : brakeAnalog;
      }

      rafId = requestAnimationFrame(pollGamepad);
    };

    rafId = requestAnimationFrame(pollGamepad);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("gamepadconnected", onPadConnected);
      window.removeEventListener("gamepaddisconnected", onPadDisconnected);
      cancelAnimationFrame(rafId);
    };
  }, []);
}
