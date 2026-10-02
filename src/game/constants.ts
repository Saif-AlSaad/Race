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
  // realistic motorsport specs
  engineType: string;
  bhp: number;
  weightKg: number;
  zeroToSixty: number;
  maxSpeedDisplay: number;
  lateralG: number;
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
    engineType: "4.0L TWIN-TURBO V8",
    bhp: 575,
    weightKg: 1390,
    zeroToSixty: 3.0,
    maxSpeedDisplay: 212,
    lateralG: 1.28,
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
    engineType: "6.5L QUAD-CAM V12",
    bhp: 740,
    weightKg: 1280,
    zeroToSixty: 2.6,
    maxSpeedDisplay: 234,
    lateralG: 1.15,
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
    engineType: "2.4L TURBOCHARGED BOXER",
    bhp: 510,
    weightKg: 1140,
    zeroToSixty: 2.8,
    maxSpeedDisplay: 198,
    lateralG: 1.45,
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
export const STORAGE_SETTINGS = "apex.settings";
export const STORAGE_CAREER = "apex.career";
export const STORAGE_DIFFICULTY = "apex.difficulty";

export type DifficultyLevel = "amateur" | "pro" | "legend";

export interface DifficultyConfig {
  id: DifficultyLevel;
  label: string;
  badge: string;
  aiSpeedMult: number;
  cashMult: number;
  desc: string;
}

export const DIFFICULTIES: Record<DifficultyLevel, DifficultyConfig> = {
  amateur: {
    id: "amateur",
    label: "AMATEUR",
    badge: "ROOKIE // 1.0X",
    aiSpeedMult: 0.88,
    cashMult: 1.0,
    desc: "Forgiving opponents, gentle rubberbanding, standard payouts",
  },
  pro: {
    id: "pro",
    label: "PRO",
    badge: "VETERAN // 1.5X",
    aiSpeedMult: 1.0,
    cashMult: 1.5,
    desc: "Realistic race pace, competitive AI overtakes, +50% prize bonus",
  },
  legend: {
    id: "legend",
    label: "LEGEND",
    badge: "ELITE // 2.0X",
    aiSpeedMult: 1.12,
    cashMult: 2.0,
    desc: "Aggressive slipstreaming, late braking, double prize purse",
  },
};

export interface CarUpgrades {
  engine: number; // 0..3
  trans: number; // 0..3
  tires: number; // 0..3
  nitro: number; // 0..3
}

export const DEFAULT_UPGRADES: CarUpgrades = {
  engine: 0,
  trans: 0,
  tires: 0,
  nitro: 0,
};

export interface UpgradeTier {
  stage: number;
  name: string;
  cost: number;
  bonus: string;
}

export interface UpgradeCategory {
  id: keyof CarUpgrades;
  name: string;
  desc: string;
  icon: string;
  tiers: UpgradeTier[];
}

