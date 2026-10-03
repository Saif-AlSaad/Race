// ------------------------------------------------------------------
// APEX HORIZON engine — pseudo-3D road renderer (segment projection),
// player physics (grip, drift, nitro, offroad), AI rivals, collisions,
// particles, laps, standings, golden-hour scenery.
// ------------------------------------------------------------------

import {
  SEGMENT_LENGTH, ROAD_WIDTH, CAMERA_HEIGHT, DRAW_DISTANCE, FIELD_OF_VIEW,
  FOG_DENSITY, CENTRIFUGAL, TOTAL_LAPS, PLAYER_HALF_W, MPH_SCALE,
  BASE_MAX_SPEED, BASE_ACCEL, BRAKE_FORCE, COAST_DECEL, OFFROAD_DECEL,
  OFFROAD_LIMIT, BOOST_TOP_MULT, BOOST_ACCEL_MULT, RIVALS, SCENES, CARS,
  type CarDef, type WeatherMode, type GameSettings, DEFAULT_SETTINGS,
  type DifficultyLevel, DIFFICULTIES, type CarUpgrades, DEFAULT_UPGRADES,
} from "./constants";
import { buildTrack, type TrackData, type Segment, type SpritePlacement } from "./track";
import {
  carSprite, palmSprite, pineSprite, billboardSprite, lampSprite,
  shrubSprite, rockSprite, brakeMarkerSprite, chevronSprite,
  tireWallSprite, marshalPostSprite, gantrySprite,
  skyLayer, ridgeLayer, cloudSprite, type SpriteInfo, type Paint,
} from "./sprites";
import type { AudioEngine } from "./audio";

export type GameMode = "attract" | "countdown" | "racing" | "paused" | "finished";

export interface InputState {
  left: boolean; right: boolean; up: boolean; down: boolean; boost: boolean; drift: boolean;
}

export interface Standing {
  name: string;
  isPlayer: boolean;
  gap: string;
}

export interface RaceResult {
  position: number;
  totalTime: number;
  bestLap: number;
  laps: number[];
  standings: Standing[];
  cleanRace: boolean;
  difficulty: DifficultyLevel;
}

export interface HudState {
  mode: GameMode;
  weather: WeatherMode;
  mph: number;
  speedUnit: string;
  gear: number;
  rpm: number;
  boost: number; // 0..100
  boosting: boolean;
  drifting: boolean;
  offroad: boolean;
  lap: number;
  totalLaps: number;
  lapProgress: number; // 0..1 through current lap
  position: number;
  racers: number;
  raceTime: number;
  lapTime: number;
  lastLap: number;
  bestLap: number;
  gapAhead: string | null;
  finished: boolean;
  lateralG: number;
  shiftLights: number;
  cleanRace: boolean;
  difficulty: DifficultyLevel;
  drafting: boolean;
  draftFactor: number;
  draftRival: string | null;
}

interface Opponent {
  name: string;
  paint: Paint;
  z: number;
  total: number;
  offset: number;
  speed: number;
  cruise: number;
  wob: number;
  sprite: SpriteInfo;
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number; grow: number;
  color: string; front: boolean;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const percentRemaining = (n: number, total: number) => (((n % total) + total) % total) / total;
const expFog = (d: number, density: number) => 1 / Math.exp(d * d * density);

export class RaceEngine {
  input: InputState = { left: false, right: false, up: false, down: false, boost: false, drift: false };
  touch: InputState = { left: false, right: false, up: false, down: false, boost: false, drift: false };

  onLap: ((lap: number, lapMs: number, bestMs: number) => void) | null = null;
  onFinish: ((r: RaceResult) => void) | null = null;
  onOvertake: ((position: number, gained: boolean) => void) | null = null;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audio: AudioEngine;
  private track: TrackData;
  private car: CarDef = CARS[0];
  private mode: GameMode = "attract";

  private width = 1;
  private height = 1;
  private raf = 0;
  private lastT = 0;
  private time = 0;
  private destroyed = false;

  // camera & player
  private position = 0; // camera z along the track loop, wrapped in [0, track.length)
  private playerX = 0;
  private speed = 0;
  private steerVis = 0;
  private boostMeter = 60;
  private fovBoost = 0;
  private shake = 0;
  private playerTotal = 0;
  private offroadNow = false;
  private driftNow = false;
  private boostNow = false;
  private collCooldown = 0;

  // scenery scroll
  private skyOff = 0;
  private farOff = 0;
  private nearOff = 0;
  private cloudDrift = 0;

  // race state
  private lap = 1;
  private lapStart = 0;
  private raceElapsed = 0;
  private lastLap = 0;
  private bestLap = 0;
  private lapTimes: number[] = [];
  private positionNow = 8;
  private posCheck = 0;
  private finished = false;
  private raceTimeFrozen = 0;
  private opponents: Opponent[] = [];
  private particles: Particle[] = [];

  // Career, difficulty & tuning
  private difficulty: DifficultyLevel = "pro";
  private upgrades: CarUpgrades = { ...DEFAULT_UPGRADES };
  private totalLaps: number = TOTAL_LAPS;
  private lateralG: number = 0;
  private cleanRace: boolean = true;

  // Dynamic Car Body Roll & Suspension Simulation
  private rollAngle: number = 0; // chassis roll angle in radians
  private pitchOffset: number = 0; // vertical squat/dive displacement (px)
  private suspensionTravel: number = 0; // road bump displacement

  // Slipstream / Drafting Mechanic
  private draftingNow: boolean = false;
  private draftFactor: number = 0; // 0..1
  private draftTarget: Opponent | null = null;
  private aeroStreamers: { x: number; y: number; length: number; speed: number; alpha: number; side: number }[] = [];

  // Persistent Skidmarks tracking
  private lastSkidSegIndex: number = -1;

  // settings & custom options
  private settings: GameSettings = DEFAULT_SETTINGS;

  // weather & dynamic lighting
  private weather: WeatherMode = "sunset";
  private lightningTimer = 8;
  private lightningFlash = 0;
  private rainParticles: { x: number; y: number; speed: number; length: number; alpha: number }[] = [];
  private rainSplashes: { x: number; y: number; r: number; maxR: number; alpha: number }[] = [];
  private taillightHistory: { leftX: number; leftY: number; rightX: number; rightY: number; time: number }[] = [];

  // pre-rendered scenery
  private sky!: HTMLCanvasElement;
  private farRidge!: HTMLCanvasElement;
  private nearRidge!: HTMLCanvasElement;
  private clouds!: HTMLCanvasElement[];

  private readonly cameraDepthBase = 1 / Math.tan(((FIELD_OF_VIEW / 2) * Math.PI) / 180);
  private readonly playerZ = CAMERA_HEIGHT * (1 / Math.tan(((FIELD_OF_VIEW / 2) * Math.PI) / 180));
  private resizeHandler: () => void;

  constructor(
    canvas: HTMLCanvasElement,
    audio: AudioEngine,
    initialWeather: WeatherMode = "sunset",
    initialSettings: GameSettings = DEFAULT_SETTINGS,
  ) {
    this.canvas = canvas;
    this.audio = audio;
    this.weather = initialWeather;
    this.settings = initialSettings;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    this.ctx = ctx;
    this.track = buildTrack();
    this.initScenery();
    this.initRain();
    this.spawnGrid(true);
    this.resizeHandler = () => this.resize();
    window.addEventListener("resize", this.resizeHandler);
    this.resize();
    this.lastT = performance.now();
    const loop = (t: number) => {
      if (this.destroyed) return;
      const dt = clamp((t - this.lastT) / 1000, 0, 1 / 30);
      this.lastT = t;
      this.update(dt);
      this.render();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  // ---------------- public control ----------------

  getSettings(): GameSettings {
    return this.settings;
  }

  setSettings(s: GameSettings) {
    this.settings = s;
  }

  getWeather(): WeatherMode {
    return this.weather;
  }

  setWeather(w: WeatherMode) {
    if (this.weather === w && this.sky) return;
    this.weather = w;
    this.initScenery();
    this.opponents.forEach((o) => {
      o.sprite = carSprite(o.paint, false, w);
    });
    this.lightningFlash = 0;
    this.lightningTimer = 7 + Math.random() * 8;
  }

  private initScenery() {
    const w = this.weather;
    this.sky = skyLayer(1200, 620, w);
    const ridgeColFar = w === "night" ? "#120e24" : w === "rain" ? "#0e1826" : "#4b3560";
    const ridgeColNear = w === "night" ? "#090714" : w === "rain" ? "#070e17" : "#33243f";
    this.farRidge = ridgeLayer(1024, 300, 11, ridgeColFar, 0.85, w);
    this.nearRidge = ridgeLayer(1024, 260, 29, ridgeColNear, 0.95, w);
    this.clouds = [cloudSprite(w), cloudSprite(w), cloudSprite(w)];
  }

  private initRain() {
    this.rainParticles = [];
    const w = this.width || 1200;
    const h = this.height || 800;
    for (let i = 0; i < 220; i++) {
      this.rainParticles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        speed: 750 + Math.random() * 450,
        length: 14 + Math.random() * 16,
        alpha: 0.25 + Math.random() * 0.45,
      });
    }
  }

  setCar(def: CarDef) {
    this.car = def;
  }

  getDifficulty(): DifficultyLevel {
    return this.difficulty;
  }

  setDifficulty(d: DifficultyLevel) {
    this.difficulty = d;
    const diffMult = DIFFICULTIES[d]?.aiSpeedMult ?? 1.0;
    this.opponents.forEach((o) => {
      o.cruise = BASE_MAX_SPEED * (0.9 + Math.random() * 0.055) * diffMult;
    });
  }

