import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Wrench, Zap, Gauge, Wind, Flame, Check, Lock,
  Palette, Sun, Moon, CloudRain, Disc,
  Layers, ShieldCheck, ChevronLeft, ChevronRight, Timer, CircleDot,
  Coins, User, Play
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

  // Car switching handlers (supporting chevron navigation)
  const currentCarIndex = CARS.findIndex((c) => c.id === selectedCar.id);

  const handleCarSwitch = useCallback((car: CarDef) => {
    audio.beep(520, 0.08);
    setSelectedCar(car);
    setHoveredTier(null);
    const paintId = carPaints[car.id];
    const cp = paintId && paintId !== "factory" ? CUSTOM_PAINTS.find((p) => p.id === paintId) : null;
    const finalCar = cp ? { ...car, base: cp.base, dark: cp.dark, light: cp.light, accent: cp.accent } : car;
    onSelectCar(finalCar);
  }, [audio, carPaints, onSelectCar]);

  const handlePrevCar = useCallback(() => {
    const prevIdx = (currentCarIndex - 1 + CARS.length) % CARS.length;
    handleCarSwitch(CARS[prevIdx]);
  }, [currentCarIndex, handleCarSwitch]);

  const handleNextCar = useCallback(() => {
    const nextIdx = (currentCarIndex + 1) % CARS.length;
    handleCarSwitch(CARS[nextIdx]);
  }, [currentCarIndex, handleCarSwitch]);

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
      } else if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") {
        handlePrevCar();
      } else if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") {
        handleNextCar();
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
  }, [audio, onBack, handlePrevCar, handleNextCar, handleRevEngine]);

  const getArchetypeName = (style: string) => {
    switch (style) {
      case "proto": return "LE MANS PROTOTYPE";
      case "rally": return "GROUP-A RALLYE WIDEBODY";
      case "cyber": return "CYBERNETIC COUPE";
      case "muscle": return "WIDEBODY MUSCLE V8";
      default: return "MODERN GRAND TOURER";
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
    <div className="relative flex h-full w-full flex-col justify-between overflow-y-auto lg:overflow-hidden px-3 py-3 sm:px-8 sm:py-5 text-white select-none">
      {/* Background ambient lighting vignette */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/20 via-night-950/90 to-night-950" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] opacity-25" />

      {/* ================= TOP BAR: ICON RACING STYLE ================= */}
      <header className="relative z-10 flex items-center justify-between gap-3 pb-2 border-b border-white/10">
        {/* Left: Angled Back Button & Driver Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Angled Red Back Button */}
          <button
            type="button"
            onClick={() => {
              audio.beep(360, 0.08);
              onBack();
            }}
            className="group relative flex items-center gap-1.5 overflow-hidden rounded-md bg-gradient-to-r from-rose-600 via-rose-500 to-red-600 px-3 py-1.5 font-display text-xs font-black tracking-wider text-white shadow-[0_0_15px_rgba(244,63,94,0.4)] transition-transform hover:scale-105 active:scale-95 cursor-pointer skew-x-[-10deg]"
            title="Return to Main Menu [ESC]"
          >
            <div className="flex items-center gap-1 skew-x-[10deg]">
              <ChevronLeft className="h-4 w-4 stroke-[3]" />
              <span className="hidden sm:inline">PADDOCK</span>
            </div>
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-300 group-hover:translate-x-full" />
          </button>

          {/* Pilot Profile & Currency Pill */}
          <div className="flex items-center gap-2 rounded-lg border border-white/15 bg-black/60 px-2.5 py-1 backdrop-blur-md">
            <div className="grid h-7 w-7 place-items-center rounded-full border border-amber-400/60 bg-gradient-to-br from-amber-500/20 to-amber-700/40 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]">
              <User className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] font-mono tracking-widest text-white/50 leading-none">DRIVER // APEX PILOT</span>
              <div className="flex items-center gap-1 mt-0.5">
                <Coins className="h-3 w-3 text-amber-400" />
                <span className="font-mono text-xs sm:text-sm font-bold text-amber-300 leading-none">
                  ${career.credits.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Angled Header Banner */}
        <div className="hidden md:flex items-center gap-2 rounded-lg border border-white/10 bg-black/50 px-4 py-1 skew-x-[-10deg] shadow-lg">
          <div className="flex items-center gap-2 skew-x-[10deg]">
            <Wrench className="h-4 w-4 text-ember-400 animate-pulse" />
            <span className="font-display text-sm font-black italic tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-200 to-ember-400">
              MOTORSPORT GARAGE & SHOWROOM
            </span>
          </div>
        </div>

        {/* Right: Studio Workspace Tabs & Fast Race Launch */}
        <div className="flex items-center gap-2">
          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1 rounded-lg border border-white/15 bg-black/70 p-0.5 backdrop-blur-md">
            <button
              type="button"
              onClick={() => {
                audio.beep(460, 0.05);
                setActiveTab("tuning");
              }}
              className={cn(
                "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-display font-bold tracking-wider transition-all cursor-pointer",
                activeTab === "tuning"
                  ? "bg-gradient-to-r from-ember-500 to-amber-500 text-night-950 font-black shadow-[0_0_14px_rgba(255,158,61,0.6)]"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              )}
            >
              <Wrench className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">TUNING</span>
              <span className="font-mono text-[9px] opacity-75">{totalStages}/12</span>
            </button>

            <button
              type="button"
              onClick={() => {
                audio.beep(460, 0.05);
                setActiveTab("livery");
              }}
              className={cn(
                "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-display font-bold tracking-wider transition-all cursor-pointer",
                activeTab === "livery"
                  ? "bg-gradient-to-r from-cyan-500 to-sky-400 text-night-950 font-black shadow-[0_0_14px_rgba(6,182,212,0.6)]"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              )}
            >
              <Palette className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">LIVERY</span>
            </button>

            <button
              type="button"
              onClick={() => {
                audio.beep(460, 0.05);
                setActiveTab("blueprint");
              }}
              className={cn(
                "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-display font-bold tracking-wider transition-all cursor-pointer",
                activeTab === "blueprint"
                  ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-black shadow-[0_0_14px_rgba(168,85,247,0.6)]"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              )}
            >
              <Layers className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">SPECS</span>
            </button>
          </div>

          {/* Action Button: Return to Race */}
          <button
            type="button"
            onClick={() => {
              audio.beep(400, 0.08);
              onBack();
            }}
            className="group relative flex items-center gap-1.5 overflow-hidden rounded-md bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500 px-3.5 py-1.5 font-display text-xs font-black tracking-wider text-night-950 shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-transform hover:scale-105 active:scale-95 cursor-pointer skew-x-[-10deg]"
          >
            <div className="flex items-center gap-1 skew-x-[10deg]">
              <span>RACE PREP</span>
              <Play className="h-3.5 w-3.5 fill-night-950" />
            </div>
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent transition-transform duration-300 group-hover:translate-x-full" />
          </button>
        </div>
      </header>

      {/* ================= MAIN HERO SHOWCASE & DOCK ================= */}
      <main className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-3.5 my-2 flex-1 min-h-0 items-stretch">
        {/* ================= LEFT COLUMN: ICON-STYLE STAT HUD ================= */}
        <section className="lg:col-span-3 flex flex-col justify-between gap-2 rounded-2xl border border-white/15 bg-black/65 p-3 backdrop-blur-xl shadow-2xl">
          {/* Active Car Profile Card */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 flex items-center gap-2.5">
            <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-black/80 border border-white/10 flex items-center justify-center p-1">
              <img
                src={carThumbnails[selectedCar.id]}
                alt={displayCar.name}
                className="h-full w-full object-contain"
                draggable={false}
              />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-display text-sm font-black italic tracking-wide text-white truncate">
                  {displayCar.name}
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              </div>
              <span className="text-[9px] font-mono text-amber-300 font-bold uppercase truncate">
                {getArchetypeName(displayCar.bodyStyle)}
              </span>
              <span className="text-[8px] font-mono text-white/40">
                {displayCar.cls}
              </span>
            </div>
          </div>

          {/* 5 ICON-STYLE STAT PROGRESS METERS (AS SEEN IN REFERENCE DEMO) */}
          <div className="flex flex-col justify-between gap-2.5 my-auto">
            {/* 1. TOP SPEED */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="grid h-6 w-6 place-items-center rounded-full bg-cyan-950/80 border border-cyan-400/60 shadow-[0_0_8px_rgba(6,182,212,0.4)] text-cyan-300">
                    <Gauge className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-display text-[10px] font-bold tracking-wider text-white/90">
                    TOP SPEED
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-xs font-black text-cyan-300">{previewMaxSpeed} MPH</span>
                  {speedDelta > 0 && (
                    <span className="font-mono text-[9px] font-bold text-emerald-400 animate-pulse">
                      +{speedDelta}
                    </span>
                  )}
                </div>
              </div>
              {/* Luminous Glowing Bar with Sparkle Tip */}
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10 border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-white shadow-[0_0_10px_#22d3ee] transition-all duration-300"
                  style={{ width: `${Math.min(100, (previewMaxSpeed / 250) * 100)}%` }}
                />
              </div>
            </div>

            {/* 2. 0-60 ACCELERATION */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="grid h-6 w-6 place-items-center rounded-full bg-sky-950/80 border border-sky-400/60 shadow-[0_0_8px_rgba(14,165,233,0.4)] text-sky-300">
                    <Timer className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-display text-[10px] font-bold tracking-wider text-white/90">
                    0-60 ACCEL
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-xs font-black text-sky-300">{previewZeroToSixty}s</span>
                  {accelDelta > 0 && (
                    <span className="font-mono text-[9px] font-bold text-emerald-400 animate-pulse">
                      -{accelDelta}s
                    </span>
                  )}
                </div>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10 border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-indigo-600 via-sky-400 to-white shadow-[0_0_10px_#38bdf8] transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(15, ((3.6 - previewZeroToSixty) / 1.5) * 100))}%` }}
                />
              </div>
            </div>

            {/* 3. ROAD GRIP */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="grid h-6 w-6 place-items-center rounded-full bg-emerald-950/80 border border-emerald-400/60 shadow-[0_0_8px_rgba(16,185,129,0.4)] text-emerald-300">
                    <CircleDot className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-display text-[10px] font-bold tracking-wider text-white/90">
                    ROAD GRIP
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-xs font-black text-emerald-300">{previewGrip} G</span>
                  {gripDelta > 0 && (
                    <span className="font-mono text-[9px] font-bold text-emerald-400 animate-pulse">
                      +{gripDelta}G
                    </span>
                  )}
                </div>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10 border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-teal-600 via-emerald-400 to-white shadow-[0_0_10px_#34d399] transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(15, ((previewGrip - 1.0) / 0.8) * 100))}%` }}
                />
              </div>
            </div>

            {/* 4. BRAKING SYSTEM */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="grid h-6 w-6 place-items-center rounded-full bg-rose-950/80 border border-rose-400/60 shadow-[0_0_8px_rgba(244,63,94,0.4)] text-rose-300">
                    <Disc className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-display text-[10px] font-bold tracking-wider text-white/90">
                    BRAKE ROTORS
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className="h-2 w-2 rounded-full shadow-[0_0_6px_currentColor]"
                    style={{ color: displayCar.caliperColor }}
                  />
                  <span className="font-mono text-[10px] font-bold text-rose-300 uppercase">CERAMIC</span>
                </div>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10 border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-orange-600 via-rose-400 to-white shadow-[0_0_10px_#f43f5e] transition-all duration-300"
                  style={{ width: `88%` }}
                />
              </div>
            </div>

            {/* 5. NITROUS CAPACITY */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="grid h-6 w-6 place-items-center rounded-full bg-purple-950/80 border border-purple-400/60 shadow-[0_0_8px_rgba(168,85,247,0.4)] text-purple-300">
                    <Flame className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-display text-[10px] font-bold tracking-wider text-white/90">
                    NITRO BOOST
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-xs font-black text-purple-300">{previewNitro} PSI</span>
                  {nitroDelta > 0 && (
                    <span className="font-mono text-[9px] font-bold text-emerald-400 animate-pulse">
                      +{nitroDelta}
                    </span>
                  )}
                </div>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10 border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-indigo-600 via-purple-400 to-white shadow-[0_0_10px_#c084fc] transition-all duration-300"
                  style={{ width: `${Math.min(100, (previewNitro / 150) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Horsepower / Total Output Badge */}
          <div className="rounded-xl border border-amber-400/30 bg-gradient-to-r from-amber-500/15 via-black/40 to-transparent p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500/20 text-amber-300">
                <Zap className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-mono uppercase tracking-widest text-amber-300/70">TOTAL HORSEPOWER</span>
                <span className="font-display text-lg font-black italic text-white leading-none">
                  {previewBhp} <span className="text-xs font-mono font-bold text-amber-400">BHP</span>
                </span>
              </div>
            </div>
            {bhpDelta > 0 && (
              <span className="font-mono text-xs font-black text-emerald-400 bg-emerald-500/20 border border-emerald-400/40 rounded px-1.5 py-0.5 animate-pulse">
                +{bhpDelta} GAIN
              </span>
            )}
          </div>
        </section>

        {/* ================= CENTER COLUMN: HERO STAGE & CHEVRON NAVIGATION ================= */}
        <section className="lg:col-span-5 flex flex-col justify-between gap-2.5 relative min-h-[340px] lg:min-h-0">
          {/* Hero Turntable Stage Container */}
          <div className="relative flex flex-col justify-between rounded-2xl border border-white/15 bg-gradient-to-b from-black/85 via-night-950/95 to-black/95 p-3 sm:p-4 backdrop-blur-xl shadow-2xl flex-1 overflow-hidden">
            {/* Top Bar: Live Stage Status & Lighting Presets */}
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2 z-10">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
                <span className="font-display text-[10px] font-bold tracking-widest text-white/80">
                  HERO VEHICLE SHOWCASE
                </span>
              </div>

              {/* Lighting Toggles with Icons */}
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

            {/* BIG ORANGE CHEVRONS & HERO CAR DISPLAY (EXACTLY AS IN DEMO SAMPLE) */}
            <div className="relative my-auto flex h-52 sm:h-64 items-center justify-center overflow-visible">
              {/* Left Big Orange Chevron */}
              <button
                type="button"
                onClick={handlePrevCar}
                className="group absolute -left-2 sm:-left-3 z-20 flex h-14 w-8 sm:h-16 sm:w-10 items-center justify-center rounded-l-lg bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-night-950 shadow-[0_0_20px_rgba(245,158,11,0.6)] transition-all hover:scale-110 active:scale-95 cursor-pointer skew-x-[-12deg]"
                title="Previous Machine [A / ←]"
              >
                <ChevronLeft className="h-6 w-6 stroke-[3.5] text-night-950 skew-x-[12deg] transition-transform group-hover:-translate-x-0.5" />
              </button>

              {/* Right Big Orange Chevron */}
              <button
                type="button"
                onClick={handleNextCar}
                className="group absolute -right-2 sm:-right-3 z-20 flex h-14 w-8 sm:h-16 sm:w-10 items-center justify-center rounded-r-lg bg-gradient-to-r from-amber-700 via-amber-600 to-amber-500 text-night-950 shadow-[0_0_20px_rgba(245,158,11,0.6)] transition-all hover:scale-110 active:scale-95 cursor-pointer skew-x-[-12deg]"
                title="Next Machine [D / →]"
              >
                <ChevronRight className="h-6 w-6 stroke-[3.5] text-night-950 skew-x-[12deg] transition-transform group-hover:translate-x-0.5" />
              </button>

              {/* Hero Car Render on Floor Reflection */}
              <img
                src={showroomImage}
                alt={displayCar.name}
                className={cn(
                  "h-full w-full object-contain transition-all duration-300 select-none drop-shadow-[0_20px_25px_rgba(0,0,0,0.85)]",
                  isRevving && "scale-[1.05] -translate-y-1 filter drop-shadow-[0_0_35px_rgba(255,123,28,0.7)]",
                  testBrakes && "filter drop-shadow-[0_0_35px_rgba(244,63,94,0.85)]"
                )}
                draggable={false}
              />
            </div>

            {/* Interactive Stage Controls: Rev Engine & Brake Lights */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2.5 z-10">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRevEngine}
                  disabled={isRevving}
                  className={cn(
                    "group flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-display text-xs font-black tracking-wider transition-all cursor-pointer select-none active:scale-95",
                    isRevving
                      ? "bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.8)] scale-105"
                      : "bg-gradient-to-r from-ember-500 via-amber-500 to-amber-400 text-night-950 hover:shadow-[0_0_16px_rgba(255,158,61,0.6)]"
                  )}
                  title="Audition engine rev sound [SPACE]"
                >
                  <Flame className={cn("h-4 w-4", isRevving ? "animate-bounce" : "group-hover:scale-110")} />
                  <span>{isRevving ? "REVING ENGINE!" : "AUDITION REV"}</span>
                  <span className="font-mono text-[8px] opacity-75 hidden sm:inline">[SPACE]</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    audio.beep(300, 0.05);
                    setTestBrakes((b) => !b);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-display text-xs font-bold tracking-wider transition-all cursor-pointer active:scale-95",
                    testBrakes
                      ? "border-rose-500 bg-rose-950/70 text-rose-300 shadow-[0_0_14px_rgba(244,63,94,0.5)]"
                      : "border-white/15 bg-white/5 text-white/70 hover:border-white/30 hover:text-white"
                  )}
                  title="Toggle brake light illumination [B]"
                >
                  <Disc className="h-4 w-4" />
                  <span>{testBrakes ? "BRAKES: ON" : "TEST BRAKES"}</span>
                  <span className="font-mono text-[8px] opacity-60 hidden sm:inline">[B]</span>
                </button>
              </div>

              <div className="flex items-center gap-1 text-[9px] font-mono text-white/40">
                <span>PRESS [A/D] TO SWAP CAR</span>
              </div>
            </div>
          </div>
        </section>

        {/* ================= RIGHT COLUMN: ICON-STYLE TUNING & STUDIO ================= */}
        <section className="lg:col-span-4 flex flex-col rounded-2xl border border-white/15 bg-black/75 p-3 sm:p-3.5 backdrop-blur-xl shadow-2xl min-h-0 justify-between">
          {/* TAB 1: ICON-STYLE PERFORMANCE TUNING */}
          {activeTab === "tuning" && (
            <div className="flex flex-col h-full justify-between">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <div className="grid h-6 w-6 place-items-center rounded-md bg-ember-500/20 text-ember-300 border border-ember-400/40">
                    <Wrench className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-display text-xs font-black tracking-wider text-white uppercase">
                    TUNING STATIONS
                  </span>
                </div>
                <div className="flex items-center gap-1 rounded bg-white/5 px-2 py-0.5 border border-white/10 text-[9px] font-mono">
                  <span className="text-white/40">STAGES:</span>
                  <span className="font-bold text-amber-300">{totalStages}/12</span>
                </div>
              </div>

              {/* 4 Icon-Driven Tuning Category Stations */}
              <div className="mt-2 flex-1 overflow-y-auto pr-1 space-y-2 max-h-[380px] sm:max-h-[440px]">
                {UPGRADE_DEFINITIONS.map((cat) => {
                  const currentStage = carUpgrades[cat.id] || 0;
                  return (
                    <div
                      key={cat.id}
                      className="rounded-xl border border-white/10 bg-white/[0.02] p-2 transition-all hover:border-white/20"
                    >
                      {/* Category Title & Icon Pod */}
                      <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "grid h-6 w-6 place-items-center rounded-lg border",
                            cat.id === "engine" && "bg-amber-950/50 border-amber-400/50 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.3)]",
                            cat.id === "trans" && "bg-sky-950/50 border-sky-400/50 text-sky-400 shadow-[0_0_8px_rgba(14,165,233,0.3)]",
                            cat.id === "tires" && "bg-emerald-950/50 border-emerald-400/50 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]",
                            cat.id === "nitro" && "bg-purple-950/50 border-purple-400/50 text-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.3)]"
                          )}>
                            {cat.id === "engine" && <Zap className="h-3.5 w-3.5" />}
                            {cat.id === "trans" && <Gauge className="h-3.5 w-3.5" />}
                            {cat.id === "tires" && <CircleDot className="h-3.5 w-3.5" />}
                            {cat.id === "nitro" && <Flame className="h-3.5 w-3.5" />}
                          </div>
                          <span className="font-display text-xs font-black tracking-wide text-white">
                            {cat.name}
                          </span>
                        </div>

                        {/* Progress Pips */}
                        <div className="flex items-center gap-1">
                          {[1, 2, 3].map((pip) => (
                            <span
                              key={pip}
                              className={cn(
                                "h-1.5 w-3 rounded-full transition-all",
                                currentStage >= pip
                                  ? "bg-amber-400 shadow-[0_0_6px_#fbbf24]"
                                  : "bg-white/15"
                              )}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Tiers List with Stage Icons */}
                      <div className="mt-1.5 space-y-1">
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
                                "flex items-center justify-between gap-2 rounded-lg border px-2 py-1 text-xs transition-all",
                                isInstalled
                                  ? "border-emerald-500/30 bg-emerald-950/20 text-white/80"
                                  : isNext
                                  ? "border-amber-400/50 bg-amber-500/10 text-white hover:border-amber-400 shadow-[0_0_10px_rgba(255,158,61,0.2)]"
                                  : "border-white/5 bg-black/20 text-white/35 opacity-70"
                              )}
                            >
                              {/* Left Icon + Stage Label */}
                              <div className="flex items-center gap-1.5 min-w-0">
                                <div className={cn(
                                  "grid h-5 w-5 place-items-center rounded text-[9px] font-mono font-bold shrink-0",
                                  isInstalled
                                    ? "bg-emerald-500 text-night-950"
                                    : isNext
                                    ? "bg-amber-400 text-night-950 font-black shadow-[0_0_6px_#fbbf24]"
                                    : "bg-white/10 text-white/40"
                                )}>
                                  {isInstalled ? <Check className="h-3 w-3 stroke-[3]" /> : tier.stage}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="font-display text-[10px] font-bold text-white truncate leading-tight">
                                    {tier.name.split(":")[1]?.trim() || tier.name}
                                  </span>
                                  <span className="font-mono text-[8px] text-amber-300 font-bold truncate">
                                    {tier.bonus}
                                  </span>
                                </div>
                              </div>

                              {/* Right Action Button */}
                              {isInstalled ? (
                                <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-[8px] font-bold text-emerald-300 border border-emerald-500/40 shrink-0">
                                  INSTALLED
                                </span>
                              ) : isNext ? (
                                <button
                                  type="button"
                                  onClick={() => handlePurchase(cat.id, tier.stage, tier.cost)}
                                  disabled={!canAfford}
                                  className={cn(
                                    "flex items-center gap-1 rounded px-2.5 py-1 font-display text-[10px] font-black tracking-wider transition-all shrink-0 cursor-pointer active:scale-95 shadow-md",
                                    canAfford
                                      ? "bg-gradient-to-r from-amber-400 via-amber-500 to-ember-500 text-night-950 hover:shadow-[0_0_14px_rgba(245,158,11,0.6)]"
                                      : "bg-white/10 text-white/40 cursor-not-allowed border border-white/10"
                                  )}
                                  title={canAfford ? `Purchase ${tier.name}` : "Insufficient credits"}
                                >
                                  <Coins className="h-3 w-3" />
                                  <span>${tier.cost.toLocaleString()}</span>
                                </button>
                              ) : (
                                <div className="flex items-center gap-1 font-mono text-[8px] text-white/30 shrink-0">
                                  <Lock className="h-3 w-3 text-white/20" />
                                  <span>LOCKED</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Hover Delta Hint Footer */}
              <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.03] p-1.5 flex items-center justify-between text-[9px] font-mono text-white/50">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-amber-400" />
                  HOVER BUY TO PREVIEW STAT DELTA
                </span>
                <span className="text-amber-300 font-bold">LIVE TELEMETRY</span>
              </div>
            </div>
          )}

          {/* TAB 2: ICON-STYLE LIVERY & FINISH */}
          {activeTab === "livery" && (
            <div className="flex flex-col h-full justify-between">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <div className="grid h-6 w-6 place-items-center rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                    <Palette className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-display text-xs font-black tracking-wider text-white uppercase">
                    BESPOKE FINISH STUDIO
                  </span>
                </div>
                <span className="rounded bg-cyan-400/20 px-2 py-0.5 font-mono text-[9px] font-bold text-cyan-300">
                  {CUSTOM_PAINTS.length} FORMULAS
                </span>
              </div>

              {/* Swatch Tiles */}
              <div className="mt-2.5 grid grid-cols-2 gap-2 flex-1 overflow-y-auto max-h-[380px] sm:max-h-[440px] pr-1">
                {CUSTOM_PAINTS.map((paint) => {
                  const isSelected = (carPaints[selectedCar.id] || "factory") === paint.id;
                  return (
                    <button
                      key={paint.id}
                      type="button"
                      onClick={() => handleSelectPaint(paint)}
                      className={cn(
                        "group relative flex items-center gap-2 rounded-xl border p-2 text-left transition-all duration-200 cursor-pointer overflow-hidden",
                        isSelected
                          ? "border-cyan-400 bg-cyan-500/15 shadow-[0_0_16px_rgba(6,182,212,0.4)] ring-1 ring-cyan-400"
                          : "border-white/10 bg-black/40 hover:border-white/30 hover:bg-white/5"
                      )}
                    >
                      {/* Circular Multi-Tone Gradient Swatch with Gloss Specular */}
                      <div
                        className="relative h-9 w-9 shrink-0 rounded-full border border-white/30 shadow-md overflow-hidden flex items-center justify-center"
                        style={{
                          background: `radial-gradient(circle at 35% 35%, ${paint.light} 0%, ${paint.base} 55%, ${paint.dark} 100%)`,
                        }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/20 to-white/40 opacity-40 pointer-events-none" />
                        {isSelected && (
                          <div className="grid h-4 w-4 place-items-center rounded-full bg-cyan-400 text-black shadow-md">
                            <Check className="h-2.5 w-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <span className="font-display text-[11px] font-bold tracking-wider text-white truncate">
                          {paint.name}
                        </span>
                        <div className="flex items-center gap-1 text-[8px] font-mono uppercase text-white/50">
                          <span>{paint.finish}</span>
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: paint.accent }}
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Paint Spec Banner */}
              <div className="mt-2 rounded-xl border border-white/10 bg-cyan-950/20 p-2 text-xs">
                <div className="flex items-center justify-between text-[9px] font-mono text-cyan-300">
                  <span className="font-bold">99.4% REFRACTIVE CERAMIC</span>
                  <span>DYNAMIC SHADER</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ICON-STYLE CHASSIS BLUEPRINT */}
          {activeTab === "blueprint" && (
            <div className="flex flex-col h-full justify-between">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <div className="grid h-6 w-6 place-items-center rounded-md bg-purple-500/20 text-purple-300 border border-purple-400/40">
                    <Layers className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-display text-xs font-black tracking-wider text-white uppercase">
                    CHASSIS ARCHITECTURE
                  </span>
                </div>
                <span className="rounded bg-purple-400/20 px-2 py-0.5 font-mono text-[9px] font-bold text-purple-300">
                  {displayCar.cls}
                </span>
              </div>

              {/* Grid of 6 Icon-Driven Spec Blocks */}
              <div className="mt-2.5 flex-1 overflow-y-auto max-h-[380px] sm:max-h-[440px] pr-1 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* POWERTRAIN */}
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-2 flex flex-col justify-between">
                    <div className="flex items-center gap-1 text-white/40 text-[9px] font-mono">
                      <Zap className="h-3 w-3 text-amber-400" />
                      <span>POWERTRAIN</span>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-white mt-1">
                      {displayCar.engineType}
                    </span>
                  </div>

                  {/* AERODYNAMICS */}
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-2 flex flex-col justify-between">
                    <div className="flex items-center gap-1 text-white/40 text-[9px] font-mono">
                      <Wind className="h-3 w-3 text-sky-400" />
                      <span>AERO KIT</span>
                    </div>
                    <span className="font-mono text-[10px] font-bold text-white mt-1 truncate">
                      {getAeroSpec(displayCar)}
                    </span>
                  </div>

                  {/* ALLOY WHEELS */}
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-2 flex flex-col justify-between">
                    <div className="flex items-center gap-1 text-white/40 text-[9px] font-mono">
                      <CircleDot className="h-3 w-3 text-emerald-400" />
                      <span>WHEELS</span>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-white mt-1 uppercase">
                      {displayCar.wheelStyle.replace("_", " ")} SPEC
                    </span>
                  </div>

                  {/* BRAKE CALIPERS */}
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-2 flex flex-col justify-between">
                    <div className="flex items-center gap-1 text-white/40 text-[9px] font-mono">
                      <Disc className="h-3 w-3 text-rose-400" />
                      <span>CALIPERS</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: displayCar.caliperColor }}
                      />
                      <span className="font-mono text-[10px] font-bold text-white">CERAMIC</span>
                    </div>
                  </div>

                  {/* CURB WEIGHT */}
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-2 flex flex-col justify-between">
                    <div className="flex items-center gap-1 text-white/40 text-[9px] font-mono">
                      <Gauge className="h-3 w-3 text-cyan-400" />
                      <span>CURB WEIGHT</span>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-white mt-1">
                      {displayCar.weightKg} KG
                    </span>
                  </div>

                  {/* POWER-TO-WEIGHT */}
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-2 flex flex-col justify-between">
                    <div className="flex items-center gap-1 text-white/40 text-[9px] font-mono">
                      <Flame className="h-3 w-3 text-purple-400" />
                      <span>POWER/WEIGHT</span>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-amber-300 mt-1">
                      {(tunedBhp / (displayCar.weightKg / 1000)).toFixed(0)} BHP/T
                    </span>
                  </div>
                </div>

                {/* Car Backstory Quote */}
                <div className="rounded-xl border border-white/10 bg-purple-950/20 p-2.5">
                  <div className="text-[9px] font-mono uppercase text-purple-300 font-bold mb-0.5">
                    HERITAGE & PEDIGREE
                  </div>
                  <p className="text-[10px] italic text-white/70 leading-relaxed font-sans">
                    "{displayCar.desc}"
                  </p>
                </div>
              </div>

              {/* Chassis Serial Footer */}
              <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.02] p-1.5 flex items-center justify-between text-[9px] font-mono text-white/40">
                <span>SERIAL: {selectedCar.id.toUpperCase()}-2026</span>
                <span className="text-purple-300 font-bold">FIA HOMOLOGATED</span>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* ================= BOTTOM FLEET CAR RIBBON DOCK ================= */}
      <footer className="relative z-10 mt-1 flex flex-col gap-1">
        <div className="flex items-center justify-between px-1">
          <span className="text-[9px] font-mono tracking-widest text-white/40 uppercase">
            PADDOCK FLEET CAROUSEL ([← / →] TO NAVIGATE)
          </span>
          <span className="text-[9px] font-mono text-amber-300">
            {currentCarIndex + 1} OF {CARS.length} VEHICLES
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
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
                  "group relative flex items-center gap-2 rounded-xl border p-1.5 text-left transition-all duration-200 cursor-pointer overflow-hidden",
                  active
                    ? "border-amber-400 bg-gradient-to-r from-amber-500/25 via-night-900/90 to-night-950 shadow-[0_0_16px_rgba(245,158,11,0.35)] ring-1 ring-amber-400/60"
                    : "border-white/10 bg-black/50 hover:border-white/25 hover:bg-white/5"
                )}
              >
                {/* Mini Car Preview */}
                <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded-lg bg-black/70 border border-white/5 flex items-center justify-center p-0.5">
                  {thumb && (
                    <img
                      src={thumb}
                      alt={car.name}
                      className={cn(
                        "h-full w-full object-contain transition-transform duration-200",
                        active ? "scale-110" : "group-hover:scale-105"
                      )}
                      draggable={false}
                    />
                  )}
                  <span className={cn(
                    "absolute top-0.5 left-0.5 px-1 py-0.2 text-[6px] font-mono font-bold tracking-wider rounded",
                    active
                      ? "bg-amber-400 text-black font-black"
                      : "bg-black/80 text-white/70 border border-white/10"
                  )}>
                    {clsBadge}
                  </span>
                </div>

                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className={cn(
                      "font-display text-xs font-black italic tracking-wide truncate",
                      active ? "text-amber-300" : "text-white"
                    )}>
                      {car.name}
                    </span>
                    {active && (
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24] shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[8px] font-mono text-white/40 mt-0.5">
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
      </footer>
    </div>
  );
}
