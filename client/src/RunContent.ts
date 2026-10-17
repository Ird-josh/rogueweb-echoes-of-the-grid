export type CharacterId = "vesper" | "nyx" | "bram" | "sol";

export type WeaponPattern =
  | "bolt"
  | "spread"
  | "rapid"
  | "heavy"
  | "piercing"
  | "burst"
  | "wave"
  | "orbit";

export interface CharacterDefinition {
  id: CharacterId;
  name: string;
  title: string;
  description: string;
  weaponId: string;
  abilityName: string;
  abilityDescription: string;
  cooldownMs: number;
  palette: Record<string, string>;
}

export interface WeaponDefinition {
  id: string;
  name: string;
  description: string;
  pattern: WeaponPattern;
  damage: number;
  fireRateMs: number;
  projectileSpeed: number;
  multishot: number;
  spread: number;
  pierce: number;
  color: string;
}

export interface UpgradeDefinition {
  id: string;
  name: string;
  description: string;
  damage?: number;
  fireRateMs?: number;
  moveSpeed?: number;
  maxHearts?: number;
  armor?: number;
  bombs?: number;
  multishot?: number;
  heal?: number;
}

export const CHARACTERS: CharacterDefinition[] = [
  {
    id: "vesper",
    name: "Vesper",
    title: "El Heredero Carmesí",
    description: "Equilibrado. Su orbe carmesí atraviesa un enemigo.",
    weaponId: "crimson-orb",
    abilityName: "Velo espectral",
    abilityDescription: "Se vuelve invulnerable durante 1.5 segundos.",
    cooldownMs: 12000,
    palette: { H: "#9c2839", C: "#111018", S: "#d9c4b8", E: "#ff4157", R: "#27202d", G: "#ce3549", B: "#12111b" },
  },
  {
    id: "nyx",
    name: "Nyx",
    title: "La Tejedora Umbría",
    description: "Rápida y precisa. Dispara dos agujas sombrías.",
    weaponId: "shade-needle",
    abilityName: "Paso umbrío",
    abilityDescription: "Aumenta su velocidad y atraviesa enemigos brevemente.",
    cooldownMs: 9000,
    palette: { H: "#342958", C: "#10101d", S: "#d5b7b0", E: "#b88cff", R: "#282142", G: "#9065cb", B: "#171528" },
  },
  {
    id: "bram",
    name: "Bram",
    title: "El Guardián de Hierro",
    description: "Resistente. Su martillo de chispa golpea con fuerza.",
    weaponId: "iron-psalm",
    abilityName: "Muro de hierro",
    abilityDescription: "Gana 2 cargas de armadura.",
    cooldownMs: 15000,
    palette: { H: "#aa6537", C: "#17191d", S: "#cfaa8e", E: "#f2bd57", R: "#42414a", G: "#db993c", B: "#292a32" },
  },
  {
    id: "sol",
    name: "Sol",
    title: "La Llama Errante",
    description: "Cadencia veloz. Dispara una abanico de fuego solar.",
    weaponId: "sun-burst",
    abilityName: "Nova solar",
    abilityDescription: "Daña y repele a todos los enemigos cercanos.",
    cooldownMs: 11000,
    palette: { H: "#d2873d", C: "#25191a", S: "#edc6a5", E: "#ffe778", R: "#56313b", G: "#ef6b37", B: "#302027" },
  },
];