  setUpgrades(u: CarUpgrades) {
    this.upgrades = { ...u };
  }

  setTotalLaps(laps: number) {
    this.totalLaps = Math.max(1, laps);
  }

  toAttract() {
    this.reset();
    this.mode = "attract";
  }

  startGrid() {
    this.reset();
    this.mode = "countdown";
  }

  /** returns true if the launch was perfect (throttle held) */
  beginRace(): boolean {
    this.mode = "racing";
    this.raceElapsed = 0;
    this.lapStart = 0;
    const perfect = this.input.up || this.touch.up;
    if (perfect) {
      this.speed = 2600;
      this.boostMeter = Math.min(100, this.boostMeter + 25);
    }
    return perfect;
  }

  setPaused(p: boolean) {
    if (p && this.mode === "racing") {
      this.mode = "paused";
      this.audio.setEngine(0, false, false);
      this.audio.setSkid(0);
      this.audio.setBoost(0);
      this.audio.setDraft(0);
    } else if (!p && this.mode === "paused") {
      this.mode = "racing";
    }
  }

  getMode(): GameMode {
    return this.mode;
  }

  minimap(): { outline: { x: number; y: number }[]; dots: { x: number; y: number; color: string; player: boolean }[] } {
    const o = this.track.outline;
    const N = this.track.segments.length;
    const toPt = (z: number) => {
      const idx = ((Math.floor(z / SEGMENT_LENGTH) % N) + N) % N;
      return o[Math.floor(idx / 4) % o.length];
    };
    const dots = this.opponents.map((op) => ({ ...toPt(op.z), color: "#c8c2d8", player: false }));
    dots.push({ ...toPt(this.position), color: "#ff9e3d", player: true });
    return { outline: o, dots };
  }

  hud(): HudState {
    const engineMult = 1 + (this.upgrades.engine || 0) * 0.035;
    const maxSpeed = BASE_MAX_SPEED * this.car.topSpeed * engineMult;
    const gearTop = maxSpeed / 6;
    const gear = clamp(1 + Math.floor(this.speed / gearTop), 1, 6);
    const rpm = clamp((this.speed % gearTop) / gearTop, 0, 1);
    const speedMult = this.settings.speedUnit === "kmh" ? 1.60934 : 1.0;
    const speedVal = Math.round(this.speed * MPH_SCALE * speedMult);

    let shiftLights = 0;
    if (rpm > 0.97) shiftLights = 7;
    else if (rpm > 0.92) shiftLights = 6;
    else if (rpm > 0.85) shiftLights = 5;
    else if (rpm > 0.77) shiftLights = 4;
    else if (rpm > 0.65) shiftLights = 3;
    else if (rpm > 0.50) shiftLights = 2;
    else if (rpm > 0.35) shiftLights = 1;

    return {
      mode: this.mode,
      weather: this.weather,
      mph: speedVal,
      speedUnit: this.settings.speedUnit.toUpperCase(),
      gear,
      rpm,
      boost: this.boostMeter,
      boosting: this.boostNow,
      drifting: this.driftNow,
      offroad: this.offroadNow,
      lap: Math.min(this.lap, this.totalLaps),
      totalLaps: this.totalLaps,
      lapProgress: (this.playerTotal % this.track.length) / this.track.length,
      position: this.positionNow,
      racers: this.opponents.length + 1,
      raceTime: (this.finished ? this.raceTimeFrozen : this.raceElapsed) * 1000,
      lapTime: Math.max(0, (this.finished ? this.raceTimeFrozen : this.raceElapsed) - this.lapStart) * 1000,
      lastLap: this.lastLap * 1000,
      bestLap: this.bestLap * 1000,
      gapAhead: this.gapAhead(),
      finished: this.finished,
      lateralG: Number(this.lateralG.toFixed(2)),
      shiftLights,
      cleanRace: this.cleanRace,
      difficulty: this.difficulty,
      drafting: this.draftingNow,
      draftFactor: Number(this.draftFactor.toFixed(2)),
      draftRival: this.draftTarget?.name ?? null,
    };
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.resizeHandler);
    this.audio.setEngine(0, false, false);
    this.audio.setSkid(0);
    this.audio.setBoost(0);
    this.audio.setDraft(0);
  }

  // ---------------- internals ----------------

