import { useState } from "react";
import {
  X, Volume2, Music, Gauge, Sliders, RotateCcw, Check, Zap, Eye
} from "lucide-react";
import type { GameSettings } from "../game/constants";
import { formatTime } from "../game/constants";
import { cn } from "../utils/cn";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdateSettings: (newSettings: GameSettings) => void;
  bestLap: number | null;
  onResetBestLap: () => void;
}

type TabType = "audio" | "gameplay" | "graphics";

export default function SettingsModal({
  open,
  onClose,
  settings,
  onUpdateSettings,
  bestLap,
  onResetBestLap,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("audio");
  const [resetConfirm, setResetConfirm] = useState(false);

  if (!open) return null;

  const update = <K extends keyof GameSettings>(key: K, val: GameSettings[K]) => {
    onUpdateSettings({ ...settings, [key]: val });
  };

  const handleResetLap = () => {
    if (!resetConfirm) {
      setResetConfirm(true);
      setTimeout(() => setResetConfirm(false), 4000);
      return;
    }
    onResetBestLap();
    setResetConfirm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-night-900/80 backdrop-blur-md animate-fade-up">
      {/* Modal Container */}
      <div className="relative w-full max-w-xl overflow-hidden border border-white/15 bg-gradient-to-b from-night-800/95 via-night-900/95 to-night-950/98 shadow-[0_0_80px_rgba(0,0,0,0.85)] corner-frame">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center border border-ember-400/40 bg-ember-500/10 text-ember-300">
              <Sliders className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-display text-base tracking-[0.25em] text-white">SETTINGS</h2>
              <p className="text-[10px] tracking-[0.18em] text-white/45">PREFERENCES & TWEAKS</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center border border-white/10 text-white/50 transition-colors hover:border-white/30 hover:text-white"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-night-900/50 px-6">
          <TabButton
            active={activeTab === "audio"}
            onClick={() => setActiveTab("audio")}
            icon={<Volume2 className="h-3.5 w-3.5" />}
            label="AUDIO"
          />
          <TabButton
            active={activeTab === "gameplay"}
            onClick={() => setActiveTab("gameplay")}
            icon={<Gauge className="h-3.5 w-3.5" />}
            label="GAMEPLAY"
          />
          <TabButton
            active={activeTab === "graphics"}
            onClick={() => setActiveTab("graphics")}
            icon={<Eye className="h-3.5 w-3.5" />}
            label="GRAPHICS"
          />
        </div>

        {/* Tab Content */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-5 space-y-5">
          {/* AUDIO TAB */}
          {activeTab === "audio" && (
            <div className="space-y-4">
              <RangeSlider
                label="MASTER SFX VOLUME"
                icon={<Volume2 className="h-4 w-4 text-ember-400" />}
                value={settings.sfxVolume}
                onChange={(v) => update("sfxVolume", v)}
              />
              <RangeSlider
                label="SYNTHWAVE MUSIC VOLUME"
                icon={<Music className="h-4 w-4 text-sky-400" />}
                value={settings.musicVolume}
                onChange={(v) => update("musicVolume", v)}
              />
              <RangeSlider
                label="ENGINE ROAR VOLUME"
                icon={<Zap className="h-4 w-4 text-amber-400" />}
                value={settings.engineVolume}
                onChange={(v) => update("engineVolume", v)}
              />
            </div>
          )}

          {/* GAMEPLAY TAB */}
          {activeTab === "gameplay" && (
            <div className="space-y-4">
              {/* Speed Unit */}
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div>
                  <div className="font-display text-xs tracking-[0.2em] text-white/90">SPEEDOMETER UNIT</div>
                  <div className="text-[10px] text-white/40">Choose miles per hour or kilometers per hour</div>
                </div>
                <div className="flex border border-white/15 bg-night-950 p-0.5">
                  <button
                    onClick={() => update("speedUnit", "mph")}
                    className={cn(
                      "px-3 py-1 font-display text-[10px] tracking-wider transition-colors",
                      settings.speedUnit === "mph" ? "bg-ember-500 text-night-900 font-bold" : "text-white/60 hover:text-white"
                    )}
                  >
                    MPH
                  </button>
                  <button
                    onClick={() => update("speedUnit", "kmh")}
                    className={cn(
                      "px-3 py-1 font-display text-[10px] tracking-wider transition-colors",
                      settings.speedUnit === "kmh" ? "bg-ember-500 text-night-900 font-bold" : "text-white/60 hover:text-white"
                    )}
                  >
                    KM/H
                  </button>
                </div>
              </div>

              {/* Steering Sensitivity */}
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div>
                  <div className="font-display text-xs tracking-[0.2em] text-white/90">STEERING RESPONSE</div>
                  <div className="text-[10px] text-white/40">Tuning responsiveness for sharp vs casual turns</div>
                </div>
                <div className="flex border border-white/15 bg-night-950 p-0.5">
                  {[
                    { val: 0.8, label: "CASUAL" },
                    { val: 1.0, label: "STD" },
                    { val: 1.25, label: "SHARP" },
                  ].map((item) => (
                    <button
                      key={item.val}
                      onClick={() => update("steeringSensitivity", item.val)}
                      className={cn(
                        "px-2.5 py-1 font-display text-[10px] tracking-wider transition-colors",
                        settings.steeringSensitivity === item.val
                          ? "bg-ember-500 text-night-900 font-bold"
                          : "text-white/60 hover:text-white"
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto Throttle */}
              <ToggleRow
                label="AUTO-THROTTLE ASSIST"
                sub="Automatically accelerates forward; focus on steering, drift, and nitro"
                checked={settings.autoThrottle}
                onChange={(c) => update("autoThrottle", c)}
              />

              {/* Lap Record Reset */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="font-display text-xs tracking-[0.2em] text-white/90">PERSONAL BEST RECORD</div>
                  <div className="font-mono text-xs text-ember-300">
                    {bestLap !== null ? formatTime(bestLap) : "NO RECORD SET"}
                  </div>
                </div>
                {bestLap !== null && (
                  <button
                    onClick={handleResetLap}
                    className={cn(
                      "flex items-center gap-1.5 border px-3 py-1.5 font-display text-[10px] tracking-widest transition-colors",
                      resetConfirm
                        ? "border-red-500 bg-red-500/20 text-red-300"
                        : "border-white/15 text-white/55 hover:border-red-500/50 hover:text-red-300"
                    )}
                  >
                    <RotateCcw className="h-3 w-3" />
                    {resetConfirm ? "CONFIRM RESET?" : "RESET RECORD"}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* GRAPHICS TAB */}
          {activeTab === "graphics" && (
            <div className="space-y-4">
              <ToggleRow
                label="HYPER-SPEED MOTION LINES"
                sub="High-speed radial streak lines at max throttle & nitro"
                checked={settings.speedLines}
                onChange={(c) => update("speedLines", c)}
              />

              <ToggleRow
                label="NEON UNDERGLOW & LIGHT TRAILS"
                sub="Chassis ground neon reflection and LED taillight ribbon trails"
                checked={settings.lightTrails}
                onChange={(c) => update("lightTrails", c)}
              />

              <ToggleRow
                label="STORM & RAIN PARTICLE FX"
                sub="Wet road specular shine, falling rain streaks and lens droplet splashes"
                checked={settings.rainEffects}
                onChange={(c) => update("rainEffects", c)}
              />

              {/* Camera Shake */}
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div>
                  <div className="font-display text-xs tracking-[0.2em] text-white/90">CAMERA SHAKE</div>
                  <div className="text-[10px] text-white/40">Offroad bumps, launch shake and collision vibration</div>
                </div>
                <div className="flex border border-white/15 bg-night-950 p-0.5">
                  {[
                    { val: 0, label: "OFF" },
                    { val: 0.5, label: "50%" },
                    { val: 1.0, label: "100%" },
                    { val: 1.5, label: "150%" },
                  ].map((item) => (
                    <button
                      key={item.val}
                      onClick={() => update("cameraShake", item.val)}
                      className={cn(
                        "px-2 py-1 font-display text-[10px] tracking-wider transition-colors",
                        settings.cameraShake === item.val
                          ? "bg-ember-500 text-night-900 font-bold"
                          : "text-white/60 hover:text-white"
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between border-t border-white/10 bg-night-950/70 px-6 py-3.5">
          <div className="text-[10px] tracking-[0.2em] text-white/40">
            AUTO-SAVED TO BROWSER
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-2 bg-gradient-to-r from-ember-600 to-ember-400 px-6 py-2 font-display text-xs tracking-[0.2em] text-night-900 shadow-[0_0_25px_rgba(255,123,28,0.35)] transition-all hover:scale-105 active:scale-95"
          >
            <Check className="h-3.5 w-3.5" />
            DONE
          </button>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 border-b-2 px-5 py-3 font-display text-xs tracking-[0.2em] transition-all",
        active
          ? "border-ember-400 text-ember-300 font-bold"
          : "border-transparent text-white/45 hover:text-white/80"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function RangeSlider({
  label,
  icon,
  value,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="border border-white/8 bg-white/[0.02] p-3.5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-display text-xs tracking-[0.2em] text-white/85">{label}</span>
        </div>
        <span className="font-mono text-xs font-bold text-ember-300">{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none bg-white/15 accent-ember-400"
      />
    </div>
  );
}

function ToggleRow({
  label,
  sub,
  checked,
  onChange,
}: {
  label: string;
  sub: string;
  checked: boolean;
  onChange: (c: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 pb-3">
      <div>
        <div className="font-display text-xs tracking-[0.2em] text-white/90">{label}</div>
        <div className="text-[10px] text-white/40">{sub}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 border transition-colors",
          checked ? "border-ember-400/80 bg-ember-500/80" : "border-white/20 bg-night-950"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4.5 w-4.5 bg-white transition-transform",
            checked ? "left-[22px] bg-night-900" : "left-0.5 bg-white/60"
          )}
        />
      </button>
    </div>
  );
}
