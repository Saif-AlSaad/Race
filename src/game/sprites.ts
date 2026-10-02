// ------------------------------------------------------------------
// Procedural sprite factory — every visual in the game is generated
// at runtime on offscreen canvases (cars, palms, pines, billboards,
// lamps, sky layers, clouds). No image assets needed.
// ------------------------------------------------------------------

export interface SpriteInfo {
  canvas: HTMLCanvasElement;
  worldW: number; // width in road-width units
  collide: number; // collision half-width in road-width units (0 = scenery)
}

export interface Paint {
  base: string;
  dark: string;
  light: string;
  glassHi: string;
  glassLo: string;
  accent: string;
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

// ------------------------------------------------------------------
// CARS — rear view of a wide-body grand tourer
// ------------------------------------------------------------------
const carCache = new Map<string, SpriteInfo>();

export function carSprite(p: Paint, braking: boolean): SpriteInfo {
  const key = p.base + (braking ? ":b" : "");
  const hit = carCache.get(key);
  if (hit) return hit;

  const W = 300, H = 200;
  const { c, g } = make(W, H);
  const cx = W / 2;

  // ground shadow
  g.fillStyle = "rgba(8,6,10,0.5)";
  g.beginPath();
  g.ellipse(cx, H - 18, 132, 15, 0, 0, Math.PI * 2);
  g.fill();

  // rear tires
  for (const sx of [-1, 1]) {
    const x = cx + sx * 112;
    g.save();
    g.translate(x, H - 38);
    g.fillStyle = "#0d0e12";
    rr(g, -22, -34, 44, 52, 12);
    g.fill();
    const tire = g.createLinearGradient(-22, 0, 22, 0);
    tire.addColorStop(0, "#05060a");
    tire.addColorStop(0.5, "#23252c");
    tire.addColorStop(1, "#05060a");
    g.fillStyle = tire;
    rr(g, -19, -30, 38, 44, 10);
    g.fill();
    g.fillStyle = "#3a3d46";
    g.beginPath();
    g.ellipse(0, 2, 9, 13, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#15161c";
    g.beginPath();
    g.ellipse(0, 2, 5, 8, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  // main hull
  const hull = vGrad(g, 70, H - 24, [
    [0, p.light],
    [0.18, p.base],
    [0.62, p.base],
    [1, p.dark],
  ]);
  g.fillStyle = hull;
  g.beginPath();
  g.moveTo(cx - 126, H - 30);
  g.bezierCurveTo(cx - 138, H - 58, cx - 130, 92, cx - 108, 82);
  g.quadraticCurveTo(cx, 66, cx + 108, 82);
  g.bezierCurveTo(cx + 130, 92, cx + 138, H - 58, cx + 126, H - 30);
  g.quadraticCurveTo(cx, H - 16, cx - 126, H - 30);
  g.closePath();
  g.fill();

  // lower shade
  g.fillStyle = "rgba(0,0,0,0.28)";
  g.beginPath();
  g.moveTo(cx - 126, H - 30);
  g.quadraticCurveTo(cx, H - 16, cx + 126, H - 30);
  g.lineTo(cx + 122, H - 46);
  g.quadraticCurveTo(cx, H - 34, cx - 122, H - 46);
  g.closePath();
  g.fill();

  // fender creases
  g.strokeStyle = "rgba(255,255,255,0.20)";
  g.lineWidth = 2.4;
  for (const sx of [-1, 1]) {
    g.beginPath();
    g.moveTo(cx + sx * 116, 96);
    g.quadraticCurveTo(cx + sx * 126, H - 70, cx + sx * 116, H - 40);
    g.stroke();
  }

  // cabin / glasshouse
  const glass = vGrad(g, 26, 96, [
    [0, p.glassHi],
    [0.25, p.glassLo],
    [1, "#07090f"],
  ]);
  g.fillStyle = glass;
  g.beginPath();
  g.moveTo(cx - 74, 92);
  g.quadraticCurveTo(cx - 78, 52, cx - 56, 40);
  g.quadraticCurveTo(cx, 24, cx + 56, 40);
  g.quadraticCurveTo(cx + 78, 52, cx + 74, 92);
  g.quadraticCurveTo(cx, 80, cx - 74, 92);
  g.closePath();
  g.fill();
  // glass reflection — sunset streak
  g.save();
  g.clip();
  g.fillStyle = "rgba(255,190,110,0.35)";
  g.beginPath();
  g.moveTo(cx - 78, 62);
  g.quadraticCurveTo(cx, 44, cx + 78, 58);
  g.lineTo(cx + 78, 66);
  g.quadraticCurveTo(cx, 54, cx - 78, 70);
  g.closePath();
  g.fill();
  g.restore();
  // roof edge highlight
  g.strokeStyle = p.light;
  g.globalAlpha = 0.85;
  g.lineWidth = 2.6;
  g.beginPath();
  g.moveTo(cx - 56, 40);
  g.quadraticCurveTo(cx, 24, cx + 56, 40);
  g.stroke();
  g.globalAlpha = 1;

  // spoiler
  const sp = vGrad(g, 22, 46, [[0, "#3c3f47"], [0.5, "#17181d"], [1, "#0a0b0f"]]);
  g.fillStyle = sp;
  rr(g, cx - 92, 20, 184, 14, 6);
  g.fill();
  g.fillStyle = p.base;
  rr(g, cx - 92, 20, 184, 4, 2);
  g.fill();
  g.fillStyle = "#101116";
  rr(g, cx - 96, 14, 10, 26, 3);
  g.fill();
  rr(g, cx + 86, 14, 10, 26, 3);
  g.fill();

  // tail panel
  g.fillStyle = "rgba(10,10,14,0.85)";
  rr(g, cx - 118, 96, 236, 30, 10);
  g.fill();

  // tail lights
  const lampOn = braking ? "#ff5a4a" : "#d92620";
  for (const sx of [-1, 1]) {
    const x0 = sx < 0 ? cx - 110 : cx + 28;
    const tl = g.createLinearGradient(x0, 0, x0 + 82, 0);
    tl.addColorStop(0, "#4f0e0c");
    tl.addColorStop(0.5, lampOn);
    tl.addColorStop(1, "#4f0e0c");
    g.fillStyle = tl;
    rr(g, x0, 100, 82, 13, 6);
    g.fill();
    g.fillStyle = "rgba(255,255,255,0.5)";
    rr(g, x0 + 6, 101, 26, 3, 1.5);
    g.fill();
  }
  // centre strip + third brake
  g.fillStyle = braking ? "#ff6a55" : "#a31a16";
  rr(g, cx - 22, 102, 44, 9, 4);
  g.fill();
  if (braking) {
    g.save();
    g.shadowColor = "#ff3524";
    g.shadowBlur = 34;
    g.fillStyle = "rgba(255,70,50,0.9)";
    rr(g, cx - 112, 99, 224, 15, 7);
    g.fill();
    g.shadowBlur = 18;
    rr(g, cx - 30, 27, 60, 6, 3);
    g.fill();
    g.restore();
  }

  // plate
  g.fillStyle = "#e8e4d8";
  rr(g, cx - 26, 130, 52, 16, 3);
  g.fill();
  g.fillStyle = "#1d2030";
  g.font = "700 10px 'Chakra Petch', monospace";
  g.textAlign = "center";
  g.fillText("APX·07", cx, 141);

  // diffuser + exhausts
  g.fillStyle = "#0c0d11";
  g.beginPath();
  g.moveTo(cx - 84, H - 30);
  g.lineTo(cx + 84, H - 30);
  g.lineTo(cx + 74, H - 12);
  g.lineTo(cx - 74, H - 12);
  g.closePath();
  g.fill();
  g.strokeStyle = "#26282f";
  g.lineWidth = 2;
  for (let i = -3; i <= 3; i++) {
    g.beginPath();
    g.moveTo(cx + i * 22, H - 28);
    g.lineTo(cx + i * 20, H - 13);
    g.stroke();
  }
  for (const sx of [-1, 1]) {
    const x = cx + sx * 56;
    const ex = g.createRadialGradient(x - 2, H - 22, 1, x, H - 21, 10);
    ex.addColorStop(0, "#f2f4f8");
    ex.addColorStop(0.5, "#7c808c");
    ex.addColorStop(1, "#101218");
    g.fillStyle = ex;
    g.beginPath();
    g.arc(x, H - 21, 9, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#05060a";
    g.beginPath();
    g.arc(x, H - 21, 5, 0, Math.PI * 2);
    g.fill();
  }

  // top sheen
  const sheen = g.createLinearGradient(0, 66, 0, 110);
  sheen.addColorStop(0, "rgba(255,235,200,0.20)");
  sheen.addColorStop(1, "rgba(255,235,200,0)");
  g.fillStyle = sheen;
  g.beginPath();
  g.moveTo(cx - 108, 82);
  g.quadraticCurveTo(cx, 66, cx + 108, 82);
  g.lineTo(cx + 104, 96);
  g.quadraticCurveTo(cx, 82, cx - 104, 96);
  g.closePath();
  g.fill();

  const info: SpriteInfo = { canvas: c, worldW: 0.335, collide: 0.17 };
  carCache.set(key, info);
  return info;
}

// Menu preview — car on a dark studio backdrop
export function carPreview(p: Paint): string {
  const { c, g } = make(360, 220);
  const bg = vGrad(g, 0, 220, [
    [0, "#241a20"],
    [0.55, "#170f16"],
    [1, "#0a070c"],
  ]);
  g.fillStyle = bg;
  g.fillRect(0, 0, 360, 220);
  const glow = g.createRadialGradient(180, 150, 10, 180, 150, 190);
  glow.addColorStop(0, "rgba(255,158,61,0.24)");
  glow.addColorStop(1, "rgba(255,158,61,0)");
  g.fillStyle = glow;
  g.fillRect(0, 0, 360, 220);
  const spr = carSprite(p, false).canvas;
  g.drawImage(spr, 30, 26, 300, 200);
  // reflection
  g.save();
  g.globalAlpha = 0.16;
  g.translate(0, 442);
  g.scale(1, -1);
  g.drawImage(spr, 30, 26, 300, 200);
  g.restore();
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
const billCache = new Map<number, SpriteInfo>();
export function billboardSprite(variant: number): SpriteInfo {
  const hit = billCache.get(variant);
  if (hit) return hit;
  const W = 340, H = 220;
  const { c, g } = make(W, H);
  // posts
  g.fillStyle = "#23252d";
  rr(g, 70, 148, 16, 72, 4); g.fill();
  rr(g, W - 86, 148, 16, 72, 4); g.fill();
  g.fillStyle = "#34363f";
  rr(g, 72, 148, 5, 72, 2); g.fill();
  rr(g, W - 84, 148, 5, 72, 2); g.fill();
  // frame
  g.fillStyle = "#e8e2d2";
  rr(g, 8, 6, W - 16, 150, 8); g.fill();
  g.save();
  rr(g, 16, 14, W - 32, 134, 5);
  g.clip();

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
  g.restore();
  // lamps
  g.fillStyle = "#191a20";
  rr(g, 60, 0, 34, 12, 3); g.fill();
  rr(g, W - 94, 0, 34, 12, 3); g.fill();

  const info: SpriteInfo = { canvas: c, worldW: 1.65, collide: 0.5 };
  billCache.set(variant, info);
  return info;
}

// ------------------------------------------------------------------
// FESTIVAL LAMP
// ------------------------------------------------------------------
let lampCache: SpriteInfo | null = null;
export function lampSprite(): SpriteInfo {
  if (lampCache) return lampCache;
  const W = 110, H = 300;
  const { c, g } = make(W, H);
  g.strokeStyle = "#1d1e26";
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
  g.strokeStyle = "#3a3c46";
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(px, H - 6);
  g.lineTo(px, 60);
  g.stroke();
  const glow = g.createRadialGradient(ax, 40, 2, ax, 40, 34);
  glow.addColorStop(0, "rgba(255,220,150,0.95)");
  glow.addColorStop(0.4, "rgba(255,180,90,0.35)");
  glow.addColorStop(1, "rgba(255,180,90,0)");
  g.fillStyle = glow;
  g.beginPath(); g.arc(ax, 40, 34, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#ffe9c0";
  g.beginPath(); g.arc(ax, 38, 6, 0, Math.PI * 2); g.fill();
  lampCache = { canvas: c, worldW: 0.42, collide: 0.09 };
  return lampCache;
}

// ------------------------------------------------------------------
// SCENERY LAYERS — sky, periodic mountain ridges, clouds
// ------------------------------------------------------------------
export function skyLayer(w: number, h: number): HTMLCanvasElement {
  const { c, g } = make(w, h);
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
  return c;
}

// tileable mountain ridge (sum of sines with common period)
export function ridgeLayer(w: number, h: number, seed: number, color: string, alpha: number): HTMLCanvasElement {
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
  // warm haze combing the ridge tops
  g.globalAlpha = alpha * 0.5;
  const hz = vGrad(g, h * 0.1, h, [[0, "rgba(246,199,137,0)"], [1, "rgba(246,199,137,0.6)"]]);
  g.fillStyle = hz;
  g.fillRect(0, 0, w, h);
  g.globalAlpha = 1;
  return c;
}

export function cloudSprite(): HTMLCanvasElement {
  const { c, g } = make(320, 130);
  for (let i = 0; i < 26; i++) {
    const x = 40 + Math.random() * 240;
    const y = 45 + Math.random() * 40 - (Math.abs(x - 160) / 240) * 22;
    const r = 18 + Math.random() * 30;
    const gr = g.createRadialGradient(x, y, 2, x, y, r);
    gr.addColorStop(0, "rgba(255,214,178,0.34)");
    gr.addColorStop(1, "rgba(255,190,150,0)");
    g.fillStyle = gr;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  return c;
}
