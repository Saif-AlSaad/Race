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

export type BodyStyle = "gt" | "proto" | "rally" | "cyber" | "muscle";
export type WheelStyle = "forged_y" | "centerlock_star" | "bronze_dish" | "turbofan" | "muscle_deep";

export interface CarDef {
  id: string;
  name: string;
  cls: string;
  desc: string;
  bodyStyle: BodyStyle;
  wheelStyle: WheelStyle;
  caliperColor: string;
  badgeText: string;
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
    desc: "Sculpted British Grand Tourer. Twin-turbo V8, continuous horizon lightbar, and endless high-speed stability.",
    bodyStyle: "gt",
    wheelStyle: "forged_y",
    caliperColor: "#ffd600",
    badgeText: "APX·S07",
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
    desc: "Italian Le Mans prototype hypercar. Extreme ground-effect venturis, screaming V12, and massive active swan-neck wing.",
    bodyStyle: "proto",
    wheelStyle: "centerlock_star",
    caliperColor: "#ef4444",
    badgeText: "CORSA·12",
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
    desc: "Japanese Group-A widebody track weapon. Turbo boxer punch, blister arches, aggressive GT wing, and twin halo taillights.",
    bodyStyle: "rally",
    wheelStyle: "bronze_dish",
    caliperColor: "#00e5ff",
    badgeText: "MK2·RLY",
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
  {
    id: "spectre",
    name: "SPECTRE RS",
    cls: "CYBER // HYPER-ELECTRIC",
    desc: "Next-gen cybernetic hyper-coupe. Quad synchronous e-motors, active aero splitters, and full-width matrix LED lightbar.",
    bodyStyle: "cyber",
    wheelStyle: "turbofan",
    caliperColor: "#a855f7",
    badgeText: "CYB·001",
    engineType: "QUAD SYNCHRONOUS E-MOTORS",
    bhp: 820,
    weightKg: 1350,
    zeroToSixty: 2.3,
    maxSpeedDisplay: 228,
    lateralG: 1.34,
    base: "#6366f1",
    dark: "#2b236e",
    light: "#a5b4fc",
    glassHi: "#c7d2fe",
    glassLo: "#0d0b24",
    accent: "#38bdf8",
    topSpeed: 1.04,
    accel: 1.15,
    grip: 1.05,
    statTop: 0.90,
    statAcc: 0.98,
    statGrip: 0.88,
  },
  {
    id: "venom",
    name: "VENOM GT-R",
    cls: "MUSCLE // RAW TORQUE",
    desc: "Brutal widebody American muscle beast. Supercharged 6.2L crossplane V8, rear window louvers, dual stripes, and tri-bar sequential LEDs.",
    bodyStyle: "muscle",
    wheelStyle: "muscle_deep",
    caliperColor: "#f97316",
    badgeText: "V8·BRUTE",
    engineType: "6.2L SUPERCHARGED HEMI V8",
    bhp: 710,
    weightKg: 1460,
    zeroToSixty: 2.9,
    maxSpeedDisplay: 218,
    lateralG: 1.20,
    base: "#15803d",
    dark: "#0f3e1f",
    light: "#4ade80",
    glassHi: "#86efac",
    glassLo: "#061f10",
    accent: "#fbbf24",
    topSpeed: 1.02,
    accel: 1.06,
    grip: 0.92,
    statTop: 0.84,
    statAcc: 0.88,
    statGrip: 0.72,
  },
];

export interface CustomPaint {
  id: string;
  name: string;
  finish: "metallic" | "pearlescent" | "matte" | "gloss";
  base: string;
  dark: string;
  light: string;
  accent: string;
}

