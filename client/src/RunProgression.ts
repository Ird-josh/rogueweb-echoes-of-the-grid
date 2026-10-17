const STORAGE_KEY = "rogueweb-run-progression-v1";

export interface RunProgression {
  wins: number;
  shards: number;
  newGamePlusUnlocked: boolean;
  damageLevel: number;
  healthLevel: number;
  armorLevel: number;
}

export const DEFAULT_PROGRESSION: RunProgression = {
  wins: 0,
  shards: 0,
  newGamePlusUnlocked: false,
  damageLevel: 0,
  healthLevel: 0,
  armorLevel: 0,
};

export const loadProgression = (): RunProgression => {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return { ...DEFAULT_PROGRESSION };

  try {
    const value: unknown = JSON.parse(stored);
    if (!value || typeof value !== "object") throw new Error("Formato de progreso inválido");
    const data = value as Partial<RunProgression>;
    const nonnegativeInteger = (candidate: unknown) =>
      typeof candidate === "number" && Number.isInteger(candidate) && candidate >= 0 ? candidate : 0;
    return {
      wins: nonnegativeInteger(data.wins),
      shards: nonnegativeInteger(data.shards),
      newGamePlusUnlocked: data.newGamePlusUnlocked === true,
      damageLevel: nonnegativeInteger(data.damageLevel),
      healthLevel: nonnegativeInteger(data.healthLevel),
      armorLevel: nonnegativeInteger(data.armorLevel),
    };
  } catch (error) {
    console.error("No se pudo leer el progreso guardado:", error);
    return { ...DEFAULT_PROGRESSION };
  }
};

export const saveProgression = (progression: RunProgression) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progression));
};

export const upgradeCost = (level: number) => 3 + level * 2;