export const WEAPONS: WeaponDefinition[] = [
  { id: "crimson-orb", name: "Orbe carmesí", description: "Proyectil equilibrado y penetrante.", pattern: "bolt", damage: 16, fireRateMs: 280, projectileSpeed: 420, multishot: 1, spread: 0, pierce: 1, color: "#ff4157" },
  { id: "shade-needle", name: "Aguja umbría", description: "Dos agujas rápidas.", pattern: "spread", damage: 9, fireRateMs: 360, projectileSpeed: 510, multishot: 2, spread: 0.16, pierce: 1, color: "#bd8aff" },
  { id: "iron-psalm", name: "Salmo de hierro", description: "Disparo lento de gran impacto.", pattern: "heavy", damage: 35, fireRateMs: 620, projectileSpeed: 330, multishot: 1, spread: 0, pierce: 2, color: "#f2bd57" },
  { id: "sun-burst", name: "Estallido solar", description: "Abanico de tres proyectiles.", pattern: "spread", damage: 10, fireRateMs: 390, projectileSpeed: 390, multishot: 3, spread: 0.42, pierce: 1, color: "#ffe778" },
  { id: "thorn-whip", name: "Látigo de espinas", description: "Ráfaga corta que perfora.", pattern: "burst", damage: 8, fireRateMs: 470, projectileSpeed: 460, multishot: 3, spread: 0.22, pierce: 2, color: "#92db73" },
  { id: "grave-bell", name: "Campana fúnebre", description: "Orbe lento que golpea fuerte.", pattern: "heavy", damage: 42, fireRateMs: 760, projectileSpeed: 280, multishot: 1, spread: 0, pierce: 2, color: "#c7b8aa" },
  { id: "saintly-repeater", name: "Repetidor santo", description: "Ráfaga veloz de bajo daño.", pattern: "rapid", damage: 7, fireRateMs: 145, projectileSpeed: 440, multishot: 1, spread: 0, pierce: 1, color: "#75e5d4" },
  { id: "blood-lance", name: "Lanza de sangre", description: "Rayo estrecho que atraviesa filas.", pattern: "piercing", damage: 22, fireRateMs: 430, projectileSpeed: 610, multishot: 1, spread: 0, pierce: 4, color: "#d6284c" },
  { id: "ashen-fan", name: "Abanico de ceniza", description: "Cinco fragmentos en cono amplio.", pattern: "spread", damage: 7, fireRateMs: 500, projectileSpeed: 350, multishot: 5, spread: 0.72, pierce: 1, color: "#aaa2af" },
  { id: "storm-rosary", name: "Rosario de tormenta", description: "Tres cuentas eléctricas penetrantes.", pattern: "burst", damage: 12, fireRateMs: 410, projectileSpeed: 500, multishot: 3, spread: 0.28, pierce: 2, color: "#75bfff" },
  { id: "void-mortar", name: "Mortero del vacío", description: "Bola explosiva, lenta y devastadora.", pattern: "heavy", damage: 56, fireRateMs: 920, projectileSpeed: 250, multishot: 1, spread: 0, pierce: 1, color: "#9e6bce" },
  { id: "mirror-shards", name: "Esquirlas espejo", description: "Cuatro fragmentos que rebotan entre presas.", pattern: "spread", damage: 9, fireRateMs: 510, projectileSpeed: 470, multishot: 4, spread: 0.5, pierce: 2, color: "#d3e8ec" },
  { id: "ember-caster", name: "Lanzabrasa", description: "Llamas rápidas de corto alcance.", pattern: "rapid", damage: 11, fireRateMs: 190, projectileSpeed: 310, multishot: 1, spread: 0, pierce: 1, color: "#ff7938" },
  { id: "frost-reliquary", name: "Relicario glacial", description: "Cristal frío que perfora dos objetivos.", pattern: "piercing", damage: 15, fireRateMs: 360, projectileSpeed: 390, multishot: 1, spread: 0, pierce: 2, color: "#8ceaff" },
  { id: "choir-cannon", name: "Cañón del coro", description: "Doble descarga de alto impacto.", pattern: "burst", damage: 20, fireRateMs: 590, projectileSpeed: 350, multishot: 2, spread: 0.12, pierce: 2, color: "#f5e5a8" },
  { id: "moon-disc", name: "Disco lunar", description: "Disco veloz que cruza varios enemigos.", pattern: "piercing", damage: 13, fireRateMs: 300, projectileSpeed: 550, multishot: 1, spread: 0, pierce: 3, color: "#a7a8ff" },
  { id: "crypt-flak", name: "Metralla de cripta", description: "Seis fragmentos de dispersión cercana.", pattern: "spread", damage: 6, fireRateMs: 540, projectileSpeed: 330, multishot: 6, spread: 0.9, pierce: 1, color: "#c78d62" },
  { id: "starfall", name: "Lluvia estelar", description: "Lluvia precisa de cuatro estrellas.", pattern: "burst", damage: 11, fireRateMs: 440, projectileSpeed: 520, multishot: 4, spread: 0.34, pierce: 1, color: "#ffda65" },
  { id: "reaper-hook", name: "Garfio del segador", description: "Gancho de gran daño que atraviesa.", pattern: "piercing", damage: 29, fireRateMs: 630, projectileSpeed: 400, multishot: 1, spread: 0, pierce: 3, color: "#74cf91" },
  { id: "echo-prism", name: "Prisma de ecos", description: "Ráfaga de cinco rayos veloces.", pattern: "burst", damage: 9, fireRateMs: 350, projectileSpeed: 580, multishot: 5, spread: 0.55, pierce: 2, color: "#f58ad8" },
];

