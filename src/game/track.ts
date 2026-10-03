// ------------------------------------------------------------------
// Track builder — Coastline Circuit: sections of straights, sweepers,
// S-curves, crests and a hairpin. Also dresses the roadside with
// sprites and bakes a minimap outline.
// ------------------------------------------------------------------

import { SEGMENT_LENGTH, RUMBLE_LENGTH } from "./constants";

export type SceneryKind =
  | "palm"
  | "pine"
  | "bill"
  | "lamp"
  | "shrub"
  | "rock"
  | "brake"
  | "chevron"
  | "tirewall"
  | "gantry"
  | "marshal";

export interface SpritePlacement {
  kind: SceneryKind;
  variant: number;
  offset: number; // road-width units, negative = left
}

export interface Vec {
  x: number;
  y: number;
  z: number;
}

export interface Projected {
  camX: number;
  camY: number;
  camZ: number;
  scale: number;
  x: number;
  y: number;
  w: number;
}

export interface Skidmark {
  leftOffset: number;
  rightOffset: number;
  width: number;
  alpha: number;
}

export interface Segment {
  index: number;
  curve: number;
  p1: { world: Vec; scr: Projected };
  p2: { world: Vec; scr: Projected };
  sprites: SpritePlacement[];
  alt: boolean; // colour band parity
  isStart: boolean;
  // Realistic roadside environment parameters:
  barrierLeft: boolean;
  barrierRight: boolean;
  tireWallLeft: boolean;
  tireWallRight: boolean;
  coastalSide: number; // -1 = left ocean, 1 = right ocean, 0 = inland
  gravelRunoff: number; // 0 = standard verge, -1 = left gravel trap, 1 = right gravel trap, 2 = both
  curbMult: number; // rumble curb width multiplier
  // per-frame render scratch
  fog: number;
  clip: number;
  looped: boolean;
  visible: boolean;
  skids?: Skidmark[];
}

function proj(): Projected {
  return { camX: 0, camY: 0, camZ: 0, scale: 0, x: 0, y: 0, w: 0 };
}

const easeIn = (a: number, b: number, t: number) => a + (b - a) * t * t;
const easeInOut = (a: number, b: number, t: number) => a + (b - a) * ((-2 * t + 3) * t * t);

function rand(seedObj: { s: number }) {
  seedObj.s = (seedObj.s * 16807) % 2147483647;
  return (seedObj.s - 1) / 2147483646;
}

export interface TrackData {
  segments: Segment[];
  length: number; // world units
  outline: { x: number; y: number }[]; // minimap, normalised 0..1
}