export const CUSTOM_PAINTS: CustomPaint[] = [
  { id: "factory", name: "FACTORY SPEC", finish: "gloss", base: "#e07f16", dark: "#8a4a0c", light: "#ffc36e", accent: "#ffe9c2" },
  { id: "gold", name: "LIQUID GOLD", finish: "metallic", base: "#d97706", dark: "#78350f", light: "#fde68a", accent: "#ffffff" },
  { id: "rosso", name: "CORSA ROSSO", finish: "gloss", base: "#dc2626", dark: "#7f1d1d", light: "#fca5a5", accent: "#fef08a" },
  { id: "cyan", name: "CYBER CYAN", finish: "pearlescent", base: "#06b6d4", dark: "#164e63", light: "#67e8f9", accent: "#a5f3fc" },
  { id: "stealth", name: "STEALTH NERO", finish: "matte", base: "#1e212b", dark: "#0b0c10", light: "#4b5563", accent: "#38bdf8" },
  { id: "british", name: "VERDE RACING", finish: "metallic", base: "#166534", dark: "#052e16", light: "#86efac", accent: "#fde047" },
  { id: "violet", name: "HYPER PLUM", finish: "pearlescent", base: "#7c3aed", dark: "#3b0764", light: "#c4b5fd", accent: "#f472b6" },
  { id: "arctic", name: "FROST WHITE", finish: "pearlescent", base: "#e2e8f0", dark: "#64748b", light: "#ffffff", accent: "#38bdf8" },
];

export interface Rival {
  name: string;
  base: string;
  dark: string;
  light: string;
  accent: string;
  carId: string;
}

export const RIVALS: Rival[] = [
  { name: "VEX", base: "#3d7bd9", dark: "#1d3a75", light: "#8fb8ff", accent: "#d7e6ff", carId: "furia" },
  { name: "KIRA", base: "#7e3fd4", dark: "#3d1a6e", light: "#c79bff", accent: "#efe0ff", carId: "spectre" },
  { name: "DUSK", base: "#2b2f3a", dark: "#12141b", light: "#8a93a8", accent: "#ffe9c2", carId: "venom" },
  { name: "MIRA", base: "#d44fa0", dark: "#6e1f50", light: "#ff9fd4", accent: "#ffe0f0", carId: "falcon" },
  { name: "KANE", base: "#2f9e5f", dark: "#14532e", light: "#8fe0ae", accent: "#e2ffe9", carId: "solstice" },
  { name: "JOLT", base: "#d9c13a", dark: "#6e5c12", light: "#fff0a0", accent: "#fff8d6", carId: "furia" },
  { name: "ORION", base: "#c9581e", dark: "#66300d", light: "#ffa675", accent: "#ffe7d6", carId: "venom" },
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
  curbLip: string;
  curbShadow: string;
  shoulderLight: string;
  shoulderDark: string;
  gravelLight: string;
  gravelDark: string;
  vergeLight: string;
  vergeDark: string;
  waterLight: string;
  waterDark: string;
  waterFoam: string;
  barrierPlate: string;
  barrierPost: string;
  barrierReflectLeft: string;
  barrierReflectRight: string;
  lane: string;
  edge: string;
  ambientLight: number;
  wetness: number;
}

