// ------------------------------------------------------------------
// APEX HORIZON engine — pseudo-3D road renderer (segment projection),
// player physics (grip, drift, nitro, offroad), AI rivals, collisions,
// particles, laps, standings, golden-hour scenery.
// ------------------------------------------------------------------

import {
  SEGMENT_LENGTH, ROAD_WIDTH, CAMERA_HEIGHT, DRAW_DISTANCE, FIELD_OF_VIEW,
  FOG_DENSITY, CENTRIFUGAL, TOTAL_LAPS, PLAYER_HALF_W, MPH_SCALE,
  BASE_MAX_SPEED, BASE_ACCEL, BRAKE_FORCE, COAST_DECEL, OFFROAD_DECEL,
  OFFROAD_LIMIT, BOOST_TOP_MULT, BOOST_ACCEL_MULT, RIVALS, SCENE, CARS,
  type CarDef,
} from "./constants";
import { buildTrack, type TrackData, type Segment, type SpritePlacement } from "./track";
import {
  carSprite, palmSprite, pineSprite, billboardSprite, lampSprite,
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
}

export interface HudState {
  mode: GameMode;
  mph: number;
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

  // pre-rendered scenery
  private sky: HTMLCanvasElement;
  private farRidge: HTMLCanvasElement;
  private nearRidge: HTMLCanvasElement;
  private clouds: HTMLCanvasElement[];

