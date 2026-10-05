import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Wrench, Zap, Gauge, Wind, Flame, Check, Lock, DollarSign,
  ArrowLeft, Sparkles, Palette, Sun, Moon, CloudRain, Disc,
  Layers, ShieldCheck, ChevronRight
} from "lucide-react";
import {
  CARS, type CarDef, UPGRADE_DEFINITIONS,
  type CarUpgrades, type CareerProgress, DEFAULT_UPGRADES,
  CUSTOM_PAINTS, type CustomPaint, type WeatherMode
} from "../game/constants";
import { carPreview } from "../game/sprites";
import { cn } from "../utils/cn";
import { getAudio } from "../game/audio";

interface GarageTuningProps {
  career: CareerProgress;
  activeCar: CarDef;
  onSelectCar: (car: CarDef) => void;
  onUpgradeCar: (carId: string, category: keyof CarUpgrades, stage: number, cost: number) => void;
  onBack: () => void;
}

type GarageTab = "tuning" | "livery" | "blueprint";

interface HoveredTier {
  catId: keyof CarUpgrades;
  stage: number;
}

const STORAGE_CUSTOM_PAINTS = "apex.garage_paints";

export default function GarageTuning({
  career,
  activeCar,
  onSelectCar,
  onUpgradeCar,
  onBack,
}: GarageTuningProps) {
  const [selectedCar, setSelectedCar] = useState<CarDef>(activeCar);
  const [activeTab, setActiveTab] = useState<GarageTab>("tuning");
  const [showroomWeather, setShowroomWeather] = useState<WeatherMode>("night");
  const [testBrakes, setTestBrakes] = useState(false);
  const [isRevving, setIsRevving] = useState(false);
  const [hoveredTier, setHoveredTier] = useState<HoveredTier | null>(null);
  const audio = getAudio();

  // Custom paint per car dictionary
  const [carPaints, setCarPaints] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CUSTOM_PAINTS);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Merge selected car with custom paint if selected
  const displayCar: CarDef = useMemo(() => {
    const paintId = carPaints[selectedCar.id];
    if (!paintId || paintId === "factory") return selectedCar;
    const cp = CUSTOM_PAINTS.find((p) => p.id === paintId);
    if (!cp) return selectedCar;
    return {
      ...selectedCar,
      base: cp.base,
      dark: cp.dark,
      light: cp.light,
      accent: cp.accent,
    };
  }, [selectedCar, carPaints]);

  const carUpgrades: CarUpgrades = career.upgrades[selectedCar.id] || DEFAULT_UPGRADES;

  // Active stages
  const engineStage = carUpgrades.engine || 0;
  const transStage = carUpgrades.trans || 0;
  const tiresStage = carUpgrades.tires || 0;
  const nitroStage = carUpgrades.nitro || 0;
  const totalStages = engineStage + transStage + tiresStage + nitroStage;

  // Current tuned specs
  const tunedBhp = Math.round(selectedCar.bhp + engineStage * 28);
  const tunedZeroToSixty = Math.max(2.1, Number((selectedCar.zeroToSixty - transStage * 0.22).toFixed(1)));
  const tunedMaxSpeed = Math.round(selectedCar.maxSpeedDisplay * (1 + engineStage * 0.035));
  const tunedGrip = Number((selectedCar.lateralG + tiresStage * 0.09).toFixed(2));
  const tunedNitro = 100 + nitroStage * 15;

  // Prospective preview when hovering over an upgrade tier
  const previewEngineStage = hoveredTier && hoveredTier.catId === "engine" && hoveredTier.stage > engineStage
    ? hoveredTier.stage
    : engineStage;
  const previewTransStage = hoveredTier && hoveredTier.catId === "trans" && hoveredTier.stage > transStage
    ? hoveredTier.stage
    : transStage;
  const previewTiresStage = hoveredTier && hoveredTier.catId === "tires" && hoveredTier.stage > tiresStage
    ? hoveredTier.stage
    : tiresStage;
  const previewNitroStage = hoveredTier && hoveredTier.catId === "nitro" && hoveredTier.stage > nitroStage
    ? hoveredTier.stage
    : nitroStage;

  const previewBhp = Math.round(selectedCar.bhp + previewEngineStage * 28);
  const previewZeroToSixty = Math.max(2.1, Number((selectedCar.zeroToSixty - previewTransStage * 0.22).toFixed(1)));
  const previewMaxSpeed = Math.round(selectedCar.maxSpeedDisplay * (1 + previewEngineStage * 0.035));
  const previewGrip = Number((selectedCar.lateralG + previewTiresStage * 0.09).toFixed(2));
  const previewNitro = 100 + previewNitroStage * 15;

  // Deltas for display
  const bhpDelta = previewBhp - tunedBhp;
  const accelDelta = Number((tunedZeroToSixty - previewZeroToSixty).toFixed(1));
  const speedDelta = previewMaxSpeed - tunedMaxSpeed;
  const gripDelta = Number((previewGrip - tunedGrip).toFixed(2));
  const nitroDelta = previewNitro - tunedNitro;

  // High-resolution turntable showroom render
  const showroomImage = useMemo(() => {
    return carPreview(displayCar, showroomWeather, carUpgrades, {
      braking: testBrakes,
      revSparks: isRevving,
    });
  }, [displayCar, showroomWeather, carUpgrades, testBrakes, isRevving]);

  // Mini preview thumbnails for all cars in the switcher
  const carThumbnails = useMemo(() => {
    return CARS.reduce<Record<string, string>>((acc, car) => {
      const paintId = carPaints[car.id];
      const cp = paintId && paintId !== "factory" ? CUSTOM_PAINTS.find((p) => p.id === paintId) : null;
      const c = cp ? { ...car, base: cp.base, dark: cp.dark, light: cp.light, accent: cp.accent } : car;
      acc[car.id] = carPreview(c, "sunset", career.upgrades[car.id]);
      return acc;
    }, {});
  }, [carPaints, career.upgrades]);

  const handleCarSwitch = (car: CarDef) => {
    audio.beep(520, 0.08);
    setSelectedCar(car);
    setHoveredTier(null);
    const paintId = carPaints[car.id];
    const cp = paintId && paintId !== "factory" ? CUSTOM_PAINTS.find((p) => p.id === paintId) : null;
    const finalCar = cp ? { ...car, base: cp.base, dark: cp.dark, light: cp.light, accent: cp.accent } : car;
    onSelectCar(finalCar);
  };

  const handleSelectPaint = (paint: CustomPaint) => {
    audio.beep(640, 0.08);
    const next = { ...carPaints, [selectedCar.id]: paint.id };
    setCarPaints(next);
    localStorage.setItem(STORAGE_CUSTOM_PAINTS, JSON.stringify(next));

    const finalCar: CarDef = paint.id === "factory"
      ? selectedCar
      : {
          ...selectedCar,
          base: paint.base,
          dark: paint.dark,
          light: paint.light,
          accent: paint.accent,
        };
    onSelectCar(finalCar);
  };

  const handleRevEngine = useCallback(() => {
    audio.ensure();
    setIsRevving(true);
    audio.revCar(selectedCar.id);
    window.setTimeout(() => {
      setIsRevving(false);
    }, 850);
  }, [audio, selectedCar.id]);

  const handlePurchase = (category: keyof CarUpgrades, stage: number, cost: number) => {
    if (career.credits < cost) {
      audio.thud(0.5);
      return;
    }
    audio.upgrade();
    onUpgradeCar(selectedCar.id, category, stage, cost);
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "Escape") {
        audio.beep(360, 0.08);
        onBack();
      } else if (e.key === "1") {
        audio.beep(460, 0.05);
        setActiveTab("tuning");
      } else if (e.key === "2") {
        audio.beep(460, 0.05);
        setActiveTab("livery");
      } else if (e.key === "3") {
        audio.beep(460, 0.05);
        setActiveTab("blueprint");
      } else if (e.key === " " && !e.repeat) {
        e.preventDefault();
        handleRevEngine();
      } else if (e.key.toLowerCase() === "b" && !e.repeat) {
        audio.beep(300, 0.05);
        setTestBrakes((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [audio, onBack, handleRevEngine]);

  const getArchetypeName = (style: string) => {
    switch (style) {
      case "proto": return "LE MANS HYPERCAR PROTOTYPE";
      case "rally": return "GROUP-A TIME ATTACK WIDEBODY";
      case "cyber": return "CYBERNETIC HYPER-ELECTRIC COUPE";
      case "muscle": return "AMERICAN WIDEBODY MUSCLE BRUTE";
      default: return "MODERN SCULPTED GRAND TOURER";
    }
  };

  const getAeroSpec = (car: CarDef) => {
    switch (car.bodyStyle) {
      case "proto": return "Swan-Neck Carbon GT Wing // Venturi Ground-Effects";
      case "rally": return "Rally High-Downforce Wing // Roof Vortex Teeth";
      case "cyber": return "Motorized Dual Split Winglets // Cyber Aero Vents";
      case "muscle": return "Smoked Acrylic Wickerbill Ducktail // Rear Louvers";
      default: return "Dual-Deck Carbon Aero Wing // Integrated Ducktail";
    }
  };

  return (
    <div className="relative flex h-full w-full flex-col justify-between overflow-y-auto lg:overflow-hidden px-4 py-4 sm:px-8 sm:py-5 text-white select-none">
      {/* Background ambient gradient vignette */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-ember-950/25 via-night-950/90 to-night-950" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30" />

      {/* ---- TOP BAR: HEADER, WORKSPACE TABS & WALLET ---- */}
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              audio.beep(360, 0.08);
              onBack();
            }}
            className="group flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-display tracking-widest text-white/80 transition-all hover:border-ember-400 hover:bg-ember-500/10 hover:text-white cursor-pointer active:scale-95"
            title="Return to Main Menu [ESC]"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            <span>PADDOCK</span>
            <span className="hidden sm:inline-block font-mono text-[9px] text-white/40 ml-1 border border-white/15 rounded px-1">ESC</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-md border border-ember-400/40 bg-ember-500/10">
                <Wrench className="h-4 w-4 text-ember-400" />
              </div>
              <h1 className="font-display text-xl sm:text-2xl font-black italic tracking-wide text-white">
                MOTORSPORT GARAGE & SHOWROOM
              </h1>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono tracking-widest text-white/50">
              <span className="text-ember-400">APX FACTORY WORKS</span>
              <span>//</span>
              <span>TUNING LAB</span>
              <span>//</span>
              <span>LIVERY STUDIO</span>
            </div>
          </div>
        </div>

        {/* Central Workspace Tab Bar */}
        <div className="flex items-center gap-1 rounded-xl border border-white/15 bg-black/60 p-1 backdrop-blur-md shadow-2xl">
          <button
            type="button"
            onClick={() => {
              audio.beep(460, 0.05);
              setActiveTab("tuning");
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-display font-bold tracking-wider transition-all cursor-pointer",
              activeTab === "tuning"
                ? "bg-gradient-to-r from-ember-500 to-amber-500 text-night-950 font-black shadow-[0_0_16px_rgba(255,158,61,0.5)]"
                : "text-white/60 hover:text-white hover:bg-white/10"
            )}
          >
            <Wrench className="h-3.5 w-3.5" />
            <span>TUNING & UPGRADES</span>
            <span className={cn(
              "font-mono text-[9px] px-1.5 py-0.2 rounded font-bold ml-0.5",
              activeTab === "tuning" ? "bg-black/30 text-black" : "bg-white/10 text-white/70"
            )}>
              {totalStages}/12
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              audio.beep(460, 0.05);
              setActiveTab("livery");
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-display font-bold tracking-wider transition-all cursor-pointer",
              activeTab === "livery"
                ? "bg-gradient-to-r from-cyan-500 to-sky-400 text-night-950 font-black shadow-[0_0_16px_rgba(6,182,212,0.5)]"
                : "text-white/60 hover:text-white hover:bg-white/10"
            )}
          >
            <Palette className="h-3.5 w-3.5" />
            <span>LIVERY & PAINT</span>
          </button>

          <button
            type="button"
            onClick={() => {
              audio.beep(460, 0.05);
              setActiveTab("blueprint");
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-display font-bold tracking-wider transition-all cursor-pointer",
              activeTab === "blueprint"
                ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-black shadow-[0_0_16px_rgba(168,85,247,0.5)]"
                : "text-white/60 hover:text-white hover:bg-white/10"
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>CHASSIS BLUEPRINT</span>
          </button>
        </div>

        {/* Bank Balance Pill */}
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-400/30 bg-emerald-950/40 px-3.5 py-1.5 backdrop-blur-md shadow-[0_0_20px_rgba(16,185,129,0.18)]">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500/20 text-emerald-300">
            <DollarSign className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] font-mono uppercase tracking-widest text-emerald-300/70">AVAILABLE CREDITS</span>
            <span className="font-mono text-base font-bold text-emerald-300 leading-tight">
              ${career.credits.toLocaleString()}
            </span>
          </div>
        </div>
      </header>

      {/* ---- MACHINE SELECTOR RIBBON (COMPACT & SLEEK) ---- */}
      <div className="relative z-10 my-2 flex flex-col gap-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-display font-bold tracking-[0.25em] text-white/50 uppercase">
            PADDOCK FLEET ({CARS.length} VEHICLES)
          </span>
          <span className="text-[10px] font-mono text-amber-300">
            SELECTED: {displayCar.name} // {displayCar.cls}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {CARS.map((car) => {
            const active = car.id === selectedCar.id;
            const upgradesCount = Object.values(career.upgrades[car.id] || DEFAULT_UPGRADES).reduce((a, b) => a + b, 0);
            const thumb = carThumbnails[car.id];
            const clsBadge = car.cls.split("//")[0].trim();

            return (
              <button
                key={car.id}
                type="button"
                onClick={() => handleCarSwitch(car)}
                className={cn(
                  "group relative flex items-center gap-2.5 rounded-xl border p-1.5 sm:p-2 text-left transition-all duration-200 cursor-pointer overflow-hidden",
                  active
                    ? "border-ember-400/90 bg-gradient-to-r from-ember-500/20 via-night-900/90 to-night-900 shadow-[0_0_24px_rgba(255,158,61,0.3)] ring-1 ring-ember-400/50"
                    : "border-white/10 bg-night-950/60 hover:border-white/25 hover:bg-white/5"
                )}
              >
                {/* Car Preview Podium Thumbnail */}
                <div className="relative h-12 w-16 sm:h-14 sm:w-20 shrink-0 overflow-hidden rounded-lg bg-black/60 border border-white/5 flex items-center justify-center">
                  {thumb && (
                    <img
                      src={thumb}
                      alt={car.name}
                      className={cn(
                        "h-full w-full object-contain transition-transform duration-300",
                        active ? "scale-110" : "group-hover:scale-105"
                      )}
                      draggable={false}
                    />
                  )}
                  <span className={cn(
                    "absolute top-0.5 left-0.5 px-1 py-0.2 text-[7px] font-mono font-bold tracking-wider rounded",
                    active
                      ? "bg-ember-500 text-black font-black"
                      : "bg-black/80 text-white/70 border border-white/10"
                  )}>
                    {clsBadge}
                  </span>
                </div>

                {/* Car Details */}
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className={cn(
                      "font-display text-xs sm:text-sm font-black italic tracking-wide truncate",
                      active ? "text-ember-300" : "text-white"
                    )}>
                      {car.name}
                    </span>
                    {active && (
                      <span className="h-1.5 w-1.5 rounded-full bg-ember-400 shadow-[0_0_8px_#ff9e3d] shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-mono text-white/50 mt-0.5">
                    <span>{car.bhp} BHP</span>
                    <span className={cn(
                      "font-bold",
                      upgradesCount > 0 ? "text-amber-300" : "text-white/30"
                    )}>
                      {upgradesCount}/12 STAGES
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---- MAIN SPLIT VIEW: SHOWROOM & GAUGES (LEFT) + WORKSPACE STUDIO (RIGHT) ---- */}
      <main className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-3.5 my-1 flex-1 min-h-0">
        {/* ================= LEFT COLUMN: SHOWROOM STAGE & TELEMETRY ================= */}
        <section className="lg:col-span-7 flex flex-col justify-between gap-2.5 min-h-0">
          {/* 3D Turntable Arena Stage */}
          <div className="relative flex flex-col rounded-2xl border border-white/15 bg-gradient-to-b from-black/85 via-night-950/90 to-black/95 p-3 sm:p-4 backdrop-blur-xl shadow-2xl overflow-hidden flex-1 min-h-[260px] sm:min-h-[290px] justify-between">
            {/* Top Bar inside Showroom: Status + Studio Lighting */}
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
                <span className="font-display text-[11px] font-bold tracking-widest text-white/80">
                  SHOWROOM ARENA // 360° LIVE
                </span>
              </div>

              {/* Atmosphere Studio Lighting buttons */}
              <div className="inline-flex rounded-lg border border-white/15 bg-black/60 p-0.5 text-[9px]">
                <button
                  type="button"
                  onClick={() => {
                    audio.beep(420, 0.05);
                    setShowroomWeather("sunset");
                  }}
                  className={cn(
                    "flex items-center gap-1 rounded px-2 py-0.5 font-display tracking-wider transition-all cursor-pointer",
                    showroomWeather === "sunset"
                      ? "bg-amber-500 font-bold text-black shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                      : "text-white/60 hover:text-white"
                  )}
                >
                  <Sun className="h-3 w-3" /> GOLDEN
                </button>
                <button
                  type="button"
                  onClick={() => {
                    audio.beep(420, 0.05);
                    setShowroomWeather("night");
                  }}
                  className={cn(
                    "flex items-center gap-1 rounded px-2 py-0.5 font-display tracking-wider transition-all cursor-pointer",
                    showroomWeather === "night"
                      ? "bg-cyan-500 font-bold text-black shadow-[0_0_12px_rgba(6,182,212,0.6)]"
                      : "text-white/60 hover:text-white"
                  )}
                >
                  <Moon className="h-3 w-3" /> NEON
                </button>
                <button
                  type="button"
                  onClick={() => {
                    audio.beep(420, 0.05);
                    setShowroomWeather("rain");
                  }}
                  className={cn(
                    "flex items-center gap-1 rounded px-2 py-0.5 font-display tracking-wider transition-all cursor-pointer",
                    showroomWeather === "rain"
                      ? "bg-sky-500 font-bold text-black shadow-[0_0_12px_rgba(14,165,233,0.5)]"
                      : "text-white/60 hover:text-white"
                  )}
                >
                  <CloudRain className="h-3 w-3" /> CYBER
                </button>
              </div>
            </div>

            {/* Turntable Floor & Vehicle Centerpiece */}
            <div className="relative my-auto flex h-48 sm:h-56 items-center justify-center overflow-hidden rounded-xl border border-white/5 bg-radial from-white/[0.03] to-black/60 p-2">
              <img
                src={showroomImage}
                alt={displayCar.name}
                className={cn(
                  "h-full w-full object-contain transition-all duration-300 select-none",
                  isRevving && "scale-[1.04] -translate-y-1 filter drop-shadow-[0_0_35px_rgba(255,123,28,0.7)]",
                  testBrakes && "filter drop-shadow-[0_0_35px_rgba(244,63,94,0.85)]"
                )}
                draggable={false}
              />

              {/* Floating Vehicle Badge Overlays */}
              <div className="pointer-events-none absolute bottom-2 left-3 flex flex-col text-left">
                <span className="font-display text-base sm:text-lg font-black italic tracking-wider text-white drop-shadow-md">
                  {displayCar.name}
                </span>
                <span className="text-[10px] font-mono text-amber-300">
                  {getArchetypeName(displayCar.bodyStyle)}
                </span>
              </div>

              <div className="pointer-events-none absolute top-2 right-3 text-right">
                <span className="rounded-md bg-black/70 px-2 py-0.5 font-mono text-[9px] text-white/70 border border-white/10 backdrop-blur-md">
                  {displayCar.badgeText} // FIA HOMOLOGATED
                </span>
              </div>
            </div>

            {/* Interactive Stage Controls: Rev Engine & Brake Lights */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRevEngine}
                  disabled={isRevving}
                  className={cn(
                    "group flex items-center gap-2 rounded-lg px-4 py-2 font-display text-xs font-black tracking-wider transition-all cursor-pointer select-none active:scale-95",
                    isRevving
                      ? "bg-rose-500 text-white shadow-[0_0_24px_rgba(244,63,94,0.85)] scale-105"
                      : "bg-gradient-to-r from-ember-500 via-amber-500 to-amber-400 text-night-950 hover:shadow-[0_0_20px_rgba(255,158,61,0.6)]"
                  )}
                  title="Audition engine acoustics [SPACE]"
                >
                  <Flame className={cn("h-4 w-4", isRevving ? "animate-bounce" : "group-hover:scale-110")} />
                  <span>{isRevving ? "ENGINE ROARING!" : "AUDITION ENGINE REV"}</span>
                  <span className="font-mono text-[8px] opacity-75 hidden sm:inline">[SPACE]</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    audio.beep(300, 0.05);
                    setTestBrakes((b) => !b);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-3 py-2 font-display text-xs font-bold tracking-wider transition-all cursor-pointer active:scale-95",
                    testBrakes
                      ? "border-rose-500 bg-rose-950/70 text-rose-300 shadow-[0_0_16px_rgba(244,63,94,0.5)]"
                      : "border-white/15 bg-white/5 text-white/70 hover:border-white/30 hover:text-white"
                  )}
                  title="Toggle brake light illumination [B]"
                >
                  <Disc className="h-4 w-4" />
                  <span>{testBrakes ? "BRAKES: ON" : "TEST BRAKE LIGHTS"}</span>
                  <span className="font-mono text-[8px] opacity-60 hidden sm:inline">[B]</span>
                </button>
              </div>

              <div className="flex items-center gap-1 text-[10px] font-mono text-white/40">
                <span>ACOUSTIC SYNTHESIS ENGINE</span>
              </div>
            </div>
          </div>

          {/* Unified Live Telemetry Gauges Cluster with Real-Time Delta Preview */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 rounded-2xl border border-white/10 bg-black/60 p-2.5 backdrop-blur-xl">
            {/* 1. HORSEPOWER */}
            <div className="rounded-xl border border-white/5 bg-white/[0.03] p-2 flex flex-col justify-between">
              <div className="flex items-center justify-between text-white/50">
                <span className="text-[8px] font-mono uppercase tracking-wider">POWER</span>
                <Zap className="h-3 w-3 text-amber-400" />
              </div>
              <div className="mt-1 flex items-baseline justify-between gap-1">
                <span className="font-display text-lg font-black text-white">{previewBhp}</span>
                <span className="text-[9px] font-mono text-amber-400">BHP</span>
                {bhpDelta > 0 ? (
                  <span className="font-mono text-[9px] font-bold text-emerald-400 animate-pulse ml-auto">
                    +{bhpDelta}
                  </span>
                ) : engineStage > 0 ? (
                  <span className="font-mono text-[8px] text-white/40 ml-auto">
                    +{engineStage * 28}
                  </span>
                ) : null}
              </div>
              <div className="mt-1.5 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-ember-400 transition-all duration-300"
                  style={{ width: `${Math.min(100, (previewBhp / 950) * 100)}%` }}
                />
              </div>
            </div>

            {/* 2. 0-60 ACCELERATION */}
            <div className="rounded-xl border border-white/5 bg-white/[0.03] p-2 flex flex-col justify-between">
              <div className="flex items-center justify-between text-white/50">
                <span className="text-[8px] font-mono uppercase tracking-wider">0-60 MPH</span>
                <Gauge className="h-3 w-3 text-sky-400" />
              </div>
              <div className="mt-1 flex items-baseline justify-between gap-1">
                <span className="font-display text-lg font-black text-white">{previewZeroToSixty}s</span>
                {accelDelta > 0 ? (
                  <span className="font-mono text-[9px] font-bold text-emerald-400 animate-pulse ml-auto">
                    -{accelDelta}s
                  </span>
                ) : transStage > 0 ? (
                  <span className="font-mono text-[8px] text-white/40 ml-auto">
                    -{(transStage * 0.22).toFixed(1)}s
                  </span>
                ) : null}
              </div>
              <div className="mt-1.5 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(10, ((3.6 - previewZeroToSixty) / 1.5) * 100))}%` }}
                />
              </div>
            </div>

            {/* 3. TOP SPEED */}
            <div className="rounded-xl border border-white/5 bg-white/[0.03] p-2 flex flex-col justify-between">
              <div className="flex items-center justify-between text-white/50">
                <span className="text-[8px] font-mono uppercase tracking-wider">TOP SPEED</span>
                <Flame className="h-3 w-3 text-ember-400" />
              </div>
              <div className="mt-1 flex items-baseline justify-between gap-1">
                <span className="font-display text-lg font-black text-white">{previewMaxSpeed}</span>
                <span className="text-[9px] font-mono text-ember-400">MPH</span>
                {speedDelta > 0 ? (
                  <span className="font-mono text-[9px] font-bold text-emerald-400 animate-pulse ml-auto">
                    +{speedDelta}
                  </span>
                ) : engineStage > 0 ? (
                  <span className="font-mono text-[8px] text-white/40 ml-auto">
                    +{tunedMaxSpeed - selectedCar.maxSpeedDisplay}
                  </span>
                ) : null}
              </div>
              <div className="mt-1.5 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-ember-500 to-rose-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, (previewMaxSpeed / 260) * 100)}%` }}
                />
              </div>
            </div>

            {/* 4. LATERAL GRIP */}
            <div className="rounded-xl border border-white/5 bg-white/[0.03] p-2 flex flex-col justify-between">
              <div className="flex items-center justify-between text-white/50">
                <span className="text-[8px] font-mono uppercase tracking-wider">LATERAL GRIP</span>
                <Wind className="h-3 w-3 text-emerald-400" />
              </div>
              <div className="mt-1 flex items-baseline justify-between gap-1">
                <span className="font-display text-lg font-black text-white">{previewGrip}</span>
                <span className="text-[9px] font-mono text-emerald-400">G</span>
                {gripDelta > 0 ? (
                  <span className="font-mono text-[9px] font-bold text-emerald-400 animate-pulse ml-auto">
                    +{gripDelta}G
                  </span>
                ) : tiresStage > 0 ? (
                  <span className="font-mono text-[8px] text-white/40 ml-auto">
                    +{(tiresStage * 0.09).toFixed(2)}G
                  </span>
                ) : null}
              </div>
              <div className="mt-1.5 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(10, ((previewGrip - 1.0) / 0.8) * 100))}%` }}
                />
              </div>
            </div>

            {/* 5. NITROUS CAPACITY */}
            <div className="rounded-xl border border-white/5 bg-white/[0.03] p-2 flex flex-col justify-between col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-white/50">
                <span className="text-[8px] font-mono uppercase tracking-wider">NITRO BOOST</span>
                <Sparkles className="h-3 w-3 text-purple-400" />
              </div>
              <div className="mt-1 flex items-baseline justify-between gap-1">
                <span className="font-display text-lg font-black text-white">{previewNitro}</span>
                <span className="text-[9px] font-mono text-purple-400">PSI</span>
                {nitroDelta > 0 ? (
                  <span className="font-mono text-[9px] font-bold text-emerald-400 animate-pulse ml-auto">
                    +{nitroDelta}
                  </span>
                ) : nitroStage > 0 ? (
                  <span className="font-mono text-[8px] text-white/40 ml-auto">
                    +{nitroStage * 15}
                  </span>
                ) : null}
              </div>
              <div className="mt-1.5 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-400 transition-all duration-300"
                  style={{ width: `${Math.min(100, (previewNitro / 150) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ================= RIGHT COLUMN: DYNAMIC WORKSPACE STUDIO ================= */}
        <section className="lg:col-span-5 flex flex-col rounded-2xl border border-white/15 bg-black/75 p-3 sm:p-4 backdrop-blur-xl shadow-2xl min-h-0 justify-between">
          {/* TAB 1: PERFORMANCE UPGRADES */}
          {activeTab === "tuning" && (
            <div className="flex flex-col h-full justify-between">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-ember-400" />
                  <span className="font-display text-xs font-black tracking-wider text-white uppercase">
                    PERFORMANCE TUNING MODULES
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono">
                  <span className="text-white/40">TOTAL TUNED:</span>
                  <span className="font-bold text-ember-300">{totalStages}/12 STAGES</span>
                </div>
              </div>

              {/* Scrollable list of 4 Upgrade Categories */}
              <div className="mt-2.5 flex-1 overflow-y-auto pr-1 space-y-2.5 max-h-[360px] sm:max-h-[420px]">
                {UPGRADE_DEFINITIONS.map((cat) => {
                  const currentStage = carUpgrades[cat.id] || 0;
                  return (
                    <div
                      key={cat.id}
                      className="rounded-xl border border-white/10 bg-white/[0.02] p-2.5 transition-all hover:border-white/20"
                    >
                      {/* Category Header */}
                      <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-1.5">
                        <div className="flex items-center gap-1.5">
                          {cat.id === "engine" && <Zap className="h-3.5 w-3.5 text-amber-400" />}
                          {cat.id === "trans" && <Gauge className="h-3.5 w-3.5 text-sky-400" />}
                          {cat.id === "tires" && <Wind className="h-3.5 w-3.5 text-emerald-400" />}
                          {cat.id === "nitro" && <Flame className="h-3.5 w-3.5 text-purple-400" />}
                          <span className="font-display text-xs font-bold tracking-wide text-white">
                            {cat.name}
                          </span>
                        </div>

                        {/* Progress Pips */}
                        <div className="flex items-center gap-1">
                          {[1, 2, 3].map((pip) => (
                            <span
                              key={pip}
                              className={cn(
                                "h-1.5 w-3.5 rounded-full transition-all",
                                currentStage >= pip
                                  ? "bg-ember-400 shadow-[0_0_6px_#ff9e3d]"
                                  : "bg-white/15"
                              )}
                            />
                          ))}
                          <span className="font-mono text-[9px] text-white/50 ml-1">
                            STG {currentStage}/3
                          </span>
                        </div>
                      </div>

                      {/* Tiers List */}
                      <div className="mt-2 space-y-1.5">
                        {cat.tiers.map((tier) => {
                          const isInstalled = currentStage >= tier.stage;
                          const isNext = currentStage === tier.stage - 1;
                          const canAfford = career.credits >= tier.cost;

                          return (
                            <div
                              key={tier.stage}
                              onMouseEnter={() => {
                                if (!isInstalled) {
                                  setHoveredTier({ catId: cat.id, stage: tier.stage });
                                }
                              }}
                              onMouseLeave={() => setHoveredTier(null)}
                              className={cn(
                                "flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-all",
                                isInstalled
                                  ? "border-emerald-500/30 bg-emerald-950/20 text-white/80"
                                  : isNext
                                  ? "border-amber-400/40 bg-amber-500/10 text-white hover:border-amber-400 hover:shadow-[0_0_12px_rgba(255,158,61,0.25)]"
                                  : "border-white/5 bg-black/20 text-white/35 opacity-70"
                              )}
                            >
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-1 font-bold text-[11px] truncate">
                                  {isInstalled && <Check className="h-3 w-3 text-emerald-400 shrink-0" />}
                                  {!isInstalled && isNext && <Sparkles className="h-3 w-3 text-amber-400 shrink-0" />}
                                  {!isInstalled && !isNext && <Lock className="h-3 w-3 text-white/30 shrink-0" />}
                                  <span className="truncate">{tier.name}</span>
                                </div>
                                <span className="text-[9px] font-mono text-amber-300/80">
                                  {tier.bonus}
                                </span>
                              </div>

                              {/* Action Button */}
                              {isInstalled ? (
                                <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-300 border border-emerald-500/40 shrink-0">
                                  INSTALLED
                                </span>
                              ) : isNext ? (
                                <button
                                  type="button"
                                  onClick={() => handlePurchase(cat.id, tier.stage, tier.cost)}
                                  disabled={!canAfford}
                                  className={cn(
                                    "rounded px-2.5 py-1 font-display text-[10px] font-black tracking-wider transition-all shrink-0 cursor-pointer active:scale-95",
                                    canAfford
                                      ? "bg-gradient-to-r from-ember-500 to-amber-400 text-night-950 hover:shadow-[0_0_12px_rgba(255,158,61,0.6)]"
                                      : "bg-white/10 text-white/40 cursor-not-allowed border border-white/10"
                                  )}
                                  title={canAfford ? `Purchase ${tier.name}` : "Insufficient credits"}
                                >
                                  ${tier.cost.toLocaleString()}
                                </button>
                              ) : (
                                <span className="font-mono text-[9px] text-white/30 shrink-0">
                                  LOCKED
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Live Info Banner */}
              <div className="mt-2.5 rounded-lg border border-white/10 bg-white/[0.03] p-2 flex items-center justify-between text-[10px] font-mono text-white/50">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-ember-400" />
                  HOVER TO PREVIEW STAT DELTAS
                </span>
                <span className="text-amber-300 font-bold">PHYSICS LIVE SYNC</span>
              </div>
            </div>
          )}

          {/* TAB 2: LIVERY & PAINT STUDIO */}
          {activeTab === "livery" && (
            <div className="flex flex-col h-full justify-between">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-cyan-400" />
                  <span className="font-display text-xs font-black tracking-wider text-white uppercase">
                    BESPOKE FINISH & LIVERY STUDIO
                  </span>
                </div>
                <span className="rounded bg-cyan-400/20 px-2 py-0.5 font-mono text-[9px] font-bold text-cyan-300">
                  {CUSTOM_PAINTS.length} BESPOKE FINISHES
                </span>
              </div>

              {/* Swatch Grid */}
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1 overflow-y-auto max-h-[360px] sm:max-h-[420px] pr-1">
                {CUSTOM_PAINTS.map((paint) => {
                  const isSelected = (carPaints[selectedCar.id] || "factory") === paint.id;
                  return (
                    <button
                      key={paint.id}
                      type="button"
                      onClick={() => handleSelectPaint(paint)}
                      className={cn(
                        "group relative flex flex-col rounded-xl border p-2 text-left transition-all duration-200 cursor-pointer overflow-hidden",
                        isSelected
                          ? "border-cyan-400 bg-cyan-500/15 shadow-[0_0_18px_rgba(6,182,212,0.4)] ring-1 ring-cyan-400"
                          : "border-white/10 bg-black/40 hover:border-white/30 hover:bg-white/5"
                      )}
                    >
                      {/* Color gradient swatch */}
                      <div
                        className="h-10 w-full rounded-lg border border-white/20 shadow-inner relative overflow-hidden"
                        style={{
                          background: `linear-gradient(135deg, ${paint.light} 0%, ${paint.base} 50%, ${paint.dark} 100%)`,
                        }}
                      >
                        {/* Reflective gloss highlight */}
                        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/25 to-white/40 opacity-40 pointer-events-none" />
                        {isSelected && (
                          <div className="absolute top-1 right-1 grid h-4 w-4 place-items-center rounded-full bg-cyan-400 text-black shadow-md">
                            <Check className="h-2.5 w-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      <div className="mt-2 flex flex-col">
                        <span className="font-display text-[11px] font-bold tracking-wider text-white truncate">
                          {paint.name}
                        </span>
                        <div className="flex items-center justify-between text-[8px] font-mono uppercase text-white/50 mt-0.5">
                          <span>{paint.finish}</span>
                          <span
                            className="h-2 w-2 rounded-full border border-white/30"
                            style={{ backgroundColor: paint.accent }}
                            title={`Accent: ${paint.accent}`}
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Paint Specs Card */}
              <div className="mt-2.5 rounded-xl border border-white/10 bg-cyan-950/20 p-2.5 text-xs">
                <div className="flex items-center justify-between text-[10px] font-mono text-cyan-300">
                  <span className="font-bold uppercase tracking-wider">COATING TECHNOLOGY</span>
                  <span>99.4% REFRACTIVE CLEARCOAT</span>
                </div>
                <p className="mt-1 text-[10px] text-white/60 leading-relaxed font-sans">
                  Applied with dual-stage hydrophobic ceramic bake. Procedural shaders reflect environment illumination, sunlight angles, and rain droplets in real-time during races.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: CHASSIS BLUEPRINT */}
          {activeTab === "blueprint" && (
            <div className="flex flex-col h-full justify-between">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-purple-400" />
                  <span className="font-display text-xs font-black tracking-wider text-white uppercase">
                    MOTORSPORT CHASSIS BLUEPRINT
                  </span>
                </div>
                <span className="rounded bg-purple-400/20 px-2 py-0.5 font-mono text-[9px] font-bold text-purple-300">
                  {displayCar.cls}
                </span>
              </div>

              {/* Engineering Specs Matrix */}
              <div className="mt-3 flex-1 overflow-y-auto max-h-[360px] sm:max-h-[420px] pr-1 space-y-2 text-xs">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-2">
                  <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                    <span className="text-white/50 text-[11px] font-mono">POWERTRAIN:</span>
                    <span className="font-mono font-bold text-white text-[11px]">{displayCar.engineType}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                    <span className="text-white/50 text-[11px] font-mono">AERODYNAMICS:</span>
                    <span className="font-mono text-white/90 text-[10px] text-right truncate max-w-[220px]">
                      {getAeroSpec(displayCar)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                    <span className="text-white/50 text-[11px] font-mono">ALLOY WHEELS:</span>
                    <span className="font-mono text-white/90 text-[11px] uppercase">
                      {displayCar.wheelStyle.replace("_", " ")} SPEC FORGED
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                    <span className="text-white/50 text-[11px] font-mono">BRAKE CALIPERS:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: displayCar.caliperColor }} />
                      <span className="font-mono text-white/90 text-[11px]">CERAMIC COMPOSITE</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                    <span className="text-white/50 text-[11px] font-mono">CURB WEIGHT:</span>
                    <span className="font-mono font-bold text-white text-[11px]">{displayCar.weightKg} KG</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                    <span className="text-white/50 text-[11px] font-mono">POWER-TO-WEIGHT:</span>
                    <span className="font-mono font-bold text-amber-300 text-[11px]">
                      {(tunedBhp / (displayCar.weightKg / 1000)).toFixed(0)} BHP / TONNE
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/50 text-[11px] font-mono">HOMOLOGATION:</span>
                    <span className="font-mono text-emerald-400 font-bold text-[11px]">{displayCar.badgeText} // FIA PASS</span>
                  </div>
                </div>

                {/* Machine Bio Quote */}
                <div className="rounded-xl border border-white/10 bg-purple-950/20 p-3">
                  <div className="text-[10px] font-mono uppercase text-purple-300 font-bold mb-1">
                    CHASSIS PEDIGREE & DESIGN
                  </div>
                  <p className="text-[11px] italic text-white/70 leading-relaxed font-sans">
                    "{displayCar.desc}"
                  </p>
                </div>
              </div>

              {/* Homologation Footer */}
              <div className="mt-2.5 rounded-lg border border-white/10 bg-white/[0.02] p-2 flex items-center justify-between text-[10px] font-mono text-white/40">
                <span>CHASSIS SERIAL: {selectedCar.id.toUpperCase()}-2026</span>
                <span className="text-purple-300 font-bold">AUTHENTIC VEHICLE SPECS</span>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* ---- BOTTOM FOOTER NAVIGATION ---- */}
      <footer className="relative z-10 mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2 text-[10px] font-mono text-white/50">
        <div className="flex items-center gap-3">
          <span>HOTKEYS:</span>
          <span className="border border-white/15 px-1 rounded">[1] TUNING</span>
          <span className="border border-white/15 px-1 rounded">[2] LIVERY</span>
          <span className="border border-white/15 px-1 rounded">[3] BLUEPRINT</span>
          <span className="border border-white/15 px-1 rounded">[SPACE] REV</span>
          <span className="border border-white/15 px-1 rounded">[B] BRAKES</span>
        </div>

        <button
          type="button"
          onClick={() => {
            audio.beep(400, 0.08);
            onBack();
          }}
          className="flex items-center gap-1 font-display font-bold text-ember-400 hover:text-ember-300 transition-colors tracking-widest uppercase cursor-pointer"
        >
          <span>RETURN TO RACE PREP</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </footer>
    </div>
  );
}
