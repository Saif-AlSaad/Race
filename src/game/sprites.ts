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
// PROCEDURAL CAR ANIMATIONS & DYNAMIC 3D VEHICLE LAYERS
// ------------------------------------------------------------------

/** Renders steered front wheels underneath the front splitter / arches */
export function renderSteeredFrontWheels(
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  dw: number,
  dh: number,
  steerAngle: number, // in radians: -0.6 to +0.6
  wheelStyle: WheelStyle,
  caliperColor: string,
  isDrifting: boolean,
) {
  if (Math.abs(steerAngle) < 0.03 && !isDrifting) return;

  const scale = dw / 340;
  const wheelW = 32 * scale;
  const wheelH = 46 * scale;
  const frontY = baseY - dh * 0.14;

  ctx.save();

  // Draw front splitter aerodynamic shadow
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.beginPath();
  ctx.ellipse(cx, frontY + wheelH * 0.42, dw * 0.42, dh * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();

  // Left and Right front wheels
  for (const sx of [-1, 1]) {
    const wx = cx + sx * (116 * scale);
    ctx.save();
    ctx.translate(wx, frontY);

    // Negative camber + steering yaw rotation
    const steerEff = steerAngle * 0.85;
    ctx.rotate(steerEff);
    // Camber lean
    ctx.transform(1, 0, -steerEff * 0.18, 1, 0, 0);

    // 1. Tire outer tread profile
    ctx.fillStyle = "#07080c";
    rr(ctx, -wheelW / 2, -wheelH / 2, wheelW, wheelH, 6 * scale);
    ctx.fill();

    // Tread rubber gradient
    const trGrad = ctx.createLinearGradient(-wheelW / 2, 0, wheelW / 2, 0);
    trGrad.addColorStop(0, "#050608");
    trGrad.addColorStop(0.3, "#1c1e24");
    trGrad.addColorStop(0.7, "#282a33");
    trGrad.addColorStop(1, "#050608");
    ctx.fillStyle = trGrad;
    rr(ctx, -wheelW / 2 + 2 * scale, -wheelH / 2 + 2 * scale, wheelW - 4 * scale, wheelH - 4 * scale, 5 * scale);
    ctx.fill();

    // Tire tread grooves (perspective angled with steer)
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.lineWidth = 1.2 * scale;
    for (const gx of [-wheelW * 0.22, 0, wheelW * 0.22]) {
      ctx.beginPath();
      ctx.moveTo(gx, -wheelH * 0.4);
      ctx.lineTo(gx, wheelH * 0.4);
      ctx.stroke();
    }

    // 2. Visible wheel rim face (if wheel is steered outward towards viewer)
    const isOutward = (sx < 0 && steerAngle > 0.08) || (sx > 0 && steerAngle < -0.08);
    if (isOutward || Math.abs(steerAngle) > 0.22) {
      const rimR = wheelW * 0.42;
      // Carbon-ceramic rotor disc
      ctx.fillStyle = "#4a4e59";
      ctx.beginPath();
      ctx.arc(0, 0, rimR, 0, Math.PI * 2);
      ctx.fill();

      // Caliper
      ctx.fillStyle = caliperColor;
      ctx.beginPath();
      ctx.arc(0, 0, rimR * 1.05, -0.4, 0.4);
      ctx.lineWidth = 3 * scale;
      ctx.strokeStyle = caliperColor;
      ctx.stroke();

      // Rim spokes
      ctx.strokeStyle = wheelStyle === "bronze_dish" ? "#b45309" : "#cbd5e1";
      ctx.lineWidth = 1.6 * scale;
      for (let i = 0; i < 5; i++) {
        const a = (i * 2 * Math.PI) / 5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * rimR * 0.9, Math.sin(a) * rimR * 0.9);
        ctx.stroke();
      }

      // Center nut
      ctx.fillStyle = wheelStyle === "centerlock_star" ? "#ef4444" : "#1e293b";
      ctx.beginPath();
      ctx.arc(0, 0, rimR * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  ctx.restore();
}

/** Renders high-speed spinning alloy wheels with motion blur & glowing brake rotors */
export function renderAnimatedRearWheels(
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  dw: number,
  dh: number,
  wheelAngle: number,
  wheelStyle: WheelStyle,
  caliperColor: string,
  rotorHeat: number, // 0..1
  speedPct: number,
  accentColor: string,
) {
  const scale = dw / 340;
  const wheelR = 15.5 * scale;
  const wheelY = baseY - 42 * (dh / 220);

  for (const sx of [-1, 1]) {
    const wx = cx + sx * (124 * scale);
    ctx.save();
    ctx.translate(wx, wheelY);

    // 1. Carbon-Ceramic Brake Rotor with Dynamic Thermal Incandescent Glow
    if (rotorHeat > 0.04) {
      const glowR = wheelR * (1.1 + rotorHeat * 0.5);
      const heatGrad = ctx.createRadialGradient(0, 0, wheelR * 0.2, 0, 0, glowR);
      heatGrad.addColorStop(0, `rgba(255, 245, 180, ${Math.min(0.98, rotorHeat * 1.1)})`);
      heatGrad.addColorStop(0.35, `rgba(255, 90, 20, ${Math.min(0.9, rotorHeat * 0.95)})`);
      heatGrad.addColorStop(0.7, `rgba(220, 20, 10, ${Math.min(0.65, rotorHeat * 0.7)})`);
      heatGrad.addColorStop(1, "rgba(180, 0, 0, 0)");

      ctx.fillStyle = heatGrad;
      ctx.beginPath();
      ctx.arc(0, 0, glowR, 0, Math.PI * 2);
      ctx.fill();

      // Cross-drilled cooling vents glowing orange
      ctx.strokeStyle = `rgba(255, 230, 120, ${rotorHeat * 0.9})`;
      ctx.lineWidth = 1.2 * scale;
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 + wheelAngle;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 4 * scale, Math.sin(a) * 4 * scale);
        ctx.lineTo(Math.cos(a) * 13 * scale, Math.sin(a) * 13 * scale);
        ctx.stroke();
      }
    }

    // 2. High-Performance Multi-Piston Brake Caliper
    ctx.save();
    ctx.fillStyle = caliperColor;
    ctx.strokeStyle = caliperColor;
    ctx.lineWidth = 4 * scale;
    const calAngle = sx < 0 ? Math.PI * 0.9 : -Math.PI * 0.1;
    ctx.beginPath();
    ctx.arc(0, 0, wheelR * 1.05, calAngle - 0.52, calAngle + 0.52);
    ctx.stroke();
    // Caliper branding badge
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(sx < 0 ? -13 * scale : 9 * scale, -2.5 * scale, 3 * scale, 5 * scale);
    ctx.restore();

    // 3. Dynamic Rotating Wheel Rims
    if (speedPct < 0.28) {
      // Crisp spoke rendering with rotation
      ctx.save();
      ctx.rotate(wheelAngle);

      if (wheelStyle === "centerlock_star") {
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 2.4 * scale;
        for (let i = 0; i < 5; i++) {
          const a = (i * 2 * Math.PI) / 5;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * 13 * scale, Math.sin(a) * 13 * scale);
          ctx.stroke();
        }
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(0, 0, 4 * scale, 0, Math.PI * 2);
        ctx.fill();
      } else if (wheelStyle === "bronze_dish") {
        ctx.strokeStyle = "#b45309";
        ctx.lineWidth = 1.8 * scale;
        for (let i = 0; i < 10; i++) {
          const a = (i * 2 * Math.PI) / 10;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * 13 * scale, Math.sin(a) * 13 * scale);
          ctx.stroke();
        }
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 1.4 * scale;
        ctx.beginPath();
        ctx.arc(0, 0, 13 * scale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#78350f";
        ctx.beginPath();
        ctx.arc(0, 0, 3.5 * scale, 0, Math.PI * 2);
        ctx.fill();
      } else if (wheelStyle === "turbofan") {
        ctx.fillStyle = "#1e212b";
        ctx.beginPath();
        ctx.arc(0, 0, 13 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 1.5 * scale;
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,0.45)";
        ctx.lineWidth = 1.2 * scale;
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * 4 * scale, Math.sin(a) * 4 * scale);
          ctx.lineTo(Math.cos(a + 0.3) * 12 * scale, Math.sin(a + 0.3) * 12 * scale);
          ctx.stroke();
        }
      } else if (wheelStyle === "muscle_deep") {
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 3.4 * scale;
        for (let i = 0; i < 5; i++) {
          const a = (i * 2 * Math.PI) / 5;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * 13 * scale, Math.sin(a) * 13 * scale);
          ctx.stroke();
        }
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 1.8 * scale;
        ctx.beginPath();
        ctx.arc(0, 0, 13 * scale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.arc(0, 0, 4 * scale, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 1.6 * scale;
        for (let i = 0; i < 5; i++) {
          const a = (i * 2 * Math.PI) / 5;
          const ax = Math.cos(a) * 13 * scale, ay = Math.sin(a) * 13 * scale;
          ctx.beginPath();
          ctx.moveTo(0, 0); ctx.lineTo(ax - 2 * scale, ay);
          ctx.moveTo(0, 0); ctx.lineTo(ax + 2 * scale, ay);
          ctx.stroke();
        }
        ctx.fillStyle = "#1e293b";
        ctx.beginPath();
        ctx.arc(0, 0, 3.8 * scale, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    } else {
      // 4. High-Speed Rotational Motion Blur Disc
      const blurGrad = ctx.createRadialGradient(0, 0, 2 * scale, 0, 0, wheelR * 0.95);
      blurGrad.addColorStop(0, "#2a303d");
      blurGrad.addColorStop(0.4, "#4b5568");
      blurGrad.addColorStop(0.7, "#1e2430");
      blurGrad.addColorStop(1, "#374151");
      ctx.fillStyle = blurGrad;
      ctx.beginPath();
      ctx.arc(0, 0, wheelR * 0.92, 0, Math.PI * 2);
      ctx.fill();

      // Spinning specular gleam rings
      ctx.save();
      ctx.rotate(wheelAngle * 2.2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 1.8 * scale;
      ctx.beginPath();
      ctx.arc(0, 0, wheelR * 0.68, -0.6, 0.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, wheelR * 0.68, Math.PI - 0.6, Math.PI + 0.6);
      ctx.stroke();
      ctx.restore();

      // Centerlock nut
      ctx.fillStyle = wheelStyle === "centerlock_star" ? "#ef4444" : "#0f172a";
      ctx.beginPath();
      ctx.arc(0, 0, 3.8 * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

/** Renders active aerodynamic rear wings (Airbrake on braking, DRS on boost) */
export function renderActiveWing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  dw: number,
  dh: number,
  bodyStyle: BodyStyle,
  baseColor: string,
  accentColor: string,
  airbrakeAmount: number, // 0..1
  drsAmount: number, // 0..1
  roll: number,
) {
  if (airbrakeAmount < 0.02 && drsAmount < 0.02) return;

  const scale = dw / 340;
  const wingBaseY = baseY - dh * 0.88;

  ctx.save();
  ctx.translate(cx, wingBaseY);
  ctx.rotate(roll * 0.4);

  if (bodyStyle === "proto") {
    // Le Mans Swan-Neck Wing with Active Airbrake Angle
    const wingW = 264 * scale;
    const wingH = 16 * scale;
    const pitchLift = -airbrakeAmount * 18 * scale + drsAmount * 6 * scale;
    const flapAngle = airbrakeAmount * 0.38 - drsAmount * 0.16;

    ctx.save();
    ctx.translate(0, pitchLift);
    ctx.rotate(flapAngle);

    // Hydraulic actuator struts extended
    if (airbrakeAmount > 0.05) {
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 3 * scale;
      for (const sx of [-40, 40]) {
        ctx.beginPath();
        ctx.moveTo(sx * scale, 0);
        ctx.lineTo(sx * scale, -pitchLift);
        ctx.stroke();
      }
    }

    // Active wing blade
    ctx.fillStyle = "#0f1016";
    rr(ctx, -wingW / 2, -wingH / 2, wingW, wingH, 5 * scale);
    ctx.fill();
    ctx.fillStyle = baseColor;
    rr(ctx, -wingW / 2, -wingH / 2, wingW, 3.5 * scale, 1.5 * scale);
    ctx.fill();

    // Airbrake flashing high-intensity red LED strip
    if (airbrakeAmount > 0.25) {
      ctx.shadowColor = "#ff1744";
      ctx.shadowBlur = 18;
      ctx.fillStyle = "#ffffff";
      rr(ctx, -wingW * 0.38, -2 * scale, wingW * 0.76, 4 * scale, 2 * scale);
      ctx.fill();
    }

    // Endplates
    ctx.fillStyle = accentColor;
    rr(ctx, -wingW / 2 - 4 * scale, -wingH / 2 - 8 * scale, 7 * scale, 34 * scale, 3 * scale);
    ctx.fill();
    rr(ctx, wingW / 2 - 3 * scale, -wingH / 2 - 8 * scale, 7 * scale, 34 * scale, 3 * scale);
    ctx.fill();

    ctx.restore();
  } else if (bodyStyle === "cyber") {
    // Dual Motorized Split Winglets (Active Vectoring)
    const flapW = 88 * scale;
    const flapH = 14 * scale;
    const pitchLift = -airbrakeAmount * 14 * scale;

    for (const sx of [-1, 1]) {
      const wx = sx * 70 * scale;
      ctx.save();
      ctx.translate(wx, pitchLift);
      ctx.rotate(sx * roll * 0.5 + airbrakeAmount * 0.35);

      ctx.fillStyle = "#12141c";
      rr(ctx, -flapW / 2, -flapH / 2, flapW, flapH, 3 * scale);
      ctx.fill();
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 1.8 * scale;
      ctx.stroke();

      if (airbrakeAmount > 0.2) {
        ctx.fillStyle = "#ff1744";
        rr(ctx, -flapW * 0.4, -2 * scale, flapW * 0.8, 3.5 * scale, 1.5 * scale);
        ctx.fill();
      }

      ctx.restore();
    }
  } else {
    // GT / Muscle / Rally Active Aerofoil
    const wingW = 220 * scale;
    const wingH = 14 * scale;
    const pitchLift = -airbrakeAmount * 14 * scale + drsAmount * 5 * scale;
    const flapAngle = airbrakeAmount * 0.32 - drsAmount * 0.14;

    ctx.save();
    ctx.translate(0, pitchLift);
    ctx.rotate(flapAngle);

    ctx.fillStyle = "#12141b";
    rr(ctx, -wingW / 2, -wingH / 2, wingW, wingH, 4 * scale);
    ctx.fill();
    ctx.fillStyle = baseColor;
    rr(ctx, -wingW / 2, -wingH / 2, wingW, 3 * scale, 1.5 * scale);
    ctx.fill();

    if (airbrakeAmount > 0.2) {
      ctx.shadowColor = "#ff1744";
      ctx.shadowBlur = 14;
      ctx.fillStyle = "#ffffff";
      rr(ctx, -wingW * 0.35, -2 * scale, wingW * 0.7, 3.5 * scale, 1.5 * scale);
      ctx.fill();
    }

    ctx.restore();
  }

  ctx.restore();
}

/** Renders multi-stage procedural exhaust backfires, flame jets and plasma torches */
export function renderExhaustFlames(
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  dw: number,
  dh: number,
  bodyStyle: BodyStyle,
  isBoosting: boolean,
  backfireTimer: number,
  redlineTimer: number,
  driftBoost: boolean,
  time: number,
) {
  const active = isBoosting || backfireTimer > 0 || redlineTimer > 0 || driftBoost;
  if (!active) return;

  const scale = dw / 340;
  let tips: { x: number; y: number; size: number }[] = [];

  if (bodyStyle === "proto") {
    // Central quad rocket barrels
    tips = [
      { x: -7 * scale, y: -95 * (dh / 220), size: 1.0 },
      { x: 7 * scale, y: -95 * (dh / 220), size: 1.0 },
      { x: -7 * scale, y: -85 * (dh / 220), size: 1.0 },
      { x: 7 * scale, y: -85 * (dh / 220), size: 1.0 },
    ];
  } else if (bodyStyle === "rally") {
    // Giant angled single cannon right
    tips = [{ x: 64 * scale, y: -24 * (dh / 220), size: 1.85 }];
  } else if (bodyStyle === "cyber") {
    // Dual vector energy ports
    tips = [
      { x: -68 * scale, y: -23 * (dh / 220), size: 1.35 },
      { x: 68 * scale, y: -23 * (dh / 220), size: 1.35 },
    ];
  } else if (bodyStyle === "muscle") {
    // Quad rectangular tips
    tips = [
      { x: -72 * scale, y: -23 * (dh / 220), size: 1.1 },
      { x: -56 * scale, y: -23 * (dh / 220), size: 1.1 },
      { x: 56 * scale, y: -23 * (dh / 220), size: 1.1 },
      { x: 72 * scale, y: -23 * (dh / 220), size: 1.1 },
    ];
  } else {
    // Solstice GT quad oval tips
    tips = [
      { x: -70 * scale, y: -23 * (dh / 220), size: 1.05 },
      { x: -58 * scale, y: -23 * (dh / 220), size: 1.05 },
      { x: 58 * scale, y: -23 * (dh / 220), size: 1.05 },
      { x: 70 * scale, y: -23 * (dh / 220), size: 1.05 },
    ];
  }

  ctx.save();

  for (let i = 0; i < tips.length; i++) {
    const tip = tips[i];
    const fx = cx + tip.x;
    const fy = baseY + tip.y;
    const turb = Math.sin(time * 65 + i * 2.1);

    // Calculate dynamic flame geometry
    let flameLen = 0;
    let flameW = 10 * scale * tip.size;

    if (isBoosting) {
      flameLen = (48 + turb * 12) * scale * tip.size;
    } else if (driftBoost) {
      flameLen = (62 + turb * 16) * scale * tip.size;
    } else if (backfireTimer > 0) {
      flameLen = (38 + Math.random() * 22) * scale * tip.size;
      flameW *= 1.3;
    } else if (redlineTimer > 0) {
      flameLen = (28 + Math.random() * 14) * scale * tip.size;
    }

    if (flameLen <= 2) continue;

    // Ground tarmac flame glow illumination
    const groundGlow = ctx.createRadialGradient(fx, fy + flameLen * 0.5, 2, fx, fy + flameLen * 0.5, flameLen * 0.85);
    groundGlow.addColorStop(0, isBoosting || bodyStyle === "cyber" ? "rgba(56, 189, 248, 0.45)" : "rgba(255, 140, 40, 0.45)");
    groundGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = groundGlow;
    ctx.beginPath();
    ctx.ellipse(fx, fy + flameLen * 0.6, flameW * 2.2, flameLen * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    // Flame gradient
    const flameGrad = ctx.createLinearGradient(fx, fy, fx, fy + flameLen);
    if (isBoosting || bodyStyle === "cyber") {
      // Supersonic Cyan/Azure Plasma Torch
      flameGrad.addColorStop(0, "rgba(255, 255, 255, 0.98)");
      flameGrad.addColorStop(0.2, "rgba(125, 245, 255, 0.95)");
      flameGrad.addColorStop(0.55, "rgba(14, 165, 233, 0.85)");
      flameGrad.addColorStop(0.85, "rgba(99, 102, 241, 0.5)");
      flameGrad.addColorStop(1, "rgba(168, 85, 247, 0)");
    } else {
      // Violent Combustion Fireball
      flameGrad.addColorStop(0, "rgba(255, 255, 255, 0.98)");
      flameGrad.addColorStop(0.25, "rgba(255, 225, 110, 0.95)");
      flameGrad.addColorStop(0.6, "rgba(255, 100, 20, 0.85)");
      flameGrad.addColorStop(0.85, "rgba(220, 38, 38, 0.5)");
      flameGrad.addColorStop(1, "rgba(120, 10, 10, 0)");
    }

    ctx.fillStyle = flameGrad;
    ctx.beginPath();
    ctx.moveTo(fx - flameW * 0.5, fy);
    ctx.quadraticCurveTo(fx - flameW * 0.7, fy + flameLen * 0.4, fx, fy + flameLen);
    ctx.quadraticCurveTo(fx + flameW * 0.7, fy + flameLen * 0.4, fx + flameW * 0.5, fy);
    ctx.closePath();
    ctx.fill();

    // Shock diamond core
    if (isBoosting || driftBoost) {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(fx, fy + 4 * scale);
      ctx.lineTo(fx - flameW * 0.22, fy + flameLen * 0.35);
      ctx.lineTo(fx, fy + flameLen * 0.6);
      ctx.lineTo(fx + flameW * 0.22, fy + flameLen * 0.35);
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.restore();
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
// REALISTIC COASTAL PALM TREE (2 Variants)
// ------------------------------------------------------------------
const palmCaches = new Map<number, SpriteInfo>();
export function palmSprite(variant: number = 0): SpriteInfo {
  const v = variant % 2;
  const hit = palmCaches.get(v);
  if (hit) return hit;

  const W = 280, H = 340;
  const { c, g } = make(W, H);

  if (v === 0) {
    // ---- Variant 0: Tall Californian Coastal Fan Palm ----
    const topX = 155, topY = 70;
    const baseX = 120, baseY = H - 8;

    // soft ground shadow
    g.fillStyle = "rgba(10, 8, 14, 0.35)";
    g.beginPath();
    g.ellipse(baseX, baseY + 4, 34, 10, 0, 0, Math.PI * 2);
    g.fill();

    // Trunk core gradient
    const trunkGrad = g.createLinearGradient(baseX - 18, baseY, topX + 10, topY);
    trunkGrad.addColorStop(0, "#2c1c11");
    trunkGrad.addColorStop(0.3, "#4d341f");
    trunkGrad.addColorStop(0.7, "#65452b");
    trunkGrad.addColorStop(1, "#422c19");

    // Main curved trunk
    g.beginPath();
    g.moveTo(baseX - 14, baseY);
    g.quadraticCurveTo(116, 200, topX - 7, topY + 6);
    g.lineTo(topX + 7, topY + 6);
    g.quadraticCurveTo(134, 200, baseX + 14, baseY);
    g.closePath();
    g.fillStyle = trunkGrad;
    g.fill();

    // Bark texture & fiber rings
    for (let i = 0; i < 28; i++) {
      const t = i / 28;
      const tx = baseX + (topX - baseX) * (t * 0.9 + t * t * 0.1);
      const ty = baseY - (baseY - topY) * t;
      const w = 13 - t * 6.5;

      g.strokeStyle = i % 2 === 0 ? "rgba(25, 14, 8, 0.75)" : "rgba(145, 105, 72, 0.4)";
      g.lineWidth = 2.2;
      g.beginPath();
      g.moveTo(tx - w, ty);
      g.quadraticCurveTo(tx, ty - 2.5, tx + w, ty);
      g.stroke();
    }

    // Trunk sunlit highlight ridge (left side golden rim)
    g.strokeStyle = "rgba(255, 210, 140, 0.35)";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(baseX - 9, baseY);
    g.quadraticCurveTo(119, 200, topX - 4, topY + 10);
    g.stroke();

    // Coconut clusters at crown
    const coconuts = [
      { x: topX - 10, y: topY + 12, r: 7.5 },
      { x: topX - 3, y: topY + 16, r: 8.5 },
      { x: topX + 8, y: topY + 14, r: 8 },
      { x: topX + 3, y: topY + 22, r: 6.5 },
    ];
    for (const cn of coconuts) {
      const cg = g.createRadialGradient(cn.x - 2, cn.y - 2, 1, cn.x, cn.y, cn.r);
      cg.addColorStop(0, "#73512e");
      cg.addColorStop(0.7, "#422c15");
      cg.addColorStop(1, "#211508");
      g.fillStyle = cg;
      g.beginPath();
      g.arc(cn.x, cn.y, cn.r, 0, Math.PI * 2);
      g.fill();
    }

    // Volumetric fan palm fronds (14 distinct natural fronds)
    const fronds = [
      { a: -168, len: 98, droop: 32, curve: -15 },
      { a: -145, len: 112, droop: 40, curve: -18 },
      { a: -125, len: 122, droop: 36, curve: -10 },
      { a: -105, len: 126, droop: 28, curve: -5 },
      { a: -85, len: 130, droop: 22, curve: 4 },
      { a: -65, len: 125, droop: 26, curve: 10 },
      { a: -45, len: 118, droop: 38, curve: 18 },
      { a: -22, len: 105, droop: 46, curve: 22 },
      { a: -5, len: 92, droop: 52, curve: 26 },
      // Under-fronds (older, richer dark tones)
      { a: -178, len: 84, droop: 48, curve: -22 },
      { a: -135, len: 96, droop: 52, curve: -14 },
      { a: -95, len: 104, droop: 42, curve: 0 },
      { a: -55, len: 98, droop: 50, curve: 16 },
      { a: 12, len: 80, droop: 56, curve: 25 },
    ];

    for (const f of fronds) {
      const rad = (f.a * Math.PI) / 180;
      const ex = topX + Math.cos(rad) * f.len;
      const ey = topY + Math.sin(rad) * f.len * 0.72 + f.droop;
      const mx = topX + Math.cos(rad) * f.len * 0.52 + f.curve * 0.6;
      const my = topY + Math.sin(rad) * f.len * 0.4 - 14;

      // Frond stem
      const stemGrad = g.createLinearGradient(topX, topY, ex, ey);
      stemGrad.addColorStop(0, "#4a6e30");
      stemGrad.addColorStop(0.65, "#304d1e");
      stemGrad.addColorStop(1, "#1e3312");
      g.strokeStyle = stemGrad;
      g.lineWidth = 4.5;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(topX, topY);
      g.quadraticCurveTo(mx, my, ex, ey);
      g.stroke();

      // Leaf pinnules / blades along stem
      const blades = 14;
      for (let b = 2; b < blades; b++) {
        const bt = b / blades;
        const bx = topX * (1 - bt) * (1 - bt) + 2 * (1 - bt) * bt * mx + bt * bt * ex;
        const by = topY * (1 - bt) * (1 - bt) + 2 * (1 - bt) * bt * my + bt * bt * ey;
        const bladeLen = (Math.sin(bt * Math.PI) * 26 + 6) * (f.len / 115);

        // Angle perpendicular to frond tangent
        const tangX = 2 * (1 - bt) * (mx - topX) + 2 * bt * (ex - mx);
        const tangY = 2 * (1 - bt) * (my - topY) + 2 * bt * (ey - my);
        const bladeAng = Math.atan2(tangY, tangX) + Math.PI / 2;

        g.strokeStyle = bt < 0.4 ? "#3d6126" : bt < 0.75 ? "#2d4a1b" : "#1a3010";
        g.lineWidth = 2.8;
        // left leaflet
        g.beginPath();
        g.moveTo(bx, by);
        g.lineTo(bx + Math.cos(bladeAng) * bladeLen, by + Math.sin(bladeAng) * bladeLen + 6);
        g.stroke();
        // right leaflet
        g.beginPath();
        g.moveTo(bx, by);
        g.lineTo(bx - Math.cos(bladeAng) * bladeLen, by - Math.sin(bladeAng) * bladeLen + 6);
        g.stroke();
      }

      // Sunlit rim highlight on top curve of frond
      g.strokeStyle = "rgba(255, 235, 140, 0.45)";
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(topX, topY - 2);
      g.quadraticCurveTo(mx, my - 2, ex, ey - 2);
      g.stroke();
    }
  } else {
    // ---- Variant 1: Sweeping Arching Date Palm ----
    const topX = 188, topY = 96;
    const baseX = 85, baseY = H - 8;

    // Ground shadow
    g.fillStyle = "rgba(10, 8, 14, 0.35)";
    g.beginPath();
    g.ellipse(baseX, baseY + 4, 38, 11, 0, 0, Math.PI * 2);
    g.fill();

    // Arching trunk
    const trunkGrad = g.createLinearGradient(baseX, baseY, topX, topY);
    trunkGrad.addColorStop(0, "#331f13");
    trunkGrad.addColorStop(0.5, "#583a21");
    trunkGrad.addColorStop(1, "#3d2716");

    g.beginPath();
    g.moveTo(baseX - 16, baseY);
    g.quadraticCurveTo(110, 210, topX - 8, topY + 8);
    g.lineTo(topX + 8, topY + 8);
    g.quadraticCurveTo(138, 210, baseX + 16, baseY);
    g.closePath();
    g.fillStyle = trunkGrad;
    g.fill();

    // Diagonal diamond bark pattern
    for (let i = 0; i < 24; i++) {
      const t = i / 24;
      const tx = baseX + (topX - baseX) * (t * 0.75 + t * t * 0.25);
      const ty = baseY - (baseY - topY) * t;
      const w = 14 - t * 7;
      g.strokeStyle = "rgba(20, 10, 5, 0.65)";
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(tx - w, ty + 2);
      g.lineTo(tx + w, ty - 3);
      g.stroke();
    }

    // Heavy cascading fronds
    const fronds = [
      { a: -180, len: 110, droop: 45, curve: -20 },
      { a: -155, len: 125, droop: 48, curve: -16 },
      { a: -130, len: 135, droop: 40, curve: -8 },
      { a: -105, len: 140, droop: 32, curve: 0 },
      { a: -80, len: 145, droop: 35, curve: 12 },
      { a: -50, len: 138, droop: 45, curve: 20 },
      { a: -20, len: 120, droop: 55, curve: 26 },
      { a: 5, len: 98, droop: 62, curve: 28 },
      // lower drooping canopy
      { a: -168, len: 92, droop: 60, curve: -18 },
      { a: -120, len: 110, droop: 58, curve: -5 },
      { a: -70, len: 118, droop: 52, curve: 14 },
      { a: -10, len: 95, droop: 68, curve: 24 },
    ];

    for (const f of fronds) {
      const rad = (f.a * Math.PI) / 180;
      const ex = topX + Math.cos(rad) * f.len;
      const ey = topY + Math.sin(rad) * f.len * 0.7 + f.droop;
      const mx = topX + Math.cos(rad) * f.len * 0.5 + f.curve * 0.7;
      const my = topY + Math.sin(rad) * f.len * 0.35 - 12;

      g.strokeStyle = "#385822";
      g.lineWidth = 5;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(topX, topY);
      g.quadraticCurveTo(mx, my, ex, ey);
      g.stroke();

      // Leaf blades
      const blades = 13;
      for (let b = 1; b < blades; b++) {
        const bt = b / blades;
        const bx = topX * (1 - bt) * (1 - bt) + 2 * (1 - bt) * bt * mx + bt * bt * ex;
        const by = topY * (1 - bt) * (1 - bt) + 2 * (1 - bt) * bt * my + bt * bt * ey;
        const blen = Math.sin(bt * Math.PI) * 28 + 6;
        g.strokeStyle = bt < 0.5 ? "#466b2b" : "#243c16";
        g.lineWidth = 3.2;
        g.beginPath();
        g.moveTo(bx, by);
        g.lineTo(bx - 12, by + blen);
        g.stroke();
        g.beginPath();
        g.moveTo(bx, by);
        g.lineTo(bx + 12, by + blen);
        g.stroke();
      }

      g.strokeStyle = "rgba(255, 220, 120, 0.4)";
      g.lineWidth = 1.8;
      g.beginPath();
      g.moveTo(topX, topY - 2);
      g.quadraticCurveTo(mx, my - 2, ex, ey - 2);
      g.stroke();
    }
  }

  const info: SpriteInfo = { canvas: c, worldW: 1.9, collide: 0.12 };
  palmCaches.set(v, info);
  return info;
}

// ------------------------------------------------------------------
// REALISTIC COASTAL PINE & CYPRESS (2 Variants)
// ------------------------------------------------------------------
const pineCaches = new Map<number, SpriteInfo>();
export function pineSprite(variant: number = 0): SpriteInfo {
  const v = variant % 2;
  const hit = pineCaches.get(v);
  if (hit) return hit;

  const W = 240, H = 340;
  const { c, g } = make(W, H);
  const cx = W / 2;

  // Ground shadow
  g.fillStyle = "rgba(10, 8, 14, 0.35)";
  g.beginPath();
  g.ellipse(cx, H - 6, 42, 12, 0, 0, Math.PI * 2);
  g.fill();

  if (v === 0) {
    // ---- Variant 0: Mediterranean Columnar Cypress ----
    // Trunk base
    g.fillStyle = "#382517";
    rr(g, cx - 7, H - 36, 14, 32, 3);
    g.fill();

    // 7 overlapping organic flame lobes
    const lobes = [
      { y: 24, w: 26, h: 62 },
      { y: 64, w: 38, h: 74 },
      { y: 110, w: 48, h: 84 },
      { y: 160, w: 56, h: 90 },
      { y: 210, w: 60, h: 94 },
      { y: 254, w: 52, h: 72 },
      { y: 284, w: 38, h: 42 },
    ];

    for (let i = 0; i < lobes.length; i++) {
      const lb = lobes[i];
      const grad = g.createRadialGradient(cx - lb.w * 0.25, lb.y + lb.h * 0.35, 4, cx, lb.y + lb.h * 0.5, lb.w);
      grad.addColorStop(0, "#3e6435");
      grad.addColorStop(0.5, "#254221");
      grad.addColorStop(1, "#142512");
      g.fillStyle = grad;

      g.beginPath();
      g.moveTo(cx, lb.y);
      g.quadraticCurveTo(cx + lb.w, lb.y + lb.h * 0.45, cx + lb.w * 0.65, lb.y + lb.h);
      g.quadraticCurveTo(cx, lb.y + lb.h - 8, cx - lb.w * 0.65, lb.y + lb.h);
      g.quadraticCurveTo(cx - lb.w, lb.y + lb.h * 0.45, cx, lb.y);
      g.closePath();
      g.fill();

      // Needle texture bumps on perimeter
      g.fillStyle = "rgba(65, 105, 55, 0.45)";
      for (let k = 0; k < 8; k++) {
        const offY = lb.y + lb.h * (0.2 + k * 0.09);
        const offX = cx + (k % 2 === 0 ? 1 : -1) * (lb.w * 0.78);
        g.beginPath();
        g.arc(offX, offY, 6, 0, Math.PI * 2);
        g.fill();
      }

      // Warm sunlight rim highlight along left/right edge
      g.strokeStyle = "rgba(255, 214, 130, 0.45)";
      g.lineWidth = 2.4;
      g.beginPath();
      g.moveTo(cx, lb.y + 4);
      g.quadraticCurveTo(cx + lb.w - 3, lb.y + lb.h * 0.45, cx + lb.w * 0.55, lb.y + lb.h - 4);
      g.stroke();
    }
  } else {
    // ---- Variant 1: Rugged Coastal Pine ----
    // Trunk with bark texture
    const trunkGrad = g.createLinearGradient(cx - 10, H, cx + 10, 60);
    trunkGrad.addColorStop(0, "#2c1c11");
    trunkGrad.addColorStop(0.5, "#4e3522");
    trunkGrad.addColorStop(1, "#362215");
    g.fillStyle = trunkGrad;

    g.beginPath();
    g.moveTo(cx - 12, H - 6);
    g.quadraticCurveTo(cx - 5, 190, cx - 4, 60);
    g.lineTo(cx + 4, 60);
    g.quadraticCurveTo(cx + 6, 190, cx + 12, H - 6);
    g.closePath();
    g.fill();

    // 6 horizontal tiered boughs
    const tiers = [
      { y: 40, w: 42, h: 52, yOff: 0 },
      { y: 85, w: 72, h: 62, yOff: 5 },
      { y: 135, w: 94, h: 68, yOff: -6 },
      { y: 185, w: 108, h: 72, yOff: 8 },
      { y: 235, w: 114, h: 76, yOff: -4 },
      { y: 280, w: 86, h: 58, yOff: 6 },
    ];

    for (const tr of tiers) {
      // Wood branch arms
      g.strokeStyle = "#382315";
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(cx, tr.y + tr.h * 0.4);
      g.lineTo(cx - tr.w * 0.75, tr.y + tr.h * 0.7);
      g.moveTo(cx, tr.y + tr.h * 0.4);
      g.lineTo(cx + tr.w * 0.75, tr.y + tr.h * 0.7);
      g.stroke();

      // Tier foliage cluster
      const grad = g.createLinearGradient(cx - tr.w, tr.y, cx + tr.w, tr.y + tr.h);
      grad.addColorStop(0, "#193019");
      grad.addColorStop(0.4, "#2e522b");
      grad.addColorStop(0.85, "#426b38");
      grad.addColorStop(1, "#21381c");
      g.fillStyle = grad;

      g.beginPath();
      g.moveTo(cx, tr.y);
      g.lineTo(cx + tr.w, tr.y + tr.h);
      g.quadraticCurveTo(cx, tr.y + tr.h - 18, cx - tr.w, tr.y + tr.h);
      g.closePath();
      g.fill();

      // Needle tuft fringes
      g.fillStyle = "rgba(75, 120, 65, 0.4)";
      for (let n = -tr.w + 14; n < tr.w - 10; n += 18) {
        g.beginPath();
        g.arc(cx + n, tr.y + tr.h - 6, 8, 0, Math.PI * 2);
        g.fill();
      }

      // Edge rim
      g.strokeStyle = "rgba(255, 205, 120, 0.5)";
      g.lineWidth = 2.2;
      g.beginPath();
      g.moveTo(cx, tr.y + 2);
      g.lineTo(cx + tr.w - 4, tr.y + tr.h - 3);
      g.stroke();
    }
  }

  const info: SpriteInfo = { canvas: c, worldW: 1.6, collide: 0.16 };
  pineCaches.set(v, info);
  return info;
}

// ------------------------------------------------------------------
// COASTAL SHRUBS & FLOWERING OLEANDER BUSHES
// ------------------------------------------------------------------
const shrubCaches = new Map<string, SpriteInfo>();
export function shrubSprite(variant: number = 0, weather: WeatherMode = "sunset"): SpriteInfo {
  const key = `${variant % 3}:${weather}`;
  const hit = shrubCaches.get(key);
  if (hit) return hit;

  const W = 180, H = 110;
  const { c, g } = make(W, H);
  const cx = W / 2, cy = H - 18;

  // Ground shadow
  g.fillStyle = "rgba(10, 8, 14, 0.3)";
  g.beginPath();
  g.ellipse(cx, H - 8, 70, 14, 0, 0, Math.PI * 2);
  g.fill();

  // Root branches
  g.strokeStyle = "#382717";
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(cx - 20, H - 10); g.lineTo(cx - 35, cy - 25);
  g.moveTo(cx, H - 10); g.lineTo(cx, cy - 35);
  g.moveTo(cx + 20, H - 10); g.lineTo(cx + 35, cy - 25);
  g.stroke();

  // Overlapping organic leaf bubbles
  const clusters = [
    { x: cx - 44, y: cy - 14, r: 28 },
    { x: cx + 44, y: cy - 14, r: 28 },
    { x: cx - 24, y: cy - 36, r: 32 },
    { x: cx + 24, y: cy - 36, r: 32 },
    { x: cx, y: cy - 48, r: 30 },
    { x: cx - 56, y: cy - 8, r: 20 },
    { x: cx + 56, y: cy - 8, r: 20 },
  ];

  for (const cl of clusters) {
    const cg = g.createRadialGradient(cl.x - cl.r * 0.3, cl.y - cl.r * 0.3, 3, cl.x, cl.y, cl.r);
    if (weather === "night") {
      cg.addColorStop(0, "#1e3a2c");
      cg.addColorStop(0.7, "#0f2118");
      cg.addColorStop(1, "#07110c");
    } else if (weather === "rain") {
      cg.addColorStop(0, "#224233");
      cg.addColorStop(0.7, "#14291f");
      cg.addColorStop(1, "#0a1610");
    } else {
      cg.addColorStop(0, "#618a42");
      cg.addColorStop(0.65, "#3d5e27");
      cg.addColorStop(1, "#233b15");
    }
    g.fillStyle = cg;
    g.beginPath();
    g.arc(cl.x, cl.y, cl.r, 0, Math.PI * 2);
    g.fill();
  }

  // Flowering blossoms (coastal oleander / bougainvillea)
  const flowers = [
    { x: cx - 38, y: cy - 28 }, { x: cx - 18, y: cy - 46 }, { x: cx + 14, y: cy - 48 },
    { x: cx + 38, y: cy - 32 }, { x: cx - 48, y: cy - 12 }, { x: cx + 48, y: cy - 14 },
    { x: cx, y: cy - 34 }, { x: cx - 12, y: cy - 20 }, { x: cx + 20, y: cy - 22 },
  ];

  for (const fl of flowers) {
    g.fillStyle =
      weather === "night"
        ? "#00e5ff"
        : weather === "rain"
          ? "#e0f2fe"
          : (variant % 2 === 0 ? "#f43f5e" : "#fbbf24");
    g.beginPath();
    g.arc(fl.x, fl.y, 3.8, 0, Math.PI * 2);
    g.fill();
    // Flower center
    g.fillStyle = "#ffffff";
    g.beginPath();
    g.arc(fl.x, fl.y, 1.4, 0, Math.PI * 2);
    g.fill();
  }

  const info: SpriteInfo = { canvas: c, worldW: 0.85, collide: 0 };
  shrubCaches.set(key, info);
  return info;
}

// ------------------------------------------------------------------
// GRANITE BOULDERS & COASTAL CLIFF ROCKS
// ------------------------------------------------------------------
const rockCaches = new Map<string, SpriteInfo>();
export function rockSprite(variant: number = 0, weather: WeatherMode = "sunset"): SpriteInfo {
  const key = `${variant % 3}:${weather}`;
  const hit = rockCaches.get(key);
  if (hit) return hit;

  const W = 220, H = 140;
  const { c, g } = make(W, H);
  const cx = W / 2, cy = H - 20;

  // Ground shadow
  g.fillStyle = "rgba(10, 8, 14, 0.4)";
  g.beginPath();
  g.ellipse(cx, H - 12, 85, 18, 0, 0, Math.PI * 2);
  g.fill();

  const isNight = weather === "night";
  const isRain = weather === "rain";

  // Base stone palette
  const litColor = isNight ? "#2a3142" : isRain ? "#384152" : "#a89f91";
  const midColor = isNight ? "#1a202c" : isRain ? "#252e3d" : "#7d7568";
  const darkColor = isNight ? "#0f131a" : isRain ? "#151b24" : "#4a443b";
  const rimColor = isNight ? "#00e5ff" : isRain ? "#7dd3fc" : "#ffdca8";

  // Multi-faceted angular boulder polygons
  // Face 1: Lit Top Face
  g.fillStyle = litColor;
  g.beginPath();
  g.moveTo(cx - 30, cy - 80);
  g.lineTo(cx + 40, cy - 70);
  g.lineTo(cx + 70, cy - 25);
  g.lineTo(cx + 10, cy - 35);
  g.lineTo(cx - 50, cy - 30);
  g.closePath();
  g.fill();

  // Face 2: Left Midtone Slanted Face
  g.fillStyle = midColor;
  g.beginPath();
  g.moveTo(cx - 30, cy - 80);
  g.lineTo(cx - 50, cy - 30);
  g.lineTo(cx - 85, cy);
  g.lineTo(cx - 65, cy - 40);
  g.closePath();
  g.fill();

  // Face 3: Right Shadowed Facet
  g.fillStyle = darkColor;
  g.beginPath();
  g.moveTo(cx + 40, cy - 70);
  g.lineTo(cx + 85, cy - 10);
  g.lineTo(cx + 70, cy - 25);
  g.closePath();
  g.fill();

  // Face 4: Main Front Facet
  const frontGrad = g.createLinearGradient(cx, cy - 40, cx, cy);
  frontGrad.addColorStop(0, midColor);
  frontGrad.addColorStop(1, darkColor);
  g.fillStyle = frontGrad;
  g.beginPath();
  g.moveTo(cx - 50, cy - 30);
  g.lineTo(cx + 10, cy - 35);
  g.lineTo(cx + 70, cy - 25);
  g.lineTo(cx + 80, cy);
  g.lineTo(cx - 85, cy);
  g.closePath();
  g.fill();

  // Weathered cracks and fissures
  g.strokeStyle = "rgba(15, 12, 10, 0.75)";
  g.lineWidth = 2.2;
  g.beginPath();
  g.moveTo(cx + 10, cy - 35); g.lineTo(cx + 15, cy - 12); g.lineTo(cx + 28, cy);
  g.moveTo(cx - 30, cy - 80); g.lineTo(cx - 15, cy - 50); g.lineTo(cx - 24, cy - 30);
  g.stroke();

  // Lichen/moss patches on top ledge
  g.fillStyle = isNight ? "rgba(0, 229, 255, 0.25)" : "rgba(125, 150, 75, 0.45)";
  g.beginPath();
  g.arc(cx - 10, cy - 65, 14, 0, Math.PI * 2);
  g.arc(cx + 25, cy - 58, 12, 0, Math.PI * 2);
  g.fill();

  // Rim highlight on sharp stone crest
  g.strokeStyle = rimColor;
  g.lineWidth = 2.6;
  g.beginPath();
  g.moveTo(cx - 65, cy - 40);
  g.lineTo(cx - 30, cy - 80);
  g.lineTo(cx + 40, cy - 70);
  g.lineTo(cx + 70, cy - 25);
  g.stroke();

  const info: SpriteInfo = { canvas: c, worldW: 1.1, collide: 0.28 };
  rockCaches.set(key, info);
  return info;
}

// ------------------------------------------------------------------
// FIA MOTORSPORT BRAKE DISTANCE BOARDS (150m, 100m, 50m)
// ------------------------------------------------------------------
const brakeCaches = new Map<number, SpriteInfo>();
export function brakeMarkerSprite(meters: number = 100): SpriteInfo {
  const m = meters === 50 ? 50 : meters === 150 ? 150 : 100;
  const hit = brakeCaches.get(m);
  if (hit) return hit;

  const W = 140, H = 160;
  const { c, g } = make(W, H);
  const cx = W / 2;

  // Dual steel mounting legs
  g.fillStyle = "#1e222b";
  rr(g, cx - 28, 90, 8, 65, 2); g.fill();
  rr(g, cx + 20, 90, 8, 65, 2); g.fill();
  g.fillStyle = "#3a404f";
  rr(g, cx - 27, 90, 3, 65, 1); g.fill();
  rr(g, cx + 21, 90, 3, 65, 1); g.fill();

  // Main high-visibility board
  g.fillStyle = "#0d1017";
  rr(g, 10, 8, W - 20, 90, 6);
  g.fill();

  // Reflective white face
  g.fillStyle = "#f8fafc";
  rr(g, 14, 12, W - 28, 82, 4);
  g.fill();

  // Red racing indicator band at top
  g.fillStyle = "#dc2626";
  rr(g, 14, 12, W - 28, 12, 3);
  g.fill();

  // Bold high-contrast distance numeral
  g.fillStyle = "#0f172a";
  g.font = "italic 900 44px 'Chakra Petch', Arial";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(String(m), cx, 58);

  // Red distance hashes at bottom (3 hashes for 150, 2 for 100, 1 for 50)
  const hashCount = m === 150 ? 3 : m === 100 ? 2 : 1;
  const hWidth = 14;
  const startX = cx - (hashCount * hWidth + (hashCount - 1) * 6) / 2;
  g.fillStyle = "#dc2626";
  for (let h = 0; h < hashCount; h++) {
    g.fillRect(startX + h * (hWidth + 6), 84, hWidth, 5);
  }

  const info: SpriteInfo = { canvas: c, worldW: 0.6, collide: 0.08 };
  brakeCaches.set(m, info);
  return info;
}

// ------------------------------------------------------------------
// CORNER APEX CHEVRON DIRECTIONAL BOARDS
// ------------------------------------------------------------------
const chevronCaches = new Map<string, SpriteInfo>();
export function chevronSprite(direction: "left" | "right" = "left", weather: WeatherMode = "sunset"): SpriteInfo {
  const key = `${direction}:${weather}`;
  const hit = chevronCaches.get(key);
  if (hit) return hit;

  const W = 180, H = 140;
  const { c, g } = make(W, H);

  // Dual legs
  g.fillStyle = "#1e222b";
  rr(g, 36, 75, 8, 60, 2); g.fill();
  rr(g, W - 44, 75, 8, 60, 2); g.fill();

  // Outer frame
  g.fillStyle = "#0b0e14";
  rr(g, 10, 10, W - 20, 72, 6);
  g.fill();

  // High-contrast background
  const isNight = weather !== "sunset";
  g.fillStyle = isNight ? "#111422" : "#f8fafc";
  rr(g, 14, 14, W - 28, 64, 4);
  g.fill();

  // Draw 3 bold directional chevrons (<<< or >>>)
  const numChevrons = 3;
  const chW = 34, chH = 46;
  const arrowColor = isNight ? "#00e5ff" : "#dc2626";

  g.fillStyle = arrowColor;
  for (let i = 0; i < numChevrons; i++) {
    const x = 32 + i * 44;
    const y = 23;
    g.beginPath();
    if (direction === "left") {
      g.moveTo(x + chW, y);
      g.lineTo(x, y + chH / 2);
      g.lineTo(x + chW, y + chH);
      g.lineTo(x + chW - 14, y + chH);
      g.lineTo(x - 14, y + chH / 2);
      g.lineTo(x + chW - 14, y);
    } else {
      g.moveTo(x, y);
      g.lineTo(x + chW, y + chH / 2);
      g.lineTo(x, y + chH);
      g.lineTo(x + 14, y + chH);
      g.lineTo(x + chW + 14, y + chH / 2);
      g.lineTo(x + 14, y);
    }
    g.closePath();
    g.fill();
  }

  // Neon glow in night mode
  if (isNight) {
    g.strokeStyle = "rgba(0, 229, 255, 0.75)";
    g.lineWidth = 2.5;
    rr(g, 12, 12, W - 24, 68, 5);
    g.stroke();
  }

  const info: SpriteInfo = { canvas: c, worldW: 0.8, collide: 0.08 };
  chevronCaches.set(key, info);
  return info;
}

// ------------------------------------------------------------------
// STRAPPED RACING TIRE SAFETY WALL
// ------------------------------------------------------------------
const tireWallCaches = new Map<string, SpriteInfo>();
export function tireWallSprite(weather: WeatherMode = "sunset"): SpriteInfo {
  const hit = tireWallCaches.get(weather);
  if (hit) return hit;

  const W = 220, H = 120;
  const { c, g } = make(W, H);

  // Ground shadow
  g.fillStyle = "rgba(10, 8, 14, 0.4)";
  g.beginPath();
  g.ellipse(W / 2, H - 8, 100, 14, 0, 0, Math.PI * 2);
  g.fill();

  // 3 tire stacks side by side, each 3 tires high
  const stacks = 3;
  const tireW = 62, tireH = 26;

  for (let col = 0; col < stacks; col++) {
    const tx = 18 + col * 64;
    for (let row = 2; row >= 0; row--) {
      const ty = H - 24 - (2 - row) * 22;
      const isRed = (col + row) % 2 === 0;

      // Tire body
      g.fillStyle = isRed ? "#dc2626" : "#f1f5f9";
      rr(g, tx, ty, tireW, tireH, 6);
      g.fill();

      // Tire rubber shadow & grooving
      g.fillStyle = isRed ? "#991b1b" : "#94a3b8";
      rr(g, tx + 4, ty + 4, tireW - 8, tireH - 8, 4);
      g.fill();

      // Hollow tire center hole
      g.fillStyle = "#0f172a";
      g.beginPath();
      g.ellipse(tx + tireW / 2, ty + tireH / 2, 16, 6, 0, 0, Math.PI * 2);
      g.fill();

      // Top specular highlight
      g.strokeStyle = "rgba(255, 255, 255, 0.5)";
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(tx + 6, ty + 2);
      g.lineTo(tx + tireW - 6, ty + 2);
      g.stroke();
    }
  }

  // Heavy black industrial safety strap holding all stacks together
  g.fillStyle = "#090d16";
  g.fillRect(10, H - 56, W - 20, 10);
  g.strokeStyle = "#38bdf8";
  g.lineWidth = 1.5;
  g.strokeRect(10, H - 56, W - 20, 10);

  const info: SpriteInfo = { canvas: c, worldW: 1.15, collide: 0.35 };
  tireWallCaches.set(weather, info);
  return info;
}

// ------------------------------------------------------------------
// CIRCUIT MARSHAL SAFETY POST
// ------------------------------------------------------------------
const marshalCaches = new Map<string, SpriteInfo>();
export function marshalPostSprite(weather: WeatherMode = "sunset"): SpriteInfo {
  const hit = marshalCaches.get(weather);
  if (hit) return hit;

  const W = 180, H = 220;
  const { c, g } = make(W, H);
  const cx = W / 2;

  // Ground shadow
  g.fillStyle = "rgba(10, 8, 14, 0.35)";
  g.beginPath();
  g.ellipse(cx, H - 8, 65, 14, 0, 0, Math.PI * 2);
  g.fill();

  // 4 steel stilt columns
  g.fillStyle = "#1e222b";
  g.fillRect(cx - 45, 120, 8, 90);
  g.fillRect(cx - 30, 120, 6, 90);
  g.fillRect(cx + 24, 120, 6, 90);
  g.fillRect(cx + 37, 120, 8, 90);

  // Cross braces
  g.strokeStyle = "#2e3442";
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(cx - 45, 130); g.lineTo(cx + 45, 205);
  g.moveTo(cx + 45, 130); g.lineTo(cx - 45, 205);
  g.stroke();

  // Raised platform deck
  g.fillStyle = "#475569";
  rr(g, cx - 55, 114, 110, 12, 3);
  g.fill();

  // Safety cabin enclosure
  g.fillStyle = "#f8fafc";
  rr(g, cx - 45, 52, 90, 64, 4);
  g.fill();

  // FIA blue / red racing stripe on cabin
  g.fillStyle = "#2563eb";
  g.fillRect(cx - 45, 96, 90, 10);
  g.fillStyle = "#dc2626";
  g.fillRect(cx - 45, 106, 90, 4);

  // Viewing windows
  g.fillStyle = "#0f172a";
  rr(g, cx - 38, 58, 76, 32, 2);
  g.fill();
  g.fillStyle = "rgba(147, 197, 253, 0.65)";
  g.fillRect(cx - 35, 60, 70, 28);

  // Curved corrugated weather roof
  g.fillStyle = "#1e293b";
  g.beginPath();
  g.moveTo(cx - 60, 52);
  g.quadraticCurveTo(cx, 32, cx + 60, 52);
  g.lineTo(cx + 56, 44);
  g.quadraticCurveTo(cx, 24, cx - 56, 44);
  g.closePath();
  g.fill();

  // Safety flag mast with waving green racing flag
  g.strokeStyle = "#94a3b8";
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(cx + 52, 48);
  g.lineTo(cx + 52, 6);
  g.stroke();

  // Waving Green Flag
  g.fillStyle = "#22c55e";
  g.beginPath();
  g.moveTo(cx + 52, 8);
  g.quadraticCurveTo(cx + 66, 12, cx + 80, 8);
  g.quadraticCurveTo(cx + 68, 24, cx + 80, 30);
  g.quadraticCurveTo(cx + 66, 26, cx + 52, 30);
  g.closePath();
  g.fill();

  const info: SpriteInfo = { canvas: c, worldW: 0.95, collide: 0.25 };
  marshalCaches.set(weather, info);
  return info;
}

// ------------------------------------------------------------------
// OVERHEAD GRAND PRIX START/FINISH GANTRY
// ------------------------------------------------------------------
const gantryCaches = new Map<string, SpriteInfo>();
export function gantrySprite(weather: WeatherMode = "sunset"): SpriteInfo {
  const hit = gantryCaches.get(weather);
  if (hit) return hit;

  const W = 520, H = 260;
  const { c, g } = make(W, H);

  // Left & Right lattice support pillars
  const pillars = [24, W - 64];
  for (const px of pillars) {
    g.fillStyle = "#1e222b";
    rr(g, px, 38, 40, H - 42, 4);
    g.fill();

    // Steel lattice struts
    g.strokeStyle = "#384152";
    g.lineWidth = 2.5;
    for (let y = 45; y < H - 20; y += 22) {
      g.beginPath();
      g.moveTo(px, y); g.lineTo(px + 40, y + 22);
      g.moveTo(px + 40, y); g.lineTo(px, y + 22);
      g.stroke();
    }
  }

  // Overhead main horizontal box truss spanning across pillars
  const trussY = 24, trussH = 54;
  g.fillStyle = "#0f172a";
  rr(g, 10, trussY, W - 20, trussH, 6);
  g.fill();

  // LED Matrix billboard inside truss
  g.fillStyle = "#020617";
  rr(g, 70, trussY + 6, W - 140, trussH - 12, 4);
  g.fill();

  // Digital race championship text
  g.save();
  g.fillStyle = "#facc15";
  g.font = "italic 900 24px 'Chakra Petch', Arial";
  g.textAlign = "center";
  g.shadowColor = "#facc15";
  g.shadowBlur = 12;
  g.fillText("APEX HORIZON // GRAND PRIX CIRCUIT", W / 2, trussY + 34);
  g.restore();

  // 5 FIA starting lights suspended underneath truss
  const lightsY = trussY + trussH + 4;
  const lBoxW = 34, lBoxH = 22;
  const startX = W / 2 - (5 * (lBoxW + 8)) / 2;

  for (let i = 0; i < 5; i++) {
    const lx = startX + i * (lBoxW + 8);
    // Housing box
    g.fillStyle = "#0f172a";
    rr(g, lx, lightsY, lBoxW, lBoxH, 4);
    g.fill();
    // Glowing red LED lamp
    const ledGrad = g.createRadialGradient(lx + lBoxW / 2, lightsY + lBoxH / 2, 2, lx + lBoxW / 2, lightsY + lBoxH / 2, 10);
    ledGrad.addColorStop(0, "#ffffff");
    ledGrad.addColorStop(0.3, "#ef4444");
    ledGrad.addColorStop(1, "#7f1d1d");
    g.fillStyle = ledGrad;
    g.beginPath();
    g.arc(lx + lBoxW / 2, lightsY + lBoxH / 2, 8, 0, Math.PI * 2);
    g.fill();
  }

  // Checkered flag banners flanking gantry
  const flagW = 32, flagH = 24;
  for (let ci = 0; ci < 2; ci++) {
    const fx = ci === 0 ? 30 : W - 62;
    for (let r = 0; r < 3; r++) {
      for (let col = 0; col < 4; col++) {
        g.fillStyle = (r + col) % 2 === 0 ? "#ffffff" : "#090d16";
        g.fillRect(fx + col * (flagW / 4), trussY + 8 + r * (flagH / 3), flagW / 4, flagH / 3);
      }
    }
  }

  const info: SpriteInfo = { canvas: c, worldW: 2.8, collide: 0 };
  gantryCaches.set(weather, info);
  return info;
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