export const UPGRADE_DEFINITIONS: UpgradeCategory[] = [
  {
    id: "engine",
    name: "ENGINE TUNING",
    desc: "Increases top speed and maximum horsepower",
    icon: "zap",
    tiers: [
      { stage: 1, name: "Stage 1: ECU Remap & High-Flow Filter", cost: 3500, bonus: "+3% Top Speed (+18 BHP)" },
      { stage: 2, name: "Stage 2: Performance Camshaft & Exhaust", cost: 8000, bonus: "+6% Top Speed (+42 BHP)" },
      { stage: 3, name: "Stage 3: Twin-Scroll Turbo / Supercharger", cost: 16000, bonus: "+10% Top Speed (+85 BHP)" },
    ],
  },
  {
    id: "trans",
    name: "TRANSMISSION & GEARS",
    desc: "Improves launch acceleration and gear shift response",
    icon: "gauge",
    tiers: [
      { stage: 1, name: "Stage 1: Lightweight Billet Flywheel", cost: 3000, bonus: "+4% Acceleration (-0.2s 0-60)" },
      { stage: 2, name: "Stage 2: Close-Ratio Competition Gearbox", cost: 7500, bonus: "+8% Acceleration (-0.5s 0-60)" },
      { stage: 3, name: "Stage 3: Sequential Dog-Ring Transmission", cost: 15000, bonus: "+12% Acceleration (-0.9s 0-60)" },
    ],
  },
  {
    id: "tires",
    name: "TIRES & SUSPENSION",
    desc: "Increases cornering grip and reduces lateral drift slide",
    icon: "wind",
    tiers: [
      { stage: 1, name: "Stage 1: Sport Lowering Springs", cost: 3000, bonus: "+4% Cornering Grip (+0.08G)" },
      { stage: 2, name: "Stage 2: Fully Adjustable Inverted Coilovers", cost: 7000, bonus: "+8% Cornering Grip (+0.18G)" },
      { stage: 3, name: "Stage 3: Full Racing Slicks & Aero Diffuser", cost: 14000, bonus: "+13% Cornering Grip (+0.32G)" },
    ],
  },
  {
    id: "nitro",
    name: "NITRO INJECTION SYSTEM",
    desc: "Increases nitro bottle capacity and boost burst power",
    icon: "flame",
    tiers: [
      { stage: 1, name: "Stage 1: Dual 5lb Composite Bottles", cost: 2500, bonus: "+15 Max Boost Capacity" },
      { stage: 2, name: "Stage 2: Direct-Port Nitrous Rail", cost: 6500, bonus: "+30 Max Boost & Faster Burn" },
      { stage: 3, name: "Stage 3: Cryogenic Two-Stage Nitrous Injection", cost: 13000, bonus: "+50 Max Boost & Overcharge" },
    ],
  },
];

export interface CareerEvent {
  id: string;
  name: string;
  sub: string;
  tierId: number;
  circuit: string;
  weather: WeatherMode;
  laps: number;
  basePurse: number;
  starsRequired: number;
}

export interface CareerTier {
  id: number;
  title: string;
  subtitle: string;
  tagline: string;
  starsRequired: number;
  trophyName: string;
  events: CareerEvent[];
}