  private readonly cameraDepthBase = 1 / Math.tan(((FIELD_OF_VIEW / 2) * Math.PI) / 180);
  private readonly playerZ = CAMERA_HEIGHT * (1 / Math.tan(((FIELD_OF_VIEW / 2) * Math.PI) / 180));
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, audio: AudioEngine) {
    this.canvas = canvas;
    this.audio = audio;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    this.ctx = ctx;
    this.track = buildTrack();
    this.sky = skyLayer(1200, 620);
    this.farRidge = ridgeLayer(1024, 300, 11, "#4b3560", 0.85);
    this.nearRidge = ridgeLayer(1024, 260, 29, "#33243f", 0.95);
    this.clouds = [cloudSprite(), cloudSprite(), cloudSprite()];
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

  setCar(def: CarDef) {
    this.car = def;
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
    const maxSpeed = BASE_MAX_SPEED * this.car.topSpeed;
    const gearTop = maxSpeed / 6;
    const gear = clamp(1 + Math.floor(this.speed / gearTop), 1, 6);
    const rpm = clamp((this.speed % gearTop) / gearTop, 0, 1);
    return {
      mode: this.mode,
      mph: Math.round(this.speed * MPH_SCALE),
      gear,
      rpm,
      boost: this.boostMeter,
      boosting: this.boostNow,
      drifting: this.driftNow,
      offroad: this.offroadNow,
      lap: Math.min(this.lap, TOTAL_LAPS),
      totalLaps: TOTAL_LAPS,
      lapProgress: (this.playerTotal % this.track.length) / this.track.length,
      position: this.positionNow,
      racers: this.opponents.length + 1,
      raceTime: (this.finished ? this.raceTimeFrozen : this.raceElapsed) * 1000,
      lapTime: Math.max(0, (this.finished ? this.raceTimeFrozen : this.raceElapsed) - this.lapStart) * 1000,
      lastLap: this.lastLap * 1000,
      bestLap: this.bestLap * 1000,
      gapAhead: this.gapAhead(),
      finished: this.finished,
    };
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.resizeHandler);
    this.audio.setEngine(0, false, false);
    this.audio.setSkid(0);
    this.audio.setBoost(0);
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
    this.particles = [];
    this.spawnGrid(false);
  }

  private spawnGrid(attract: boolean) {
    this.opponents = RIVALS.map((r, i) => ({
      name: r.name,
      paint: { base: r.base, dark: r.dark, light: r.light, glassHi: "#9fc3d9", glassLo: "#141d2a", accent: r.accent },
      z: attract ? 3000 + i * 2600 : 620 + i * 430 + (i % 2) * 160,
      total: attract ? 3000 + i * 2600 : 620 + i * 430 + (i % 2) * 160,
      offset: (i % 2 === 0 ? 0.55 : -0.55) + (Math.random() - 0.5) * 0.2,
      speed: 0,
      cruise: BASE_MAX_SPEED * (0.9 + Math.random() * 0.055),
      wob: Math.random() * 100,
      sprite: carSprite(
        { base: r.base, dark: r.dark, light: r.light, glassHi: "#9fc3d9", glassLo: "#141d2a", accent: r.accent },
        false,
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
    this.ctlCached = c;
    const maxSpeed = BASE_MAX_SPEED * this.car.topSpeed * (this.mode === "attract" ? 0.96 : 1);
    const speedPct = clamp(this.speed / maxSpeed, 0, 1);
    const playerSeg = this.findSegment(this.position + this.playerZ);

    // ---- steering ----
    const dx = dt * 2.3 * speedPct * (0.7 + this.car.grip * 0.42);
    let steer = 0;
    if (c.left) { this.playerX -= dx; steer = -1; }
    if (c.right) { this.playerX += dx; steer = 1; }
    this.playerX -= dx * speedPct * playerSeg.curve * CENTRIFUGAL;
    this.steerVis = lerp(this.steerVis, steer, 1 - Math.exp(-dt * 9));

    // ---- drift ----
    this.driftNow = c.drift && Math.abs(steer) > 0 && speedPct > 0.42;

    // ---- throttle / brake ----
    this.boostNow = c.boost && this.boostMeter > 1 && this.speed > 2400;
    const topNow = maxSpeed * (this.boostNow ? BOOST_TOP_MULT : 1);
    if (c.up) this.speed += BASE_ACCEL * this.car.accel * (this.boostNow ? BOOST_ACCEL_MULT : 1) * dt;
    else if (c.down) this.speed += BRAKE_FORCE * dt;
    else this.speed += COAST_DECEL * dt;
    if (this.driftNow) this.speed -= maxSpeed * 0.11 * dt;

    // ---- offroad ----
    this.offroadNow = Math.abs(this.playerX) > 1.04;
    if (this.offroadNow && this.speed > OFFROAD_LIMIT * (0.8 + this.car.grip * 0.25)) {
      this.speed += OFFROAD_DECEL * dt;
      this.dust(dt);
      this.shake = Math.max(this.shake, 0.3);
    }

    // ---- boost meter ----
    if (this.boostNow) this.boostMeter = Math.max(0, this.boostMeter - 30 * dt);
    else this.boostMeter = Math.min(100, this.boostMeter + (this.driftNow ? 26 : this.offroadNow ? 1.5 : 7) * dt);
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
        if (this.playerTotal >= TOTAL_LAPS * this.track.length) this.finishRace();
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

    // ---- audio ----
    const rpm = clamp(this.speed / maxSpeed, 0, 1);
    const skidAmt =
      this.mode === "racing" || this.mode === "attract" || this.mode === "finished"
        ? clamp((this.driftNow ? 0.9 : 0) + (this.offroadNow && this.speed > 2200 ? 0.8 : 0), 0, 1)
        : 0;
    this.audio.setEngine(rpm * (this.boostNow ? 1.12 : 1), c.up && this.speed < maxSpeed, true);
    this.audio.setSkid(skidAmt * speedPct);
    this.audio.setBoost(this.boostNow ? 1 : 0);
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
    });
  }

  private spriteInfo(s: SpritePlacement): SpriteInfo {
    switch (s.kind) {
      case "palm": return palmSprite();
      case "pine": return pineSprite();
      case "bill": return billboardSprite(s.variant);
      case "lamp": return lampSprite();
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

    ctx.clearRect(0, 0, width, height);

    // shake
    ctx.save();
    if (this.shake > 0.01) {
      ctx.translate((Math.random() - 0.5) * this.shake * 14, (Math.random() - 0.5) * this.shake * 10);
    }

    this.renderSky(speedPct);

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

    // dust behind car
    this.renderParticles(false);
    this.renderPlayer(speedPct);
    this.renderParticles(true);
    this.renderSpeedLines(speedPct);

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

  private renderSky(speedPct: number) {
    const { ctx, width, height } = this;
    const horizon = height * 0.62;
    // sky gradient + sun
    ctx.drawImage(this.sky, 0, 0, this.sky.width, this.sky.height, 0, 0, width, horizon + 2);
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
    ctx.fillStyle = SCENE.grassLight;
    ctx.fillRect(0, horizon - 1, width, height - horizon + 1);
    // speed shimmer at horizon
    ctx.globalAlpha = speedPct * 0.12;
    ctx.fillStyle = "#ffe3b0";
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
    const s1 = seg.p1.scr;
    const s2 = seg.p2.scr;
    const x1 = s1.x, y1 = s1.y, w1 = s1.w;
    const x2 = s2.x, y2 = s2.y, w2 = s2.w;
    if (y1 <= y2) return;

    // grass strip
    ctx.fillStyle = seg.alt ? SCENE.grassLight : SCENE.grassDark;
    ctx.fillRect(0, y2, width, y1 - y2);

    const r1 = w1 * 0.13;
    const r2 = w2 * 0.13;
    // rumble strips
    ctx.fillStyle = seg.alt ? SCENE.rumbleLight : SCENE.rumbleDark;
    this.poly(x1 - w1 - r1, y1, x1 - w1, y1, x2 - w2, y2, x2 - w2 - r2, y2);
    this.poly(x1 + w1 + r1, y1, x1 + w1, y1, x2 + w2, y2, x2 + w2 + r2, y2);
    // road
    ctx.fillStyle = seg.alt ? SCENE.roadLight : SCENE.roadDark;
    this.poly(x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2);
    // edge glow lines
    ctx.fillStyle = SCENE.edge;
    const e1 = w1 * 0.014, e2 = w2 * 0.014;
    this.poly(x1 - w1 + e1, y1, x1 - w1 + e1 * 2, y1, x2 - w2 + e2 * 2, y2, x2 - w2 + e2, y2);
    this.poly(x1 + w1 - e1 * 2, y1, x1 + w1 - e1, y1, x2 + w2 - e2, y2, x2 + w2 - e2 * 2, y2);

    // lane dashes
    if (seg.index % (3 * 2) < 3) {
      ctx.fillStyle = SCENE.lane;
      const l1 = w1 * 0.016, l2 = w2 * 0.016;
      this.poly(x1 - l1, y1, x1 + l1, y1, x2 + l2, y2, x2 - l2, y2);
    }

    // start line checkers
    if (seg.isStart) {
      const cols = 14;
      for (let ci = 0; ci < cols; ci++) {
        const t0 = (ci / cols) * 2 - 1;
        const t1 = ((ci + 1) / cols) * 2 - 1;
        ctx.fillStyle = ci % 2 ? "#181820" : "#f2eee0";
        this.poly(x1 + w1 * t0, y1, x1 + w1 * t1, y1, x2 + w2 * t1, y2, x2 + w2 * t0, y2);
      }
    }

    // fog
    const a = (1 - seg.fog) * 0.92;
    if (a > 0.012) {
      ctx.globalAlpha = a;
      ctx.fillStyle = SCENE.fog;
      ctx.fillRect(0, y2, width, y1 - y2);
      ctx.globalAlpha = 1;
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
    if (clipY && dy + dh > clipY) {
      const visH = clipY - dy;
      if (visH <= 0) return;
      const srcH = (info.canvas.height * visH) / dh;
      this.ctx.drawImage(info.canvas, 0, 0, info.canvas.width, srcH, dx, dy, dw, visH);
    } else {
      this.ctx.drawImage(info.canvas, dx, dy, dw, dh);
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
    const dx = sx - dw / 2;
    const dy = sy - dh;
    const clipY = seg.clip;
    if (clipY && dy + dh > clipY) {
      const visH = clipY - dy;
      if (visH <= 0) return;
      const srcH = (o.sprite.canvas.height * visH) / dh;
      this.ctx.drawImage(o.sprite.canvas, 0, 0, o.sprite.canvas.width, srcH, dx, dy, dw, visH);
    } else {
      this.ctx.drawImage(o.sprite.canvas, dx, dy, dw, dh);
    }
  }

  private playerDrawW(): number {
    const scale = this.cameraDepthBase / this.playerZ;
    return 0.335 * ROAD_WIDTH * scale * (this.width / 2);
  }

  private renderPlayer(speedPct: number) {
    const { ctx, width, height } = this;
    const braking = (this.ctlCached?.down ?? false) && this.speed > 300;
    const sprite = carSprite(this.car, braking);
    const dw = this.playerDrawW();
    const dh = dw * (sprite.canvas.height / sprite.canvas.width);
    const bounce =
      Math.sin(this.time * 43) * speedPct * speedPct * height * 0.0035 +
      (this.offroadNow ? (Math.random() - 0.5) * 5 : 0);
    const cx = width / 2 + this.steerVis * width * 0.012;
    const baseY = height * 0.985 + bounce;
    const tilt = this.steerVis * 0.05 + (this.driftNow ? this.steerVis * 0.08 : 0);

    // nitro flames
    if (this.boostNow) {
      for (const sx of [-1, 1]) {
        const fx = cx + sx * dw * 0.187;
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

    ctx.save();
    ctx.translate(cx, baseY - dh / 2);
    ctx.rotate(tilt);
    ctx.drawImage(sprite.canvas, -dw / 2, -dh / 2, dw, dh);
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