  private resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = w;
    this.height = h;
    this.initRain();
  }

  private reset() {
    this.position = 0;
    this.playerX = 0;
    this.speed = 0;
    this.steerVis = 0;
    this.boostMeter = 60;
    this.shake = 0;
    this.playerTotal = 0;
    this.lap = 1;
    this.lapStart = 0;
    this.raceElapsed = 0;
    this.raceTimeFrozen = 0;
    this.lastLap = 0;
    this.bestLap = 0;
    this.lapTimes = [];
    this.finished = false;
    this.positionNow = 8;
    this.cleanRace = true;
    this.lateralG = 0;
    this.rollAngle = 0;
    this.pitchOffset = 0;
    this.suspensionTravel = 0;
    this.draftingNow = false;
    this.draftFactor = 0;
    this.draftTarget = null;
    this.aeroStreamers = [];
    this.lastSkidSegIndex = -1;
    this.particles = [];
    this.spawnGrid(false);
  }

  private spawnGrid(attract: boolean) {
    const diffMult = DIFFICULTIES[this.difficulty]?.aiSpeedMult ?? 1.0;
    this.opponents = RIVALS.map((r, i) => ({
      name: r.name,
      paint: { base: r.base, dark: r.dark, light: r.light, glassHi: "#9fc3d9", glassLo: "#141d2a", accent: r.accent, carId: r.carId },
      z: attract ? 3000 + i * 2600 : 620 + i * 430 + (i % 2) * 160,
      total: attract ? 3000 + i * 2600 : 620 + i * 430 + (i % 2) * 160,
      offset: (i % 2 === 0 ? 0.55 : -0.55) + (Math.random() - 0.5) * 0.2,
      speed: 0,
      cruise: BASE_MAX_SPEED * (0.9 + Math.random() * 0.055) * diffMult,
      wob: Math.random() * 100,
      sprite: carSprite(
        { base: r.base, dark: r.dark, light: r.light, glassHi: "#9fc3d9", glassLo: "#141d2a", accent: r.accent, carId: r.carId },
        false,
        this.weather,
      ),
    }));
    this.positionNow = 8;
  }

  private findSegment(z: number): Segment {
    const N = this.track.segments.length;
    return this.track.segments[((Math.floor(z / SEGMENT_LENGTH) % N) + N) % N];
  }

  private gapAhead(): string | null {
    if (this.mode !== "racing" || this.positionNow <= 1) return null;
    const totals = this.opponents.map((o) => o.total);
    const ahead = totals.filter((t) => t > this.playerTotal).sort((a, b) => a - b)[0];
    if (ahead === undefined) return null;
    const secs = (ahead - this.playerTotal) / Math.max(5000, this.speed);
    return "+" + secs.toFixed(2);
  }

  private ctl(): InputState {
    const i = this.input;
    const t = this.touch;
    if (this.mode === "racing") {
      return {
        left: i.left || t.left, right: i.right || t.right,
        up: i.up || t.up, down: i.down || t.down,
        boost: i.boost || t.boost, drift: i.drift || t.drift,
      };
    }
    // autopilot (attract / victory lap)
    const seg = this.findSegment(this.position + this.playerZ);
    const speedPct = this.speed / BASE_MAX_SPEED;
    const ahead = this.findSegment(this.position + this.playerZ + SEGMENT_LENGTH * 26);
    const steer = clamp(-this.playerX * 1.1 + seg.curve * 0.34 * speedPct + ahead.curve * 0.12 * speedPct, -1, 1);
    return { left: steer < -0.07, right: steer > 0.07, up: true, down: false, boost: false, drift: false };
  }

  private update(dt: number) {
    this.time += dt;
    this.cloudDrift += dt * 3;

    if (this.mode === "paused") return;

    if (this.mode === "countdown") {
      const rev = this.input.up || this.touch.up;
      this.audio.setEngine(rev ? 0.62 + Math.sin(this.time * 31) * 0.1 : 0.1, rev, true);
      return;
    }

    const c = this.ctl();
    if (this.settings.autoThrottle && this.mode === "racing" && !c.down) {
      c.up = true;
    }
    this.ctlCached = c;
    const engineMult = 1 + (this.upgrades.engine || 0) * 0.035;
    const transMult = 1 + (this.upgrades.trans || 0) * 0.045;
    const gripMult = 1 + (this.upgrades.tires || 0) * 0.05;
    const maxBoostCap = 100 + (this.upgrades.nitro || 0) * 15;

    const maxSpeed = BASE_MAX_SPEED * this.car.topSpeed * engineMult * (this.mode === "attract" ? 0.96 : 1);
    const speedPct = clamp(this.speed / maxSpeed, 0, 1);
    const playerSeg = this.findSegment(this.position + this.playerZ);

    // ---- steering ----
    const sens = this.settings.steeringSensitivity || 1.0;
    const dx = dt * 2.3 * speedPct * (0.7 + this.car.grip * gripMult * 0.42) * sens;
    let steer = 0;
    if (c.left) { this.playerX -= dx; steer = -1; }
    if (c.right) { this.playerX += dx; steer = 1; }
    this.playerX -= dx * speedPct * playerSeg.curve * CENTRIFUGAL;
    this.steerVis = lerp(this.steerVis, steer, 1 - Math.exp(-dt * 9));

    // ---- lateral G calculation for realistic telemetry ----
    const curveG = Math.abs(playerSeg.curve) * speedPct * speedPct * 0.95;
    const steerG = Math.abs(this.steerVis) * speedPct * (1.1 + this.car.grip * gripMult * 0.35);
    const targetG = clamp(Math.max(curveG, steerG) * 1.35, 0, 1.85);
    this.lateralG = lerp(this.lateralG, targetG, 1 - Math.exp(-dt * 6.5));

    // ---- drift ----
    this.driftNow = c.drift && Math.abs(steer) > 0 && speedPct > 0.42;

    // ---- dynamic car body roll & suspension simulation ----
    // Lateral roll: chassis leans outward against cornering centrifugal force,
    // plus counter-steering lean during drifts
    const steerRoll = this.steerVis * (0.055 + (this.driftNow ? 0.065 : 0));
    const curveCentrifugalRoll = (playerSeg.curve * speedPct * speedPct) * 0.038;
    const targetRoll = -(steerRoll + curveCentrifugalRoll);
    this.rollAngle = lerp(this.rollAngle, targetRoll, 1 - Math.exp(-dt * 12));

    // Pitch: Dive on braking, Squat on acceleration/boost
    let targetPitch = 0;
    if (this.boostNow) targetPitch = 5.2;
    else if (c.up && this.speed < maxSpeed) targetPitch = 3.0;
    else if (c.down && this.speed > 350) targetPitch = -5.4;
    const slope = (playerSeg.p2.world.y - playerSeg.p1.world.y) * 0.16;
    targetPitch += clamp(slope, -4, 4);
    this.pitchOffset = lerp(this.pitchOffset, targetPitch, 1 - Math.exp(-dt * 10));

    // Road bump suspension oscillation
    this.suspensionTravel = Math.sin(this.time * 38) * speedPct * speedPct * 2.2 +
      (this.offroadNow ? (Math.random() - 0.5) * 6 : 0);

    // ---- persistent skidmarks stamping ----
    const isSkidding = this.driftNow || (c.down && this.speed > 800) || (this.offroadNow && this.speed > 1600);
    if (isSkidding && this.speed > 350) {
      const pSeg = this.findSegment(this.position + this.playerZ);
      if (!pSeg.skids) pSeg.skids = [];
      if (this.lastSkidSegIndex !== pSeg.index) {
        this.lastSkidSegIndex = pSeg.index;
        const skidAlpha = clamp(this.driftNow ? 0.72 : 0.48, 0.25, 0.78);
        const tireTrackW = 0.28;
        pSeg.skids.push({
          leftOffset: this.playerX - tireTrackW,
          rightOffset: this.playerX + tireTrackW,
          width: 0.038,
          alpha: skidAlpha,
        });
        if (pSeg.skids.length > 5) pSeg.skids.shift();
      }
    } else {
      this.lastSkidSegIndex = -1;
    }

    // ---- slipstream / drafting detection ----
    let bestDraft: Opponent | null = null;
    let closestDraftDist = Infinity;
    if (this.mode === "racing" && this.speed > 1600) {
      for (const o of this.opponents) {
        let relZ = o.total - this.playerTotal;
        // In front between 220 and 1600 world units (~1 to 9 segments ahead)
        if (relZ > 220 && relZ < 1600) {
          const latOffsetDiff = Math.abs(o.offset - this.playerX);
          if (latOffsetDiff < 0.42 && relZ < closestDraftDist) {
            closestDraftDist = relZ;
            bestDraft = o;
          }
        }
      }
    }

    if (bestDraft) {
      this.draftingNow = true;
      this.draftTarget = bestDraft;
      const distRatio = 1 - (closestDraftDist - 220) / (1600 - 220);
      const targetDraft = clamp(distRatio * 1.15, 0.2, 1.0);
      this.draftFactor = lerp(this.draftFactor, targetDraft, 1 - Math.exp(-dt * 4.5));
    } else {
      this.draftingNow = false;
      this.draftTarget = null;
      this.draftFactor = Math.max(0, this.draftFactor - dt * 2.8);
    }

    // Aerodynamic streamline streamers
    if (this.draftFactor > 0.15 && Math.random() < dt * 42) {
      this.aeroStreamers.push({
        x: (Math.random() - 0.5) * (this.width * 0.45),
        y: this.height * 0.48 + Math.random() * (this.height * 0.2),
        length: 45 + Math.random() * 80,
        speed: 1300 + Math.random() * 800,
        alpha: 0.35 + this.draftFactor * 0.55,
        side: Math.random() < 0.5 ? -1 : 1,
      });
    }
    for (let i = this.aeroStreamers.length - 1; i >= 0; i--) {
      const str = this.aeroStreamers[i];
      str.y += str.speed * dt;
      str.alpha -= dt * 1.6;
      if (str.y > this.height || str.alpha <= 0) {
        this.aeroStreamers.splice(i, 1);
      }
    }

    // ---- throttle / brake with slipstream tow ----
    this.boostNow = c.boost && this.boostMeter > 1 && this.speed > 2400;
    const draftTopMult = 1 + this.draftFactor * 0.11;
    const draftAccelMult = 1 + this.draftFactor * 0.38;
    const topNow = maxSpeed * (this.boostNow ? BOOST_TOP_MULT : 1) * draftTopMult;
    if (c.up) this.speed += BASE_ACCEL * this.car.accel * transMult * (this.boostNow ? BOOST_ACCEL_MULT : 1) * draftAccelMult * dt;
    else if (c.down) this.speed += BRAKE_FORCE * dt;
    else this.speed += COAST_DECEL * dt;
    if (this.driftNow) this.speed -= maxSpeed * 0.11 * dt;

    // ---- offroad / curb / gravel ----
    const absX = Math.abs(this.playerX);
    const onCurb = absX > 0.98 && absX <= 1.15;
    this.offroadNow = absX > 1.15;
    if (onCurb && this.speed > 600) {
      this.shake = Math.max(this.shake, 0.12);
    }
    if (this.offroadNow && this.speed > OFFROAD_LIMIT * (0.8 + this.car.grip * 0.25)) {
      this.speed += OFFROAD_DECEL * dt;
      this.dust(dt);
      this.shake = Math.max(this.shake, 0.35);
    }
    if (this.weather === "rain") {
      this.waterSpray(dt);
    }

    // ---- boost meter ----
    if (this.boostNow) this.boostMeter = Math.max(0, this.boostMeter - 30 * dt);
    else this.boostMeter = Math.min(maxBoostCap, this.boostMeter + (this.driftNow ? 28 : this.draftFactor > 0.3 ? 22 : this.offroadNow ? 1.5 : 8) * dt);
    this.fovBoost = lerp(this.fovBoost, this.boostNow ? 1 : 0, 1 - Math.exp(-dt * 4));

    // over-top-speed ease back
    if (this.speed > topNow) this.speed = lerp(this.speed, topNow, 1 - Math.exp(-dt * 2.2));
    this.speed = clamp(this.speed, 0, topNow * 1.06);
    this.playerX = clamp(this.playerX, -2.7, 2.7);

    this.position = ((this.position + this.speed * dt) % this.track.length + this.track.length) % this.track.length;
    this.playerTotal += this.speed * dt;
    this.collCooldown = Math.max(0, this.collCooldown - dt);

    // ---- scenery parallax ----
    this.skyOff += playerSeg.curve * speedPct * dt * 22;
    this.farOff += playerSeg.curve * speedPct * dt * 60;
    this.nearOff += playerSeg.curve * speedPct * dt * 130;

    // ---- collisions ----
    if (this.mode === "racing") {
      this.collideSprites(playerSeg);
      this.collideCars();
    }

    // ---- opponents ----
    this.updateOpponents(dt);

    // ---- race bookkeeping ----
    if (this.mode === "racing") {
      this.raceElapsed += dt;
      const newLap = Math.floor(this.playerTotal / this.track.length) + 1;
      if (newLap > this.lap) {
        const lapMs = (this.raceElapsed - this.lapStart) * 1000;
        this.lastLap = this.raceElapsed - this.lapStart;
        this.bestLap = this.bestLap === 0 ? this.lastLap : Math.min(this.bestLap, this.lastLap);
        this.lapTimes.push(lapMs);
        this.lapStart = this.raceElapsed;
        this.lap = newLap;
        if (this.playerTotal >= this.totalLaps * this.track.length) this.finishRace();
        else this.onLap?.(newLap, lapMs, this.bestLap * 1000);
      }
      // standings + overtake toasts
      this.posCheck += dt;
      if (this.posCheck > 0.35) {
        this.posCheck = 0;
        let better = 1;
        for (const o of this.opponents) if (o.total > this.playerTotal) better++;
        if (better !== this.positionNow) {
          if (!this.finished) this.onOvertake?.(better, better < this.positionNow);
          this.positionNow = better;
        }
      }
    }

    this.updateParticles(dt);
    this.updateRain(dt);

    // ---- audio ----
    const rpm = clamp(this.speed / maxSpeed, 0, 1);
    const skidAmt =
      this.mode === "racing" || this.mode === "attract" || this.mode === "finished"
        ? clamp((this.driftNow ? 0.9 : 0) + (this.offroadNow && this.speed > 2200 ? 0.8 : 0), 0, 1)
        : 0;
    this.audio.setEngine(rpm * (this.boostNow ? 1.12 : 1), c.up && this.speed < maxSpeed, true);
    this.audio.setSkid(skidAmt * speedPct);
    this.audio.setBoost(this.boostNow ? 1 : 0);
    this.audio.setDraft(this.mode === "racing" ? this.draftFactor : 0);
  }

  private updateOpponents(dt: number) {
    const racing = this.mode === "racing" || this.mode === "finished" || this.mode === "attract";
    for (const o of this.opponents) {
      if (!racing) continue;
      const seg = this.findSegment(o.z + SEGMENT_LENGTH * 2);
      let target = o.cruise;
      // corner speed
      const bend = Math.abs(seg.curve);
      target *= 1 - Math.min(0.42, bend * 0.055);
      // rubber band relative to player
      if (this.mode === "racing") {
        const diff = o.total - this.playerTotal;
        if (diff > 32000) target *= 0.92;
        else if (diff < -26000) target *= 1.07;
      }
      // avoidance
      let threatSpeed = Infinity;
      const playerPos = (this.position + this.playerZ) % this.track.length;
      const blockers: { z: number; total: number; offset: number; speed: number }[] = [
        { z: playerPos, total: this.playerTotal, offset: this.playerX, speed: this.speed },
        ...this.opponents.filter((q) => q !== o),
      ];
      for (const b of blockers) {
        let rel = b.z - o.z;
        if (rel < -this.track.length / 2) rel += this.track.length;
        else if (rel > this.track.length / 2) rel -= this.track.length;
        if (rel > 0 && rel < 760 && Math.abs(b.offset - o.offset) < 0.42) {
          threatSpeed = Math.min(threatSpeed, b.speed);
        } else if (rel >= 760 && rel < 1400 && Math.abs(b.offset - o.offset) < 0.38) {
          // AI slipstream suction tow when chasing leading cars
          target *= 1.07;
        }
      }
      if (threatSpeed < Infinity) target = Math.min(target, threatSpeed * 0.94);
      if (o.speed < target) o.speed = Math.min(target, o.speed + BASE_ACCEL * 0.62 * dt);
      else o.speed = Math.max(target, o.speed + BRAKE_FORCE * 0.55 * dt);
      // gentle lane wander
      const want = Math.sin(this.time * 0.45 + o.wob) * 0.62 + seg.curve * -0.06;
      o.offset = lerp(o.offset, clamp(want, -0.85, 0.85), 1 - Math.exp(-dt * 1.1));
      let zSpeed = o.speed;
      if (this.mode === "countdown") zSpeed = 0;
      o.z = ((o.z + zSpeed * dt) % this.track.length + this.track.length) % this.track.length;
      o.total += zSpeed * dt;
    }
  }

  private collideSprites(playerSeg: Segment) {
    if (this.collCooldown > 0) return;

    // Continuous Armco guardrail and tire wall collision checks
    if (playerSeg.barrierLeft && this.playerX < -1.24) {
      this.playerX = -1.21;
      this.crash(1, 0.7);
      return;
    }
    if (playerSeg.barrierRight && this.playerX > 1.24) {
      this.playerX = 1.21;
      this.crash(-1, 0.7);
      return;
    }
    if (playerSeg.tireWallRight && this.playerX > 1.20) {
      this.playerX = 1.17;
      this.crash(-1, 0.85);
      return;
    }

    const N = this.track.segments.length;
    for (let k = 0; k < 3; k++) {
      const seg = this.track.segments[(playerSeg.index + k) % N];
      for (const s of seg.sprites) {
        const info = this.spriteInfo(s);
        if (!info || info.collide === 0) continue;
        // sprites are anchored at segment z; check precise z overlap for current player
        const spriteZ = seg.index * SEGMENT_LENGTH;
        let relZ = spriteZ - (this.position + this.playerZ);
        if (relZ < -this.track.length / 2) relZ += this.track.length;
        else if (relZ > this.track.length / 2) relZ -= this.track.length;
        if (relZ < -SEGMENT_LENGTH * 0.5 || relZ > SEGMENT_LENGTH * 1.2) continue;
        if (Math.abs(this.playerX - s.offset) < info.collide + PLAYER_HALF_W) {
          this.crash(this.playerX < s.offset ? -1 : 1, 1);
          return;
        }
      }
    }
  }

  private collideCars() {
    if (this.collCooldown > 0) return;
    for (const o of this.opponents) {
      let relZ = o.z - (this.position + this.playerZ);
      if (relZ < -this.track.length / 2) relZ += this.track.length;
      else if (relZ > this.track.length / 2) relZ -= this.track.length;
      if (Math.abs(relZ) < 300 && Math.abs(o.offset - this.playerX) < 0.36) {
        if (relZ > 0) {
          // rear-end the rival
          this.speed = Math.min(this.speed, o.speed * 0.55);
          o.speed *= 1.12;
        } else {
          this.speed *= 1.03;
          o.speed *= 0.8;
        }
        this.playerX += (this.playerX < o.offset ? -1 : 1) * 0.14;
        this.crash(this.playerX < o.offset ? -1 : 1, 0.7);
        return;
      }
    }
  }

  private crash(dir: number, strength: number) {
    this.collCooldown = 0.55;
    this.cleanRace = false;
    this.shake = Math.min(1.2, 0.8 * strength + 0.3);
    this.speed = Math.max(this.speed * 0.72, 1200);
    this.playerX += dir * 0.1;
    this.audio.thud(strength);
    // sparks
    const cx = this.width / 2;
    const cy = this.height * 0.82;
    for (let i = 0; i < 16; i++) {
      this.particles.push({
        x: cx + dir * this.width * 0.09 + (Math.random() - 0.5) * 30,
        y: cy + Math.random() * 20,
        vx: dir * (120 + Math.random() * 380),
        vy: -(60 + Math.random() * 260),
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
        size: 1.5 + Math.random() * 2.6,
        grow: -1.6,
        color: Math.random() < 0.5 ? "#ffd6a0" : "#ff9e3d",
        front: true,
      });
    }
  }

  private dust(dt: number) {
    const n = Math.min(3, Math.ceil(this.speed / 4200));
    if (Math.random() < dt * 34) {
      const cx = this.width / 2;
      const carW = this.playerDrawW();
      for (let i = 0; i < n; i++) {
        const side = Math.random() < 0.5 ? -1 : 1;
        this.particles.push({
          x: cx + side * carW * 0.38 + (Math.random() - 0.5) * 16,
          y: this.height * 0.94 + Math.random() * 12,
          vx: side * (26 + Math.random() * 70),
          vy: -(30 + Math.random() * 90),
          life: 0.5 + Math.random() * 0.5,
          maxLife: 1,
          size: 5 + Math.random() * 9,
          grow: 26,
          color: "216,196,150",
          front: false,
        });
      }
    }
  }

  private waterSpray(dt: number) {
    if (this.speed < 1200) return;
    const n = Math.min(3, Math.ceil(this.speed / 3400));
    if (Math.random() < dt * 40) {
      const cx = this.width / 2;
      const carW = this.playerDrawW();
      for (let i = 0; i < n; i++) {
        const side = Math.random() < 0.5 ? -1 : 1;
        this.particles.push({
          x: cx + side * carW * 0.38 + (Math.random() - 0.5) * 16,
          y: this.height * 0.95 + Math.random() * 8,
          vx: side * (32 + Math.random() * 80),
          vy: -(35 + Math.random() * 95),
          life: 0.35 + Math.random() * 0.35,
          maxLife: 0.7,
          size: 4 + Math.random() * 7,
          grow: 28,
          color: "186,220,245",
          front: false,
        });
      }
    }
  }

  private updateRain(dt: number) {
    if (this.weather !== "rain") return;
    const speedPct = this.speed / BASE_MAX_SPEED;
    const windX = (-this.steerVis * 140 - 55) * dt;
    const fallY = (800 + this.speed * 0.08) * dt;
    for (const r of this.rainParticles) {
      r.x += windX;
      r.y += fallY * (r.speed / 800);
      if (r.y > this.height) {
        r.y = -r.length;
        r.x = Math.random() * this.width;
      } else if (r.x < 0) {
        r.x = this.width;
      } else if (r.x > this.width) {
        r.x = 0;
      }
    }
    // lens splashes
    if (Math.random() < dt * (5 + speedPct * 14)) {
      this.rainSplashes.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        r: 2,
        maxR: 8 + Math.random() * 14,
        alpha: 0.55 + Math.random() * 0.35,
      });
    }
    for (let i = this.rainSplashes.length - 1; i >= 0; i--) {
      const s = this.rainSplashes[i];
      s.r += dt * 32;
      if (s.r >= s.maxR) this.rainSplashes.splice(i, 1);
    }

    // lightning
    this.lightningTimer -= dt;
    if (this.lightningTimer <= 0) {
      this.lightningTimer = 7 + Math.random() * 10;
      this.lightningFlash = 1.0;
      this.audio.thunder();
    }
    if (this.lightningFlash > 0) {
      this.lightningFlash = Math.max(0, this.lightningFlash - dt * 3.8);
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) { this.particles.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.front ? 500 : -24) * dt; // sparks fall, dust rises
      p.size = Math.max(0.4, p.size + p.grow * dt);
    }
  }

  private finishRace() {
    this.finished = true;
    this.raceTimeFrozen = this.raceElapsed;
    this.mode = "finished";
    const entries = [
      { name: "YOU", isPlayer: true, total: this.playerTotal },
      ...this.opponents.map((o) => ({ name: o.name, isPlayer: false, total: o.total })),
    ].sort((a, b) => b.total - a.total);
    const pos = entries.findIndex((e) => e.isPlayer) + 1;
    const leader = entries[0].total;
    const standings: Standing[] = entries.map((e, i) => ({
      name: e.name,
      isPlayer: e.isPlayer,
      gap: i === 0 ? "WINNER" : `+${((leader - e.total) / 9800).toFixed(2)}s`,
    }));
    this.positionNow = pos;
    this.audio.jingle(pos === 1);
    this.onFinish?.({
      position: pos,
      totalTime: this.raceTimeFrozen * 1000,
      bestLap: this.bestLap * 1000,
      laps: this.lapTimes,
      standings,
      cleanRace: this.cleanRace,
      difficulty: this.difficulty,
    });
  }

  private spriteInfo(s: SpritePlacement): SpriteInfo {
    switch (s.kind) {
      case "palm": return palmSprite(s.variant);
      case "pine": return pineSprite(s.variant);
      case "bill": return billboardSprite(s.variant, this.weather);
      case "lamp": return lampSprite(this.weather);
      case "shrub": return shrubSprite(s.variant, this.weather);
      case "rock": return rockSprite(s.variant, this.weather);
      case "brake": return brakeMarkerSprite(s.variant);
      case "chevron": return chevronSprite(s.variant === 0 ? "left" : "right", this.weather);
      case "tirewall": return tireWallSprite(this.weather);
      case "marshal": return marshalPostSprite(this.weather);
      case "gantry": return gantrySprite(this.weather);
    }
  }

  // ==================================================================
  // RENDER
  // ==================================================================

  private render() {
    const { ctx, width, height } = this;
    const N = this.track.segments.length;
    const maxSpeed = BASE_MAX_SPEED * this.car.topSpeed;
    const speedPct = clamp(this.speed / maxSpeed, 0, 1);
    const fov = FIELD_OF_VIEW + speedPct * 12 + this.fovBoost * 9;
    const cameraDepth = 1 / Math.tan(((fov / 2) * Math.PI) / 180);
    const horizon = height * 0.62;

    ctx.clearRect(0, 0, width, height);

    // shake
    ctx.save();
    const shakeMult = this.settings.cameraShake ?? 1.0;
    if (this.shake > 0.01 && shakeMult > 0) {
      ctx.translate(
        (Math.random() - 0.5) * this.shake * 14 * shakeMult,
        (Math.random() - 0.5) * this.shake * 10 * shakeMult,
      );
    }

    this.renderSky(speedPct, horizon);

    const base = this.findSegment(this.position);
    const basePct = percentRemaining(this.position, SEGMENT_LENGTH);
    const playerSeg = this.findSegment(this.position + this.playerZ);
    const playerPct = percentRemaining(this.position + this.playerZ, SEGMENT_LENGTH);
    const cameraY = CAMERA_HEIGHT + lerp(playerSeg.p1.world.y, playerSeg.p2.world.y, playerPct);

    let x = 0;
    let dxc = -(base.curve * basePct);
    let maxy = height;

    const camZBase = this.position;

    for (let n = 0; n < DRAW_DISTANCE; n++) {
      const seg = this.track.segments[(base.index + n) % N];
      seg.looped = seg.index < base.index;
      seg.fog = expFog(n / DRAW_DISTANCE, FOG_DENSITY);
      seg.clip = maxy;
      seg.visible = false;
      const camZ = camZBase - (seg.looped ? this.track.length : 0);
      this.project(seg.p1.scr, seg.p1.world, this.playerX * ROAD_WIDTH - x, cameraY, camZ, cameraDepth);
      this.project(seg.p2.scr, seg.p2.world, this.playerX * ROAD_WIDTH - x - dxc, cameraY, camZ, cameraDepth);
      x += dxc;
      dxc += seg.curve;
      if (seg.p1.scr.camZ <= cameraDepth || seg.p2.scr.y >= maxy) continue;
      seg.visible = true;
      this.renderSegment(seg);
      maxy = seg.p2.scr.y;
    }

    // far-to-near: sprites & rivals
    for (let n = DRAW_DISTANCE - 1; n >= 0; n--) {
      const seg = this.track.segments[(base.index + n) % N];
      if (!seg.visible) continue;
      for (const s of seg.sprites) this.renderSprite(seg, s);
      // rivals anchored to this segment
      for (const o of this.opponents) {
        if (Math.floor(o.z / SEGMENT_LENGTH) % N === seg.index) {
          let relZ = o.z - this.position;
          if (relZ < -this.track.length / 2) relZ += this.track.length;
          else if (relZ > this.track.length / 2) relZ -= this.track.length;
          if (relZ > 0 && relZ < DRAW_DISTANCE * SEGMENT_LENGTH) {
            this.renderRival(seg, o);
          }
        }
      }
    }

    // In attract mode, we give the camera a clean cinematic fly-through
    // so the home screen has an unobstructed, gorgeous view of the track and scenery!
    if (this.mode !== "attract") {
      const dw = this.playerDrawW();
      const braking = (this.ctlCached?.down ?? false) && this.speed > 300;
      const sprite = carSprite(this.car, braking, this.weather, this.upgrades);
      const dh = dw * (sprite.canvas.height / sprite.canvas.width);
      const bounce =
        Math.sin(this.time * 43) * speedPct * speedPct * height * 0.0035 +
        (this.offroadNow ? (Math.random() - 0.5) * 5 : 0) +
        this.suspensionTravel;
      const cx = width / 2 + this.steerVis * width * 0.012;
      const baseY = height * 0.985 + bounce + this.pitchOffset;

      // volumetric headlights on dark road
      if (this.weather !== "sunset") {
        this.renderHeadlights(horizon, cx, baseY, dw, dh);
      }

      // neon underglow & taillight trails
      if (this.settings.lightTrails) {
        this.renderUnderglow(cx, baseY, dw, dh);
        this.renderTaillightTrails();
      }

      // dust / spray behind car
      this.renderParticles(false);

      // player car
      this.renderPlayer(cx, baseY, dw, dh, sprite);

      // aerodynamic slipstream streamers
      if (this.draftFactor > 0.05) {
        this.renderAeroStreamers();
      }

      // sparks / particles in front of car
      this.renderParticles(true);
    }

    // dynamic rain & lens splashes in rain mode
    if (this.settings.rainEffects) {
      this.renderRain();
    }

    if (this.settings.speedLines && this.mode !== "attract") {
      this.renderSpeedLines(speedPct);
    }

    ctx.restore();
    this.shake = Math.max(0, this.shake - 2.4 * (1 / 60));
  }

  private project(
    scr: { camX: number; camY: number; camZ: number; scale: number; x: number; y: number; w: number },
    world: { x: number; y: number; z: number },
    cameraX: number, cameraY: number, cameraZ: number, cameraDepth: number,
  ) {
    scr.camX = world.x - cameraX;
    scr.camY = world.y - cameraY;
    scr.camZ = world.z - cameraZ;
    scr.scale = cameraDepth / scr.camZ;
    scr.x = this.width / 2 + scr.scale * scr.camX * (this.width / 2);
    scr.y = this.height / 2 - scr.scale * scr.camY * (this.height / 2);
    scr.w = scr.scale * ROAD_WIDTH * (this.width / 2);
  }

  private renderSky(speedPct: number, horizon: number) {
    const { ctx, width, height } = this;
    const palette = SCENES[this.weather];

    // sky gradient + sun/moon/city
    ctx.drawImage(this.sky, 0, 0, this.sky.width, this.sky.height, 0, 0, width, horizon + 2);

    // lightning flash in rain mode
    if (this.lightningFlash > 0.01) {
      ctx.fillStyle = `rgba(224, 245, 255, ${this.lightningFlash * 0.8})`;
      ctx.fillRect(0, 0, width, horizon + 2);
      // jagged electric bolt
      ctx.strokeStyle = `rgba(255, 255, 255, ${this.lightningFlash})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      let lx = width * 0.48;
      let ly = 10;
      ctx.moveTo(lx, ly);
      while (ly < horizon * 0.82) {
        lx += Math.sin(ly * 0.1) * 22 + (Math.random() - 0.5) * 18;
        ly += 16 + Math.random() * 22;
        ctx.lineTo(lx, ly);
      }
      ctx.stroke();
    }

    // clouds
    for (let i = 0; i < 3; i++) {
      const cw = width * (0.3 + i * 0.08);
      const ch = cw * 0.4;
      const cx = ((i * width * 0.42 - this.cloudDrift * (8 + i * 5) - this.skyOff * (2 + i)) % (width + cw)) - cw * 0.5;
      const cyy = height * (0.05 + i * 0.075);
      ctx.globalAlpha = 0.75 - i * 0.12;
      ctx.drawImage(this.clouds[i], cx, cyy, cw, ch);
    }
    ctx.globalAlpha = 1;

    // mountains
    this.tileRidge(this.farRidge, this.farOff * 0.4 + this.skyOff * 4, horizon - height * 0.02, height * 0.24);
    this.tileRidge(this.nearRidge, this.nearOff * 0.7 + this.skyOff * 8, horizon, height * 0.17);

    // base grass (covers beyond far clip)
    ctx.fillStyle = palette.grassLight;
    ctx.fillRect(0, horizon - 1, width, height - horizon + 1);

    // speed shimmer at horizon
    ctx.globalAlpha = speedPct * 0.12;
    ctx.fillStyle = this.weather === "night" ? "#a5f3fc" : "#ffe3b0";
    ctx.fillRect(0, horizon - 2, width, 3);
    ctx.globalAlpha = 1;
  }

  private tileRidge(src: HTMLCanvasElement, off: number, bottomY: number, h: number) {
    const { ctx, width } = this;
    const w = width;
    let start = -(((off % w) + w) % w);
    for (let xi = start; xi < width; xi += w) {
      ctx.drawImage(src, 0, 0, src.width, src.height, xi, bottomY - h, w, h);
    }
    start = 0;
  }

  private renderSegment(seg: Segment) {
    const { ctx, width } = this;
    const palette = SCENES[this.weather];
    const s1 = seg.p1.scr;
    const s2 = seg.p2.scr;
    const x1 = s1.x, y1 = s1.y, w1 = s1.w;
    const x2 = s2.x, y2 = s2.y, w2 = s2.w;
    if (y1 <= y2) return;

    // -------------------------------------------------------------
    // 1. LATERAL GEOMETRY & BOUNDARIES (Perspective projection)
    // -------------------------------------------------------------
    // Curb width with apex widening multiplier
    const curbM = seg.curbMult || 1.0;
    const r1 = w1 * 0.14 * curbM;
    const r2 = w2 * 0.14 * curbM;

    // Gravel runoff bed width (expanded on outside of high-speed turns)
    const gw1_l = w1 * (seg.gravelRunoff === -1 || seg.gravelRunoff === 2 ? 0.44 : 0.22);
    const gw2_l = w2 * (seg.gravelRunoff === -1 || seg.gravelRunoff === 2 ? 0.44 : 0.22);
    const gw1_r = w1 * (seg.gravelRunoff === 1 || seg.gravelRunoff === 2 ? 0.44 : 0.22);
    const gw2_r = w2 * (seg.gravelRunoff === 1 || seg.gravelRunoff === 2 ? 0.44 : 0.22);

    // Natural soil verge transition width
    const vw1 = w1 * 0.22;
    const vw2 = w2 * 0.22;

    // Left lateral positions (inside to outside)
    const lx1_edge = x1 - w1;
    const lx2_edge = x2 - w2;
    const lx1_curb = lx1_edge - r1;
    const lx2_curb = lx2_edge - r2;
    const lx1_grav = lx1_curb - gw1_l;
    const lx2_grav = lx2_curb - gw2_l;
    const lx1_verge = lx1_grav - vw1;
    const lx2_verge = lx2_grav - vw2;

    // Right lateral positions (inside to outside)
    const rx1_edge = x1 + w1;
    const rx2_edge = x2 + w2;
    const rx1_curb = rx1_edge + r1;
    const rx2_curb = rx2_edge + r2;
    const rx1_grav = rx1_curb + gw1_r;
    const rx2_grav = rx2_curb + gw2_r;
    const rx1_verge = rx1_grav + vw1;
    const rx2_verge = rx2_grav + vw2;

    // -------------------------------------------------------------
    // 2. OUTER NATURAL TERRAIN & COASTAL OCEAN
    // -------------------------------------------------------------
    // ---- Left Outer Zone ----
    if (seg.coastalSide === -1) {
      // Coastal Ocean Water
      ctx.fillStyle = seg.alt ? palette.waterLight : palette.waterDark;
      this.poly(0, y1, lx1_verge, y1, lx2_verge, y2, 0, y2);

      // Rolling ocean surf foam breaker line along shoreline
      const wavePhase = Math.sin(this.time * 2.6 + seg.index * 0.25);
      const foam1 = w1 * (0.065 + wavePhase * 0.02);
      const foam2 = w2 * (0.065 + wavePhase * 0.02);
      ctx.fillStyle = palette.waterFoam;
      this.poly(lx1_verge - foam1, y1, lx1_verge, y1, lx2_verge, y2, lx2_verge - foam2, y2);
    } else {
      // Rolling green/countryside turf
      ctx.fillStyle = seg.alt ? palette.grassLight : palette.grassDark;
      this.poly(0, y1, lx1_verge, y1, lx2_verge, y2, 0, y2);
    }

    // ---- Right Outer Zone ----
    if (seg.coastalSide === 1) {
      ctx.fillStyle = seg.alt ? palette.waterLight : palette.waterDark;
      this.poly(rx1_verge, y1, width, y1, width, y2, rx2_verge, y2);
    } else {
      ctx.fillStyle = seg.alt ? palette.grassLight : palette.grassDark;
      this.poly(rx1_verge, y1, width, y1, width, y2, rx2_verge, y2);
    }

    // -------------------------------------------------------------
    // 3. SOIL VERGE & GRAVEL RUNOFF TRAPS
    // -------------------------------------------------------------
    // Natural soil verge transition
    ctx.fillStyle = seg.alt ? palette.vergeLight : palette.vergeDark;
    this.poly(lx1_verge, y1, lx1_grav, y1, lx2_grav, y2, lx2_verge, y2);
    this.poly(rx1_grav, y1, rx1_verge, y1, rx2_verge, y2, rx2_grav, y2);

    // Gravel runoff bed
    ctx.fillStyle = seg.alt ? palette.gravelLight : palette.gravelDark;
    this.poly(lx1_grav, y1, lx1_curb, y1, lx2_curb, y2, lx2_grav, y2);
    this.poly(rx1_curb, y1, rx1_grav, y1, rx2_grav, y2, rx2_curb, y2);

    // Subtle raked gravel texture line in alternating bands
    if (seg.index % 2 === 0) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.07)";
      const lRake1 = (lx1_grav + lx1_curb) * 0.5;
      const lRake2 = (lx2_grav + lx2_curb) * 0.5;
      const rRake1 = (rx1_curb + rx1_grav) * 0.5;
      const rRake2 = (rx2_curb + rx2_grav) * 0.5;
      const rw1 = Math.max(1, w1 * 0.012);
      const rw2 = Math.max(1, w2 * 0.012);
      this.poly(lRake1 - rw1, y1, lRake1 + rw1, y1, lRake2 + rw2, y2, lRake2 - rw2, y2);
      this.poly(rRake1 - rw1, y1, rRake1 + rw1, y1, rRake2 + rw2, y2, rRake2 - rw2, y2);
    }

    // -------------------------------------------------------------
    // 4. 3D BEVELED RUMBLE CURBS (KERBS)
    // -------------------------------------------------------------
    // Outer drop shadow (depth between curb lip and gravel)
    const sh1 = Math.max(1, w1 * 0.018);
    const sh2 = Math.max(1, w2 * 0.018);
    ctx.fillStyle = palette.curbShadow;
    this.poly(lx1_curb - sh1, y1, lx1_curb, y1, lx2_curb, y2, lx2_curb - sh2, y2);
    this.poly(rx1_curb, y1, rx1_curb + sh1, y1, rx2_curb + sh2, y2, rx2_curb, y2);

    // Main rumble curb face (alternating contrasting teeth)
    ctx.fillStyle = seg.alt ? palette.rumbleLight : palette.rumbleDark;
    this.poly(lx1_curb, y1, lx1_edge, y1, lx2_edge, y2, lx2_curb, y2);
    this.poly(rx1_edge, y1, rx1_curb, y1, rx2_curb, y2, rx2_edge, y2);

    // Inner bright curb lip highlight
    const lip1 = Math.max(1, w1 * 0.014);
    const lip2 = Math.max(1, w2 * 0.014);
    ctx.fillStyle = palette.curbLip;
    this.poly(lx1_edge - lip1, y1, lx1_edge, y1, lx2_edge, y2, lx2_edge - lip2, y2);
    this.poly(rx1_edge, y1, rx1_edge + lip1, y1, rx2_edge + lip2, y2, rx2_edge, y2);

    // -------------------------------------------------------------
    // 5. MAIN ROAD SURFACE & ASPHALT
    // -------------------------------------------------------------
    ctx.fillStyle = seg.alt ? palette.roadLight : palette.roadDark;
    this.poly(lx1_edge, y1, rx1_edge, y1, rx2_edge, y2, lx2_edge, y2);

    // Wet asphalt specular reflection in rain
    if (palette.wetness > 0) {
      const wetAlpha = palette.wetness * 0.14 * (1 - seg.fog * 0.4);
      ctx.fillStyle = `rgba(186, 230, 253, ${wetAlpha})`;
      this.poly(x1 - w1 * 0.32, y1, x1 + w1 * 0.32, y1, x2 + w2 * 0.32, y2, x2 - w2 * 0.32, y2);
    }

    // Persistent rubber tire skidmarks
    if (seg.skids && seg.skids.length > 0) {
      for (const skid of seg.skids) {
        const skidAlpha = skid.alpha * (1 - seg.fog * 0.65);
        if (skidAlpha <= 0.02) continue;
        ctx.fillStyle = `rgba(16, 12, 20, ${skidAlpha})`;

        // Left tire skidmark
        const slx1 = x1 + skid.leftOffset * w1;
        const slx2 = x2 + skid.leftOffset * w2;
        const slw1 = skid.width * w1;
        const slw2 = skid.width * w2;
        this.poly(slx1 - slw1, y1, slx1 + slw1, y1, slx2 + slw2, y2, slx2 - slw2, y2);

        // Right tire skidmark
        const srx1 = x1 + skid.rightOffset * w1;
        const srx2 = x2 + skid.rightOffset * w2;
        const srw1 = skid.width * w1;
        const srw2 = skid.width * w2;
        this.poly(srx1 - srw1, y1, srx1 + srw1, y1, srx2 + srw2, y2, srx2 - srw2, y2);
      }
    }

    // Edge glow lines
    ctx.fillStyle = palette.edge;
    const e1 = w1 * 0.015, e2 = w2 * 0.015;
    this.poly(lx1_edge + e1, y1, lx1_edge + e1 * 2, y1, lx2_edge + e2 * 2, y2, lx2_edge + e2, y2);
    this.poly(rx1_edge - e1 * 2, y1, rx1_edge - e1, y1, rx2_edge - e2, y2, rx2_edge - e2 * 2, y2);

    // Lane dashes
    if (seg.index % (3 * 2) < 3) {
      ctx.fillStyle = palette.lane;
      const l1 = w1 * 0.016, l2 = w2 * 0.016;
      this.poly(x1 - l1, y1, x1 + l1, y1, x2 + l2, y2, x2 - l2, y2);
    }

    // Cat's eye reflectors along edges in dark environments
    if (this.weather !== "sunset" && seg.index % 6 === 0) {
      ctx.fillStyle = this.weather === "night" ? "rgba(0, 229, 255, 0.95)" : "rgba(255, 230, 120, 0.85)";
      ctx.fillRect(lx1_edge - 2, y1 - 2, 4, 3);
      ctx.fillRect(rx1_edge - 2, y1 - 2, 4, 3);
    }

    // Start line checkers
    if (seg.isStart) {
      const cols = 14;
      for (let ci = 0; ci < cols; ci++) {
        const t0 = (ci / cols) * 2 - 1;
        const t1 = ((ci + 1) / cols) * 2 - 1;
        ctx.fillStyle = ci % 2 ? "#181820" : "#f2eee0";
        this.poly(x1 + w1 * t0, y1, x1 + w1 * t1, y1, x2 + w2 * t1, y2, x2 + w2 * t0, y2);
      }
    }

    // -------------------------------------------------------------
    // 6. CONTINUOUS 3D ARMCO GUARDRAILS & TIRE SAFETY WALLS
    // -------------------------------------------------------------
    this.renderRoadsideBarriers(seg, x1, y1, w1, x2, y2, w2, s1.scale, s2.scale, palette);

    // -------------------------------------------------------------
    // 7. ATMOSPHERIC DISTANCE FOG DISSOLVE
    // -------------------------------------------------------------
    const a = (1 - seg.fog) * 0.92;
    if (a > 0.012) {
      ctx.globalAlpha = a;
      ctx.fillStyle = palette.fog;
      ctx.fillRect(0, y2, width, y1 - y2);
      ctx.globalAlpha = 1;
    }
  }

  private renderRoadsideBarriers(
    seg: Segment,
    x1: number, y1: number, w1: number,
    x2: number, y2: number, w2: number,
    scale1: number, scale2: number,
    palette: ScenePalette,
  ) {
    const { ctx } = this;

    // Continuous Armco Corrugated Steel Guardrails
    const sides: ("left" | "right")[] = [];
    if (seg.barrierLeft) sides.push("left");
    if (seg.barrierRight) sides.push("right");

    for (const side of sides) {
      const isLeft = side === "left";
      const dir = isLeft ? -1 : 1;
      const curbM = seg.curbMult || 1.0;
      const offset = dir * (1.24 + (curbM > 1.2 ? (curbM - 1.2) * 0.12 : 0));

      const bx1 = x1 + offset * w1;
      const bx2 = x2 + offset * w2;

      // Armco barrier height in pixels
      const bh1 = Math.max(3, 44 * scale1 * (this.height / 2));
      const bh2 = Math.max(2, 44 * scale2 * (this.height / 2));

      // Steel I-beam support posts (every 2 segments)
      if (seg.index % 2 === 0) {
        const postW1 = Math.max(2, 7 * scale1 * (this.width / 2));
        ctx.fillStyle = palette.barrierPost;
        ctx.fillRect(bx1 - postW1 / 2, y1 - bh1 * 1.15, postW1, bh1 * 1.15);
      }

      // Main galvanized corrugated steel rail plate
      ctx.fillStyle = palette.barrierPlate;
      this.poly(bx1, y1 - bh1 * 0.15, bx1, y1 - bh1 * 0.95, bx2, y2 - bh2 * 0.95, bx2, y2 - bh2 * 0.15);

      // Top metallic specular shine lip
      ctx.fillStyle = "rgba(255, 255, 255, 0.42)";
      this.poly(bx1, y1 - bh1 * 0.95, bx1, y1 - bh1 * 0.78, bx2, y2 - bh2 * 0.78, bx2, y2 - bh2 * 0.95);

      // Middle corrugated shadow groove
      ctx.fillStyle = "rgba(10, 15, 22, 0.55)";
      this.poly(bx1, y1 - bh1 * 0.62, bx1, y1 - bh1 * 0.44, bx2, y2 - bh2 * 0.44, bx2, y2 - bh2 * 0.62);

      // Retro-reflective safety delineator tabs (amber/red on right, white/cyan on left)
      if (seg.index % 4 === 0) {
        ctx.fillStyle = isLeft ? palette.barrierReflectLeft : palette.barrierReflectRight;
        const refH = Math.max(2, bh1 * 0.28);
        const refW = Math.max(2, 5 * scale1 * (this.width / 2));
        ctx.fillRect(bx1 - refW / 2, y1 - bh1 * 0.72, refW, refH);
      }
    }

    // Continuous Heavy Strapped Tire Safety Walls (Hairpin / Crash apexes)
    if (seg.tireWallLeft || seg.tireWallRight) {
      const isLeft = seg.tireWallLeft;
      const dir = isLeft ? -1 : 1;
      const twOffset = dir * 1.34;
      const tx1 = x1 + twOffset * w1;
      const tx2 = x2 + twOffset * w2;
      const th1 = Math.max(3, 46 * scale1 * (this.height / 2));
      const th2 = Math.max(2, 46 * scale2 * (this.height / 2));

      // Alternating red and white high-impact tire segments
      const isRed = Math.floor(seg.index / 2) % 2 === 0;
      ctx.fillStyle = isRed ? "#dc2626" : "#f1f5f9";
      this.poly(tx1, y1, tx1, y1 - th1, tx2, y2 - th2, tx2, y2);

      // Black rubber top rim depth
      ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
      this.poly(tx1, y1 - th1, tx1, y1 - th1 * 0.82, tx2, y2 - th2 * 0.82, tx2, y2 - th2);
    }
  }

  private poly(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.lineTo(x4, y4);
    ctx.closePath();
    ctx.fill();
  }

  private renderSprite(seg: Segment, s: SpritePlacement) {
    const info = this.spriteInfo(s);
    const scale = seg.p1.scr.scale;
    const sx = seg.p1.scr.x + scale * s.offset * ROAD_WIDTH * (this.width / 2);
    const sy = seg.p1.scr.y;
    let dw = info.worldW * ROAD_WIDTH * scale * (this.width / 2);
    if (dw < 1.5) return;
    dw = Math.min(dw, this.width * 1.15);
    const dh = dw * (info.canvas.height / info.canvas.width);
    const dx = sx - dw / 2;
    const dy = sy - dh;
    const clipY = seg.clip;

    // Atmospheric distance blending for scenery sprites
    if (seg.fog < 0.96) {
      this.ctx.globalAlpha = Math.max(0.12, seg.fog);
    }

    if (clipY && dy + dh > clipY) {
      const visH = clipY - dy;
      if (visH <= 0) {
        this.ctx.globalAlpha = 1;
        return;
      }
      const srcH = (info.canvas.height * visH) / dh;
      this.ctx.drawImage(info.canvas, 0, 0, info.canvas.width, srcH, dx, dy, dw, visH);
    } else {
      this.ctx.drawImage(info.canvas, dx, dy, dw, dh);
    }

    if (seg.fog < 0.96) {
      this.ctx.globalAlpha = 1;
    }
  }

  private renderRival(seg: Segment, o: Opponent) {
    const scale = seg.p1.scr.scale;
    const sx = seg.p1.scr.x + scale * o.offset * ROAD_WIDTH * (this.width / 2);
    const sy = seg.p1.scr.y;
    let dw = o.sprite.worldW * ROAD_WIDTH * scale * (this.width / 2);
    if (dw < 1.5) return;
    dw = Math.min(dw, this.width * 0.86);
    const dh = dw * (o.sprite.canvas.height / o.sprite.canvas.width);
    const clipY = seg.clip;

    // dynamic body roll based on road curvature and steering wander
    const rivalRoll = -seg.curve * 0.038;

    this.ctx.save();
    this.ctx.translate(sx, sy);
    if (Math.abs(rivalRoll) > 0.002) {
      this.ctx.rotate(rivalRoll);
    }

    // dynamic contact shadow under rival tires
    const shadowAlpha = 0.38 * (1 - seg.fog * 0.5);
    this.ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, dw * 0.44, dh * 0.12, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // in dark environments, draw red LED taillight halo behind rival
    if (this.weather !== "sunset") {
      const glow = this.ctx.createRadialGradient(0, -dh * 0.5, 2, 0, -dh * 0.5, dw * 0.55);
      glow.addColorStop(0, "rgba(255, 25, 45, 0.75)");
      glow.addColorStop(0.5, "rgba(255, 10, 30, 0.2)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      this.ctx.fillStyle = glow;
      this.ctx.beginPath();
      this.ctx.arc(0, -dh * 0.5, dw * 0.55, 0, Math.PI * 2);
      this.ctx.fill();
    }

    if (clipY && sy > clipY) {
      const visH = clipY - (sy - dh);
      if (visH > 0) {
        const srcH = (o.sprite.canvas.height * visH) / dh;
        this.ctx.drawImage(o.sprite.canvas, 0, 0, o.sprite.canvas.width, srcH, -dw / 2, -dh, dw, visH);
      }
    } else {
      this.ctx.drawImage(o.sprite.canvas, -dw / 2, -dh, dw, dh);
    }
    this.ctx.restore();
  }

  private playerDrawW(): number {
    const scale = this.cameraDepthBase / this.playerZ;
    return 0.335 * ROAD_WIDTH * scale * (this.width / 2);
  }

  private renderHeadlights(horizon: number, cx: number, baseY: number, dw: number, dh: number) {
    const { ctx, width } = this;
    ctx.save();
    ctx.globalCompositeOperation = "screen";

    const beamColor = this.weather === "night" ? "rgba(224, 242, 254, 0.28)" : "rgba(255, 245, 210, 0.25)";
    const beamHot = this.weather === "night" ? "rgba(224, 242, 254, 0.55)" : "rgba(255, 245, 210, 0.5)";

    // left beam shaft
    const lx0 = cx - dw * 0.32;
    const ly0 = baseY - dh * 0.2;
    const lGrad = ctx.createLinearGradient(lx0, ly0, cx - width * 0.18, horizon + 20);
    lGrad.addColorStop(0, beamHot);
    lGrad.addColorStop(0.3, beamColor);
    lGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = lGrad;
    ctx.beginPath();
    ctx.moveTo(lx0 - 8, ly0);
    ctx.lineTo(lx0 + 8, ly0);
    ctx.lineTo(cx - width * 0.05, horizon + 20);
    ctx.lineTo(cx - width * 0.35, horizon + 20);
    ctx.closePath();
    ctx.fill();

    // right beam shaft
    const rx0 = cx + dw * 0.32;
    const ry0 = baseY - dh * 0.2;
    const rGrad = ctx.createLinearGradient(rx0, ry0, cx + width * 0.18, horizon + 20);
    rGrad.addColorStop(0, beamHot);
    rGrad.addColorStop(0.3, beamColor);
    rGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = rGrad;
    ctx.beginPath();
    ctx.moveTo(rx0 - 8, ry0);
    ctx.lineTo(rx0 + 8, ry0);
    ctx.lineTo(cx + width * 0.35, horizon + 20);
    ctx.lineTo(cx + width * 0.05, horizon + 20);
    ctx.closePath();
    ctx.fill();

    // high-beam illuminated pavement oval directly in front of the car
    const roadPool = ctx.createRadialGradient(cx, baseY - dh * 0.25, 10, cx, baseY - dh * 0.25, dw * 1.6);
    roadPool.addColorStop(0, this.weather === "night" ? "rgba(224, 245, 255, 0.42)" : "rgba(255, 240, 200, 0.38)");
    roadPool.addColorStop(0.5, this.weather === "night" ? "rgba(186, 230, 253, 0.18)" : "rgba(255, 220, 160, 0.14)");
    roadPool.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = roadPool;
    ctx.beginPath();
    ctx.ellipse(cx, baseY - dh * 0.25, dw * 1.6, dh * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private renderUnderglow(cx: number, baseY: number, dw: number, dh: number) {
    const { ctx } = this;
    const color = this.car.accent || "#00e5ff";
    const intense = this.boostNow;
    const ugRadius = dw * (intense ? 1.35 : 1.05);

    ctx.save();
    const ug = ctx.createRadialGradient(cx, baseY + dh * 0.02, 10, cx, baseY + dh * 0.02, ugRadius);
    ug.addColorStop(0, color + (intense ? "cc" : "88"));
    ug.addColorStop(0.45, color + (intense ? "55" : "28"));
    ug.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = ug;
    ctx.beginPath();
    ctx.ellipse(cx, baseY + dh * 0.02, ugRadius, dh * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private renderTaillightTrails() {
    if (this.taillightHistory.length < 3) return;
    const { ctx } = this;
    const isDark = this.weather !== "sunset";
    const intense = this.boostNow || this.driftNow;
    if (!isDark && !intense) return;

    ctx.save();
    // left taillight trail
    ctx.beginPath();
    for (let i = 0; i < this.taillightHistory.length; i++) {
      const pt = this.taillightHistory[i];
      if (i === 0) ctx.moveTo(pt.leftX, pt.leftY);
      else ctx.lineTo(pt.leftX, pt.leftY);
    }
    ctx.strokeStyle = "rgba(255, 23, 68, 0.85)";
    ctx.lineWidth = intense ? 4 : 2.5;
    ctx.shadowColor = "#ff1744";
    ctx.shadowBlur = intense ? 18 : 10;
    ctx.stroke();

    // right taillight trail
    ctx.beginPath();
    for (let i = 0; i < this.taillightHistory.length; i++) {
      const pt = this.taillightHistory[i];
      if (i === 0) ctx.moveTo(pt.rightX, pt.rightY);
      else ctx.lineTo(pt.rightX, pt.rightY);
    }
    ctx.stroke();

    // if boosting, add dual electric cyan nitro exhaust ribbons
    if (this.boostNow) {
      ctx.beginPath();
      for (let i = 0; i < this.taillightHistory.length; i++) {
        const pt = this.taillightHistory[i];
        const nx = pt.leftX + (pt.rightX - pt.leftX) * 0.38;
        if (i === 0) ctx.moveTo(nx, pt.leftY + 4);
        else ctx.lineTo(nx, pt.leftY + 4);
      }
      ctx.strokeStyle = "rgba(0, 229, 255, 0.9)";
      ctx.lineWidth = 3;
      ctx.shadowColor = "#00e5ff";
      ctx.shadowBlur = 16;
      ctx.stroke();

      ctx.beginPath();
      for (let i = 0; i < this.taillightHistory.length; i++) {
        const pt = this.taillightHistory[i];
        const nx = pt.leftX + (pt.rightX - pt.leftX) * 0.62;
        if (i === 0) ctx.moveTo(nx, pt.rightY + 4);
        else ctx.lineTo(nx, pt.rightY + 4);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  private renderRain() {
    if (this.weather !== "rain") return;
    const { ctx } = this;
    const speedPct = this.speed / BASE_MAX_SPEED;
    const wind = -this.steerVis * 140 - 50;

    // rain streaks
    ctx.save();
    ctx.strokeStyle = "rgba(186, 230, 253, 0.42)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (const r of this.rainParticles) {
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x + wind * 0.04, r.y + r.length * (1 + speedPct * 0.7));
    }
    ctx.stroke();

    // lens splashes
    for (const s of this.rainSplashes) {
      const alpha = (1 - s.r / s.maxR) * s.alpha;
      ctx.strokeStyle = `rgba(224, 242, 254, ${alpha})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private renderPlayer(
    cx: number,
    baseY: number,
    dw: number,
    dh: number,
    sprite: SpriteInfo,
  ) {
    const { ctx } = this;
    // Dynamic car body roll: chassis leans with rollAngle
    const roll = this.rollAngle;
    const rollShiftX = -roll * dw * 0.28;

    // Contact shadow anchored to the road underneath the tires
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.44)";
    ctx.beginPath();
    ctx.ellipse(cx, baseY, dw * 0.46, dh * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // nitro flames
    if (this.boostNow) {
      for (const sx of [-1, 1]) {
        const fx = cx + rollShiftX + sx * dw * 0.187;
        const fy = baseY - dh * 0.104;
        const len = dw * (0.1 + Math.random() * 0.09);
        const grd = ctx.createLinearGradient(fx, fy, fx, fy + len);
        grd.addColorStop(0, "rgba(255,230,170,0.95)");
        grd.addColorStop(0.4, "rgba(255,140,50,0.8)");
        grd.addColorStop(1, "rgba(255,80,30,0)");
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.moveTo(fx - dw * 0.028, fy);
        ctx.lineTo(fx + dw * 0.028, fy);
        ctx.lineTo(fx, fy + len);
        ctx.closePath();
        ctx.fill();
      }
    }

    // record taillight history for light trails
    const brakeY = baseY - dh * 0.52;
    this.taillightHistory.push({
      leftX: cx + rollShiftX - dw * 0.33,
      leftY: brakeY,
      rightX: cx + rollShiftX + dw * 0.33,
      rightY: brakeY,
      time: this.time,
    });
    while (this.taillightHistory.length > 16) this.taillightHistory.shift();

    // Draw player car rotated around tire contact base
    ctx.save();
    ctx.translate(cx + rollShiftX, baseY);
    ctx.rotate(roll);
    ctx.drawImage(sprite.canvas, -dw / 2, -dh, dw, dh);
    ctx.restore();
  }

  private renderAeroStreamers() {
    if (this.aeroStreamers.length === 0) return;
    const { ctx, width } = this;
    ctx.save();
    ctx.lineCap = "round";
    for (const str of this.aeroStreamers) {
      const sx = width / 2 + str.x;
      const alpha = clamp(str.alpha * this.draftFactor, 0, 0.85);
      if (alpha <= 0.01) continue;

      const grad = ctx.createLinearGradient(sx, str.y - str.length, sx, str.y);
      grad.addColorStop(0, "rgba(56, 189, 248, 0)");
      grad.addColorStop(0.5, `rgba(186, 230, 253, ${alpha * 0.75})`);
      grad.addColorStop(1, `rgba(255, 255, 255, ${alpha})`);

      ctx.strokeStyle = grad;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(sx - str.side * 6, str.y - str.length);
      ctx.quadraticCurveTo(sx, str.y - str.length * 0.4, sx + str.side * 8, str.y);
      ctx.stroke();

      // soft blue vortex glow
      ctx.strokeStyle = `rgba(14, 165, 233, ${alpha * 0.35})`;
      ctx.lineWidth = 5;
      ctx.stroke();
    }
    ctx.restore();
  }

  private ctlCached: InputState | null = null;

  private renderParticles(front: boolean) {
    const { ctx } = this;
    for (const p of this.particles) {
      if (p.front !== front) continue;
      const a = clamp(p.life / p.maxLife, 0, 1);
      ctx.fillStyle = p.color.startsWith("#") ? p.color : `rgba(${p.color},${a * 0.5})`;
      ctx.globalAlpha = p.color.startsWith("#") ? a : 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  private renderSpeedLines(speedPct: number) {
    if (speedPct < 0.72) return;
    const { ctx, width, height } = this;
    const a = (speedPct - 0.72) * 0.8 + this.fovBoost * 0.15;
    ctx.strokeStyle = `rgba(255,225,190,${clamp(a, 0, 0.4)})`;
    ctx.lineWidth = 2;
    const cx = width / 2;
    const cy = height * 0.45;
    for (let i = 0; i < 12; i++) {
      const ang = Math.random() * Math.PI * 2;
      const r0 = Math.min(width, height) * (0.42 + Math.random() * 0.2);
      const len = 30 + Math.random() * 90 * speedPct;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0 * 0.7);
      ctx.lineTo(cx + Math.cos(ang) * (r0 + len), cy + Math.sin(ang) * (r0 + len) * 0.7);
      ctx.stroke();
    }
  }
}