export const CAREER_TIERS: CareerTier[] = [
  {
    id: 1,
    title: "TIER 1 // ROOKIE SPRINT CUP",
    subtitle: "COASTLINE ROOKIE SERIES",
    tagline: "Begin your motorsport journey under the golden Pacific sunset",
    starsRequired: 0,
    trophyName: "Bronze Coastline Piston",
    events: [
      {
        id: "t1_e1",
        name: "SUNSET PROLOGUE",
        sub: "Sprint Qualifier // 2 Laps",
        tierId: 1,
        circuit: "Coastline Circuit",
        weather: "sunset",
        laps: 2,
        basePurse: 4000,
        starsRequired: 0,
      },
      {
        id: "t1_e2",
        name: "PACIFIC SWEEP",
        sub: "Cornering Duel // 2 Laps",
        tierId: 1,
        circuit: "Coastline Circuit",
        weather: "sunset",
        laps: 2,
        basePurse: 6500,
        starsRequired: 2,
      },
      {
        id: "t1_e3",
        name: "ROOKIE CUP FINALE",
        sub: "Championship Trophy Race // 3 Laps",
        tierId: 1,
        circuit: "Coastline Circuit",
        weather: "sunset",
        laps: 3,
        basePurse: 10000,
        starsRequired: 5,
      },
    ],
  },
  {
    id: 2,
    title: "TIER 2 // PRO MIDNIGHT LEAGUE",
    subtitle: "NEON METROPOLIS SHOWDOWN",
    tagline: "Battle underground rivals through illuminated cyberpunk streetways",
    starsRequired: 7,
    trophyName: "Silver Midnight Turbo",
    events: [
      {
        id: "t2_e1",
        name: "NEON BOULEVARD",
        sub: "Night Sprint // 2 Laps",
        tierId: 2,
        circuit: "Coastline Circuit",
        weather: "night",
        laps: 2,
        basePurse: 11000,
        starsRequired: 7,
      },
      {
        id: "t2_e2",
        name: "CYBER CITY DUEL",
        sub: "High-Speed Midnight Chase // 3 Laps",
        tierId: 2,
        circuit: "Coastline Circuit",
        weather: "night",
        laps: 3,
        basePurse: 16000,
        starsRequired: 10,
      },
      {
        id: "t2_e3",
        name: "METROPOLIS GRAND PRIX",
        sub: "Night League Finale // 3 Laps",
        tierId: 2,
        circuit: "Coastline Circuit",
        weather: "night",
        laps: 3,
        basePurse: 24000,
        starsRequired: 14,
      },
    ],
  },
  {
    id: 3,
    title: "TIER 3 // STORM CHASER MASTERS",
    subtitle: "CYCLONE INVITATIONAL",
    tagline: "Test extreme wet grip and lightning reflex in torrential storms",
    starsRequired: 17,
    trophyName: "Titanium Typhoon Rotor",
    events: [
      {
        id: "t3_e1",
        name: "GALE WARNING",
        sub: "Wet Asphalt Trial // 2 Laps",
        tierId: 3,
        circuit: "Coastline Circuit",
        weather: "rain",
        laps: 2,
        basePurse: 18000,
        starsRequired: 17,
      },
      {
        id: "t3_e2",
        name: "THUNDER ALLEY",
        sub: "Electrical Storm Clash // 3 Laps",
        tierId: 3,
        circuit: "Coastline Circuit",
        weather: "rain",
        laps: 3,
        basePurse: 28000,
        starsRequired: 20,
      },
      {
        id: "t3_e3",
        name: "TYPHOON MASTERS CUP",
        sub: "Adverse Condition Finale // 3 Laps",
        tierId: 3,
        circuit: "Coastline Circuit",
        weather: "rain",
        laps: 3,
        basePurse: 40000,
        starsRequired: 24,
      },
    ],
  },
  {
    id: 4,
    title: "TIER 4 // APEX WORLD CHAMPIONSHIP",
    subtitle: "THE PINNACLE GRAND PRIX",
    tagline: "The world's fastest drivers clashing for ultimate championship glory",
    starsRequired: 28,
    trophyName: "Gold Apex Champion Goblet",
    events: [
      {
        id: "t4_e1",
        name: "LEGENDS INVITATIONAL",
        sub: "World Tour Round 1 // 3 Laps",
        tierId: 4,
        circuit: "Coastline Circuit",
        weather: "sunset",
        laps: 3,
        basePurse: 45000,
        starsRequired: 28,
      },
      {
        id: "t4_e2",
        name: "MIDNIGHT ENDURANCE",
        sub: "Night Battle // 4 Laps",
        tierId: 4,
        circuit: "Coastline Circuit",
        weather: "night",
        laps: 4,
        basePurse: 65000,
        starsRequired: 31,
      },
      {
        id: "t4_e3",
        name: "APEX HORIZON CROWN",
        sub: "The Final Showdown // 4 Laps",
        tierId: 4,
        circuit: "Coastline Circuit",
        weather: "rain",
        laps: 4,
        basePurse: 100000,
        starsRequired: 34,
      },
    ],
  },
];

export interface CareerProgress {
  credits: number;
  stars: Record<string, number>; // eventId -> stars (1..3)
  bestPositions: Record<string, number>; // eventId -> position (1..8)
  upgrades: Record<string, CarUpgrades>; // carId -> CarUpgrades
}

export const INITIAL_CAREER_PROGRESS: CareerProgress = {
  credits: 5000, // starting seed money
  stars: {},
  bestPositions: {},
  upgrades: {
    solstice: { engine: 0, trans: 0, tires: 0, nitro: 0 },
    furia: { engine: 0, trans: 0, tires: 0, nitro: 0 },
    falcon: { engine: 0, trans: 0, tires: 0, nitro: 0 },
  },
};

export interface GameSettings {
  sfxVolume: number; // 0..100
  musicVolume: number; // 0..100
  engineVolume: number; // 0..100
  speedUnit: "mph" | "kmh";
  difficulty: DifficultyLevel;
  steeringSensitivity: number; // 0.8, 1.0, 1.25
  speedLines: boolean;
  cameraShake: number; // 0, 0.5, 1.0, 1.5
  lightTrails: boolean;
  rainEffects: boolean;
  autoThrottle: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  sfxVolume: 80,
  musicVolume: 75,
  engineVolume: 85,
  speedUnit: "mph",
  difficulty: "pro",
  steeringSensitivity: 1.0,
  speedLines: true,
  cameraShake: 1.0,
  lightTrails: true,
  rainEffects: true,
  autoThrottle: false,
};

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
