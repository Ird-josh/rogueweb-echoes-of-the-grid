export type GameAction =
  | "moveUp"
  | "moveDown"
  | "moveLeft"
  | "moveRight"
  | "shootUp"
  | "shootDown"
  | "shootLeft"
  | "shootRight"
  | "bomb"
  | "ability";

export type Difficulty = "easy" | "normal" | "hard";

export type ControlBindings = Record<GameAction, string>;

export interface GameSettings {
  musicEnabled: boolean;
  difficulty: Difficulty;
  controls: ControlBindings;
}

export const DEFAULT_SETTINGS: GameSettings = {
  musicEnabled: true,
  difficulty: "normal",
  controls: {
    moveUp: "w",
    moveDown: "s",
    moveLeft: "a",
    moveRight: "d",
    shootUp: "arrowup",
    shootDown: "arrowdown",
    shootLeft: "arrowleft",
    shootRight: "arrowright",
    bomb: "e",
    ability: "q",
  },
};

export const GAME_ACTIONS: { id: GameAction; label: string }[] = [
  { id: "moveUp", label: "Mover arriba" },
  { id: "moveDown", label: "Mover abajo" },
  { id: "moveLeft", label: "Mover izquierda" },
  { id: "moveRight", label: "Mover derecha" },
  { id: "shootUp", label: "Disparar arriba" },
  { id: "shootDown", label: "Disparar abajo" },
  { id: "shootLeft", label: "Disparar izquierda" },
  { id: "shootRight", label: "Disparar derecha" },
  { id: "bomb", label: "Usar bomba" },
  { id: "ability", label: "Habilidad del personaje" },
];
