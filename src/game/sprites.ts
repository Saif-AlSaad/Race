// ------------------------------------------------------------------
// Procedural sprite factory — every visual in the game is generated
// at runtime on offscreen canvases (cars, palms, pines, billboards,
// lamps, sky layers, clouds). No image assets needed.
// ------------------------------------------------------------------

import type { WeatherMode, BodyStyle, WheelStyle, CarUpgrades } from "./constants";

export interface SpriteInfo {
  canvas: HTMLCanvasElement;
  worldW: number; // width in road-width units
  collide: number; // collision half-width in road-width units (0 = scenery)
}

export interface Paint {
  id?: string;
  carId?: string;
  name?: string;
  bodyStyle?: BodyStyle;
  wheelStyle?: WheelStyle;
  caliperColor?: string;
  badgeText?: string;
  base: string;
  dark: string;
  light: string;
  glassHi: string;
  glassLo: string;
  accent: string;
}

export interface CarPreviewOptions {
  braking?: boolean;
  revSparks?: boolean;
}

function make(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  return { c, g };
}

function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function vGrad(g: CanvasRenderingContext2D, y0: number, y1: number, stops: [number, string][]) {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  for (const [p, col] of stops) gr.addColorStop(p, col);
  return gr;
}

// Procedural twill carbon fiber weave texture
let carbonPattern: CanvasPattern | null = null;
function getCarbonPattern(g: CanvasRenderingContext2D): CanvasPattern | string {
  if (carbonPattern) return carbonPattern;
  const pSize = 6;
  const pc = document.createElement("canvas");
  pc.width = pSize;
  pc.height = pSize;
  const pg = pc.getContext("2d");
  if (!pg) return "#15161b";
  pg.fillStyle = "#121318";
  pg.fillRect(0, 0, pSize, pSize);
  pg.fillStyle = "#22242c";
  pg.fillRect(0, 0, pSize / 2, pSize / 2);
  pg.fillRect(pSize / 2, pSize / 2, pSize / 2, pSize / 2);
  pg.fillStyle = "rgba(255,255,255,0.08)";
  pg.fillRect(0, 0, 1, 1);
  pg.fillRect(pSize / 2, pSize / 2, 1, 1);
  carbonPattern = g.createPattern(pc, "repeat");
  return carbonPattern || "#15161b";
}

// Resolve car traits based on carId or explicit settings
function resolveCarProps(p: Paint): {
  bodyStyle: BodyStyle;
  wheelStyle: WheelStyle;
  caliperColor: string;
  badgeText: string;
} {
  const cid = (p.carId || p.id || "").toLowerCase();
  let bodyStyle: BodyStyle = p.bodyStyle || "gt";
  let wheelStyle: WheelStyle = p.wheelStyle || "forged_y";
  let caliperColor = p.caliperColor || "#ffd600";
  let badgeText = p.badgeText || "APX·S07";

  if (!p.bodyStyle || !p.wheelStyle) {
    if (cid.includes("furia")) {
      bodyStyle = "proto";
      wheelStyle = "centerlock_star";
      caliperColor = "#ef4444";
      badgeText = "CORSA·12";
    } else if (cid.includes("falcon")) {
      bodyStyle = "rally";
      wheelStyle = "bronze_dish";
      caliperColor = "#00e5ff";
      badgeText = "MK2·RLY";
    } else if (cid.includes("spectre")) {
      bodyStyle = "cyber";
      wheelStyle = "turbofan";
      caliperColor = "#a855f7";
      badgeText = "CYB·001";
    } else if (cid.includes("venom")) {
      bodyStyle = "muscle";
      wheelStyle = "muscle_deep";
      caliperColor = "#f97316";
      badgeText = "V8·BRUTE";
    }
  }
  return { bodyStyle, wheelStyle, caliperColor, badgeText };
}

// ------------------------------------------------------------------
// PHOTOREALISTIC MULTI-MODEL VEHICLE SPRITE FACTORY
// ------------------------------------------------------------------
const carCache = new Map<string, SpriteInfo>();