export function buildTrack(): TrackData {
  const segments: Segment[] = [];

  const lastY = () => (segments.length === 0 ? 0 : segments[segments.length - 1].p2.world.y);

  function addSegment(curve: number, y: number) {
    const n = segments.length;
    segments.push({
      index: n,
      curve,
      p1: { world: { x: 0, y: lastY(), z: n * SEGMENT_LENGTH }, scr: proj() },
      p2: { world: { x: 0, y, z: (n + 1) * SEGMENT_LENGTH }, scr: proj() },
      sprites: [],
      alt: Math.floor(n / RUMBLE_LENGTH) % 2 === 0,
      isStart: false,
      barrierLeft: false,
      barrierRight: false,
      tireWallLeft: false,
      tireWallRight: false,
      coastalSide: 0,
      gravelRunoff: 0,
      curbMult: 1.0,
      fog: 1,
      clip: 0,
      looped: false,
      visible: false,
    });
  }

  function addRoad(enter: number, hold: number, leave: number, curve: number, hill: number) {
    const startY = lastY();
    const endY = startY + hill * SEGMENT_LENGTH;
    const total = enter + hold + leave;
    for (let n = 0; n < enter; n++) addSegment(easeIn(0, curve, n / enter), easeInOut(startY, endY, n / total));
    for (let n = 0; n < hold; n++) addSegment(curve, easeInOut(startY, endY, (enter + n) / total));
    for (let n = 0; n < leave; n++) addSegment(easeInOut(curve, 0, n / leave), easeInOut(startY, endY, (enter + hold + n) / total));
  }

  const L = { SHORT: 25, MED: 50, LONG: 100 };
  const C = { NONE: 0, EASY: 2, MED: 4, HARD: 6 };

  // ---- Coastline Circuit layout ----
  addRoad(L.MED, L.MED, L.MED, C.NONE, 0); // start straight (0 to 150)
  addRoad(40, 40, 40, 3, 18); // gentle right climbing (150 to 270)
  addRoad(25, 25, 25, -C.EASY, -6); // S-curves (270 to 345)
  addRoad(25, 25, 25, C.EASY + 1, 8); // (345 to 420)
  addRoad(25, 25, 25, -C.EASY - 1, 0); // (420 to 495)
  addRoad(25, 25, 25, C.EASY, -10); // (495 to 570)
  addRoad(30, 60, 30, 0, 42); // big crest / bridge (570 to 690)
  addRoad(30, 30, 30, -C.HARD, -34); // plunging left (690 to 780)
  addRoad(20, 20, 20, C.EASY, 12); // rolling (780 to 840)
  addRoad(20, 20, 20, -C.EASY, 10); // (840 to 900)
  addRoad(20, 20, 20, C.EASY + 1, -26); // (900 to 960)
  addRoad(30, 30, 30, 0, -18); // dip (960 to 1050)
  addRoad(40, 60, 40, C.MED, 22); // long right uphill (1050 to 1190)
  addRoad(40, 40, 40, -C.HARD, 12); // hairpin left (1190 to 1310)
  addRoad(20, 80, 20, 1, -20); // run home (1310 to 1430)

  // settle — return elevation to start height for a seamless wrap
  const settleLen = 80;
  {
    const startY = lastY();
    for (let n = 0; n < settleLen; n++) addSegment(0, easeInOut(startY, 0, n / settleLen));
  }

  const N = segments.length;

  // start line paint
  segments[6].isStart = true;

  // ---- CIRCUIT ENVIRONMENTAL ZONING & BARRIER ASSIGNMENTS ----
  for (let i = 0; i < N; i++) {
    const seg = segments[i];
    const curveAbs = Math.abs(seg.curve);

    // 1. Coastline ocean placement (left side ocean on scenic seaside sections)
    if ((i >= 150 && i <= 690) || (i >= 1310 && i <= 1510)) {
      seg.coastalSide = -1; // Left side opens to the ocean
    }

    // 2. High Bridge / Ridge crossing (570 to 690): Dual Armco guardrails
    if (i >= 570 && i <= 690) {
      seg.barrierLeft = true;
      seg.barrierRight = true;
    }

    // 3. Coastal ocean cliff protection: left Armco guardrail
    if (seg.coastalSide === -1 && i >= 150 && i <= 570) {
      seg.barrierLeft = true;
    }

    // 4. Dynamic curve barrier & gravel trap setup based on physics
    if (curveAbs >= 1.5) {
      seg.curbMult = 1.3 + curveAbs * 0.12;
      // Centrifugal force pushes car outward:
      if (seg.curve > 0) {
        // Right turn: outside is LEFT
        seg.gravelRunoff = -1;
        seg.barrierLeft = true;
      } else {
        // Left turn: outside is RIGHT
        seg.gravelRunoff = 1;
        seg.barrierRight = true;
      }
    }

    // 5. Critical High-G Turn Safety: Tire Walls
    // Plunging Left (seg 710 to 765): outside right has tire safety wall
    if (i >= 710 && i <= 765) {
      seg.tireWallRight = true;
      seg.gravelRunoff = 1;
      seg.curbMult = 1.6;
    }
    // Hard Hairpin Left (seg 1210 to 1280): outside right has full tire barrier
    if (i >= 1210 && i <= 1280) {
      seg.tireWallRight = true;
      seg.gravelRunoff = 1;
      seg.curbMult = 1.8;
    }
  }

  // ---- ROADSIDE MOTORSPORT DRESSING & SPRITES ----
  // Start / finish gantry over line
  segments[6].sprites.push({ kind: "gantry", variant: 0, offset: 0 });

  // Marshals' observation posts
  segments[14].sprites.push({ kind: "marshal", variant: 0, offset: -1.4 });
  segments[695].sprites.push({ kind: "marshal", variant: 0, offset: -1.45 });
  segments[1200].sprites.push({ kind: "marshal", variant: 0, offset: -1.45 });

  // FIA Turn Distance Brake Boards
  // Plunging Left entry approach
  segments[665].sprites.push({ kind: "brake", variant: 150, offset: 1.32 });
  segments[675].sprites.push({ kind: "brake", variant: 100, offset: 1.32 });
  segments[685].sprites.push({ kind: "brake", variant: 50, offset: 1.32 });

  // Hairpin entry approach
  segments[1165].sprites.push({ kind: "brake", variant: 150, offset: 1.32 });
  segments[1178].sprites.push({ kind: "brake", variant: 100, offset: 1.32 });
  segments[1190].sprites.push({ kind: "brake", variant: 50, offset: 1.32 });

  // Apex Chevron Directional Indicators
  // Plunging Left apex
  for (let ci = 720; ci <= 750; ci += 8) {
    segments[ci].sprites.push({ kind: "chevron", variant: 0, offset: 1.4 });
  }
  // Hairpin Left apex
  for (let ci = 1225; ci <= 1265; ci += 8) {
    segments[ci].sprites.push({ kind: "chevron", variant: 0, offset: 1.45 });
  }

  // Deterministic roadside natural environment population
  const rng = { s: 1234567 };
  let sinceLamp = 0;
  let sinceBill = 40;

  for (let i = 24; i < N; i++) {
    const seg = segments[i];
    sinceLamp++;
    sinceBill++;

    // 1. Roadside Flowering Shrubs (populate verges with low natural flora)
    if (i % 3 === 0 && rand(rng) < 0.65) {
      const side = rand(rng) < 0.5 ? -1 : 1;
      const shOffset = side * (1.35 + rand(rng) * 0.45);
      seg.sprites.push({ kind: "shrub", variant: Math.floor(rand(rng) * 3), offset: shOffset });
    }

    // 2. Granite Boulders / Rock outcroppings near cutting banks & turns
    if (i % 7 === 0 && rand(rng) < 0.45) {
      const side = seg.curve > 0 ? 1 : seg.curve < 0 ? -1 : rand(rng) < 0.5 ? -1 : 1;
      const rockOffset = side * (1.65 + rand(rng) * 0.9);
      seg.sprites.push({ kind: "rock", variant: Math.floor(rand(rng) * 3), offset: rockOffset });
    }

    // 3. Palm & Pine Trees (multi-variant lush foliage)
    const r = rand(rng);
    if (r < 0.46) {
      const side = rand(rng) < 0.5 ? -1 : 1;
      const isPalm = seg.coastalSide === -1 ? rand(rng) < 0.82 : rand(rng) < 0.45;
      const kind: SceneryKind = isPalm ? "palm" : "pine";
      const variant = rand(rng) < 0.5 ? 0 : 1;
      const treeOffset = side * (1.8 + rand(rng) * 1.5);
      seg.sprites.push({ kind, variant, offset: treeOffset });

      if (rand(rng) < 0.35) {
        const otherSide = -side;
        const otherKind: SceneryKind = rand(rng) < 0.6 ? "palm" : "pine";
        const otherVar = rand(rng) < 0.5 ? 0 : 1;
        seg.sprites.push({ kind: otherKind, variant: otherVar, offset: otherSide * (1.9 + rand(rng) * 1.4) });
      }
    }

    // 4. Highway / Trackside Lighting Masts
    if (sinceLamp >= 14) {
      sinceLamp = 0;
      const side = seg.curve > 0.5 ? -1 : seg.curve < -0.5 ? 1 : i % 28 === 0 ? 1 : -1;
      seg.sprites.push({ kind: "lamp", variant: 0, offset: side * 1.34 });
    }

    // 5. Grand Prix Sponsor Billboards
    if (sinceBill > 95 && Math.abs(seg.curve) < 2 && rand(rng) < 0.55) {
      sinceBill = 0;
      const side = rand(rng) < 0.5 ? -1 : 1;
      seg.sprites.push({ kind: "bill", variant: Math.floor(rand(rng) * 3), offset: side * 2.1 });
    }
  }

  // Guard the start/finish straight approach clear of road obstacles
  for (let i = 0; i < 40; i++) {
    segments[i].sprites = segments[i].sprites.filter(
      (s) => Math.abs(s.offset) > 1.38 || s.kind === "lamp" || s.kind === "gantry" || s.kind === "marshal"
    );
  }

  // Festival lighting flanking the start line
  segments[3].sprites.push({ kind: "lamp", variant: 0, offset: -1.35 });
  segments[3].sprites.push({ kind: "lamp", variant: 0, offset: 1.35 });
  segments[9].sprites.push({ kind: "lamp", variant: 0, offset: -1.35 });
  segments[9].sprites.push({ kind: "lamp", variant: 0, offset: 1.35 });

  // ---- minimap outline (smooth closed circuit layout) ----
  const waypoints = [
    { t: 0.00, x: 0.22, y: 0.82 }, // start/finish straight
    { t: 0.10, x: 0.22, y: 0.35 }, // entering turn 1
    { t: 0.18, x: 0.38, y: 0.18 }, // gentle right sweeper
    { t: 0.28, x: 0.54, y: 0.28 }, // chicane 1
    { t: 0.38, x: 0.64, y: 0.18 }, // chicane 2
    { t: 0.50, x: 0.82, y: 0.24 }, // crest straight
    { t: 0.62, x: 0.86, y: 0.54 }, // plunging sweep
    { t: 0.72, x: 0.72, y: 0.68 }, // mid-infield curves
    { t: 0.80, x: 0.84, y: 0.84 }, // hairpin approach
    { t: 0.86, x: 0.78, y: 0.88 }, // hairpin apex
    { t: 0.94, x: 0.45, y: 0.82 }, // run home
    { t: 1.00, x: 0.22, y: 0.82 }, // closed loop
  ];

  function catmullRom(p0: number, p1: number, p2: number, p3: number, u: number) {
    const u2 = u * u;
    const u3 = u2 * u;
    return 0.5 * (
      (2 * p1) +
      (-p0 + p2) * u +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * u3
    );
  }

  const W = waypoints.length - 1;
  const outline: { x: number; y: number }[] = [];
  for (let i = 0; i < N; i += 4) {
    const t = i / N;
    let segIdx = 0;
    while (segIdx < W - 1 && waypoints[segIdx + 1].t < t) {
      segIdx++;
    }
    const w0 = waypoints[segIdx];
    const w1 = waypoints[segIdx + 1];
    const u = (t - w0.t) / (w1.t - w0.t || 1);

    const p0 = waypoints[(segIdx - 1 + W) % W];
    const p1 = w0;
    const p2 = w1;
    const p3 = waypoints[(segIdx + 2) % W];

    outline.push({
      x: catmullRom(p0.x, p1.x, p2.x, p3.x, u),
      y: catmullRom(p0.y, p1.y, p2.y, p3.y, u),
    });
  }

  return { segments, length: N * SEGMENT_LENGTH, outline };
}