export const UPGRADES: UpgradeDefinition[] = [
  { id: "heart-seal", name: "Sello vital", description: "Aumenta en 2 tus corazones máximos.", maxHearts: 2 },
  { id: "iron-skin", name: "Piel de hierro", description: "Añade 2 cargas de armadura.", armor: 2 },
  { id: "quick-hands", name: "Manos veloces", description: "Dispara un 12% más rápido.", fireRateMs: -34 },
  { id: "blood-rite", name: "Rito de sangre", description: "Cada proyectil inflige 6 puntos más de daño.", damage: 6 },
  { id: "fleet-boots", name: "Botas del espectro", description: "Aumenta tu velocidad de movimiento en 35.", moveSpeed: 35 },
  { id: "extra-rosary", name: "Rosario duplicado", description: "Añade 2 bombas al inventario.", bombs: 2 },
  { id: "split-sigil", name: "Sigilo dividido", description: "Dispara 1 proyectil adicional por ráfaga.", multishot: 1 },
  { id: "vigor-vial", name: "Vial de vigor", description: "Recupera 2 corazones.", heal: 2 },
  { id: "ashen-heart", name: "Corazón de ceniza", description: "Aumenta tu máximo y recupera 1 corazón.", maxHearts: 1, heal: 1 },
  { id: "cinder-edge", name: "Filo de brasa", description: "Cada proyectil inflige 12 puntos más de daño.", damage: 12 },
  { id: "wind-step", name: "Paso del viento", description: "Aumenta tu velocidad de movimiento en 60.", moveSpeed: 60 },
  { id: "silver-ward", name: "Amparo de plata", description: "Añade 3 cargas de armadura.", armor: 3 },
  { id: "rapid-chant", name: "Cántico veloz", description: "Dispara un 18% más rápido.", fireRateMs: -50 },
  { id: "thorn-crown", name: "Corona de espinas", description: "+8 daño y +1 armadura.", damage: 8, armor: 1 },
  { id: "blood-reserve", name: "Reserva vital", description: "Aumenta en 3 tus corazones máximos.", maxHearts: 3 },
  { id: "echo-chamber", name: "Cámara de ecos", description: "+2 proyectiles por disparo.", multishot: 2 },
  { id: "bomb-satchel", name: "Morral de pólvora", description: "Añade 3 bombas al inventario.", bombs: 3 },
  { id: "hunter-mark", name: "Marca del cazador", description: "+16 daño y +1 proyectil.", damage: 16, multishot: 1 },
  { id: "shadow-mantle", name: "Manto de sombra", description: "+25 velocidad y +2 armaduras.", moveSpeed: 25, armor: 2 },
  { id: "last-light", name: "Última luz", description: "Recupera 4 corazones y +1 máximo.", maxHearts: 1, heal: 4 },
];

export const STARTING_UNLOCKS = {
  characters: ["vesper", "nyx", "bram", "sol"] as CharacterId[],
  weapons: ["crimson-orb", "shade-needle", "iron-psalm", "sun-burst"],
};
