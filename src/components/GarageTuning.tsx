import { useState, useMemo, useEffect } from "react";
import {
  Wrench, Zap, Gauge, Wind, Flame, Check, Lock, DollarSign,
  ArrowLeft, Sparkles, Volume2, Palette, Sun, Moon, CloudRain, Disc
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

const STORAGE_CUSTOM_PAINTS = "apex.garage_paints";

export default function GarageTuning({
  career,
  activeCar,
  onSelectCar,
  onUpgradeCar,
  onBack,
}: GarageTuningProps) {
  const [selectedCar, setSelectedCar] = useState<CarDef>(activeCar);
  const [showroomWeather, setShowroomWeather] = useState<WeatherMode>("night");
  const [testBrakes, setTestBrakes] = useState(false);
  const [isRevving, setIsRevving] = useState(false);
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

  // Calculate live tuned specs
  const engineStage = carUpgrades.engine || 0;
  const transStage = carUpgrades.trans || 0;
  const tiresStage = carUpgrades.tires || 0;
  const nitroStage = carUpgrades.nitro || 0;

  // Multipliers for spec telemetry display
  const tunedBhp = Math.round(selectedCar.bhp + engineStage * 28);
  const tunedZeroToSixty = Math.max(2.1, Number((selectedCar.zeroToSixty - transStage * 0.22).toFixed(1)));
  const tunedMaxSpeed = Math.round(selectedCar.maxSpeedDisplay * (1 + engineStage * 0.035));
  const tunedGrip = Number((selectedCar.lateralG + tiresStage * 0.09).toFixed(2));

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

  const handleRevEngine = () => {
    audio.ensure();
    setIsRevving(true);
    audio.revCar(selectedCar.id);
    window.setTimeout(() => {
      setIsRevving(false);
    }, 850);
  };

  const handlePurchase = (category: keyof CarUpgrades, stage: number, cost: number) => {
    if (career.credits < cost) {
      audio.thud(0.5);
      return;
    }
    audio.upgrade();
    onUpgradeCar(selectedCar.id, category, stage, cost);
  };

  // Car traits helper
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
    <div className="relative flex h-full w-full flex-col justify-between overflow-y-auto px-4 py-6 sm:px-10 sm:py-8 text-white select-none">
      {/* Background ambient gradient */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-amber-950/20 via-black/85 to-night-950" />

      {/* ---- TOP BAR: HEADER & WALLET ---- */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              audio.beep(360, 0.08);
              onBack();
            }}
            className="flex items-center gap-2 rounded border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-display tracking-widest text-white/80 transition-all hover:border-ember-400 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" /> BACK TO PADDOCK
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-ember-400" />
              <h1 className="font-display text-2xl font-black italic tracking-wider sm:text-3xl">
                MOTORSPORT GARAGE & SHOWROOM
              </h1>
            </div>
            <p className="text-xs text-white/50 tracking-wider">
              Inspect bespoke machine chassis, audition realistic engine revs, customize exotic liveries & install performance upgrades
            </p>
          </div>
        </div>

        {/* Balance */}
        <div className="flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-950/40 px-4 py-2 backdrop-blur-md shadow-[0_0_20px_rgba(16,185,129,0.15)]">
          <DollarSign className="h-5 w-5 text-emerald-400" />
          <div className="flex flex-col">
            <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-300/70">AVAILABLE CREDITS</span>
            <span className="font-mono text-lg font-bold text-emerald-300 leading-none">
              ${career.credits.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* ---- CAR SELECTION TABS WITH VISUAL THUMBNAILS ---- */}
      <div className="relative z-10 my-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-display font-black tracking-widest text-white/60">
            SELECT MOTORSPORT MACHINE ({CARS.length} CARS IN PADDOCK)
          </span>
          <span className="text-[11px] font-mono text-ember-300">
            CURRENT: {displayCar.name} // {displayCar.cls}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {CARS.map((car) => {
            const active = car.id === selectedCar.id;
            const upgradesCount = Object.values(career.upgrades[car.id] || DEFAULT_UPGRADES).reduce((a, b) => a + b, 0);
            const thumb = carThumbnails[car.id];

            return (
              <button
                key={car.id}
                type="button"
                onClick={() => handleCarSwitch(car)}
                className={cn(
                  "relative flex flex-col rounded-xl border p-2 text-left transition-all overflow-hidden cursor-pointer",
                  active
                    ? "border-ember-400 bg-ember-500/15 text-white shadow-[0_0_24px_rgba(255,158,61,0.35)] ring-1 ring-ember-400"
                    : "border-white/10 bg-white/5 text-white/65 hover:border-white/25 hover:bg-white/10"
                )}
              >
                {/* Mini Visual Preview */}
                <div className="relative h-16 w-full overflow-hidden rounded-lg bg-black/60 mb-2">
                  {thumb && (
                    <img
                      src={thumb}
                      alt={car.name}
                      className={cn("h-full w-full object-contain transition-transform duration-300", active && "scale-105")}
                      draggable={false}
                    />
                  )}
                  <span className={cn(
                    "absolute top-1 left-1.5 px-1.5 py-0.5 text-[8px] font-bold tracking-wider rounded border",
                    active
                      ? "border-ember-400 bg-ember-500 text-black font-black"
                      : "border-white/20 bg-black/70 text-white/70"
                  )}>
                    {car.cls.split("//")[0].trim()}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="font-display text-sm font-black italic tracking-wide text-white">
                    {car.name}
                  </div>
                  {active && (
                    <span className="flex h-2 w-2 rounded-full bg-ember-400 animate-ping" />
                  )}
                </div>

                <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-white/45">
                  <span>{car.bhp} BHP</span>
                  <span className="text-amber-300 font-bold">{upgradesCount}/12 STAGES</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---- INTERACTIVE SHOWROOM TURNTABLE STAGE & SPECS COCKPIT ---- */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-5 my-2">
        {/* Left: Interactive 3D Showroom Turntable */}
        <div className="lg:col-span-7 flex flex-col justify-between rounded-2xl border border-white/15 bg-gradient-to-b from-black/80 via-night-950/90 to-black/95 p-4 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-display text-xs font-black tracking-widest text-white/80 uppercase">
                SHOWROOM TURNTABLE // HIGH-FIDELITY RENDER
              </span>
            </div>

            {/* Atmosphere Studio Lighting buttons */}
            <div className="inline-flex rounded-lg border border-white/15 bg-black/60 p-0.5 text-[10px]">
              <button
                type="button"
                onClick={() => {
                  audio.beep(420, 0.05);
                  setShowroomWeather("sunset");
                }}
                className={cn(
                  "flex items-center gap-1 rounded px-2.5 py-1 font-display tracking-wider transition-all",
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
                  "flex items-center gap-1 rounded px-2.5 py-1 font-display tracking-wider transition-all",
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
                  "flex items-center gap-1 rounded px-2.5 py-1 font-display tracking-wider transition-all",
                  showroomWeather === "rain"
                    ? "bg-sky-500 font-bold text-black shadow-[0_0_12px_rgba(14,165,233,0.5)]"
                    : "text-white/60 hover:text-white"
                )}
              >
                <CloudRain className="h-3 w-3" /> CYBER
              </button>
            </div>
          </div>

          {/* Showroom Canvas Display */}
          <div className="relative my-3 flex min-h-[220px] items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-night-950/80 p-2">
            <img
              src={showroomImage}
              alt={displayCar.name}
              className={cn(
                "h-52 w-full object-contain transition-all duration-300 select-none",
                isRevving && "scale-[1.03] -translate-y-0.5 filter drop-shadow-[0_0_25px_rgba(255,100,20,0.6)]",
                testBrakes && "filter drop-shadow-[0_0_30px_rgba(255,20,40,0.7)]"
              )}
              draggable={false}
            />

            {/* Overlays / Badges */}
            <div className="pointer-events-none absolute bottom-3 left-3 flex flex-col gap-0.5 text-left">
              <span className="font-display text-sm font-black italic tracking-wider text-white">
                {displayCar.name}
              </span>
              <span className="text-[10px] font-mono text-amber-300">
                {getArchetypeName(displayCar.bodyStyle)}
              </span>
            </div>

            <div className="pointer-events-none absolute top-3 right-3 text-right">
              <span className="rounded bg-black/60 px-2 py-1 font-mono text-[9px] text-white/50 border border-white/10">
                {displayCar.badgeText} // FIA HOMOLOGATED
              </span>
            </div>
          </div>

          {/* Turntable Action Bar: Rev Engine, Test Brakes */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRevEngine}
                disabled={isRevving}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-4 py-2 font-display text-xs font-black tracking-wider transition-all cursor-pointer",
                  isRevving
                    ? "bg-rose-500 text-white shadow-[0_0_24px_rgba(244,63,94,0.8)] scale-105"
                    : "bg-gradient-to-r from-ember-500 to-amber-500 text-black hover:scale-105 hover:shadow-[0_0_18px_rgba(255,158,61,0.6)]"
                )}
              >
                <Flame className="h-4 w-4" />
                {isRevving ? "REV & SPARKING!" : "AUDITION ENGINE REV"}
              </button>

              <button
                type="button"
                onClick={() => {
                  audio.beep(300, 0.05);
                  setTestBrakes((b) => !b);
                }}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3.5 py-2 font-display text-xs font-bold tracking-wider transition-all cursor-pointer",
                  testBrakes
                    ? "border-rose-500 bg-rose-950/60 text-rose-300 shadow-[0_0_16px_rgba(244,63,94,0.5)]"
                    : "border-white/15 bg-white/5 text-white/70 hover:border-white/30 hover:text-white"
                )}
              >
                <Disc className="h-4 w-4" />
                {testBrakes ? "BRAKES: ILLUMINATED" : "TEST BRAKE LIGHTS"}
              </button>
            </div>

            <span className="text-[10px] font-mono text-white/40">
              CLICK REV TO HEAR AUTHENTIC ACOUSTICS
            </span>
          </div>

          {/* Bespoke Custom Paint Studio */}
          <div className="mt-3 border-t border-white/10 pt-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-display font-bold tracking-wider text-white/70">
                <Palette className="h-3.5 w-3.5 text-amber-400" />
                BESPOKE FINISH & LIVERY STUDIO
              </div>
              <span className="text-[10px] font-mono text-white/40">
                APPLIES INSTANTLY TO VEHICLE
              </span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {CUSTOM_PAINTS.map((paint) => {
                const isSelected = (carPaints[selectedCar.id] || "factory") === paint.id;
                return (
                  <button
                    key={paint.id}
                    type="button"
                    onClick={() => handleSelectPaint(paint)}
                    className={cn(
                      "group relative flex flex-col items-center rounded-lg border p-1.5 text-center transition-all cursor-pointer",
                      isSelected
                        ? "border-ember-400 bg-ember-500/20 shadow-[0_0_12px_rgba(255,158,61,0.4)]"
                        : "border-white/10 bg-black/40 hover:border-white/25 hover:bg-white/5"
                    )}
                  >
                    <div
                      className="h-5 w-full rounded-md border border-white/20 shadow-inner"
                      style={{
                        background: `linear-gradient(135deg, ${paint.light} 0%, ${paint.base} 55%, ${paint.dark} 100%)`,
                      }}
                    />
                    <span className="mt-1 font-display text-[9px] font-bold tracking-wider text-white/80 truncate w-full">
                      {paint.name.split(" ")[0]}
                    </span>
                    <span className="text-[7px] font-mono uppercase text-white/40">
                      {paint.finish}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Machine Blueprint & Live Tuned Telemetry */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-4">
          {/* Blueprint Specs Card */}
          <div className="rounded-2xl border border-white/15 bg-black/60 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <span className="font-display text-xs font-black tracking-widest text-amber-400 uppercase">
                MOTORSPORT CHASSIS BLUEPRINT
              </span>
              <span className="rounded bg-amber-400/20 px-2 py-0.5 font-mono text-[9px] font-bold text-amber-300">
                {displayCar.cls}
              </span>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                <span className="text-white/50 text-[11px]">POWERTRAIN:</span>
                <span className="font-mono font-bold text-white text-[11px]">{displayCar.engineType}</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                <span className="text-white/50 text-[11px]">AERODYNAMICS:</span>
                <span className="font-mono text-white/90 text-[10px] text-right truncate max-w-[210px]">
                  {getAeroSpec(displayCar)}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                <span className="text-white/50 text-[11px]">ALLOY WHEELS:</span>
                <span className="font-mono text-white/90 text-[11px] uppercase">
                  {displayCar.wheelStyle.replace("_", " ")} SPEC
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                <span className="text-white/50 text-[11px]">BRAKE CALIPERS:</span>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: displayCar.caliperColor }} />
                  <span className="font-mono text-white/90 text-[11px]">CERAMIC DISC</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50 text-[11px]">CURB WEIGHT:</span>
                <span className="font-mono font-bold text-white text-[11px]">{displayCar.weightKg} KG</span>
              </div>
            </div>

            <p className="mt-3 text-[11px] italic text-white/50 leading-relaxed border-t border-white/10 pt-2.5">
              "{displayCar.desc}"
            </p>
          </div>

          {/* Live Tuned Telemetry Spec Cards */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {/* Horsepower */}
            <div className="rounded-xl border border-white/10 bg-black/40 p-3 backdrop-blur-md">
              <div className="flex items-center justify-between text-white/40">
                <span className="text-[9px] font-mono uppercase tracking-wider">OUTPUT POWER</span>
                <Zap className="h-3.5 w-3.5 text-amber-400" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-display text-xl font-black text-white">{tunedBhp}</span>
                <span className="text-[10px] font-mono text-amber-400">BHP</span>
                {engineStage > 0 && (
                  <span className="ml-auto text-[9px] font-mono text-emerald-400 font-bold">
                    +{engineStage * 28}
                  </span>
                )}
              </div>
              <div className="mt-1.5 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-[width] duration-300"
                  style={{ width: `${(tunedBhp / 950) * 100}%` }}
                />
              </div>
            </div>

            {/* Acceleration */}
            <div className="rounded-xl border border-white/10 bg-black/40 p-3 backdrop-blur-md">
              <div className="flex items-center justify-between text-white/40">
                <span className="text-[9px] font-mono uppercase tracking-wider">0-60 MPH</span>
                <Gauge className="h-3.5 w-3.5 text-sky-400" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-display text-xl font-black text-white">{tunedZeroToSixty}s</span>
                {transStage > 0 && (
                  <span className="ml-auto text-[9px] font-mono text-emerald-400 font-bold">
                    -{(transStage * 0.22).toFixed(1)}s
                  </span>
                )}
              </div>
              <div className="mt-1.5 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-400 transition-[width] duration-300"
                  style={{ width: `${((3.5 - tunedZeroToSixty) / 1.5) * 100}%` }}
                />
              </div>
            </div>

            {/* Top Speed */}
            <div className="rounded-xl border border-white/10 bg-black/40 p-3 backdrop-blur-md">
              <div className="flex items-center justify-between text-white/40">
                <span className="text-[9px] font-mono uppercase tracking-wider">TOP SPEED</span>
                <Flame className="h-3.5 w-3.5 text-ember-400" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-display text-xl font-black text-white">{tunedMaxSpeed}</span>
                <span className="text-[10px] font-mono text-ember-400">MPH</span>
                {engineStage > 0 && (
                  <span className="ml-auto text-[9px] font-mono text-emerald-400 font-bold">
                    +{tunedMaxSpeed - selectedCar.maxSpeedDisplay}
                  </span>
                )}
              </div>
              <div className="mt-1.5 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-ember-400 transition-[width] duration-300"
                  style={{ width: `${(tunedMaxSpeed / 260) * 100}%` }}
                />
              </div>
            </div>

            {/* Lateral Grip */}
            <div className="rounded-xl border border-white/10 bg-black/40 p-3 backdrop-blur-md">
              <div className="flex items-center justify-between text-white/40">
                <span className="text-[9px] font-mono uppercase tracking-wider">LATERAL GRIP</span>
                <Wind className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-display text-xl font-black text-white">{tunedGrip}</span>
                <span className="text-[10px] font-mono text-emerald-400">G</span>
                {tiresStage > 0 && (
                  <span className="ml-auto text-[9px] font-mono text-emerald-400 font-bold">
                    +{(tiresStage * 0.09).toFixed(2)}G
                  </span>
                )}
              </div>
              <div className="mt-1.5 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-[width] duration-300"
                  style={{ width: `${((tunedGrip - 1.0) / 0.8) * 100}%` }}
                />
              </div>
            </div>

            {/* Nitrous Capacity */}
            <div className="rounded-xl border border-white/10 bg-black/40 p-3 backdrop-blur-md col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-white/40">
                <span className="text-[9px] font-mono uppercase tracking-wider">NITRO CAPACITY</span>
                <Flame className="h-3.5 w-3.5 text-purple-400" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-display text-xl font-black text-white">{100 + nitroStage * 15}</span>
                <span className="text-[10px] font-mono text-purple-400">PSI</span>
                {nitroStage > 0 && (
                  <span className="ml-auto text-[9px] font-mono text-emerald-400 font-bold">
                    +{nitroStage * 15}
                  </span>
                )}
              </div>
              <div className="mt-1.5 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-400 transition-[width] duration-300"
                  style={{ width: `${((100 + nitroStage * 15) / 150) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---- 4 UPGRADE CATEGORIES & STAGE SELECTORS ---- */}
      <div className="relative z-10 mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {UPGRADE_DEFINITIONS.map((cat) => {
          const currentStage = carUpgrades[cat.id] || 0;
          return (
            <div
              key={cat.id}
              className="rounded-xl border border-white/15 bg-white/5 p-4 backdrop-blur-md flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                  <div className="flex items-center gap-2">
                    {cat.id === "engine" && <Zap className="h-4 w-4 text-amber-400" />}
                    {cat.id === "trans" && <Gauge className="h-4 w-4 text-sky-400" />}
                    {cat.id === "tires" && <Wind className="h-4 w-4 text-emerald-400" />}
                    {cat.id === "nitro" && <Flame className="h-4 w-4 text-ember-400" />}
                    <h3 className="font-display text-sm font-bold tracking-wider text-white">
                      {cat.name}
                    </h3>
                  </div>
                  <span className="font-mono text-xs text-ember-300/90 font-bold">
                    STAGE {currentStage}/3
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-white/50">{cat.desc}</p>
              </div>

              {/* Tiers / Stages */}
              <div className="mt-3 flex flex-col gap-2">
                {cat.tiers.map((tier) => {
                  const isInstalled = currentStage >= tier.stage;
                  const isNext = currentStage === tier.stage - 1;
                  const canAfford = career.credits >= tier.cost;

                  return (
                    <div
                      key={tier.stage}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-lg border p-2.5 text-xs transition-all",
                        isInstalled
                          ? "border-emerald-500/40 bg-emerald-950/20 text-white"
                          : isNext
                          ? "border-white/20 bg-black/40 text-white hover:border-amber-400/60"
                          : "border-white/5 bg-black/20 text-white/30"
                      )}
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 font-bold">
                          {isInstalled && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                          {!isInstalled && isNext && <Sparkles className="h-3.5 w-3.5 text-amber-400" />}
                          {!isInstalled && !isNext && <Lock className="h-3.5 w-3.5 text-white/20" />}
                          <span>{tier.name}</span>
                        </div>
                        <span className="text-[10px] font-mono text-amber-300/80 mt-0.5">
                          {tier.bonus}
                        </span>
                      </div>

                      {/* Action state */}
                      {isInstalled ? (
                        <span className="rounded bg-emerald-500/20 px-2.5 py-1 font-mono text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                          INSTALLED
                        </span>
                      ) : isNext ? (
                        <button
                          type="button"
                          onClick={() => handlePurchase(cat.id, tier.stage, tier.cost)}
                          disabled={!canAfford}
                          className={cn(
                            "rounded px-3 py-1.5 font-display text-[11px] font-black tracking-wider transition-all",
                            canAfford
                              ? "bg-gradient-to-r from-ember-500 to-amber-400 text-black hover:scale-105 hover:shadow-[0_0_12px_rgba(255,158,61,0.6)] cursor-pointer"
                              : "bg-white/10 text-white/40 cursor-not-allowed border border-white/10"
                          )}
                        >
                          ${tier.cost.toLocaleString()}
                        </button>
                      ) : (
                        <span className="font-mono text-[10px] text-white/20">
                          STAGE {tier.stage - 1} REQUIRED
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

      {/* ---- BOTTOM FOOTER ---- */}
      <div className="relative z-10 mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs font-mono text-white/40">
        <div>
          <span>Upgrades apply instantly to vehicle physics & realistic procedural rendering models.</span>
        </div>
        <button
          type="button"
          onClick={() => {
            audio.beep(400, 0.08);
            onBack();
          }}
          className="font-display font-bold text-white/70 hover:text-white transition-colors tracking-widest uppercase cursor-pointer"
        >
          RETURN TO RACE PREP &rarr;
        </button>
      </div>
    </div>
  );
}