export const SCENES: Record<WeatherMode, ScenePalette> = {
  sunset: {
    fog: "#e2a06b",
    roadLight: "#686461",
    roadDark: "#5f5b58",
    grassLight: "#7d854e",
    grassDark: "#6e7544",
    rumbleLight: "#f4ede1",
    rumbleDark: "#c0392b",
    curbLip: "#ffffff",
    curbShadow: "rgba(35, 20, 15, 0.45)",
    shoulderLight: "#4e4b48",
    shoulderDark: "#45423f",
    gravelLight: "#c8a577",
    gravelDark: "#b49266",
    vergeLight: "#676046",
    vergeDark: "#57513b",
    waterLight: "#2c5d79",
    waterDark: "#1f445a",
    waterFoam: "rgba(255, 245, 230, 0.75)",
    barrierPlate: "#bcc0cc",
    barrierPost: "#4a4f5c",
    barrierReflectLeft: "#ffffff",
    barrierReflectRight: "#ef4444",
    lane: "rgba(240, 234, 216, 0.8)",
    edge: "rgba(255, 240, 210, 0.22)",
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
    curbLip: "#a5f3fc",
    curbShadow: "rgba(0, 0, 0, 0.7)",
    shoulderLight: "#14151e",
    shoulderDark: "#0e0f16",
    gravelLight: "#191c26",
    gravelDark: "#12141c",
    vergeLight: "#0e131c",
    vergeDark: "#090d14",
    waterLight: "#081324",
    waterDark: "#040914",
    waterFoam: "rgba(0, 229, 255, 0.45)",
    barrierPlate: "#262938",
    barrierPost: "#141620",
    barrierReflectLeft: "#00e5ff",
    barrierReflectRight: "#ff007f",
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
    curbLip: "#ffffff",
    curbShadow: "rgba(0, 5, 15, 0.65)",
    shoulderLight: "#0e131d",
    shoulderDark: "#090d14",
    gravelLight: "#18222f",
    gravelDark: "#121a24",
    vergeLight: "#101822",
    vergeDark: "#0b1017",
    waterLight: "#0d1b2a",
    waterDark: "#07101a",
    waterFoam: "rgba(186, 230, 253, 0.6)",
    barrierPlate: "#3b4252",
    barrierPost: "#1f232b",
    barrierReflectLeft: "#38bdf8",
    barrierReflectRight: "#ef4444",
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

export type DifficultyLevel = "noob" | "medium" | "pro" | "grandmaster";

export const DIFFICULTY_LEVELS: DifficultyLevel[] = ["noob", "medium", "pro", "grandmaster"];

export interface DifficultyConfig {
  id: DifficultyLevel;
  label: string;
  badge: string;
  aiSpeedMult: number;
  cashMult: number;
  desc: string;
  tagline: string;
  color: string;
}

export const DIFFICULTIES: Record<DifficultyLevel, DifficultyConfig> & Record<string, DifficultyConfig> = {
  noob: {
    id: "noob",
    label: "NOOB",
    badge: "ROOKIE // 1X",
    aiSpeedMult: 0.82,
    cashMult: 1.0,
    desc: "Forgiving opponents, gentle cornering, relaxed pace. Standard 1x purse.",
    tagline: "Beginner Friendly",
    color: "#10b981",
  },
  medium: {
    id: "medium",
    label: "MEDIUM",
    badge: "CHALLENGER // 2X",
    aiSpeedMult: 0.95,
    cashMult: 2.0,
    desc: "Balanced competition, active rival overtakes. Double 2x prize purse.",
    tagline: "Standard Pace",
    color: "#0ea5e9",
  },
  pro: {
    id: "pro",
    label: "PRO",
    badge: "VETERAN // 3X",
    aiSpeedMult: 1.06,
    cashMult: 3.0,
    desc: "Aggressive pack racing, late braking, tight overtakes. Triple 3x high-stakes purse.",
    tagline: "Fast & Aggressive",
    color: "#ff9e3d",
  },
  grandmaster: {
    id: "grandmaster",
    label: "GRANDMASTER",
    badge: "APEX // 5X",
    aiSpeedMult: 1.18,
    cashMult: 5.0,
    desc: "Apex predator AI, surgical racing lines, zero mercy. Massive 5x jackpot purse!",
    tagline: "Ultimate Challenge",
    color: "#f43f5e",
  },
};

// Aliases for backward compatibility with legacy saves
(DIFFICULTIES as Record<string, DifficultyConfig>).amateur = DIFFICULTIES.noob;
(DIFFICULTIES as Record<string, DifficultyConfig>).legend = DIFFICULTIES.grandmaster;

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
  steeringSensitivity: number; // 0.8, 1.0, 1.25, etc.
  speedLines: boolean;
  cameraShake: number; // 0, 0.5, 1.0, 1.5
  lightTrails: boolean;
  rainEffects: boolean;
  autoThrottle: boolean;
  touchControls: "auto" | "always" | "never";
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
  touchControls: "auto",
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
