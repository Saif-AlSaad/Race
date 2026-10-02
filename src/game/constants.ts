// ------------------------------------------------------------------
// APEX HORIZON — tuning constants, car roster, scene palette
// ------------------------------------------------------------------

export const SEGMENT_LENGTH = 200;
export const RUMBLE_LENGTH = 3;
export const ROAD_WIDTH = 2200; // half-width of road in world units
export const CAMERA_HEIGHT = 1150;
export const DRAW_DISTANCE = 240;
export const FIELD_OF_VIEW = 100;
export const FOG_DENSITY = 5;
export const CENTRIFUGAL = 0.28;
export const TOTAL_LAPS = 3;
export const PLAYER_HALF_W = 0.19; // collision half width, road-width units
export const MPH_SCALE = 0.0183;

export const BASE_MAX_SPEED = 11500; // world units / second
export const BASE_ACCEL = BASE_MAX_SPEED / 4.4;
export const BRAKE_FORCE = -BASE_MAX_SPEED * 0.92;
export const COAST_DECEL = -BASE_MAX_SPEED * 0.22;
export const OFFROAD_DECEL = -BASE_MAX_SPEED * 0.78;
export const OFFROAD_LIMIT = BASE_MAX_SPEED * 0.36;
export const BOOST_TOP_MULT = 1.33;
export const BOOST_ACCEL_MULT = 1.55;

export interface CarDef {
  id: string;
  name: string;
  cls: string;
  desc: string;
  // paint
  base: string;
  dark: string;
  light: string;
  glassHi: string;
  glassLo: string;
  accent: string;
  // performance multipliers
  topSpeed: number;
  accel: number;
  grip: number;
  // UI stat bars 0..1
  statTop: number;
  statAcc: number;
  statGrip: number;
}

export const CARS: CarDef[] = [
  {
    id: "solstice",
    name: "SOLSTICE S",
    cls: "GT // BALANCED",
    desc: "Factory team spec. Neutral balance, endless golden-hour legs.",
    base: "#e07f16",
    dark: "#8a4a0c",
    light: "#ffc36e",
    glassHi: "#9fc3d9",
    glassLo: "#141f2c",
    accent: "#ffe9c2",
    topSpeed: 1.0,
    accel: 1.0,
    grip: 1.0,
    statTop: 0.78,
    statAcc: 0.76,
    statGrip: 0.8,
  },
  {
    id: "furia",
    name: "CORSA FURIA",
    cls: "PROTO // TOP SPEED",
    desc: "A straight-line missile. Treat the braking zones with respect.",
    base: "#c2262e",
    dark: "#6f0f13",
    light: "#ff7d6c",
    glassHi: "#a8c6d8",
    glassLo: "#161d2a",
    accent: "#ffd9a8",
    topSpeed: 1.075,
    accel: 0.95,
    grip: 0.93,
    statTop: 0.97,
    statAcc: 0.68,
    statGrip: 0.6,
  },
  {
    id: "falcon",
    name: "FALCON MK-II",
    cls: "RALLYE // AGILITY",
    desc: "Featherweight chassis. Lives on the curbs, thrives in the twist.",
    base: "#1fa8c9",
    dark: "#0c4a5e",
    light: "#8fe8ff",
    glassHi: "#b2d4de",
    glassLo: "#12202c",
    accent: "#d9fff2",
    topSpeed: 0.955,
    accel: 1.1,
    grip: 1.13,
    statTop: 0.66,
    statAcc: 0.94,
    statGrip: 0.96,
  },
];

export interface Rival {
  name: string;
  base: string;
  dark: string;
  light: string;
  accent: string;
}

export const RIVALS: Rival[] = [
  { name: "VEX", base: "#3d7bd9", dark: "#1d3a75", light: "#8fb8ff", accent: "#d7e6ff" },
  { name: "KIRA", base: "#7e3fd4", dark: "#3d1a6e", light: "#c79bff", accent: "#efe0ff" },
  { name: "DUSK", base: "#2b2f3a", dark: "#12141b", light: "#8a93a8", accent: "#ffe9c2" },
  { name: "MIRA", base: "#d44fa0", dark: "#6e1f50", light: "#ff9fd4", accent: "#ffe0f0" },
  { name: "KANE", base: "#2f9e5f", dark: "#14532e", light: "#8fe0ae", accent: "#e2ffe9" },
  { name: "JOLT", base: "#d9c13a", dark: "#6e5c12", light: "#fff0a0", accent: "#fff8d6" },
  { name: "ORION", base: "#c9581e", dark: "#66300d", light: "#ffa675", accent: "#ffe7d6" },
];

export type WeatherMode = "sunset" | "night" | "rain";

export interface ScenePalette {
  fog: string;
  roadLight: string;
  roadDark: string;
  grassLight: string;
  grassDark: string;
  rumbleLight: string;
  rumbleDark: string;
  lane: string;
  edge: string;
  ambientLight: number;
  wetness: number;
}

export const SCENES: Record<WeatherMode, ScenePalette> = {
  sunset: {
    fog: "#e2a06b",
    roadLight: "#6e6a67",
    roadDark: "#666260",
    grassLight: "#8b9057",
    grassDark: "#7f8750",
    rumbleLight: "#ece5d6",
    rumbleDark: "#bd3d2c",
    lane: "rgba(240, 234, 216, 0.75)",
    edge: "rgba(255, 240, 210, 0.16)",
    ambientLight: 1.0,
    wetness: 0,
  },
  night: {
    fog: "#070612",
    roadLight: "#181a24",
    roadDark: "#111219",
    grassLight: "#0c111a",
    grassDark: "#080b12",
    rumbleLight: "#00e5ff", // electric cyan neon
    rumbleDark: "#ff007f", // electric magenta neon
    lane: "rgba(255, 230, 110, 0.95)", // glowing phosphor highway lane
    edge: "rgba(0, 229, 255, 0.6)", // neon cyan edge glow
    ambientLight: 0.22,
    wetness: 0.25,
  },
  rain: {
    fog: "#09101c",
    roadLight: "#121824",
    roadDark: "#0c111a",
    grassLight: "#101822",
    grassDark: "#090f16",
    rumbleLight: "#dbeafe",
    rumbleDark: "#2563eb",
    lane: "rgba(240, 248, 255, 0.9)",
    edge: "rgba(56, 189, 248, 0.55)",
    ambientLight: 0.28,
    wetness: 0.95,
  },
};

// default golden-hour scene palette
export const SCENE = SCENES.sunset;

export const TRACK_NAME = "COASTLINE CIRCUIT";
export const GAME_TITLE = "APEX HORIZON";
export const GAME_SUB = "HIGHWAY GRAND PRIX";

export const STORAGE_CAR = "apex.car";
export const STORAGE_BEST = "apex.best";
export const STORAGE_WEATHER = "apex.weather";

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function formatTime(ms: number): string {
  if (!isFinite(ms) || ms < 0) ms = 0;
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const mm = Math.floor(ms % 1000);
  return `${m}:${s.toString().padStart(2, "0")}.${mm.toString().padStart(3, "0")}`;
}