export function carSprite(
  p: Paint,
  braking: boolean,
  weather: WeatherMode = "sunset",
  upgrades?: CarUpgrades,
): SpriteInfo {
  const { bodyStyle, wheelStyle, caliperColor, badgeText } = resolveCarProps(p);
  const eng = upgrades?.engine || 0;
  const trans = upgrades?.trans || 0;
  const tires = upgrades?.tires || 0;
  const nitro = upgrades?.nitro || 0;
  const key = `${p.carId || p.id || bodyStyle}:${p.base}:${p.accent}:${braking ? "b" : "n"}:${weather}:${eng}:${trans}:${tires}:${nitro}`;
  const hit = carCache.get(key);
  if (hit) return hit;

  const W = 340, H = 220;
  const { c, g } = make(W, H);
  const cx = W / 2;

  // 1. Multi-level ground contact shadow (realistic road ambient occlusion)
  g.fillStyle = "rgba(4, 3, 6, 0.45)";
  g.beginPath();
  g.ellipse(cx, H - 18, 148, 18, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "rgba(2, 2, 4, 0.78)";
  g.beginPath();
  g.ellipse(cx, H - 18, 126, 12, 0, 0, Math.PI * 2);
  g.fill();

  // Tire contact patches
  for (const sx of [-1, 1]) {
    const x = cx + sx * 124;
    g.fillStyle = "rgba(0, 0, 0, 0.9)";
    g.beginPath();
    g.ellipse(x, H - 16, 22, 6, 0, 0, Math.PI * 2);
    g.fill();
  }

  // 2. Underglow (glows in night/rain or when nitro is upgraded)
  if (weather !== "sunset" || nitro > 0) {
    const ug = g.createRadialGradient(cx, H - 18, 10, cx, H - 18, 136);
    const uc = p.accent || "#00e5ff";
    ug.addColorStop(0, nitro > 1 ? `${uc}dd` : `${uc}99`);
    ug.addColorStop(0.35, `${uc}44`);
    ug.addColorStop(0.7, `${uc}15`);
    ug.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = ug;
    g.beginPath();
    g.ellipse(cx, H - 18, 140, 18, 0, 0, Math.PI * 2);
    g.fill();
  }

  // 3. Ultra-wide competition tires & 3D alloy wheels
  for (const sx of [-1, 1]) {
    const x = cx + sx * 124;
    g.save();
    g.translate(x, H - 42);

    // Dark tire outer silhouette
    g.fillStyle = "#090a0f";
    rr(g, -24, -36, 48, 56, 13);
    g.fill();

    // Tread band with vulcanized rubber linear gradient
    const tire = g.createLinearGradient(-24, 0, 24, 0);
    tire.addColorStop(0, "#050609");
    tire.addColorStop(0.2, "#1c1f26");
    tire.addColorStop(0.5, "#2d3039");
    tire.addColorStop(0.8, "#1c1f26");
    tire.addColorStop(1, "#050609");
    g.fillStyle = tire;
    rr(g, -21, -33, 42, 50, 10);
    g.fill();

    // Tire tread grooves (parallel sipes for authentic motorsport grip)
    g.strokeStyle = "rgba(0,0,0,0.55)";
    g.lineWidth = 1.6;
    for (const gx of [-12, -4, 4, 12]) {
      g.beginPath();
      g.moveTo(gx, -32);
      g.lineTo(gx, 16);
      g.stroke();
    }

    // Racing tire sidewall stencil lettering
    if (tires >= 1 || weather === "sunset") {
      g.save();
      g.fillStyle = "rgba(255, 235, 120, 0.75)";
      g.font = "bold 5px 'Chakra Petch', monospace";
      g.textAlign = "center";
      g.fillText("APEX", 0, -25);
      g.fillText("P-ZERO", 0, 14);
      g.restore();
    }

    // Inner wheel well shadow
    g.fillStyle = "#0c0d12";
    rr(g, -17, -27, 34, 40, 8);
    g.fill();

    // Carbon-ceramic brake rotor disc
    const rotor = g.createRadialGradient(0, 0, 2, 0, 0, 16);
    rotor.addColorStop(0, "#4a4e59");
    rotor.addColorStop(0.7, "#8c919d");
    rotor.addColorStop(1, "#363a43");
    g.fillStyle = rotor;
    g.beginPath();
    g.arc(0, 0, 15, 0, Math.PI * 2);
    g.fill();

    // Rotor ventilation cross-drilled slots
    g.strokeStyle = "#1e2129";
    g.lineWidth = 1.2;
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      g.beginPath();
      g.moveTo(Math.cos(a) * 6, Math.sin(a) * 6);
      g.lineTo(Math.cos(a) * 14, Math.sin(a) * 14);
      g.stroke();
    }

    // High-performance multi-piston brake caliper in caliperColor
    g.save();
    g.fillStyle = caliperColor;
    g.beginPath();
    const calAngle = sx < 0 ? Math.PI * 0.9 : -Math.PI * 0.1;
    g.arc(0, 0, 15.5, calAngle - 0.55, calAngle + 0.55);
    g.lineWidth = 4.5;
    g.strokeStyle = caliperColor;
    g.stroke();
    // Caliper branding badge
    g.fillStyle = "#ffffff";
    g.fillRect(sx < 0 ? -14 : 10, -3, 3.5, 6);
    g.restore();

    // Distinctive Wheel Rims based on wheelStyle
    g.save();
    if (wheelStyle === "centerlock_star") {
      // 5-spoke star race alloy with red centerlock nut
      g.strokeStyle = "#94a3b8";
      g.lineWidth = 2.4;
      for (let i = 0; i < 5; i++) {
        const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(Math.cos(a) * 13, Math.sin(a) * 13);
        g.stroke();
      }
      // Red anodized center nut
      g.fillStyle = "#ef4444";
      g.beginPath();
      g.arc(0, 0, 4.2, 0, Math.PI * 2);
      g.fill();
    } else if (wheelStyle === "bronze_dish") {
      // Deep dish bronze racing rim with outer polished chrome lip
      g.strokeStyle = "#b45309";
      g.lineWidth = 1.8;
      for (let i = 0; i < 10; i++) {
        const a = (i * 2 * Math.PI) / 10;
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(Math.cos(a) * 13, Math.sin(a) * 13);
        g.stroke();
      }
      g.strokeStyle = "#e2e8f0";
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(0, 0, 13.5, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = "#78350f";
      g.beginPath();
      g.arc(0, 0, 3.5, 0, Math.PI * 2);
      g.fill();
    } else if (wheelStyle === "turbofan") {
      // Carbon aero-disc turbofan
      g.fillStyle = getCarbonPattern(g);
      g.beginPath();
      g.arc(0, 0, 13.5, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = p.accent;
      g.lineWidth = 1.5;
      g.stroke();
      // Directional cooling slots
      g.strokeStyle = "rgba(255,255,255,0.4)";
      g.lineWidth = 1.2;
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        g.beginPath();
        g.moveTo(Math.cos(a) * 5, Math.sin(a) * 5);
        g.lineTo(Math.cos(a + 0.3) * 12, Math.sin(a + 0.3) * 12);
        g.stroke();
      }
    } else if (wheelStyle === "muscle_deep") {
      // Heavy 5-star muscle rim with chrome perimeter rivets
      g.strokeStyle = "#334155";
      g.lineWidth = 3.6;
      for (let i = 0; i < 5; i++) {
        const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(Math.cos(a) * 13, Math.sin(a) * 13);
        g.stroke();
      }
      g.strokeStyle = "#94a3b8";
      g.lineWidth = 1.8;
      g.beginPath();
      g.arc(0, 0, 13.5, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = "#0f172a";
      g.beginPath();
      g.arc(0, 0, 4, 0, Math.PI * 2);
      g.fill();
    } else {
      // Standard forged Y-spoke
      g.strokeStyle = "#cbd5e1";
      g.lineWidth = 1.6;
      for (let i = 0; i < 5; i++) {
        const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        const ax = Math.cos(a) * 13, ay = Math.sin(a) * 13;
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(ax - 2, ay);
        g.moveTo(0, 0);
        g.lineTo(ax + 2, ay);
        g.stroke();
      }
      g.fillStyle = "#1e293b";
      g.beginPath();
      g.arc(0, 0, 3.8, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();

    g.restore();
  }

  // 4. Photorealistic Body Hull Shading & Archetype Silhouettes
  const hullGrad = vGrad(g, 68, H - 24, [
    [0, p.light],
    [0.15, p.base],
    [0.55, p.base],
    [0.85, p.dark],
    [1, "#08090d"],
  ]);
  g.fillStyle = hullGrad;

  // Distinct body contours based on vehicle bodyStyle
  g.beginPath();
  if (bodyStyle === "proto") {
    // Ultra-low, super-wide Le Mans prototype
    g.moveTo(cx - 146, H - 32);
    g.bezierCurveTo(cx - 158, H - 60, cx - 148, 86, cx - 110, 76);
    g.quadraticCurveTo(cx, 62, cx + 110, 76);
    g.bezierCurveTo(cx + 148, 86, cx + 158, H - 60, cx + 146, H - 32);
    g.quadraticCurveTo(cx, H - 18, cx - 146, H - 32);
  } else if (bodyStyle === "rally") {
    // Boxy blister widebody arches with cutaway vents
    g.moveTo(cx - 144, H - 32);
    g.lineTo(cx - 148, H - 70);
    g.lineTo(cx - 140, 92);
    g.lineTo(cx - 114, 82);
    g.quadraticCurveTo(cx, 70, cx + 114, 82);
    g.lineTo(cx + 140, 92);
    g.lineTo(cx + 148, H - 70);
    g.lineTo(cx + 144, H - 32);
    g.quadraticCurveTo(cx, H - 18, cx - 144, H - 32);
  } else if (bodyStyle === "cyber") {
    // Stealth-faceted angular geometric lines
    g.moveTo(cx - 142, H - 32);
    g.lineTo(cx - 150, H - 60);
    g.lineTo(cx - 138, 90);
    g.lineTo(cx - 106, 78);
    g.lineTo(cx, 66);
    g.lineTo(cx + 106, 78);
    g.lineTo(cx + 138, 90);
    g.lineTo(cx + 150, H - 60);
    g.lineTo(cx + 142, H - 32);
    g.lineTo(cx, H - 20);
  } else if (bodyStyle === "muscle") {
    // Broad squared muscular rear quarter-panels
    g.moveTo(cx - 144, H - 32);
    g.lineTo(cx - 148, H - 64);
    g.bezierCurveTo(cx - 146, 92, cx - 136, 86, cx - 114, 82);
    g.quadraticCurveTo(cx, 70, cx + 114, 82);
    g.bezierCurveTo(cx + 136, 86, cx + 146, 92, cx + 148, H - 64);
    g.lineTo(cx + 144, H - 32);
    g.quadraticCurveTo(cx, H - 18, cx - 144, H - 32);
  } else {
    // Grand Tourer (Solstice)
    g.moveTo(cx - 138, H - 32);
    g.bezierCurveTo(cx - 150, H - 60, cx - 142, 94, cx - 116, 84);
    g.quadraticCurveTo(cx, 68, cx + 116, 84);
    g.bezierCurveTo(cx + 142, 94, cx + 150, H - 60, cx + 138, H - 32);
    g.quadraticCurveTo(cx, H - 18, cx - 138, H - 32);
  }
  g.closePath();
  g.fill();

  // 3D Convex Curvature Shading (center highlight & ambient fender shadow)
  const convexShading = g.createRadialGradient(cx, 110, 10, cx, 110, 150);
  convexShading.addColorStop(0, "rgba(255,255,255,0.18)");
  convexShading.addColorStop(0.5, "rgba(0,0,0,0)");
  convexShading.addColorStop(1, "rgba(0,0,0,0.5)");
  g.fillStyle = convexShading;
  g.fill();

  // Muscle car bold dual racing stripes down the body
  if (bodyStyle === "muscle") {
    g.fillStyle = p.accent;
    g.fillRect(cx - 20, 36, 14, H - 64);
    g.fillRect(cx + 6, 36, 14, H - 64);
  }

  // Fender creases & bodywork edge highlights
  g.strokeStyle = "rgba(255, 255, 255, 0.28)";
  g.lineWidth = 1.8;
  for (const sx of [-1, 1]) {
    g.beginPath();
    g.moveTo(cx + sx * 122, 94);
    g.quadraticCurveTo(cx + sx * 136, H - 74, cx + sx * 124, H - 42);
    g.stroke();
  }

  // 5. Cockpit & Rear Glasshouse (3D interior depth, rollcage & driver)
  const glassTop = bodyStyle === "proto" ? 42 : 32;
  const glassGrad = vGrad(g, glassTop, 96, [
    [0, p.glassHi],
    [0.2, p.glassLo],
    [0.75, "#08090f"],
    [1, "#030406"],
  ]);
  g.fillStyle = glassGrad;
  g.beginPath();
  g.moveTo(cx - 78, 92);
  g.quadraticCurveTo(cx - 82, 54, cx - 58, glassTop);
  g.quadraticCurveTo(cx, glassTop - 12, cx + 58, glassTop);
  g.quadraticCurveTo(cx + 82, 54, cx + 78, 92);
  g.quadraticCurveTo(cx, 82, cx - 78, 92);
  g.closePath();
  g.fill();

  // Glasshouse Interior View (Welded roll cage, driver helmet & steering wheel)
  g.save();
  g.clip();

  // Welded tubular steel roll cage in accent color
  g.strokeStyle = p.accent;
  g.lineWidth = 3.2;
  g.beginPath();
  g.moveTo(cx - 48, 86);
  g.lineTo(cx + 48, 48);
  g.moveTo(cx + 48, 86);
  g.lineTo(cx - 48, 48);
  g.stroke();
  // Roll cage crossbar
  g.lineWidth = 2.4;
  g.beginPath();
  g.moveTo(cx - 50, 66);
  g.lineTo(cx + 50, 66);
  g.stroke();

  // Driver racing helmet silhouette & seat
  g.fillStyle = "#1e222d";
  rr(g, cx - 22, 48, 44, 40, 8);
  g.fill();
  g.fillStyle = "#0c0d12";
  g.beginPath();
  g.ellipse(cx, 56, 12, 14, 0, 0, Math.PI * 2);
  g.fill();
  // Visor reflection
  g.fillStyle = "rgba(0, 229, 255, 0.7)";
  g.fillRect(cx - 7, 54, 14, 3);

  // Sports steering wheel arc
  g.strokeStyle = "#383c48";
  g.lineWidth = 2.4;
  g.beginPath();
  g.arc(cx, 76, 14, Math.PI, Math.PI * 2);
  g.stroke();
  // 12-o'clock centering stripe
  g.fillStyle = "#f59e0b";
  g.fillRect(cx - 1.5, 61, 3, 3);

  // Dashboard instrument cluster ambient glow
  const dashGlow = g.createRadialGradient(cx, 82, 2, cx, 82, 35);
  dashGlow.addColorStop(0, "rgba(56, 189, 248, 0.45)");
  dashGlow.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = dashGlow;
  g.fillRect(cx - 35, 66, 70, 26);

  // Proto engine view inside hatch: V12 carbon cover & red intake runners
  if (bodyStyle === "proto") {
    g.fillStyle = getCarbonPattern(g);
    rr(g, cx - 34, 52, 68, 38, 5);
    g.fill();
    g.strokeStyle = "#dc2626";
    g.lineWidth = 2.4;
    for (let i = -2; i <= 2; i++) {
      g.beginPath();
      g.moveTo(cx + i * 12, 54);
      g.lineTo(cx + i * 10, 84);
      g.stroke();
    }
  }

  // Muscle car horizontal rear window louvers
  if (bodyStyle === "muscle") {
    g.fillStyle = "#17181f";
    for (let y = glassTop + 8; y < 86; y += 8) {
      g.fillRect(cx - 68, y, 136, 4.5);
    }
  }

  // Exterior glass reflection line (curved sky reflection)
  g.fillStyle = weather === "sunset" ? "rgba(255, 205, 140, 0.38)" : "rgba(200, 235, 255, 0.28)";
  g.beginPath();
  g.moveTo(cx - 82, 66);
  g.quadraticCurveTo(cx, 48, cx + 82, 62);
  g.lineTo(cx + 82, 70);
  g.quadraticCurveTo(cx, 56, cx - 82, 74);
  g.closePath();
  g.fill();

  g.restore(); // end glasshouse clip

  // Glass edge chrome/rubber surround
  g.strokeStyle = "rgba(0,0,0,0.65)";
  g.lineWidth = 2.2;
  g.beginPath();
  g.moveTo(cx - 78, 92);
  g.quadraticCurveTo(cx - 82, 54, cx - 58, glassTop);
  g.quadraticCurveTo(cx, glassTop - 12, cx + 58, glassTop);
  g.quadraticCurveTo(cx + 82, 54, cx + 78, 92);
  g.quadraticCurveTo(cx, 82, cx - 78, 92);
  g.stroke();

  // Roof Trailing Vortex Generators for Rally Falcon
  if (bodyStyle === "rally") {
    g.fillStyle = "#0c0d12";
    for (let i = -3; i <= 3; i++) {
      const vx = cx + i * 16;
      g.beginPath();
      g.moveTo(vx, 32);
      g.lineTo(vx - 2.5, 40);
      g.lineTo(vx + 2.5, 40);
      g.closePath();
      g.fill();
    }
  }

  // Central Dorsal Shark Fin for Proto Furia
  if (bodyStyle === "proto") {
    g.fillStyle = getCarbonPattern(g);
    g.beginPath();
    g.moveTo(cx - 2, 20);
    g.lineTo(cx + 2, 20);
    g.lineTo(cx + 3, 76);
    g.lineTo(cx - 3, 76);
    g.closePath();
    g.fill();
    g.strokeStyle = p.accent;
    g.lineWidth = 1;
    g.stroke();
  }

  // 6. Spoilers & Aerodynamic Wings
  if (bodyStyle === "proto") {
    // Massive Le Mans Swan-Neck Carbon Wing
    const wingY = 18;
    // Wing mounts
    g.fillStyle = "#0c0d12";
    rr(g, cx - 44, wingY, 8, 48, 2);
    g.fill();
    rr(g, cx + 36, wingY, 8, 48, 2);
    g.fill();
    // Carbon wing blade
    g.fillStyle = getCarbonPattern(g);
    rr(g, cx - 132, wingY, 264, 14, 5);
    g.fill();
    g.fillStyle = p.base;
    rr(g, cx - 132, wingY, 264, 3, 1.5);
    g.fill();
    // Vertical aerodynamic endplate fins
    g.fillStyle = p.accent;
    rr(g, cx - 136, wingY - 8, 8, 46, 3);
    g.fill();
    rr(g, cx + 128, wingY - 8, 8, 46, 3);
    g.fill();
  } else if (bodyStyle === "rally") {
    // High-mount Rally GT Wing with Gurney Flap
    const wingY = 22;
    g.fillStyle = "#334155";
    rr(g, cx - 62, wingY, 7, 44, 2);
    g.fill();
    rr(g, cx + 55, wingY, 7, 44, 2);
    g.fill();
    // Main dual-tier wing
    g.fillStyle = getCarbonPattern(g);
    rr(g, cx - 112, wingY, 224, 15, 4);
    g.fill();
    // Gurney flap lip
    g.fillStyle = "#dc2626";
    rr(g, cx - 112, wingY, 224, 3.5, 1);
    g.fill();
    // Wing endplates
    g.fillStyle = "#0f172a";
    rr(g, cx - 116, wingY - 4, 8, 32, 3);
    g.fill();
    rr(g, cx + 108, wingY - 4, 8, 32, 3);
    g.fill();
  } else if (bodyStyle === "cyber") {
    // Dual Split Active Motorized Winglets
    g.fillStyle = getCarbonPattern(g);
    rr(g, cx - 116, 26, 88, 12, 3);
    g.fill();
    rr(g, cx + 28, 26, 88, 12, 3);
    g.fill();
    g.strokeStyle = p.accent;
    g.lineWidth = 1.6;
    g.stroke();
    // Motor mounts
    g.fillStyle = "#090a0f";
    rr(g, cx - 82, 36, 6, 24, 2);
    g.fill();
    rr(g, cx + 76, 36, 6, 24, 2);
    g.fill();
  } else if (bodyStyle === "muscle") {
    // Wide Ducktail Spoiler with Smoked Acrylic Wickerbill
    const duckY = 64;
    g.fillStyle = "#0a0b0f";
    rr(g, cx - 120, duckY, 240, 16, 4);
    g.fill();
    // Acrylic transparent wickerbill with hex bolts
    g.fillStyle = "rgba(15, 23, 42, 0.7)";
    rr(g, cx - 116, duckY - 6, 232, 9, 2);
    g.fill();
    g.fillStyle = "#e2e8f0";
    for (let i = -4; i <= 4; i++) {
      g.fillRect(cx + i * 26, duckY - 4, 2, 2);
    }
  } else {
    // GT Wing (Solstice)
    const wingY = 24;
    g.fillStyle = "#111318";
    rr(g, cx - 84, wingY, 8, 38, 2);
    g.fill();
    rr(g, cx + 76, wingY, 8, 38, 2);
    g.fill();
    g.fillStyle = getCarbonPattern(g);
    rr(g, cx - 104, wingY, 208, 13, 5);
    g.fill();
    g.fillStyle = p.base;
    rr(g, cx - 104, wingY, 208, 3.5, 2);
    g.fill();
    // Wing endplates
    g.fillStyle = "#0a0b0e";
    rr(g, cx - 108, wingY - 3, 6, 24, 2);
    g.fill();
    rr(g, cx + 102, wingY - 3, 6, 24, 2);
    g.fill();
  }

  // 7. Dark Rear Tail Fascia
  g.fillStyle = "rgba(10, 11, 16, 0.92)";
  rr(g, cx - 124, 98, 248, 32, 9);
  g.fill();

  // 8. Photorealistic Distinct Taillights & Optical Assemblies
  const lampCore = braking ? "#ffffff" : "#ff5a4a";
  const lampGlow = braking ? "rgba(255, 30, 45, 0.95)" : "rgba(220, 20, 30, 0.85)";

  if (bodyStyle === "proto") {
    // Sharp Y-Blade / Dual Chevron LED clusters
    for (const sx of [-1, 1]) {
      const x0 = sx < 0 ? cx - 116 : cx + 46;
      g.save();
      g.fillStyle = lampGlow;
      g.beginPath();
      g.moveTo(x0, 102);
      g.lineTo(x0 + 70, 102);
      g.lineTo(x0 + 56, 116);
      g.lineTo(x0 + 16, 116);
      g.closePath();
      g.fill();
      // Internal LED diode array
      g.fillStyle = lampCore;
      for (let d = 0; d < 5; d++) {
        g.fillRect(x0 + 6 + d * 11, 104, 6, 3.5);
      }
      g.restore();
    }
  } else if (bodyStyle === "rally") {
    // Dual Round Halo LED Taillights (two on each side, afterburner style)
    for (const sx of [-1, 1]) {
      const baseX = sx < 0 ? cx - 100 : cx + 56;
      for (let h = 0; h < 2; h++) {
        const hx = baseX + h * 42;
        // Deep chrome reflector housing
        g.fillStyle = "#1e2028";
        g.beginPath();
        g.arc(hx, 113, 14, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = "#475569";
        g.lineWidth = 1.5;
        g.stroke();
        // Glowing red halo ring
        g.strokeStyle = lampGlow;
        g.lineWidth = 3.6;
        g.beginPath();
        g.arc(hx, 113, 10.5, 0, Math.PI * 2);
        g.stroke();
        // Inner diode core
        g.fillStyle = lampCore;
        g.beginPath();
        g.arc(hx, 113, 4.5, 0, Math.PI * 2);
        g.fill();
      }
    }
  } else if (bodyStyle === "cyber") {
    // Segmented Matrix LED Digital Blade
    const numCells = 18;
    const startX = cx - 112;
    const cellW = 224 / numCells;
    for (let cIdx = 0; cIdx < numCells; cIdx++) {
      const cellX = startX + cIdx * cellW;
      const isCorner = cIdx < 2 || cIdx > numCells - 3;
      g.fillStyle = isCorner && !braking ? "rgba(0, 229, 255, 0.85)" : lampGlow;
      rr(g, cellX + 1.5, 106, cellW - 3, 12, 2);
      g.fill();
      g.fillStyle = lampCore;
      rr(g, cellX + 3, 108, cellW - 6, 3, 1);
      g.fill();
    }
  } else if (bodyStyle === "muscle") {
    // Tri-Bar Vertical Sequential 3D LED Pillars
    for (const sx of [-1, 1]) {
      const barBaseX = sx < 0 ? cx - 108 : cx + 44;
      for (let b = 0; b < 3; b++) {
        const bx = barBaseX + b * 22;
        g.fillStyle = "#111219";
        rr(g, bx, 102, 16, 24, 3);
        g.fill();
        g.fillStyle = lampGlow;
        rr(g, bx + 2, 104, 12, 20, 2);
        g.fill();
        g.fillStyle = lampCore;
        rr(g, bx + 5, 106, 6, 16, 1.5);
        g.fill();
      }
    }
  } else {
    // Continuous Horizon LED Ribbon (Solstice)
    for (const sx of [-1, 1]) {
      const x0 = sx < 0 ? cx - 116 : cx + 24;
      const tl = g.createLinearGradient(x0, 0, x0 + 92, 0);
      tl.addColorStop(0, "#5b1010");
      tl.addColorStop(0.5, lampGlow);
      tl.addColorStop(1, "#5b1010");
      g.fillStyle = tl;
      rr(g, x0, 105, 92, 14, 5);
      g.fill();
      // Internal optic line
      g.fillStyle = lampCore;
      rr(g, x0 + 8, 107, 76, 3.5, 1.5);
      g.fill();
    }
    // Center connector strip
    g.fillStyle = lampGlow;
    rr(g, cx - 24, 107, 48, 10, 4);
    g.fill();
  }

  // High-Mount 3rd Brake Light Strip (CHMSL)
  const thirdBrakeY = bodyStyle === "proto" ? 28 : 34;
  g.fillStyle = braking ? "#ffffff" : "rgba(220, 20, 30, 0.8)";
  rr(g, cx - 28, thirdBrakeY, 56, 5, 2.5);
  g.fill();

  // Dynamic High-Intensity Braking Bloom
  if (braking) {
    g.save();
    g.shadowColor = "#ff1744";
    g.shadowBlur = 38;
    g.fillStyle = "rgba(255, 60, 60, 0.95)";
    rr(g, cx - 120, 102, 240, 18, 8);
    g.fill();
    g.shadowBlur = 24;
    rr(g, cx - 36, thirdBrakeY - 1, 72, 7, 3.5);
    g.fill();
    g.restore();
  }

  // 9. Embossed Stamped Motorsport License Plate
  const plateY = 138;
  // Outer frame
  g.fillStyle = "#0c0d12";
  rr(g, cx - 32, plateY, 64, 20, 4);
  g.fill();
  g.strokeStyle = "rgba(255,255,255,0.2)";
  g.lineWidth = 1;
  g.stroke();
  // Plate face
  g.fillStyle = weather === "sunset" ? "#faf6e8" : "#f1f5f9";
  rr(g, cx - 30, plateY + 2, 60, 16, 2.5);
  g.fill();
  // Plate registration text
  g.fillStyle = "#0f172a";
  g.font = "bold 9px 'Chakra Petch', monospace";
  g.textAlign = "center";
  g.fillText(badgeText, cx, plateY + 13);
  // Micro LED license plate illumination lamps
  g.fillStyle = "#ffffff";
  g.fillRect(cx - 18, plateY - 1.5, 4, 2);
  g.fillRect(cx + 14, plateY - 1.5, 4, 2);

  // 10. Carbon Fiber Rear Diffuser & Aerodynamic Strakes
  g.fillStyle = getCarbonPattern(g);
  g.beginPath();
  g.moveTo(cx - 96, H - 32);
  g.lineTo(cx + 96, H - 32);
  g.lineTo(cx + 86, H - 14);
  g.lineTo(cx - 86, H - 14);
  g.closePath();
  g.fill();

  // Vertical aerodynamic diffuser fins (more fins if transmission is upgraded)
  const numFins = 3 + trans;
  g.strokeStyle = "#383f4f";
  g.lineWidth = 2.4;
  for (let i = -numFins; i <= numFins; i++) {
    const fx0 = cx + (i * 76) / numFins;
    const fx1 = cx + (i * 68) / numFins;
    g.beginPath();
    g.moveTo(fx0, H - 30);
    g.lineTo(fx1, H - 15);
    g.stroke();
  }

  // Center F1/FIA Rain Safety Strobe Beacon
  g.fillStyle = weather === "rain" || braking ? "#ef4444" : "#ffb703";
  rr(g, cx - 7, H - 24, 14, 8, 2);
  g.fill();
  g.fillStyle = "#ffffff";
  g.fillRect(cx - 3, H - 22, 6, 4);

  // 11. Realistic Exhaust Systems
  if (bodyStyle === "proto") {
    // High-mount central quad rocket cluster (4 titanium barrels grouped in the center)
    const exY = 125;
    for (const [ox, oy] of [[-7, -5], [7, -5], [-7, 5], [7, 5]]) {
      const exX = cx + ox;
      const exGrad = g.createRadialGradient(exX, exY + oy, 1, exX, exY + oy, 7);
      exGrad.addColorStop(0, eng >= 2 ? "#38bdf8" : "#f1f5f9");
      exGrad.addColorStop(0.5, "#64748b");
      exGrad.addColorStop(1, "#090a0f");
      g.fillStyle = exGrad;
      g.beginPath();
      g.arc(exX, exY + oy, 6.5, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = eng >= 2 ? "rgba(255, 60, 20, 0.95)" : "#020204";
      g.beginPath();
      g.arc(exX, exY + oy, 3.8, 0, Math.PI * 2);
      g.fill();
    }
  } else if (bodyStyle === "rally") {
    // Giant angled single/twin cannon blast pipe with burnt blue titanium lip
    const exX = cx + 64;
    const exY = H - 24;
    const exGrad = g.createRadialGradient(exX, exY, 2, exX, exY, 13);
    exGrad.addColorStop(0, "#38bdf8"); // blued titanium
    exGrad.addColorStop(0.4, "#a855f7"); // purple heat-treat
    exGrad.addColorStop(0.7, "#eab308"); // gold heat
    exGrad.addColorStop(1, "#0f172a");
    g.fillStyle = exGrad;
    g.beginPath();
    g.arc(exX, exY, 12, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = eng >= 2 ? "rgba(255, 100, 30, 0.9)" : "#020306";
    g.beginPath();
    g.arc(exX, exY, 7.5, 0, Math.PI * 2);
    g.fill();
  } else if (bodyStyle === "cyber") {
    // Sculpted flush hexagonal vector vents with cyan energy aura
    for (const sx of [-1, 1]) {
      const exX = cx + sx * 68;
      const exY = H - 23;
      g.fillStyle = "#0a0b10";
      rr(g, exX - 12, exY - 7, 24, 14, 3);
      g.fill();
      g.strokeStyle = "#38bdf8";
      g.lineWidth = 1.8;
      rr(g, exX - 10, exY - 5, 20, 10, 2);
      g.stroke();
      g.fillStyle = "rgba(0, 229, 255, 0.75)";
      rr(g, exX - 6, exY - 2.5, 12, 5, 1.5);
      g.fill();
    }
  } else if (bodyStyle === "muscle") {
    // Quad aggressive rectangular black-chrome exhaust tips
    for (const sx of [-1, 1]) {
      const baseX = cx + sx * 64;
      const exY = H - 23;
      for (const ox of [-8, 8]) {
        g.fillStyle = "#1e293b";
        rr(g, baseX + ox - 6, exY - 6, 12, 12, 2.5);
        g.fill();
        g.fillStyle = "#020617";
        rr(g, baseX + ox - 4, exY - 4, 8, 8, 1.5);
        g.fill();
      }
    }
  } else {
    // Dual twin-oval exhausts with titanium burnt finish (Solstice)
    for (const sx of [-1, 1]) {
      const baseX = cx + sx * 64;
      const exY = H - 23;
      for (const ox of [-6, 6]) {
        const exX = baseX + ox;
        const exGrad = g.createRadialGradient(exX, exY, 1, exX, exY, 9);
        exGrad.addColorStop(0, eng >= 1 ? "#38bdf8" : "#f1f5f9");
        exGrad.addColorStop(0.5, "#64748b");
        exGrad.addColorStop(1, "#0a0c12");
        g.fillStyle = exGrad;
        g.beginPath();
        g.arc(exX, exY, 7.5, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = eng >= 2 ? "rgba(255, 80, 20, 0.85)" : "#040508";
        g.beginPath();
        g.arc(exX, exY, 4.5, 0, Math.PI * 2);
        g.fill();
      }
    }
  }

  // 12. Upper Body Horizon Sheen
  const sheen = g.createLinearGradient(0, 70, 0, 105);
  sheen.addColorStop(0, "rgba(255,255,255,0.25)");
  sheen.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = sheen;
  g.beginPath();
  g.moveTo(cx - 110, 84);
  g.quadraticCurveTo(cx, 70, cx + 110, 84);
  g.lineTo(cx + 104, 96);
  g.quadraticCurveTo(cx, 84, cx - 104, 96);
  g.closePath();
  g.fill();

  const info: SpriteInfo = { canvas: c, worldW: 0.335, collide: 0.17 };
  carCache.set(key, info);
  return info;
}

// ------------------------------------------------------------------
// SHOWROOM PREVIEW — HIGH FIDELITY TURNTABLE SHOWCASE
// ------------------------------------------------------------------
export function carPreview(
  p: Paint,
  weather: WeatherMode = "sunset",
  upgrades?: CarUpgrades,
  options?: CarPreviewOptions,
): string {
  const W = 480, H = 240;
  const { c, g } = make(W, H);
  const cx = W / 2;
  const isNight = weather === "night";
  const isRain = weather === "rain";

  // Studio background radial gradient
  const bg = g.createRadialGradient(cx, 110, 10, cx, 120, 280);
  if (isNight) {
    bg.addColorStop(0, "#16132d");
    bg.addColorStop(0.5, "#0d0a1d");
    bg.addColorStop(1, "#030208");
  } else if (isRain) {
    bg.addColorStop(0, "#101d32");
    bg.addColorStop(0.5, "#091322");
    bg.addColorStop(1, "#03070f");
  } else {
    bg.addColorStop(0, "#2c1c27");
    bg.addColorStop(0.5, "#1a0f1b");
    bg.addColorStop(1, "#0a050d");
  }
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);

  const accent = p.accent || "#ff9e3d";

  // Ambient neon wall glow
  const wallGlow = g.createRadialGradient(cx, 130, 20, cx, 130, 260);
  wallGlow.addColorStop(0, isNight ? `${accent}40` : isRain ? "rgba(56, 189, 248, 0.32)" : "rgba(255, 158, 61, 0.26)");
  wallGlow.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = wallGlow;
  g.fillRect(0, 0, W, H);

  // Showroom turntable platform
  const stageY = 190;
  g.save();
  // Outer platform rim with neon lighting
  g.strokeStyle = isNight ? `${accent}99` : isRain ? "rgba(56, 189, 248, 0.75)" : "rgba(255, 195, 110, 0.65)";
  g.lineWidth = 2.4;
  g.shadowColor = accent;
  g.shadowBlur = 16;
  g.beginPath();
  g.ellipse(cx, stageY, 205, 34, 0, 0, Math.PI * 2);
  g.stroke();

  // Inner glossy turntable ring
  g.lineWidth = 1.2;
  g.shadowBlur = 8;
  g.beginPath();
  g.ellipse(cx, stageY, 168, 28, 0, 0, Math.PI * 2);
  g.stroke();
  g.restore();

  // Contact ground shadow under wheels
  g.fillStyle = "rgba(0, 0, 0, 0.85)";
  g.beginPath();
  g.ellipse(cx, stageY - 2, 132, 18, 0, 0, Math.PI * 2);
  g.fill();

  // Neon underglow cast onto turntable
  if (isNight || isRain || (upgrades && upgrades.nitro > 0)) {
    const ug = g.createRadialGradient(cx, stageY, 10, cx, stageY, 140);
    ug.addColorStop(0, `${accent}dd`);
    ug.addColorStop(0.5, `${accent}44`);
    ug.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = ug;
    g.beginPath();
    g.ellipse(cx, stageY, 145, 24, 0, 0, Math.PI * 2);
    g.fill();
  }

  // Draw the high-fidelity car sprite
  const braking = options?.braking ?? false;
  const spr = carSprite(p, braking, weather, upgrades).canvas;
  const carW = 270;
  const carH = (carW * spr.height) / spr.width;
  const carX = cx - carW / 2;
  const carY = stageY - carH + 16;

  // Mirror reflection on the glossy turntable
  g.save();
  g.globalAlpha = isRain ? 0.35 : isNight ? 0.28 : 0.2;
  g.translate(0, stageY * 2 - 2);
  g.scale(1, -1);
  g.drawImage(spr, carX, carY, carW, carH);
  g.restore();

  // Render the car
  g.drawImage(spr, carX, carY, carW, carH);

  // Optional rev exhaust sparks / flames
  if (options?.revSparks) {
    g.save();
    for (const sx of [-1, 1]) {
      const fx = cx + sx * 52;
      const fy = stageY - 20;
      const flameGrad = g.createLinearGradient(fx, fy, fx + sx * 15, fy + 25);
      flameGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
      flameGrad.addColorStop(0.3, "rgba(255, 180, 50, 0.9)");
      flameGrad.addColorStop(0.7, "rgba(255, 50, 20, 0.8)");
      flameGrad.addColorStop(1, "rgba(255, 20, 10, 0)");
      g.fillStyle = flameGrad;
      g.beginPath();
      g.moveTo(fx - 6, fy);
      g.lineTo(fx + 6, fy);
      g.lineTo(fx + sx * 18, fy + 24);
      g.closePath();
      g.fill();
    }
    g.restore();
  }

  return c.toDataURL();
}

// ------------------------------------------------------------------
// PALM TREE
// ------------------------------------------------------------------
let palmCache: SpriteInfo | null = null;
export function palmSprite(): SpriteInfo {
  if (palmCache) return palmCache;
  const W = 260, H = 300;
  const { c, g } = make(W, H);
  const topX = 148, topY = 74;

  // trunk
  g.strokeStyle = "#4a3421";
  g.lineCap = "round";
  g.lineWidth = 17;
  g.beginPath();
  g.moveTo(112, H - 6);
  g.quadraticCurveTo(112, 180, topX, topY);
  g.stroke();
  g.strokeStyle = "#6b4c2c";
  g.lineWidth = 9;
  g.beginPath();
  g.moveTo(112, H - 6);
  g.quadraticCurveTo(113, 180, topX, topY);
  g.stroke();
  // trunk rings
  g.strokeStyle = "rgba(30,20,12,0.55)";
  g.lineWidth = 3;
  for (let i = 0; i < 7; i++) {
    const t = i / 7;
    const x = 112 + (topX - 112) * t * t;
    const y = H - 10 - (H - 10 - topY) * t;
    g.beginPath();
    g.moveTo(x - 9, y);
    g.lineTo(x + 9, y - 3);
    g.stroke();
  }

  // fronds
  const fronds = 8;
  for (let i = 0; i < fronds; i++) {
    const a = (-178 + (i / (fronds - 1)) * 176) * (Math.PI / 180);
    const len = 78 + Math.sin(i * 2.3) * 16;
    const ex = topX + Math.cos(a) * len;
    const ey = topY + Math.sin(a) * len * 0.62 + 26;
    const mx = topX + Math.cos(a) * len * 0.55;
    const my = topY + Math.sin(a) * len * 0.3 - 12;
    const grad = g.createLinearGradient(topX, topY, ex, ey);
    grad.addColorStop(0, "#3c5c2a");
    grad.addColorStop(0.7, "#2a441f");
    grad.addColorStop(1, "#1c3016");
    g.strokeStyle = grad;
    g.lineWidth = 11;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(topX, topY);
    g.quadraticCurveTo(mx, my, ex, ey);
    g.stroke();
    // backlit edge
    g.strokeStyle = "rgba(255,196,110,0.5)";
    g.lineWidth = 2.4;
    g.beginPath();
    g.moveTo(topX, topY - 4);
    g.quadraticCurveTo(mx, my - 5, ex, ey - 4);
    g.stroke();
  }
  // coconuts
  g.fillStyle = "#5c4126";
  g.beginPath(); g.arc(topX - 7, topY + 8, 6, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(topX + 6, topY + 10, 5, 0, Math.PI * 2); g.fill();

  palmCache = { canvas: c, worldW: 1.85, collide: 0.14 };
  return palmCache;
}

// ------------------------------------------------------------------
// PINE
// ------------------------------------------------------------------
let pineCache: SpriteInfo | null = null;
export function pineSprite(): SpriteInfo {
  if (pineCache) return pineCache;
  const W = 220, H = 300;
  const { c, g } = make(W, H);
  const cx = W / 2;
  g.fillStyle = "#4a3421";
  rr(g, cx - 8, H - 46, 16, 44, 4);
  g.fill();
  const layers = 4;
  for (let i = 0; i < layers; i++) {
    const t = i / layers;
    const y0 = 26 + t * 190;
    const w = 46 + t * 78;
    const h = 74;
    const gr = g.createLinearGradient(cx - w, y0, cx + w, y0 + h);
    gr.addColorStop(0, "#1d3320");
    gr.addColorStop(0.75, "#2f4c28");
    gr.addColorStop(1, "#43682f");
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(cx, y0);
    g.lineTo(cx - w, y0 + h);
    g.quadraticCurveTo(cx, y0 + h - 14, cx + w, y0 + h);
    g.closePath();
    g.fill();
    // sunset rim on right edge
    g.strokeStyle = "rgba(255,186,100,0.55)";
    g.lineWidth = 2.2;
    g.beginPath();
    g.moveTo(cx, y0 + 2);
    g.lineTo(cx + w - 4, y0 + h - 2);
    g.stroke();
  }
  pineCache = { canvas: c, worldW: 1.5, collide: 0.18 };
  return pineCache;
}

// ------------------------------------------------------------------
// BILLBOARD
// ------------------------------------------------------------------
const billCache = new Map<string, SpriteInfo>();
export function billboardSprite(variant: number, weather: WeatherMode = "sunset"): SpriteInfo {
  const key = `${variant}:${weather}`;
  const hit = billCache.get(key);
  if (hit) return hit;
  const W = 340, H = 220;
  const { c, g } = make(W, H);
  const isNight = weather !== "sunset";

  // posts
  g.fillStyle = "#1e2028";
  rr(g, 70, 148, 16, 72, 4); g.fill();
  rr(g, W - 86, 148, 16, 72, 4); g.fill();
  g.fillStyle = "#2c2f38";
  rr(g, 72, 148, 5, 72, 2); g.fill();
  rr(g, W - 84, 148, 5, 72, 2); g.fill();

  // frame
  g.fillStyle = isNight ? "#242533" : "#e8e2d2";
  rr(g, 8, 6, W - 16, 150, 8); g.fill();

  // neon glow frame border in dark modes
  if (isNight) {
    g.strokeStyle = variant % 2 === 0 ? "rgba(255, 0, 127, 0.85)" : "rgba(0, 229, 255, 0.85)";
    g.lineWidth = 3;
    rr(g, 9, 7, W - 18, 148, 7);
    g.stroke();
  }

  g.save();
  rr(g, 16, 14, W - 32, 134, 5);
  g.clip();

  if (isNight) {
    // ---- CYBERPUNK NEON BILLBOARDS ----
    if (variant % 3 === 0) {
      // Neon Synthwave Sunset Grid
      const bg = vGrad(g, 14, 148, [[0, "#080614"], [0.65, "#180d28"], [1, "#280b2c"]]);
      g.fillStyle = bg;
      g.fillRect(16, 14, W - 32, 134);
      // neon sun
      const sun = g.createRadialGradient(W / 2, 75, 4, W / 2, 75, 52);
      sun.addColorStop(0, "#fff5ea");
      sun.addColorStop(0.3, "#ff007f");
      sun.addColorStop(0.7, "#7928ca");
      sun.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = sun;
      g.beginPath(); g.arc(W / 2, 75, 52, 0, Math.PI * 2); g.fill();
      // perspective grid lines
      g.strokeStyle = "rgba(0, 229, 255, 0.65)";
      g.lineWidth = 1.6;
      for (let i = 0; i < 5; i++) {
        g.beginPath(); g.moveTo(16, 92 + i * 11); g.lineTo(W - 16, 92 + i * 11); g.stroke();
      }
      for (let i = -4; i <= 4; i++) {
        g.beginPath(); g.moveTo(W / 2 + i * 8, 92); g.lineTo(W / 2 + i * 36, 148); g.stroke();
      }
      // neon header
      g.save();
      g.shadowColor = "#ff007f";
      g.shadowBlur = 18;
      g.fillStyle = "#ffffff";
      g.font = "italic 900 36px 'Chakra Petch', Arial";
      g.textAlign = "center";
      g.fillText("NEO TOKYO", W / 2, 58);
      g.restore();
    } else if (variant % 3 === 1) {
      // Electric Hyper-Nitro
      const bg = vGrad(g, 14, 148, [[0, "#030c14"], [1, "#061822"]]);
      g.fillStyle = bg;
      g.fillRect(16, 14, W - 32, 134);
      // glowing lightning bolt
      g.save();
      g.shadowColor = "#00e5ff";
      g.shadowBlur = 24;
      g.strokeStyle = "#ffffff";
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(W / 2 + 10, 20); g.lineTo(W / 2 - 16, 74); g.lineTo(W / 2 + 4, 76); g.lineTo(W / 2 - 14, 138);
      g.stroke();
      g.restore();
      // neon text
      g.save();
      g.shadowColor = "#00e5ff";
      g.shadowBlur = 16;
      g.fillStyle = "#8fe8ff";
      g.font = "italic 900 36px 'Chakra Petch', Arial";
      g.textAlign = "center";
      g.fillText("HYPER NITRO", W / 2, 68);
      g.shadowColor = "#ffea00";
      g.fillStyle = "#ffea00";
      g.font = "700 15px 'Chakra Petch', Arial";
      g.fillText("OVERDRIVE // 100% BOOST", W / 2, 126);
      g.restore();
    } else {
      // Cyber Grand Prix
      g.fillStyle = "#07070f";
      g.fillRect(16, 14, W - 32, 134);
      // neon matrix grid
      g.strokeStyle = "rgba(255, 0, 128, 0.25)";
      g.lineWidth = 1;
      for (let x = 20; x < W - 20; x += 18) {
        g.beginPath(); g.moveTo(x, 14); g.lineTo(x, 148); g.stroke();
      }
      g.save();
      g.shadowColor = "#ff9e3d";
      g.shadowBlur = 22;
      g.fillStyle = "#ffffff";
      g.font = "italic 900 48px 'Chakra Petch', Arial";
      g.textAlign = "center";
      g.fillText("APEX GP", W / 2, 85);
      g.shadowColor = "#00e5ff";
      g.fillStyle = "#00e5ff";
      g.font = "700 14px 'Chakra Petch', Arial";
      g.fillText("高速道路 // MIDNIGHT CIRCUIT", W / 2, 124);
      g.restore();
    }
  } else {
    // ---- GOLDEN HOUR BILLBOARDS ----
    if (variant % 3 === 0) {
      const bg = vGrad(g, 14, 148, [[0, "#ff8a3c"], [0.6, "#e8542e"], [1, "#8c1f3c"]]);
      g.fillStyle = bg;
      g.fillRect(16, 14, W - 32, 134);
      const sun = g.createRadialGradient(W / 2, 92, 6, W / 2, 92, 60);
      sun.addColorStop(0, "#ffe9b0");
      sun.addColorStop(0.45, "#ffc36e");
      sun.addColorStop(1, "rgba(255,150,80,0)");
      g.fillStyle = sun;
      g.fillRect(16, 14, W - 32, 134);
      g.strokeStyle = "rgba(60,10,20,0.7)";
      g.lineWidth = 5;
      for (let i = 0; i < 4; i++) {
        g.beginPath(); g.moveTo(16, 100 + i * 12); g.lineTo(W - 16, 100 + i * 12); g.stroke();
      }
      g.fillStyle = "#fff6e8";
      g.font = "italic 900 44px 'Chakra Petch', Arial";
      g.textAlign = "center";
      g.fillText("SOLSTICE", W / 2, 66);
    } else if (variant % 3 === 1) {
      const bg = vGrad(g, 14, 148, [[0, "#0e2a34"], [1, "#071218"]]);
      g.fillStyle = bg;
      g.fillRect(16, 14, W - 32, 134);
      g.strokeStyle = "rgba(255,214,94,0.9)";
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(W / 2 + 8, 22); g.lineTo(W / 2 - 18, 78); g.lineTo(W / 2 + 2, 80); g.lineTo(W / 2 - 14, 136);
      g.stroke();
      g.fillStyle = "#ffd65e";
      g.font = "italic 900 40px 'Chakra Petch', Arial";
      g.textAlign = "center";
      g.fillText("VOLT NITRO", W / 2, 70);
      g.fillStyle = "rgba(143,232,255,0.85)";
      g.font = "700 17px 'Chakra Petch', Arial";
      g.fillText("OFFICIAL FUEL // APX SERIES", W / 2, 128);
    } else {
      g.fillStyle = "#101014";
      g.fillRect(16, 14, W - 32, 134);
      for (let r = 0; r < 3; r++)
        for (let col = 0; col < 16; col++) {
          g.fillStyle = (r + col) % 2 ? "#f2eee2" : "#141418";
          g.fillRect(16 + col * ((W - 32) / 16), 14 + r * 16, (W - 32) / 16, 16);
        }
      g.fillStyle = "#ff9e3d";
      g.font = "italic 900 52px 'Chakra Petch', Arial";
      g.textAlign = "center";
      g.fillText("APEX GP", W / 2, 118);
    }
  }
  g.restore();

  // top lamps
  g.fillStyle = isNight ? "#00e5ff" : "#191a20";
  rr(g, 60, 0, 34, 12, 3); g.fill();
  rr(g, W - 94, 0, 34, 12, 3); g.fill();

  const info: SpriteInfo = { canvas: c, worldW: 1.65, collide: 0.5 };
  billCache.set(key, info);
  return info;
}

// ------------------------------------------------------------------
// FESTIVAL LAMP
// ------------------------------------------------------------------
const lampCaches = new Map<string, SpriteInfo>();
export function lampSprite(weather: WeatherMode = "sunset"): SpriteInfo {
  const hit = lampCaches.get(weather);
  if (hit) return hit;
  const W = 110, H = 300;
  const { c, g } = make(W, H);
  const isNight = weather !== "sunset";

  g.strokeStyle = isNight ? "#111218" : "#1d1e26";
  g.lineWidth = 8;
  g.lineCap = "round";
  const flip = Math.random() < 0.5;
  const px = flip ? W - 26 : 26;
  const ax = flip ? 14 : W - 14;
  g.beginPath();
  g.moveTo(px, H - 4);
  g.lineTo(px, 60);
  g.quadraticCurveTo(px, 30, ax, 34);
  g.stroke();
  g.strokeStyle = isNight ? "#252733" : "#3a3c46";
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(px, H - 6);
  g.lineTo(px, 60);
  g.stroke();

  if (isNight) {
    // intense glowing neon bulb with projected light cone
    const glow = g.createRadialGradient(ax, 38, 2, ax, 38, 54);
    glow.addColorStop(0, "#ffffff");
    glow.addColorStop(0.25, weather === "night" ? "rgba(0, 229, 255, 0.95)" : "rgba(255, 200, 100, 0.95)");
    glow.addColorStop(0.65, weather === "night" ? "rgba(0, 180, 255, 0.35)" : "rgba(255, 140, 50, 0.35)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = glow;
    g.beginPath(); g.arc(ax, 38, 54, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#ffffff";
    g.beginPath(); g.arc(ax, 38, 7, 0, Math.PI * 2); g.fill();

    // soft downward cone of light
    const cone = g.createLinearGradient(ax, 40, ax + (flip ? -30 : 30), H);
    cone.addColorStop(0, weather === "night" ? "rgba(0, 229, 255, 0.35)" : "rgba(255, 200, 100, 0.3)");
    cone.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = cone;
    g.beginPath();
    g.moveTo(ax - 6, 42);
    g.lineTo(flip ? 0 : W, H);
    g.lineTo(flip ? W * 0.45 : W * 0.55, H);
    g.lineTo(ax + 6, 42);
    g.closePath();
    g.fill();
  } else {
    const glow = g.createRadialGradient(ax, 40, 2, ax, 40, 34);
    glow.addColorStop(0, "rgba(255,220,150,0.95)");
    glow.addColorStop(0.4, "rgba(255,180,90,0.35)");
    glow.addColorStop(1, "rgba(255,180,90,0)");
    g.fillStyle = glow;
    g.beginPath(); g.arc(ax, 40, 34, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#ffe9c0";
    g.beginPath(); g.arc(ax, 38, 6, 0, Math.PI * 2); g.fill();
  }

  const info: SpriteInfo = { canvas: c, worldW: 0.42, collide: 0.09 };
  lampCaches.set(weather, info);
  return info;
}

// ------------------------------------------------------------------
// SCENERY LAYERS — sky, periodic mountain ridges, clouds
// ------------------------------------------------------------------
export function skyLayer(w: number, h: number, weather: WeatherMode = "sunset"): HTMLCanvasElement {
  const { c, g } = make(w, h);

  if (weather === "night") {
    // ---- NEON MIDNIGHT SKY ----
    const bg = vGrad(g, 0, h, [
      [0, "#02030a"],
      [0.35, "#06091e"],
      [0.68, "#110d32"],
      [0.9, "#1e1546"],
      [1, "#2d1b54"],
    ]);
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);

    // 140 stars (white, cyan, golden twinkle)
    for (let i = 0; i < 140; i++) {
      const y = Math.random() * h * 0.55;
      const isCyan = i % 5 === 0;
      const isGold = i % 7 === 0;
      g.fillStyle = isCyan ? "#a5f3fc" : isGold ? "#fef08a" : "#ffffff";
      g.globalAlpha = 0.3 + Math.random() * 0.7 * (1 - y / (h * 0.65));
      const s = Math.random() < 0.2 ? 2.2 : 1.2;
      g.fillRect(Math.random() * w, y, s, s);
    }
    g.globalAlpha = 1;

    // glowing full moon
    const mx = w * 0.75, my = h * 0.36;
    const moonHalo = g.createRadialGradient(mx, my, 8, mx, my, h * 0.38);
    moonHalo.addColorStop(0, "rgba(224, 242, 254, 0.95)");
    moonHalo.addColorStop(0.2, "rgba(186, 230, 253, 0.45)");
    moonHalo.addColorStop(0.55, "rgba(147, 197, 253, 0.12)");
    moonHalo.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = moonHalo;
    g.beginPath(); g.arc(mx, my, h * 0.38, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#f0f9ff";
    g.beginPath(); g.arc(mx, my, h * 0.065, 0, Math.PI * 2); g.fill();

    // futuristic cyberpunk skyline silhouette
    const horizon = h * 0.92;
    g.fillStyle = "#070612";
    let bx = 0;
    while (bx < w) {
      const bw = 24 + Math.random() * 45;
      const bh = 28 + Math.random() * 85;
      const by = horizon - bh;
      g.fillRect(bx, by, bw, bh);

      // antenna with glowing red beacon
      if (Math.random() < 0.4) {
        g.strokeStyle = "#1b192e";
        g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(bx + bw / 2, by); g.lineTo(bx + bw / 2, by - 16); g.stroke();
        g.fillStyle = "#ff1744";
        g.fillRect(bx + bw / 2 - 1, by - 17, 2, 2);
      }

      // illuminated windows
      const rows = Math.floor(bh / 8);
      const cols = Math.floor(bw / 6);
      for (let r = 1; r < rows - 1; r++) {
        for (let col = 1; col < cols - 1; col++) {
          if (Math.random() < 0.38) {
            const pick = Math.random();
            g.fillStyle = pick < 0.5 ? "rgba(0, 229, 255, 0.85)" : pick < 0.8 ? "rgba(255, 230, 100, 0.9)" : "rgba(255, 0, 127, 0.85)";
            g.fillRect(bx + col * 6, by + r * 8, 3, 4);
          }
        }
      }
      bx += bw + 3 + Math.random() * 6;
    }
  } else if (weather === "rain") {
    // ---- CYBER STORM SKY ----
    const bg = vGrad(g, 0, h, [
      [0, "#04060d"],
      [0.35, "#09101f"],
      [0.68, "#101b2f"],
      [0.9, "#18263e"],
      [1, "#21324e"],
    ]);
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);

    // overcast misty horizon diffusion
    const horizon = h * 0.94;
    const haze = g.createLinearGradient(0, horizon - h * 0.3, 0, horizon);
    haze.addColorStop(0, "rgba(56, 189, 248, 0)");
    haze.addColorStop(1, "rgba(56, 189, 248, 0.18)");
    g.fillStyle = haze;
    g.fillRect(0, horizon - h * 0.3, w, h * 0.3);

    // subtle distant city silhouettes
    g.fillStyle = "#080c16";
    let bx = 0;
    while (bx < w) {
      const bw = 26 + Math.random() * 40;
      const bh = 20 + Math.random() * 60;
      g.fillRect(bx, horizon - bh, bw, bh);
      bx += bw + 4;
    }
  } else {
    // ---- GOLDEN HOUR SUNSET SKY ----
    const bg = vGrad(g, 0, h, [
      [0, "#191c42"],
      [0.42, "#4b3a6e"],
      [0.68, "#a05a58"],
      [0.85, "#e8793d"],
      [1, "#f6c789"],
    ]);
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    // stars
    g.fillStyle = "rgba(255,255,255,0.7)";
    for (let i = 0; i < 60; i++) {
      const y = Math.random() * h * 0.3;
      g.globalAlpha = 0.2 + Math.random() * 0.6 * (1 - y / (h * 0.35));
      g.fillRect(Math.random() * w, y, 1.4, 1.4);
    }
    g.globalAlpha = 1;
    // sun
    const sx = w * 0.68, sy = h * 0.8;
    const glow = g.createRadialGradient(sx, sy, 4, sx, sy, h * 0.55);
    glow.addColorStop(0, "rgba(255,236,190,0.95)");
    glow.addColorStop(0.18, "rgba(255,196,110,0.55)");
    glow.addColorStop(1, "rgba(255,160,80,0)");
    g.fillStyle = glow;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#ffedc4";
    g.beginPath(); g.arc(sx, sy, h * 0.085, 0, Math.PI * 2); g.fill();
  }

  return c;
}

// tileable mountain ridge (sum of sines with common period)
export function ridgeLayer(
  w: number,
  h: number,
  seed: number,
  color: string,
  alpha: number,
  weather: WeatherMode = "sunset",
): HTMLCanvasElement {
  const { c, g } = make(w, h);
  const comps = [
    { f: 1, a: 0.34 }, { f: 2, a: 0.22 }, { f: 3, a: 0.13 },
    { f: 5, a: 0.07 }, { f: 8, a: 0.05 },
  ].map((cp, i) => ({ ...cp, ph: Math.sin(seed * 37.7 + i * 91.3) * Math.PI * 2 }));
  const ridge = (x: number) => {
    let v = 0;
    for (const cp of comps) v += Math.sin(cp.f * ((x / w) * Math.PI * 2) + cp.ph) * cp.a;
    return h * 0.62 + v * h * 0.5;
  };
  g.globalAlpha = alpha;
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(0, h);
  for (let x = 0; x <= w; x += 4) g.lineTo(x, ridge(x));
  g.lineTo(w, h);
  g.closePath();
  g.fill();

  // haze combing the ridge tops
  g.globalAlpha = alpha * 0.55;
  const hazeColor =
    weather === "night"
      ? "rgba(147, 51, 234, 0.4)"
      : weather === "rain"
        ? "rgba(56, 189, 248, 0.35)"
        : "rgba(246, 199, 137, 0.6)";
  const hz = vGrad(g, h * 0.1, h, [[0, "rgba(0,0,0,0)"], [1, hazeColor]]);
  g.fillStyle = hz;
  g.fillRect(0, 0, w, h);
  g.globalAlpha = 1;
  return c;
}

export function cloudSprite(weather: WeatherMode = "sunset"): HTMLCanvasElement {
  const { c, g } = make(320, 130);
  const isNight = weather === "night";
  const isRain = weather === "rain";

  for (let i = 0; i < 26; i++) {
    const x = 40 + Math.random() * 240;
    const y = 45 + Math.random() * 40 - (Math.abs(x - 160) / 240) * 22;
    const r = 18 + Math.random() * 30;
    const gr = g.createRadialGradient(x, y, 2, x, y, r);
    if (isNight) {
      gr.addColorStop(0, "rgba(90, 60, 130, 0.28)");
      gr.addColorStop(1, "rgba(40, 20, 70, 0)");
    } else if (isRain) {
      gr.addColorStop(0, "rgba(35, 50, 75, 0.42)");
      gr.addColorStop(1, "rgba(15, 25, 40, 0)");
    } else {
      gr.addColorStop(0, "rgba(255,214,178,0.34)");
      gr.addColorStop(1, "rgba(255,190,150,0)");
    }
    g.fillStyle = gr;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  return c;
}
