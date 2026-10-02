import { useState } from "react";
import {
  Wrench, Zap, Gauge, Wind, Flame, Check, Lock, DollarSign,
  ArrowLeft, Sparkles
} from "lucide-react";
import {
  CARS, type CarDef, UPGRADE_DEFINITIONS,
  type CarUpgrades, type CareerProgress, DEFAULT_UPGRADES
} from "../game/constants";
import { cn } from "../utils/cn";
import { getAudio } from "../game/audio";

interface GarageTuningProps {
  career: CareerProgress;
  activeCar: CarDef;
  onSelectCar: (car: CarDef) => void;
  onUpgradeCar: (carId: string, category: keyof CarUpgrades, stage: number, cost: number) => void;
  onBack: () => void;
}

export default function GarageTuning({
  career,
  activeCar,
  onSelectCar,
  onUpgradeCar,
  onBack,
}: GarageTuningProps) {
  const [selectedCar, setSelectedCar] = useState<CarDef>(activeCar);
  const audio = getAudio();

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

  const handleCarSwitch = (car: CarDef) => {
    audio.beep(520, 0.08);
    setSelectedCar(car);
    onSelectCar(car);
  };

  const handlePurchase = (category: keyof CarUpgrades, stage: number, cost: number) => {
    if (career.credits < cost) {
      audio.thud(0.5);
      return;
    }
    audio.upgrade();
    onUpgradeCar(selectedCar.id, category, stage, cost);
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
            className="flex items-center gap-2 rounded border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-display tracking-widest text-white/80 transition-all hover:border-ember-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> BACK
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-ember-400" />
              <h1 className="font-display text-2xl font-black italic tracking-wider sm:text-3xl">
                PERFORMANCE TUNING SHOP
              </h1>
            </div>
            <p className="text-xs text-white/50 tracking-wider">
              Upgrade engine mapping, close-ratio gears, racing slicks, and cryogenic nitrous
            </p>
          </div>
        </div>

        {/* Balance */}
        <div className="flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-950/40 px-4 py-2 backdrop-blur-md">
          <DollarSign className="h-5 w-5 text-emerald-400" />
          <div className="flex flex-col">
            <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-300/70">AVAILABLE CREDITS</span>
            <span className="font-mono text-lg font-bold text-emerald-300 leading-none">
              ${career.credits.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* ---- CAR SELECTION TABS & SPECS COCKPIT ---- */}
      <div className="relative z-10 my-4 flex flex-col gap-4 sm:my-6">
        {/* Car Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {CARS.map((car) => {
            const active = car.id === selectedCar.id;
            const upgradesCount = Object.values(career.upgrades[car.id] || DEFAULT_UPGRADES).reduce((a, b) => a + b, 0);
            return (
              <button
                key={car.id}
                type="button"
                onClick={() => handleCarSwitch(car)}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg border px-4 py-2.5 text-left transition-all",
                  active
                    ? "border-ember-400 bg-ember-500/20 text-white shadow-[0_0_16px_rgba(255,158,61,0.3)]"
                    : "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white"
                )}
              >
                <div>
                  <div className="font-display text-sm font-black italic tracking-wider">
                    {car.name}
                  </div>
                  <div className="text-[10px] font-mono text-white/40">
                    {car.engineType} // {upgradesCount}/12 STAGES
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Live Tuned Telemetry Spec Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {/* Horsepower */}
          <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 backdrop-blur-md">
            <div className="flex items-center justify-between text-white/40">
              <span className="text-[10px] font-mono uppercase tracking-wider">OUTPUT POWER</span>
              <Zap className="h-4 w-4 text-amber-400" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-display text-2xl font-black text-white">{tunedBhp}</span>
              <span className="text-xs font-mono text-amber-400">BHP</span>
              {engineStage > 0 && (
                <span className="ml-auto text-[10px] font-mono text-emerald-400 font-bold">
                  +{engineStage * 28}
                </span>
              )}
            </div>
            <div className="mt-2 h-1 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 transition-[width] duration-300"
                style={{ width: `${(tunedBhp / 900) * 100}%` }}
              />
            </div>
          </div>

          {/* Acceleration */}
          <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 backdrop-blur-md">
            <div className="flex items-center justify-between text-white/40">
              <span className="text-[10px] font-mono uppercase tracking-wider">0-60 MPH</span>
              <Gauge className="h-4 w-4 text-sky-400" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-display text-2xl font-black text-white">{tunedZeroToSixty}s</span>
              {transStage > 0 && (
                <span className="ml-auto text-[10px] font-mono text-emerald-400 font-bold">
                  -{(transStage * 0.22).toFixed(1)}s
                </span>
              )}
            </div>
            <div className="mt-2 h-1 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-400 transition-[width] duration-300"
                style={{ width: `${((3.5 - tunedZeroToSixty) / 1.5) * 100}%` }}
              />
            </div>
          </div>

          {/* Top Speed */}
          <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 backdrop-blur-md">
            <div className="flex items-center justify-between text-white/40">
              <span className="text-[10px] font-mono uppercase tracking-wider">TOP SPEED</span>
              <Flame className="h-4 w-4 text-ember-400" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-display text-2xl font-black text-white">{tunedMaxSpeed}</span>
              <span className="text-xs font-mono text-ember-400">MPH</span>
              {engineStage > 0 && (
                <span className="ml-auto text-[10px] font-mono text-emerald-400 font-bold">
                  +{tunedMaxSpeed - selectedCar.maxSpeedDisplay}
                </span>
              )}
            </div>
            <div className="mt-2 h-1 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-ember-400 transition-[width] duration-300"
                style={{ width: `${(tunedMaxSpeed / 250) * 100}%` }}
              />
            </div>
          </div>

          {/* Lateral Grip */}
          <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 backdrop-blur-md">
            <div className="flex items-center justify-between text-white/40">
              <span className="text-[10px] font-mono uppercase tracking-wider">LATERAL GRIP</span>
              <Wind className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-display text-2xl font-black text-white">{tunedGrip}</span>
              <span className="text-xs font-mono text-emerald-400">G</span>
              {tiresStage > 0 && (
                <span className="ml-auto text-[10px] font-mono text-emerald-400 font-bold">
                  +{(tiresStage * 0.09).toFixed(2)}G
                </span>
              )}
            </div>
            <div className="mt-2 h-1 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 transition-[width] duration-300"
                style={{ width: `${((tunedGrip - 1.0) / 0.8) * 100}%` }}
              />
            </div>
          </div>

          {/* Nitrous Capacity */}
          <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 backdrop-blur-md col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-white/40">
              <span className="text-[10px] font-mono uppercase tracking-wider">NITRO CAPACITY</span>
              <Flame className="h-4 w-4 text-purple-400" />
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-display text-2xl font-black text-white">{100 + nitroStage * 15}</span>
              <span className="text-xs font-mono text-purple-400">PSI</span>
              {nitroStage > 0 && (
                <span className="ml-auto text-[10px] font-mono text-emerald-400 font-bold">
                  +{nitroStage * 15}
                </span>
              )}
            </div>
            <div className="mt-2 h-1 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-400 transition-[width] duration-300"
                style={{ width: `${((100 + nitroStage * 15) / 150) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ---- 4 UPGRADE CATEGORIES & STAGE SELECTORS ---- */}
      <div className="relative z-10 grid grid-cols-1 gap-4 md:grid-cols-2">
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
          <span>Upgrades apply instantly to this vehicle and persist in your career profile.</span>
        </div>
        <button
          type="button"
          onClick={() => {
            audio.beep(400, 0.08);
            onBack();
          }}
          className="font-display font-bold text-white/70 hover:text-white transition-colors tracking-widest uppercase"
        >
          RETURN TO RACE PREP &rarr;
        </button>
      </div>
    </div>
  );
}
