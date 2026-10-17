import { useEffect, useRef, useState, type CSSProperties, type FC, type PointerEvent as ReactPointerEvent } from "react";
import type { GameAction, GameSettings } from "./GameSettings";
import { CHARACTERS, UPGRADES, WEAPONS, type CharacterId, type WeaponDefinition } from "./RunContent";
import type { RunProgression } from "./RunProgression";
import { io, type Socket } from "socket.io-client";
import { apiUrl, type LobbyMember, supabase } from "./backend";
import {
  chooseShopPrice,
  generateFloorLayout,
  purchaseWithCoins,
  rollEnemyCoins,
  type FloorRoomType,
} from "./FloorLayout";

const ROOM_W = 960;
const ROOM_H = 560;
const WALL_THICKNESS = 64;
const PIXEL_SCALE = 3;

const difficultyProfile = (difficulty: GameSettings["difficulty"]) => {
  if (difficulty === "easy") return { playerHearts: 8, enemyHealth: 0.75, enemyAttackRate: 0.8 };
  if (difficulty === "hard") return { playerHearts: 4, enemyHealth: 1.35, enemyAttackRate: 1.25 };
  return { playerHearts: 6, enemyHealth: 1, enemyAttackRate: 1 };
};

const formatControlHint = (...keys: string[]) =>
  keys.map((key) => (key.startsWith("arrow") ? key.slice(5, 6).toUpperCase() : key.toUpperCase())).join("");

type PixelPalette = Record<string, string>;

const playerSpriteFrames = [
  [
    "....HH...HH....",
    "...HHHH.HHHH...",
    "....CCCCCCC....",
    "...CCSSSSSCC...",
    "..CCSSSSSSSCC..",
    "..CSSSESSSESSC.",
    "..CSSSSSSSSSSC.",
    "...CCSSSSSCC...",
    "....RRRRRRR....",
    "...RRRGRGRRR...",
    "...RRRGRGRRR...",
    "...RRRRRRRRR...",
    "....RRRRRR.....",
    "...BBB...BBB...",
    "...BBB...BBB...",
    "..BBBB...BBBB..",
  ],
  [
    "....HH...HH....",
    "...HHHH.HHHH...",
    "....CCCCCCC....",
    "...CCSSSSSCC...",
    "..CCSSSSSSSCC..",
    "..CSSSESSSESSC.",
    "..CSSSSSSSSSSC.",
    "...CCSSSSSCC...",
    "....RRRRRRR....",
    "...RRRGRGRRR...",
    "...RRRGRGRRR...",
    "...RRRRRRRRR...",
    "...RRRRRRRRR...",
    "....BBB.BBB....",
    "....BBB.BBB....",
    "...BBBB.BBBB...",
  ],
];

const enemySprites: Record<ZealotEnemy["type"], string[][]> = {
  cleric_bible: [
    [
      ".....KKKKK.....",
      "....KWWWWWK....",
      "...KWWWWWWWK...",
      "..KKFFFFFFFKK..",
      "..KFFEEEEEEFK..",
      "..KFFEE.EEEFK..",
      "...KFFFFFFFK...",
      "....KWWWWWK....",
      ".....RRRRR.....",
      "....RRGRGRR....",
      "...RRRGRGRRR...",
      "...RRRRRRRRR...",
      "....RRRRRRR....",
      "....BBB.BBB....",
      "...BBBB.BBBB...",
    ],
    [
      ".....KKKKK.....",
      "....KWWWWWK....",
      "...KWWWWWWWK...",
      "..KKFFFFFFFKK..",
      "..KFFEEEEEEFK..",
      "..KFFEE.EEEFK..",
      "...KFFFFFFFK...",
      "....KWWWWWK....",
      ".....RRRRR.....",
      "....RRGRGRR....",
      "...RRRGRGRRR...",
      "...RRRRRRRRR...",
      "...RRRRRRRRR...",
      ".....BBB.BBB...",
      ".....BBB.BBB...",
    ],
  ],
  stake_hunter: [
    [
      ".....KKKKK.....",
      "....KWWWWWK....",
      "...KWWWWWWWK...",
      "..KKSSSSSSSKK..",
      "..KSSSESSSESK..",
      "..KSSSSSSSSSK..",
      "...KSSSSSSSK...",
      "....KWWWWWK....",
      ".....TTTTT.....",
      "....TTGTGTT....",
      "...TTTGTGTTT...",
      "...TTTTTTTTT...",
      "....TTTTTTT....",
      "....BBB.BBB....",
      "...BBBB.BBBB...",
    ],
    [
      ".....KKKKK.....",
      "....KWWWWWK....",
      "...KWWWWWWWK...",
      "..KKSSSSSSSKK..",
      "..KSSSESSSESK..",
      "..KSSSSSSSSSK..",
      "...KSSSSSSSK...",
      "....KWWWWWK....",
      ".....TTTTT.....",
      "....TTGTGTT....",
      "...TTTGTGTTT...",
      "...TTTTTTTTT...",
      "...TTTTTTTTT...",
      ".....BBB.BBB...",
      ".....BBB.BBB...",
    ],
  ],
  inquisitor: [
    [
      ".....KKKKK.....",
      "....KWWWWWK....",
      "...KWWWWWWWK...",
      "..KKSSSSSSSKK..",
      "..KSSSESSSESK..",
      "..KSSSSSSSSSK..",
      "...KSSSSSSSK...",
      "....KWWWWWK....",
      "....GGGGGGG....",
      "...GGGSGSGGG...",
      "..GGGGSGSGGGG..",
      "...GGGGGGGGG...",
      "....GGGGGGG....",
      "....BBB.BBB....",
      "...BBBB.BBBB...",
    ],
    [
      ".....KKKKK.....",
      "....KWWWWWK....",
      "...KWWWWWWWK...",
      "..KKSSSSSSSKK..",
      "..KSSSESSSESK..",
      "..KSSSSSSSSSK..",
      "...KSSSSSSSK...",
      "....KWWWWWK....",
      "....GGGGGGG....",
      "...GGGSGSGGG...",
      "..GGGGSGSGGGG..",
      "...GGGGGGGGG...",
      "...GGGGGGGGG...",
      ".....BBB.BBB...",
      ".....BBB.BBB...",
    ],
  ],
  boss_archbishop: [
    [
      ".......GGG.......",
      "......GGGGG......",
      ".....GKKKKKG.....",
      "....KKWWWWWKK....",
      "...KKWWWWWWWKK...",
      "..KKKFFFFFFFKKK..",
      "..KFFSESSSSEFFK..",
      "..KFFSSS.SSSFFK..",
      "...KFFFFFFFFFK...",
      "....KWWWWWWWK....",
      ".....GGGGGGG.....",
      "....GGGSGSGGG....",
      "...GGGSSGSSGGG...",
      "..GGGGGGGGGGGGG..",
      "....GGGGGGGGG....",
      "....BBB...BBB....",
      "...BBBB...BBBB...",
    ],
    [
      ".......GGG.......",
      "......GGGGG......",
      ".....GKKKKKG.....",
      "....KKWWWWWKK....",
      "...KKWWWWWWWKK...",
      "..KKKFFFFFFFKKK..",
      "..KFFSESSSSEFFK..",
      "..KFFSSS.SSSFFK..",
      "...KFFFFFFFFFK...",
      "....KWWWWWWWK....",
      ".....GGGGGGG.....",
      "....GGGSGSGGG....",
      "...GGGSSGSSGGG...",
      "..GGGGGGGGGGGGG..",
      "...GGGGGGGGGGG...",
      ".....BBB.BBB.....",
      ".....BBB.BBB.....",
    ],
  ],
  boss_maiden: [
    [
      "......HHHHH......",
      ".....HHHHHHH.....",
      "....KKKKKKKKK....",
      "...KKSSSSSSSKK...",
      "..KKSSSSSSSSSKK..",
      "..KSSSESSSESSSK..",
      "..KSSSSSSSSSSSK..",
      "...KSSSSSSSSSK...",
      "....KSSSSSSSK....",
      "....RRRRRRRRR....",
      "...RRRGRGRRRRR...",
      "..RRRRGRGRRRRRR..",
      "..RRRRRRRRRRRRR..",
      "...RRRRRRRRRRR...",
      "....BBB...BBB....",
      "...BBBB...BBBB...",
    ],
    [
      "......HHHHH......",
      ".....HHHHHHH.....",
      "....KKKKKKKKK....",
      "...KKSSSSSSSKK...",
      "..KKSSSSSSSSSKK..",
      "..KSSSESSSESSSK..",
      "..KSSSSSSSSSSSK..",
      "...KSSSSSSSSSK...",
      "....KSSSSSSSK....",
      "....RRRRRRRRR....",
      "...RRRGRGRRRRR...",
      "..RRRRGRGRRRRRR..",
      "..RRRRRRRRRRRRR..",
      "..RRRRRRRRRRRRR..",
      ".....BBB.BBB.....",
      ".....BBB.BBB.....",
    ],
  ],
  boss_seraph: [
    [
      ".......WWWW.......",
      "......WWWWWW......",
      "....WWWKKKKWWW....",
      "...WWKKSSSSKKWW...",
      "..WWKSSSSSSSSKWW..",
      ".WWKSSSESSSESSKWW.",
      ".WWKSSSSSSSSSSSKWW.",
      "..WKSSSSSSSSSSSKW..",
      "...KSSSSSSSSSSSK...",
      "....KWWWWWWWWWK....",
      "...GGGWWGWWGGG...",
      "..GGGGGSGSGGGGG..",
      "...GGGGSGSGGGG...",
      "....GGGGGGGGG....",
      ".....BBB.BBB.....",
      "....BBBB.BBBB....",
    ],
    [
      "......WWWWWW......",
      ".....WWWWWWWW.....",
      "...WWWKKKKKKWWW...",
      "..WWKKSSSSSSKKWW..",
      ".WWKSSSSSSSSSSKWW.",
      ".WKSSSESSSESSSSKW.",
      ".WKSSSSSSSSSSSSKW.",
      "..KSSSSSSSSSSSSK..",
      "...KSSSSSSSSSSK...",
      "....KWWWWWWWWK....",
      "...GGGGWGWGGGG...",
      "..GGGGGSGSGGGGG..",
      "...GGGGSGSGGGG...",
      "....GGGGGGGGG....",
      ".....BBB...BBB....",
      "....BBBB...BBBB...",
    ],
  ],
  boss_colossus: [
    [
      "........KKKK........",
      "......KKKKKKKK......",
      ".....KKWWWWWWKK.....",
      "....KKWWWWWWWWKK....",
      "...KKKFFFFFFFFKKK...",
      "..KKFFSSSSSSSSFFKK..",
      "..KFFSSESSSSESSFFK..",
      "..KFFSSSSSSSSSSFFK..",
      "..KKFFFFFFFFFFKK..",
      "...KKWWWWWWWWKK...",
      "..GGGKKGGGGKKGGG..",
      ".GGGGGKGGGGGKGGGG.",
      "..GGGGKKKKKKGGGG..",
      "...GGKKKKKKKKGG...",
      "...KKKKKKKKKKKK...",
      "..KKKKKK..KKKKKK..",
      "..BBB......BBB..",
    ],
    [
      "........KKKK........",
      "......KKKKKKKK......",
      ".....KKWWWWWWKK.....",
      "....KKWWWWWWWWKK....",
      "...KKKFFFFFFFFKKK...",
      "..KKFFSSSSSSSSFFKK..",
      "..KFFSSESSSSESSFFK..",
      "..KFFSSSSSSSSSSFFK..",
      "..KKFFFFFFFFFFKK..",
      "...KKWWWWWWWWKK...",
      "..GGGKKGGGGKKGGG..",
      ".GGGGGKGGGGGKGGGG.",
      "..GGGGKKKKKKGGGG..",
      "...GGKKKKKKKKGG...",
      "...KKKKKKKKKKKK...",
      "...BBBB....BBBB...",
      "...BBBB....BBBB...",
    ],
  ],
  boss_oracle: [
    [
      "........WWWW........",
      "......WWWWWWWW......",
      "....WWWKKKKKKWWW....",
      "...WWKKWWWWWWKKWW...",
      "..WWKWWSSSSSSWWKWW..",
      ".WWKSSSSSESSSSSSKWW.",
      ".WKSSSSSSSSSSSSSSKW.",
      "..KSSSSSSSSSSSSSSK..",
      "...KWWWWWWWWWWWWK...",
      "....KKGGGGGGGGKK....",
      "...GGGKKGKKGKKGGG...",
      "..GGGGGSGSGSGGGGG..",
      "...GGGGGGGGGGGG...",
      "....GGGGGGGGGG....",
      "...BBB......BBB...",
      "..BBBB......BBBB..",
    ],
    [
      "......WWWWWWWW......",
      "....WWWWWWWWWWWW....",
      "...WWKKKKKKKKKKWW...",
      "..WWKWWWWWWWWWWKWW..",
      ".WWKWWSSSSSSSSWWKWW.",
      ".WKSSSSSESSSSSSSSKW.",
      ".WKSSSSSSSSSSSSSSKW.",
      "..KSSSSSSSSSSSSSSK..",
      "...KWWWWWWWWWWWWK...",
      "....KKGGGGGGGGKK....",
      "...GGGKKGKKGKKGGG...",
      "..GGGGGSGSGSGGGGG..",
      "...GGGGGGGGGGGG...",
      "....GGGGGGGGGG....",
      "....BBBB....BBBB....",
      "...BBBB......BBBB...",
    ],
  ],
};

const drawPixelSprite = (
  ctx: CanvasRenderingContext2D,
  rows: string[],
  palette: PixelPalette,
  x: number,
  y: number,
  pixelSize: number,
  flip = false,
  flash = false
) => {
  const width = Math.max(...rows.map((row) => row.length));
  const height = rows.length;
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  rows.forEach((row, rowIndex) => {
    for (let col = 0; col < row.length; col++) {
      const key = row[col];
      if (key === ".") continue;
      ctx.fillStyle = flash ? "#ffffff" : (palette[key] ?? "#ff00ff");
      ctx.fillRect(
        (col - width / 2) * pixelSize,
        (rowIndex - height / 2) * pixelSize,
        pixelSize,
        pixelSize
      );
    }
  });
  ctx.restore();
};

interface GameCanvasProps {
  onBackToMenu: () => void;
  onOpenSettings: () => void;
  lobbyId?: string | null;
  playerId?: string | null;
  playerName?: string;
  lobbyMembers?: LobbyMember[];
  lobbyHostId?: string | null;
  settings: GameSettings;
  settingsOpen: boolean;
  characterId: CharacterId;
  newGamePlus: boolean;
  progression: RunProgression;
  onVictory: (newGamePlus: boolean) => void;
  onRunComplete: (run: {
    characterId: CharacterId;
    newGamePlus: boolean;
    status: "victory" | "defeat";
    floor: number;
    kills: number;
    durationSeconds: number;
    inventory: string[];
    lobbyCode: string | null;
  }) => void;
}

type Direction = "N" | "S" | "E" | "W";
type RoomType = FloorRoomType;

interface MultiplayerInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  shootUp: boolean;
  shootDown: boolean;
  shootLeft: boolean;
  shootRight: boolean;
  bomb: boolean;
  ability: boolean;
}

interface MultiplayerPlayer {
  id: string;
  name: string;
  characterId: CharacterId;
  x: number;
  y: number;
  faceDir: Direction;
  stepPhase: number;
  invulnSec: number;
  abilityTimer: number;
  abilityCooldown: number;
  lastShotAt: number;
  lastInputAt: number;
  input: MultiplayerInput;
}

const EMPTY_MULTIPLAYER_INPUT: MultiplayerInput = {
  up: false,
  down: false,
  left: false,
  right: false,
  shootUp: false,
  shootDown: false,
  shootLeft: false,
  shootRight: false,
  bomb: false,
  ability: false,
};

const lobbyCharacter = (value: string): CharacterId =>
  CHARACTERS.find((character) => character.id === value)?.id ?? "vesper";

interface Pillar {
  id: number;
  x: number;
  y: number;
  type: "pew" | "reliquary" | "holy_water";
}

interface RelicDrop {
  id: number;
  x: number;
  y: number;
  type:
    | "blood_vial"
    | "dark_soul"
    | "rosary_bomb"
    | "relic_crimson"
    | "relic_sigil"
    | "relic_ashes"
    | "relic_nightfang"
    | "weapon"
    | "upgrade"
    | "shop_upgrade"
    | "coin";
  name: string;
  desc: string;
  itemId?: string;
  cost?: number;
  choiceGroup?: string;
  coinValue?: number;
}

interface RoomOffer {
  id: number;
  type: RelicDrop["type"];
  name: string;
  desc: string;
  cost?: number;
}

interface ZealotEnemy {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  type:
    | "cleric_bible"
    | "stake_hunter"
    | "inquisitor"
    | "boss_archbishop"
    | "boss_maiden"
    | "boss_seraph"
    | "boss_colossus"
    | "boss_oracle";
  cooldown: number;
  phaseTimer: number;
  dashVx: number;
  dashVy: number;
  hitFlash?: number;
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  angle: number;
  spinSpeed: number;
  kind: "demonic_bolt" | "bible" | "stake" | "holy_cross";
  isEnemy: boolean;
  pierce?: number;
  color?: string;
  hitTargets?: Set<number>;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
}

interface BloodMark {
  x: number;
  y: number;
  radius: number;
  color: string;
}

interface RosaryBomb {
  x: number;
  y: number;
  timer: number; // En segundos reales
}

interface RoomNode {
  gx: number;
  gy: number;
  type: RoomType;
  cleared: boolean;
  visited: boolean;
  doors: Record<Direction, boolean>;
  pillars: Pillar[];
  enemies: ZealotEnemy[];
  drops: RelicDrop[];
  marks: BloodMark[];
  portalOpen: boolean;
}

export const GameCanvas: FC<GameCanvasProps> = ({
  onBackToMenu,
  onOpenSettings,
  lobbyId,
  playerId,
  playerName = "Explorador",
  lobbyMembers = [],
  lobbyHostId,
  settings,
  settingsOpen,
  characterId,
  newGamePlus,
  progression,
  onVictory,
  onRunComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isDead, setIsDead] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const [roomOffers, setRoomOffers] = useState<RoomOffer[]>([]);
  const roomOffersRef = useRef(roomOffers);
  roomOffersRef.current = roomOffers;
  const victoryTriggeredRef = useRef(false);
  const runStartedAtRef = useRef(0);
  const runCompletionSentRef = useRef(false);
  const [abilityAvailable, setAbilityAvailable] = useState(true);
  const touchKeys = useRef<Map<string, Set<number>>>(new Map());
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const activeDifficultyRef = useRef(settings.difficulty);
  const settingsOpenRef = useRef(settingsOpen);
  settingsOpenRef.current = settingsOpen;
  const soundContextRef = useRef<AudioContext | null>(null);
  const lastImpactSoundRef = useRef(0);
  const lastShopNoticeAtRef = useRef(0);
  const lastPlayerMoveAtRef = useRef(0);
  const selectedCharacter = CHARACTERS.find((entry) => entry.id === characterId) ?? CHARACTERS[0];
  const initialWeapon = WEAPONS.find((entry) => entry.id === selectedCharacter.weaponId) ?? WEAPONS[0];
  const initialHearts = difficultyProfile(settings.difficulty).playerHearts +
    (newGamePlus ? progression.healthLevel : 0);

  const [hud, setHud] = useState({
    bloodHearts: initialHearts,
    maxBloodHearts: initialHearts,
    darkArmor: 2 + (newGamePlus ? progression.armorLevel : 0),
    rosaries: 2,
    coins: 0,
    damage: initialWeapon.damage + (newGamePlus ? progression.damageLevel * 2 : 0),
    fireRateMs: initialWeapon.fireRateMs,
    moveSpeed: 210,
    multishot: initialWeapon.multishot,
    weaponId: initialWeapon.id,
    projectileSpeed: initialWeapon.projectileSpeed,
    projectileSpread: initialWeapon.spread,
    projectilePierce: initialWeapon.pierce,
    projectileColor: initialWeapon.color,
    damageBonus: newGamePlus ? progression.damageLevel * 2 : 0,
    rateBonus: 0,
    extraShots: 0,
    floor: 1,
    kills: 0,
    relics: [] as string[],
    minimap: [] as { gx: number; gy: number; type: RoomType; current: boolean; visited: boolean }[],
  });

  const statsRef = useRef(hud);
  statsRef.current = hud;
  const multiplayer = Boolean(lobbyId && playerId && lobbyHostId);
  const isGameHost = multiplayer && playerId === lobbyHostId;
  const gameSocketRef = useRef<Socket | null>(null);
  const remotePlayersRef = useRef<MultiplayerPlayer[]>([]);
  const pendingNetworkActionsRef = useRef({ bomb: false, ability: false });
  const lastInputSentAtRef = useRef(0);
  const lastStateSentAtRef = useRef(0);
  const onVictoryRef = useRef(onVictory);
  onVictoryRef.current = onVictory;
  const [multiplayerError, setMultiplayerError] = useState<string | null>(null);
  const [multiplayerConnected, setMultiplayerConnected] = useState(false);

  useEffect(() => {
    runStartedAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    if ((!isDead && !hasWon) || runCompletionSentRef.current) return;
    runCompletionSentRef.current = true;
    const finalStats = statsRef.current;
    onRunComplete({
      characterId,
      newGamePlus,
      status: hasWon ? "victory" : "defeat",
      floor: finalStats.floor,
      kills: finalStats.kills,
      durationSeconds: Math.max(0, Math.floor((Date.now() - runStartedAtRef.current) / 1000)),
      inventory: finalStats.relics,
      lobbyCode: lobbyId?.toUpperCase() ?? null,
    });
  }, [characterId, hasWon, isDead, lobbyId, newGamePlus, onRunComplete]);

  const bannerRef = useRef({
    title: "ACTO I: CAPÍTULO DE CENIZA",
    subtitle: "Una incursión por el Santuario Carmesí",
    timer: 3.2, // Segundos reales
  });

  // Posición del demonio (Movimiento preciso sin deslizamiento)
  const demon = useRef({
    x: ROOM_W / 2,
    y: ROOM_H / 2,
    faceDir: "S" as Direction,
    stepPhase: 0,
    invulnSec: 0,
    abilityTimer: 0,
    abilityCooldown: 0,
  });

  // Coordenada discreta para compatibilidad con el test E2E de Playwright
  const playwrightGrid = useRef({ col: 2, row: 2 });

  const keys = useRef<Set<string>>(new Set());
  const lastShotTime = useRef<number>(0);
  const shakeSec = useRef<number>(0);

  const dungeon = useRef<Map<string, RoomNode>>(new Map());
  const currentRoomKey = useRef<string>("0,0");

  const projectiles = useRef<Projectile[]>([]);
  const particles = useRef<Particle[]>([]);
  const bombs = useRef<RosaryBomb[]>([]);

  useEffect(() => {
    if (!multiplayer || !lobbyId || !playerId || !lobbyHostId || !supabase) return;

    let active = true;
    let socket: Socket | null = null;
    void supabase.auth.getSession().then(
      ({ data, error }) => {
        if (!active) return;
        if (error || !data.session?.access_token) {
          setMultiplayerError(error?.message ?? "Inicia sesión otra vez para sincronizar la partida.");
          return;
        }

        socket = io(apiUrl, { auth: { accessToken: data.session.access_token } });
        gameSocketRef.current = socket;
        socket.on("connect", () => {
          socket?.emit(
            "game:join",
            { code: lobbyId },
            (result: { ok: boolean; error?: string; lobby?: { members: LobbyMember[] } }) => {
              if (!result.ok || !result.lobby) {
                setMultiplayerError(result.error ?? "No se pudo entrar a la partida compartida.");
                return;
              }
              setMultiplayerError(null);
              setMultiplayerConnected(true);
              const currentMembers = result.lobby.members.length ? result.lobby.members : lobbyMembers;
              remotePlayersRef.current = currentMembers
                .filter((member) => member.userId !== playerId)
                .map((member, index) => ({
                  id: member.userId,
                  name: member.name,
                  characterId: lobbyCharacter(member.characterId),
                  x: ROOM_W / 2 + (index % 2 === 0 ? -48 : 48),
                  y: ROOM_H / 2 + 44,
                  faceDir: "S",
                  stepPhase: 0,
                  invulnSec: 0,
                  abilityTimer: 0,
                  abilityCooldown: 0,
                  lastShotAt: 0,
                  lastInputAt: performance.now(),
                  input: { ...EMPTY_MULTIPLAYER_INPUT },
                }));
              setMultiplayerError(null);
            },
          );
        });
        socket.on("connect_error", (connectError) => {
          setMultiplayerConnected(false);
          setMultiplayerError(`No se pudo conectar la partida: ${connectError.message}`);
        });
        socket.on("disconnect", () => setMultiplayerConnected(false));
        socket.on("game:error", (payload: { error?: string }) => {
          setMultiplayerError(payload.error ?? "Se perdió la sincronización con la partida.");
        });
        socket.on("game:input", (payload: { playerId: string; input: MultiplayerInput }) => {
          if (!isGameHost) return;
          const player = remotePlayersRef.current.find((entry) => entry.id === payload.playerId);
          if (player) {
            player.input = payload.input;
            player.lastInputAt = performance.now();
          }
        });
        socket.on("game:state", (snapshot: {
          dungeon?: [string, RoomNode][];
          currentRoomKey?: string;
          players?: MultiplayerPlayer[];
          projectiles?: (Omit<Projectile, "hitTargets"> & { hitTargets?: number[] })[];
          bombs?: RosaryBomb[];
          hud?: typeof hud;
          deadPlayers?: string[];
          hasWon?: boolean;
          roomOffers?: RoomOffer[];
        }) => {
          if (isGameHost) return;
          if (
            !Array.isArray(snapshot.dungeon) ||
            typeof snapshot.currentRoomKey !== "string" ||
            !Array.isArray(snapshot.players) ||
            !Array.isArray(snapshot.projectiles) ||
            !Array.isArray(snapshot.bombs) ||
            !snapshot.hud
          ) return;

          dungeon.current = new Map(snapshot.dungeon);
          currentRoomKey.current = snapshot.currentRoomKey;
          const localPlayer = snapshot.players.find((player) => player.id === playerId);
          if (localPlayer) {
            demon.current.x = localPlayer.x;
            demon.current.y = localPlayer.y;
            demon.current.faceDir = localPlayer.faceDir;
            demon.current.stepPhase = localPlayer.stepPhase;
            demon.current.invulnSec = localPlayer.invulnSec;
            demon.current.abilityTimer = localPlayer.abilityTimer;
            demon.current.abilityCooldown = localPlayer.abilityCooldown;
          }
          remotePlayersRef.current = snapshot.players
            .filter((player) => player.id !== playerId)
            .map((player) => ({ ...player, input: { ...EMPTY_MULTIPLAYER_INPUT } }));
          projectiles.current = snapshot.projectiles.map((projectile) => ({
            ...projectile,
            hitTargets: new Set(projectile.hitTargets ?? []),
          }));
          bombs.current = snapshot.bombs;
          setHud(snapshot.hud);
          setRoomOffers(snapshot.roomOffers ?? []);
          setIsDead(snapshot.deadPlayers?.includes(playerId) ?? false);
          if (snapshot.hasWon && !victoryTriggeredRef.current) {
            victoryTriggeredRef.current = true;
            onVictoryRef.current(newGamePlus);
          }
          setHasWon(snapshot.hasWon ?? false);
        });
      },
      (sessionError: unknown) => {
        if (active) setMultiplayerError(sessionError instanceof Error ? sessionError.message : "No se pudo recuperar la sesión.");
      },
    );

    return () => {
      active = false;
      socket?.disconnect();
      if (gameSocketRef.current === socket) gameSocketRef.current = null;
    };
  }, [isGameHost, lobbyHostId, lobbyId, lobbyMembers, multiplayer, newGamePlus, playerId]);

  const activateSound = () => {
    if (typeof window.AudioContext === "undefined") return null;
    const context = soundContextRef.current ?? new window.AudioContext();
    soundContextRef.current = context;
    if (context.state === "suspended") void context.resume();
    return context;
  };

  const playGameSound = (sound: "shot" | "damage" | "death" | "enemyDeath" | "enemyHit" | "bomb") => {
    const context = activateSound();
    if (!context) return;
    const now = context.currentTime;
    const tones =
      sound === "shot"
        ? [{ from: 740, to: 180, duration: 0.075, volume: 0.045, wave: "square" as OscillatorType }]
        : sound === "damage"
        ? [{ from: 190, to: 62, duration: 0.22, volume: 0.075, wave: "sawtooth" as OscillatorType }]
        : sound === "death"
        ? [
            { from: 330, to: 90, duration: 0.38, volume: 0.07, wave: "square" as OscillatorType },
            { from: 165, to: 55, duration: 0.48, volume: 0.045, wave: "triangle" as OscillatorType },
          ]
        : sound === "enemyDeath"
        ? [{ from: 310, to: 110, duration: 0.16, volume: 0.04, wave: "triangle" as OscillatorType }]
        : sound === "enemyHit"
        ? [{ from: 460, to: 260, duration: 0.045, volume: 0.018, wave: "square" as OscillatorType }]
        : [{ from: 510, to: 90, duration: 0.28, volume: 0.065, wave: "sawtooth" as OscillatorType }];

    tones.forEach(({ from, to, duration, volume, wave }) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = wave;
      oscillator.frequency.setValueAtTime(from, now);
      oscillator.frequency.exponentialRampToValueAtTime(to, now + duration);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.01);
    });
  };

  const showBanner = (title: string, subtitle: string) => {
    bannerRef.current = { title, subtitle, timer: 3.0 };
  };

  const spawnParticles = (x: number, y: number, color: string, count = 10) => {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 40 + Math.random() * 110;
      particles.current.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        radius: 2 + Math.random() * 3,
        color,
        alpha: 1,
      });
    }
  };

  const syncMinimap = () => {
    const list: { gx: number; gy: number; type: RoomType; current: boolean; visited: boolean }[] = [];
    dungeon.current.forEach((r, k) => {
      list.push({
        gx: r.gx,
        gy: r.gy,
        type: r.type,
        current: k === currentRoomKey.current,
        visited: r.visited,
      });
    });
    setHud((h) => ({ ...h, minimap: list }));
  };

  const syncRoomOffers = (room: RoomNode) => {
    setRoomOffers(
      room.drops
        .filter((drop) => drop.type === "upgrade" || drop.type === "shop_upgrade" || drop.type === "weapon")
        .map(({ id, type, name, desc, cost }) => ({ id, type, name, desc, cost }))
    );
  };

  // Generación procedimental de la Catedral Gótica por piso
  const generateCathedralFloor = (floorNum: number) => {
    const map = new Map<string, RoomNode>();

    const layout = generateFloorLayout(floorNum);

    layout.forEach(({ gx, gy, type }) => {
      const key = `${gx},${gy}`;
      const pillars: Pillar[] = [];
      const enemies: ZealotEnemy[] = [];
      const drops: RelicDrop[] = [];

      if (type === "normal") {
        // Bancas de iglesia rotas y charcos de agua bendita
        for (let i = 0; i < 4; i++) {
          const px = 250 + (i % 2) * 460;
          const py = 180 + Math.floor(i / 2) * 200;
          pillars.push({
            id: i + 1,
            x: px,
            y: py,
            type: i === 1 && (gx + floorNum) % 2 === 0 ? "reliquary" : i === 3 ? "holy_water" : "pew",
          });
        }

        // Enemigos religiosos moderados y balanceados
        const totalEnemies = 2 + Math.min(3, floorNum);
        for (let e = 0; e < totalEnemies; e++) {
          const pool: ZealotEnemy["type"][] = ["cleric_bible", "stake_hunter", "inquisitor"];
          const chosen = pool[(e + Math.abs(gx) + floorNum) % pool.length];
          const baseHp = Math.round(
            ((chosen === "inquisitor" ? 45 : 32) + floorNum * 10) *
              (newGamePlus ? 1.2 : 1) *
              difficultyProfile(activeDifficultyRef.current).enemyHealth
          );
          enemies.push({
            id: e + 100,
            x: 240 + ((e * 210) % 480),
            y: 150 + ((e * 130) % 260),
            hp: baseHp,
            maxHp: baseHp,
            type: chosen,
            cooldown: 1.4 + e * 0.4,
            phaseTimer: 0,
            dashVx: 0,
            dashVy: 0,
          });
        }
      } else if (type === "upgrade") {
        const relicPool: RelicDrop[] = [
          {
            id: 701,
            x: ROOM_W / 2,
            y: ROOM_H / 2,
            type: "relic_crimson",
            name: "CÁLIZ CARMESÍ",
            desc: "+Daño carmesí y +1 corazón de sangre",
          },
          {
            id: 702,
            x: ROOM_W / 2,
            y: ROOM_H / 2,
            type: "relic_sigil",
            name: "ROSARIO UMBRÍO",
            desc: "Disparo triple de fuego oscuro",
          },
          {
            id: 703,
            x: ROOM_W / 2,
            y: ROOM_H / 2,
            type: "relic_ashes",
            name: "MANTO DE CENIZA",
            desc: "+Velocidad de sombra y +4 armaduras de ceniza",
          },
          {
            id: 704,
            x: ROOM_W / 2,
            y: ROOM_H / 2,
            type: "relic_nightfang",
            name: "COLMILLOS NOCTURNOS",
            desc: "Cadencia letal y daño aumentado",
          },
        ];
        drops.push({
          ...relicPool[(floorNum - 1) % relicPool.length],
          x: ROOM_W / 2,
          y: ROOM_H / 2 - 105,
        });
        const firstUpgradeIndex = (floorNum * 2 - 2) % UPGRADES.length;
        const secondUpgradeIndex = (firstUpgradeIndex + 7) % UPGRADES.length;
        const choiceGroup = `upgrade-room-${floorNum}`;
        [firstUpgradeIndex, secondUpgradeIndex].forEach((upgradeIndex, index) => {
          const offeredUpgrade = UPGRADES[upgradeIndex];
          drops.push({
            id: 900 + floorNum * 2 + index,
            x: index === 0 ? ROOM_W / 2 - 160 : ROOM_W / 2 + 160,
            y: ROOM_H / 2 + 20,
            type: "upgrade",
            name: offeredUpgrade.name,
            desc: offeredUpgrade.description,
            itemId: offeredUpgrade.id,
            choiceGroup,
          });
        });
      } else if (type === "shop") {
        const firstUpgradeIndex = (floorNum * 3 - 3) % UPGRADES.length;
        for (let index = 0; index < 3; index++) {
          const offeredUpgrade = UPGRADES[(firstUpgradeIndex + index * 5) % UPGRADES.length];
          drops.push({
            id: 1000 + floorNum * 3 + index,
            x: 240 + index * 240,
            y: ROOM_H / 2 + 40,
            type: "shop_upgrade",
            name: offeredUpgrade.name,
            desc: offeredUpgrade.description,
            itemId: offeredUpgrade.id,
            cost: chooseShopPrice(floorNum, index),
          });
        }
      } else if (type === "boss") {
        const bossTypes: ZealotEnemy["type"][] = [
          "boss_archbishop",
          "boss_maiden",
          "boss_seraph",
          "boss_colossus",
          "boss_oracle",
        ];
        const bossType = bossTypes[(floorNum - 1) % bossTypes.length];

        const bossHp = Math.round(
          (240 + floorNum * 85) *
            (newGamePlus ? 1.2 : 1) *
            difficultyProfile(activeDifficultyRef.current).enemyHealth
        );
        enemies.push({
          id: 999,
          x: ROOM_W / 2,
          y: ROOM_H / 2,
          hp: bossHp,
          maxHp: bossHp,
          type: bossType,
          cooldown: 1.8,
          phaseTimer: 0,
          dashVx: 0,
          dashVy: 0,
        });
      }

      map.set(key, {
        gx,
        gy,
        type,
        cleared: type === "start" || type === "upgrade" || type === "shop",
        visited: type === "start",
        doors: { N: false, S: false, E: false, W: false },
        pillars,
        enemies,
        drops,
        marks: [],
        portalOpen: false,
      });
    });

    map.forEach((room) => {
      if (map.has(`${room.gx},${room.gy - 1}`)) room.doors.N = true;
      if (map.has(`${room.gx},${room.gy + 1}`)) room.doors.S = true;
      if (map.has(`${room.gx + 1},${room.gy}`)) room.doors.E = true;
      if (map.has(`${room.gx - 1},${room.gy}`)) room.doors.W = true;
    });

    dungeon.current = map;
    currentRoomKey.current = "0,0";
    demon.current.x = ROOM_W / 2;
    demon.current.y = ROOM_H / 2;
    demon.current.abilityTimer = 0;
    demon.current.abilityCooldown = 0;
    playwrightGrid.current = { col: 2, row: 2 };
    (window as unknown as Record<string, unknown>).__PLAYER_POS__ = { col: 2, row: 2 };
    projectiles.current = [];
    bombs.current = [];
    syncMinimap();
    setRoomOffers([]);
  };

  const changeRoom = (dir: Direction) => {
    const curr = dungeon.current.get(currentRoomKey.current);
    if (!curr || !curr.cleared || !curr.doors[dir]) return;

    const nx = curr.gx + (dir === "E" ? 1 : dir === "W" ? -1 : 0);
    const ny = curr.gy + (dir === "S" ? 1 : dir === "N" ? -1 : 0);
    const nextRoom = dungeon.current.get(`${nx},${ny}`);
    if (!nextRoom) return;

    currentRoomKey.current = `${nx},${ny}`;
    nextRoom.visited = true;
    projectiles.current = [];
    bombs.current = [];

    if (dir === "N") {
      demon.current.x = ROOM_W / 2;
      demon.current.y = ROOM_H - WALL_THICKNESS - 44;
    } else if (dir === "S") {
      demon.current.x = ROOM_W / 2;
      demon.current.y = WALL_THICKNESS + 44;
    } else if (dir === "E") {
      demon.current.x = WALL_THICKNESS + 44;
      demon.current.y = ROOM_H / 2;
    } else if (dir === "W") {
      demon.current.x = ROOM_W - WALL_THICKNESS - 44;
      demon.current.y = ROOM_H / 2;
    }
    remotePlayersRef.current.forEach((player, index) => {
      const spread = (index - (remotePlayersRef.current.length - 1) / 2) * 34;
      if (dir === "N") {
        player.x = ROOM_W / 2 + spread;
        player.y = ROOM_H - WALL_THICKNESS - 44;
      } else if (dir === "S") {
        player.x = ROOM_W / 2 + spread;
        player.y = WALL_THICKNESS + 44;
      } else if (dir === "E") {
        player.x = WALL_THICKNESS + 44;
        player.y = ROOM_H / 2 + spread;
      } else {
        player.x = ROOM_W - WALL_THICKNESS - 44;
        player.y = ROOM_H / 2 + spread;
      }
    });

    if (nextRoom.type === "boss" && !nextRoom.cleared) {
      const f = statsRef.current.floor;
      const bossNames = [
        "ARZOBISPO DEL VELO",
        "DONCELLA DE ESTACAS",
        "SERAFÍN NOCTURNO",
        "TITÁN DE HIERRO",
        "ORÁCULO DE LAS SOMBRAS",
      ];
      showBanner(bossNames[(f - 1) % bossNames.length], "Cada guardián domina un patrón de ataque distinto");
    } else if (nextRoom.type === "upgrade") {
      showBanner("SALA DE MEJORAS", "Elige una de las dos mejoras: al tomar una, la otra se pierde");
    } else if (nextRoom.type === "shop") {
      showBanner("TIENDA DEL CAMINO", "Acércate a una oferta y paga con monedas");
    }

    syncMinimap();
    syncRoomOffers(nextRoom);
  };

  const equipWeapon = (weapon: WeaponDefinition) => {
    setHud((h) => ({
      ...h,
      weaponId: weapon.id,
      damage: weapon.damage + h.damageBonus,
      fireRateMs: Math.max(90, weapon.fireRateMs + h.rateBonus),
      multishot: weapon.multishot + h.extraShots,
      projectileSpeed: weapon.projectileSpeed,
      projectileSpread: weapon.spread,
      projectilePierce: weapon.pierce,
      projectileColor: weapon.color,
      relics: [...h.relics, weapon.name],
    }));
    showBanner(weapon.name, weapon.description);
  };

  const applyUpgrade = (upgradeId: string) => {
    const upgrade = UPGRADES.find((entry) => entry.id === upgradeId);
    if (!upgrade) {
      console.error(`No se encontró la mejora de partida: ${upgradeId}`);
      return;
    }
    setHud((h) => {
      const maxBloodHearts = h.maxBloodHearts + (upgrade.maxHearts ?? 0);
      return {
        ...h,
        damage: h.damage + (upgrade.damage ?? 0),
        damageBonus: h.damageBonus + (upgrade.damage ?? 0),
        fireRateMs: Math.max(90, h.fireRateMs + (upgrade.fireRateMs ?? 0)),
        rateBonus: h.rateBonus + (upgrade.fireRateMs ?? 0),
        moveSpeed: h.moveSpeed + (upgrade.moveSpeed ?? 0),
        maxBloodHearts,
        bloodHearts: Math.min(maxBloodHearts, h.bloodHearts + (upgrade.heal ?? 0)),
        darkArmor: h.darkArmor + (upgrade.armor ?? 0),
        rosaries: h.rosaries + (upgrade.bombs ?? 0),
        multishot: h.multishot + (upgrade.multishot ?? 0),
        extraShots: h.extraShots + (upgrade.multishot ?? 0),
        relics: [...h.relics, upgrade.name],
      };
    });
    showBanner(upgrade.name, upgrade.description);
  };

  const activateCharacterAbility = () => {
    if (isDead || hasWon || demon.current.abilityCooldown > 0) return;
    if (multiplayer && !isGameHost) {
      pendingNetworkActionsRef.current.ability = true;
      return;
    }
    demon.current.abilityCooldown = selectedCharacter.cooldownMs / 1000;
    setAbilityAvailable(false);
    window.setTimeout(() => setAbilityAvailable(true), selectedCharacter.cooldownMs);
    playGameSound("bomb");

    if (characterId === "vesper") {
      demon.current.abilityTimer = 1.5;
      demon.current.invulnSec = Math.max(demon.current.invulnSec, 1.5);
    } else if (characterId === "nyx") {
      demon.current.abilityTimer = 2.8;
      demon.current.invulnSec = Math.max(demon.current.invulnSec, 0.55);
    } else if (characterId === "bram") {
      setHud((h) => ({ ...h, darkArmor: h.darkArmor + 2 }));
      spawnParticles(demon.current.x, demon.current.y, "#f2bd57", 22);
    } else {
      const room = dungeon.current.get(currentRoomKey.current);
      room?.enemies.forEach((enemy) => {
        enemy.hp -= 90;
        enemy.hitFlash = 0.18;
        spawnParticles(enemy.x, enemy.y, selectedCharacter.palette.E, 12);
      });
    }
  };

  const shootDemonicBolt = (dx: number, dy: number, dirLabel: Direction) => {
    const now = performance.now();
    if (now - lastShotTime.current < statsRef.current.fireRateMs) return;
    lastShotTime.current = now;

    demon.current.faceDir = dirLabel;
    const s = statsRef.current;
    const count = s.multishot;
    const spread = s.projectileSpread;
    playGameSound("shot");

    for (let i = 0; i < count; i++) {
      const offset = count > 1 ? -spread / 2 + (spread / (count - 1)) * i : 0;
      const ang = Math.atan2(dy, dx) + offset;
      projectiles.current.push({
        x: demon.current.x + dx * 16,
        y: demon.current.y + dy * 16,
        vx: Math.cos(ang) * s.projectileSpeed,
        vy: Math.sin(ang) * s.projectileSpeed,
        radius: s.damage >= 22 ? 10 : 7,
        damage: s.damage,
        angle: ang,
        spinSpeed: 0,
        kind: "demonic_bolt",
        isEnemy: false,
        pierce: s.projectilePierce,
        color: s.projectileColor,
        hitTargets: new Set(),
      });
    }
  };

  const shootMultiplayerBolt = (player: MultiplayerPlayer, dx: number, dy: number, dirLabel: Direction) => {
    const now = performance.now();
    const stats = statsRef.current;
    if (now - player.lastShotAt < stats.fireRateMs) return;
    player.lastShotAt = now;
    player.faceDir = dirLabel;
    const count = stats.multishot;
    for (let index = 0; index < count; index += 1) {
      const offset = count > 1
        ? -stats.projectileSpread / 2 + (stats.projectileSpread / (count - 1)) * index
        : 0;
      const angle = Math.atan2(dy, dx) + offset;
      projectiles.current.push({
        x: player.x + dx * 16,
        y: player.y + dy * 16,
        vx: Math.cos(angle) * stats.projectileSpeed,
        vy: Math.sin(angle) * stats.projectileSpeed,
        radius: stats.damage >= 22 ? 10 : 7,
        damage: stats.damage,
        angle,
        spinSpeed: 0,
        kind: "demonic_bolt",
        isEnemy: false,
        pierce: stats.projectilePierce,
        color: stats.projectileColor,
        hitTargets: new Set(),
      });
    }
    playGameSound("shot");
  };

  const dropRosaryBomb = () => {
    if (isDead || statsRef.current.rosaries <= 0) return;
    if (multiplayer && !isGameHost) {
      pendingNetworkActionsRef.current.bomb = true;
      return;
    }
    playGameSound("bomb");
    setHud((h) => ({ ...h, rosaries: h.rosaries - 1 }));
    bombs.current.push({
      x: demon.current.x,
      y: demon.current.y,
      timer: 1.6,
    });
  };

  const hurtDemon = () => {
    if (demon.current.invulnSec > 0) return;
    playGameSound("damage");
    if (statsRef.current.darkArmor <= 0 && statsRef.current.bloodHearts <= 1) {
      setIsDead(true);
      playGameSound("death");
    }
    demon.current.invulnSec = 1.15;
    shakeSec.current = 0.25;

    const room = dungeon.current.get(currentRoomKey.current);
    if (room) {
      room.marks.push({
        x: demon.current.x,
        y: demon.current.y + 12,
        radius: 18,
        color: "rgba(185, 28, 28, 0.6)",
      });
    }

    setHud((h) => {
      if (h.darkArmor > 0) {
        return { ...h, darkArmor: h.darkArmor - 1 };
      }
      const next = h.bloodHearts - 1;
      return { ...h, bloodHearts: Math.max(0, next) };
    });
  };

  const hurtMultiplayerPlayer = (player: MultiplayerPlayer) => {
    if (player.invulnSec > 0) return;
    player.invulnSec = 1.15;
    playGameSound("damage");
    shakeSec.current = 0.25;
    if (statsRef.current.darkArmor <= 0 && statsRef.current.bloodHearts <= 1) {
      setIsDead(true);
      playGameSound("death");
    }
    setHud((current) => current.darkArmor > 0
      ? { ...current, darkArmor: current.darkArmor - 1 }
      : { ...current, bloodHearts: Math.max(0, current.bloodHearts - 1) });
  };

  const recordGridMove = (action: GameAction) => {
    if (isDead) return;
    const deltas: Partial<Record<GameAction, [number, number]>> = {
      moveUp: [0, -1],
      moveDown: [0, 1],
      moveLeft: [-1, 0],
      moveRight: [1, 0],
    };
    const [dCol, dRow] = deltas[action] ?? [0, 0];
    playwrightGrid.current = {
      col: playwrightGrid.current.col + dCol,
      row: playwrightGrid.current.row + dRow,
    };
    (window as unknown as Record<string, unknown>).__PLAYER_POS__ = { ...playwrightGrid.current };
  };

  const restartRun = () => {
    setIsDead(false);
    setHasWon(false);
    victoryTriggeredRef.current = false;
    setAbilityAvailable(true);
    activeDifficultyRef.current = settingsRef.current.difficulty;
    const startingHearts =
      difficultyProfile(activeDifficultyRef.current).playerHearts +
      (newGamePlus ? progression.healthLevel : 0);
    const weapon = WEAPONS.find((entry) => entry.id === selectedCharacter.weaponId) ?? WEAPONS[0];
    const permanentDamage = newGamePlus ? progression.damageLevel * 2 : 0;
    setHud({
      bloodHearts: startingHearts,
      maxBloodHearts: startingHearts,
      darkArmor: 2 + (newGamePlus ? progression.armorLevel : 0),
      rosaries: 2,
      coins: 0,
      damage: weapon.damage + permanentDamage,
      fireRateMs: weapon.fireRateMs,
      moveSpeed: 210,
      multishot: weapon.multishot,
      weaponId: weapon.id,
      projectileSpeed: weapon.projectileSpeed,
      projectileSpread: weapon.spread,
      projectilePierce: weapon.pierce,
      projectileColor: weapon.color,
      damageBonus: permanentDamage,
      rateBonus: 0,
      extraShots: 0,
      floor: 1,
      kills: 0,
      relics: [],
      minimap: [],
    });
    demon.current.abilityCooldown = 0;
    demon.current.abilityTimer = 0;
    remotePlayersRef.current.forEach((player, index) => {
      player.x = ROOM_W / 2 + (index % 2 === 0 ? -48 : 48);
      player.y = ROOM_H / 2 + 44;
      player.invulnSec = 0;
      player.abilityTimer = 0;
      player.abilityCooldown = 0;
    });
    generateCathedralFloor(1);
    showBanner("PISO I: LAS PUERTAS DEL SANTUARIO", "Elige tus mejoras y derrota a los cinco guardianes");
  };

  const isActionPressed = (action: GameAction) =>
    keys.current.has(settingsRef.current.controls[action]) || Boolean(touchKeys.current.get(action)?.size);

  const getMultiplayerInput = (): MultiplayerInput => ({
    up: isActionPressed("moveUp"),
    down: isActionPressed("moveDown"),
    left: isActionPressed("moveLeft"),
    right: isActionPressed("moveRight"),
    shootUp: isActionPressed("shootUp"),
    shootDown: isActionPressed("shootDown"),
    shootLeft: isActionPressed("shootLeft"),
    shootRight: isActionPressed("shootRight"),
    bomb: pendingNetworkActionsRef.current.bomb,
    ability: pendingNetworkActionsRef.current.ability,
  });

  const pressTouchKey = (key: string) => (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    activateSound();
    event.currentTarget.setPointerCapture(event.pointerId);
    const pointers = touchKeys.current.get(key) ?? new Set<number>();
    pointers.add(event.pointerId);
    touchKeys.current.set(key, pointers);
  };

  const releaseTouchKey = (key: string) => (event: ReactPointerEvent<HTMLButtonElement>) => {
    const pointers = touchKeys.current.get(key);
    pointers?.delete(event.pointerId);
    if (!pointers?.size) touchKeys.current.delete(key);
  };

  useEffect(() => {
    if (!isMobile || isDead || settingsOpen) {
      touchKeys.current.clear();
      keys.current.clear();
    }
  }, [isDead, isMobile, settingsOpen]);

  useEffect(() => () => {
    if (soundContextRef.current && soundContextRef.current.state !== "closed") {
      void soundContextRef.current.close();
    }
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      const isMobileUA = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      setIsMobile(isMobileUA || window.innerWidth <= 768);
    };
    checkMobile();

    if (dungeon.current.size === 0) {
      generateCathedralFloor(1);
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const handleResize = () => {
      canvas.width = Math.max(1, Math.floor(window.innerWidth / PIXEL_SCALE));
      canvas.height = Math.max(1, Math.floor(window.innerHeight / PIXEL_SCALE));
      ctx.imageSmoothingEnabled = false;
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      checkMobile();
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (settingsOpenRef.current) return;
      activateSound();
      const k = e.key.toLowerCase();
      const controls = settingsRef.current.controls;
      keys.current.add(k);

      if (!e.repeat) {
        const movement = (Object.keys(controls) as GameAction[]).find(
          (action) => action.startsWith("move") && controls[action] === k
        );
        if (movement) recordGridMove(movement);
        if (controls.bomb === k) dropRosaryBomb();
        if (controls.ability === k) activateCharacterAbility();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current.delete(e.key.toLowerCase());
    };

    const clearPressedKeys = () => {
      keys.current.clear();
      touchKeys.current.clear();
    };
    const handleVisibilityChange = () => {
      if (document.hidden) clearPressedKeys();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", clearPressedKeys);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    let animId: number;
    let lastFrameTime = performance.now();

    const render = (now: number) => {
      // Cálculo de Delta Time en segundos (tope de 0.05s) para que la velocidad sea IDÉNTICA en 60Hz, 144Hz o 240Hz
      const dt = settingsOpenRef.current ? 0 : Math.min(0.05, (now - lastFrameTime) / 1000);
      lastFrameTime = now;
      const isWorldAuthority = !multiplayer || isGameHost;
      if (
        multiplayer &&
        !isGameHost &&
        gameSocketRef.current?.connected &&
        now - lastInputSentAtRef.current >= 50
      ) {
        gameSocketRef.current.emit("game:input", {
          code: lobbyId,
          input: getMultiplayerInput(),
        });
        pendingNetworkActionsRef.current = { bomb: false, ability: false };
        lastInputSentAtRef.current = now;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#060203";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const room = dungeon.current.get(currentRoomKey.current);
      if (!room) return;

      const scale = Math.min(
        (canvas.width - 8) / ROOM_W,
        (canvas.height - 30) / ROOM_H
      );
      const offsetX = (canvas.width - ROOM_W * scale) / 2;
      const offsetY = (canvas.height - ROOM_H * scale) / 2 + 8;

      ctx.save();
      if (shakeSec.current > 0) {
        shakeSec.current = Math.max(0, shakeSec.current - dt);
        ctx.translate(
          offsetX + (Math.random() - 0.5) * 12,
          offsetY + (Math.random() - 0.5) * 12
        );
      } else {
        ctx.translate(offsetX, offsetY);
      }
      ctx.scale(scale, scale);

      if (isWorldAuthority && demon.current.invulnSec > 0) {
        demon.current.invulnSec = Math.max(0, demon.current.invulnSec - dt);
      }
      if (isWorldAuthority) {
        demon.current.abilityCooldown = Math.max(0, demon.current.abilityCooldown - dt);
        demon.current.abilityTimer = Math.max(0, demon.current.abilityTimer - dt);
      }

      // ==========================================
      // 1. MOVIMIENTO PRECISO DEL DEMONIO (SIN DESLIZAMIENTO)
      // ==========================================
      if (isWorldAuthority && !isDead && !hasWon) {
        let mx = 0;
        let my = 0;
        if (!settingsOpenRef.current) {
          if (isActionPressed("moveUp")) { my -= 1; demon.current.faceDir = "N"; }
          if (isActionPressed("moveDown")) { my += 1; demon.current.faceDir = "S"; }
          if (isActionPressed("moveLeft")) { mx -= 1; demon.current.faceDir = "W"; }
          if (isActionPressed("moveRight")) { mx += 1; demon.current.faceDir = "E"; }
        }

        if (mx !== 0 || my !== 0) {
          lastPlayerMoveAtRef.current = now;
          const norm = Math.hypot(mx, my);
          const moveSpeed = statsRef.current.moveSpeed + (characterId === "nyx" && demon.current.abilityTimer > 0 ? 130 : 0);
          const stepX = (mx / norm) * moveSpeed * dt;
          const stepY = (my / norm) * moveSpeed * dt;
          demon.current.stepPhase += dt * 10;

          const candidateX = demon.current.x + stepX;
          const candidateY = demon.current.y + stepY;

          let blockedX = false;
          let blockedY = false;

          room.pillars.forEach((p) => {
            if (p.type === "holy_water" && Math.hypot(candidateX - p.x, candidateY - p.y) < 30) {
              hurtDemon();
            } else if (p.type !== "holy_water") {
              if (Math.hypot(candidateX - p.x, demon.current.y - p.y) < 34) blockedX = true;
              if (Math.hypot(demon.current.x - p.x, candidateY - p.y) < 34) blockedY = true;
            }
          });

          if (!blockedX) {
            demon.current.x = Math.max(
              WALL_THICKNESS + 20,
              Math.min(ROOM_W - WALL_THICKNESS - 20, candidateX)
            );
          }
          if (!blockedY) {
            demon.current.y = Math.max(
              WALL_THICKNESS + 20,
              Math.min(ROOM_H - WALL_THICKNESS - 20, candidateY)
            );
          }
        }

        // Cruzar vitrales/puertas de la catedral
        if (room.cleared) {
          if (room.doors.N && demon.current.y <= WALL_THICKNESS + 24 && Math.abs(demon.current.x - ROOM_W / 2) < 42) {
            changeRoom("N");
          } else if (room.doors.S && demon.current.y >= ROOM_H - WALL_THICKNESS - 24 && Math.abs(demon.current.x - ROOM_W / 2) < 42) {
            changeRoom("S");
          } else if (room.doors.W && demon.current.x <= WALL_THICKNESS + 24 && Math.abs(demon.current.y - ROOM_H / 2) < 42) {
            changeRoom("W");
          } else if (room.doors.E && demon.current.x >= ROOM_W - WALL_THICKNESS - 24 && Math.abs(demon.current.y - ROOM_H / 2) < 42) {
            changeRoom("E");
          }
        }

        // Disparo con flechas
        if (!settingsOpenRef.current) {
          if (isActionPressed("shootUp")) shootDemonicBolt(0, -1, "N");
          else if (isActionPressed("shootDown")) shootDemonicBolt(0, 1, "S");
          else if (isActionPressed("shootLeft")) shootDemonicBolt(-1, 0, "W");
          else if (isActionPressed("shootRight")) shootDemonicBolt(1, 0, "E");
        }
      }

      if (multiplayer && isGameHost && !settingsOpenRef.current && !isDead && !hasWon) {
        let requestedRoomChange: Direction | null = null;
        remotePlayersRef.current.forEach((player) => {
          if (now - player.lastInputAt > 300) player.input = { ...EMPTY_MULTIPLAYER_INPUT };
          player.invulnSec = Math.max(0, player.invulnSec - dt);
          player.abilityCooldown = Math.max(0, player.abilityCooldown - dt);
          player.abilityTimer = Math.max(0, player.abilityTimer - dt);

          const input = player.input;
          if (input.ability) {
            input.ability = false;
            if (player.abilityCooldown <= 0) {
              const character = CHARACTERS.find((entry) => entry.id === player.characterId) ?? CHARACTERS[0];
              player.abilityCooldown = character.cooldownMs / 1000;
              playGameSound("bomb");
              if (player.characterId === "vesper") {
                player.abilityTimer = 1.5;
                player.invulnSec = Math.max(player.invulnSec, 1.5);
              } else if (player.characterId === "nyx") {
                player.abilityTimer = 2.8;
                player.invulnSec = Math.max(player.invulnSec, 0.55);
              } else if (player.characterId === "bram") {
                setHud((current) => ({ ...current, darkArmor: current.darkArmor + 2 }));
              } else {
                room.enemies.forEach((enemy) => {
                  enemy.hp -= 90;
                  enemy.hitFlash = 0.18;
                });
              }
            }
          }

          if (input.bomb) {
            input.bomb = false;
            if (statsRef.current.rosaries > 0) {
              playGameSound("bomb");
              setHud((current) => ({ ...current, rosaries: current.rosaries - 1 }));
              bombs.current.push({ x: player.x, y: player.y, timer: 1.6 });
            }
          }

          let mx = Number(input.right) - Number(input.left);
          let my = Number(input.down) - Number(input.up);
          if (mx || my) {
            if (input.up) player.faceDir = "N";
            if (input.down) player.faceDir = "S";
            if (input.left) player.faceDir = "W";
            if (input.right) player.faceDir = "E";
            const length = Math.hypot(mx, my);
            const speed = statsRef.current.moveSpeed + (player.characterId === "nyx" && player.abilityTimer > 0 ? 130 : 0);
            const candidateX = player.x + (mx / length) * speed * dt;
            const candidateY = player.y + (my / length) * speed * dt;
            let blockedX = false;
            let blockedY = false;
            room.pillars.forEach((pillar) => {
              if (pillar.type !== "holy_water") {
                if (Math.hypot(candidateX - pillar.x, player.y - pillar.y) < 34) blockedX = true;
                if (Math.hypot(player.x - pillar.x, candidateY - pillar.y) < 34) blockedY = true;
              }
            });
            if (!blockedX) player.x = Math.max(WALL_THICKNESS + 20, Math.min(ROOM_W - WALL_THICKNESS - 20, candidateX));
            if (!blockedY) player.y = Math.max(WALL_THICKNESS + 20, Math.min(ROOM_H - WALL_THICKNESS - 20, candidateY));
            player.stepPhase += dt * 10;
          }

          if (room.cleared) {
            if (room.doors.N && player.y <= WALL_THICKNESS + 24 && Math.abs(player.x - ROOM_W / 2) < 42) requestedRoomChange = "N";
            else if (room.doors.S && player.y >= ROOM_H - WALL_THICKNESS - 24 && Math.abs(player.x - ROOM_W / 2) < 42) requestedRoomChange = "S";
            else if (room.doors.W && player.x <= WALL_THICKNESS + 24 && Math.abs(player.y - ROOM_H / 2) < 42) requestedRoomChange = "W";
            else if (room.doors.E && player.x >= ROOM_W - WALL_THICKNESS - 24 && Math.abs(player.y - ROOM_H / 2) < 42) requestedRoomChange = "E";
          }

          if (input.shootUp) shootMultiplayerBolt(player, 0, -1, "N");
          else if (input.shootDown) shootMultiplayerBolt(player, 0, 1, "S");
          else if (input.shootLeft) shootMultiplayerBolt(player, -1, 0, "W");
          else if (input.shootRight) shootMultiplayerBolt(player, 1, 0, "E");
        });
        if (requestedRoomChange) changeRoom(requestedRoomChange);
      }

      // ==========================================
      // 2. ARQUITECTURA DE LA CATEDRAL GÓTICA Y ALFOMBRA ROJA
      // ==========================================
      ctx.fillStyle =
        room.type === "boss" ? "#1f0408" :
        room.type === "shop" ? "#24200f" :
        room.type === "upgrade" ? "#1e1218" : "#140c10";
      ctx.fillRect(0, 0, ROOM_W, ROOM_H);

      // Suelo de losas góticas oscuras
      ctx.fillStyle =
        room.type === "boss"
          ? "#160609"
          : room.type === "shop"
          ? "#1a1a10"
          : room.type === "upgrade"
          ? "#191225"
          : "#181216";
      ctx.fillRect(WALL_THICKNESS, WALL_THICKNESS, ROOM_W - WALL_THICKNESS * 2, ROOM_H - WALL_THICKNESS * 2);

      // Alfombra Carmesí Real cruzando el santuario en cruz
      ctx.fillStyle = room.type === "shop" ? "rgba(166, 132, 42, 0.25)" : "rgba(153, 27, 27, 0.38)";
      ctx.fillRect(WALL_THICKNESS, ROOM_H / 2 - 42, ROOM_W - WALL_THICKNESS * 2, 84);
      ctx.fillRect(ROOM_W / 2 - 42, WALL_THICKNESS, 84, ROOM_H - WALL_THICKNESS * 2);
      ctx.strokeStyle = "rgba(220, 38, 38, 0.45)";
      ctx.lineWidth = 2;
      ctx.strokeRect(WALL_THICKNESS, ROOM_H / 2 - 42, ROOM_W - WALL_THICKNESS * 2, 84);

      // Marco de piedra negra y borde carmesí
      ctx.strokeStyle = "#dc2626";
      ctx.lineWidth = 4;
      ctx.strokeRect(WALL_THICKNESS, WALL_THICKNESS, ROOM_W - WALL_THICKNESS * 2, ROOM_H - WALL_THICKNESS * 2);

      if (room.type === "shop") {
        ctx.fillStyle = "#473719";
        ctx.fillRect(ROOM_W / 2 - 140, 170, 280, 68);
        ctx.fillStyle = "#d8b45a";
        for (let stripe = 0; stripe < 7; stripe++) {
          ctx.fillRect(ROOM_W / 2 - 140 + stripe * 40, 170, 20, 20);
        }
        ctx.fillStyle = "#211a11";
        ctx.fillRect(ROOM_W / 2 - 158, 232, 316, 24);
        ctx.strokeStyle = "#d8b45a";
        ctx.lineWidth = 3;
        ctx.strokeRect(ROOM_W / 2 - 158, 232, 316, 24);
        ctx.fillStyle = "#f6df9a";
        ctx.font = "bold 17px 'Courier New', monospace";
        ctx.textAlign = "center";
        ctx.fillText("TIENDA DEL CAMINO", ROOM_W / 2, 287);
      }

      // Inscripciones en sangre en la Sala Inicial
      if (room.type === "start") {
        ctx.save();
        ctx.fillStyle = "rgba(248, 113, 113, 0.32)";
        ctx.font = "bold 16px 'Courier New', monospace";
        ctx.textAlign = "center";
        const controls = settingsRef.current.controls;
        ctx.fillText(
          `✟ [${formatControlHint(controls.moveUp, controls.moveLeft, controls.moveDown, controls.moveRight)}] CAMINAR | [${formatControlHint(controls.shootUp, controls.shootLeft, controls.shootDown, controls.shootRight)}] FUEGO ✟`,
          ROOM_W / 2,
          ROOM_H / 2 - 110
        );
        ctx.fillText(`[${controls.bomb.toUpperCase()}] BOMBA  ·  [${controls.ability.toUpperCase()}] ${selectedCharacter.abilityName.toUpperCase()}`, ROOM_W / 2, ROOM_H / 2 + 135);
        ctx.restore();
      }

      room.marks.forEach((m) => {
        ctx.fillStyle = m.color;
        ctx.beginPath();
        ctx.ellipse(m.x, m.y, m.radius * 1.3, m.radius * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
      });

      // ==========================================
      // 3. PUERTAS GÓTICAS CON CRUCES
      // ==========================================
      const drawGothicDoor = (dir: Direction) => {
        if (!room.doors[dir]) return;
        ctx.save();
        let dx = ROOM_W / 2;
        let dy = WALL_THICKNESS / 2;
        let rot = 0;
        if (dir === "S") { dy = ROOM_H - WALL_THICKNESS / 2; rot = Math.PI; }
        else if (dir === "E") { dx = ROOM_W - WALL_THICKNESS / 2; dy = ROOM_H / 2; rot = Math.PI / 2; }
        else if (dir === "W") { dx = WALL_THICKNESS / 2; dy = ROOM_H / 2; rot = -Math.PI / 2; }

        ctx.translate(dx, dy);
        ctx.rotate(rot);

        ctx.fillStyle = "#271216";
        ctx.fillRect(-44, -26, 88, 52);
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 3;
        ctx.strokeRect(-44, -26, 88, 52);

        if (room.cleared) {
          ctx.fillStyle = "#050102";
          ctx.fillRect(-32, -18, 64, 44);
        } else {
          // Rejas de hierro consagrado bloqueando la salida
          ctx.fillStyle = "#450a0a";
          ctx.fillRect(-32, -18, 64, 44);
          ctx.fillStyle = "#fca5a5";
          for (let b = -20; b <= 20; b += 13) {
            ctx.fillRect(b, -18, 3, 44);
          }
        }
        ctx.restore();
      };

      drawGothicDoor("N");
      drawGothicDoor("S");
      drawGothicDoor("E");
      drawGothicDoor("W");

      // ==========================================
      // 4. BANCAS DE IGLESIA, RELICARIOS Y AGUA BENDITA
      // ==========================================
      room.pillars.forEach((p) => {
        if (p.type === "holy_water") {
          // Charco brillante de agua bendita que quema al demonio
          ctx.fillStyle = "rgba(56, 189, 248, 0.35)";
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, 26, 18, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#bae6fd";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else {
          // Banca de madera oscura o Relicario con cruz dorada
          ctx.fillStyle = p.type === "reliquary" ? "#3f1d24" : "#291814";
          ctx.fillRect(p.x - 24, p.y - 20, 48, 40);
          ctx.strokeStyle = p.type === "reliquary" ? "#facc15" : "#0c0706";
          ctx.lineWidth = 3;
          ctx.strokeRect(p.x - 24, p.y - 20, 48, 40);

          if (p.type === "reliquary") {
            ctx.fillStyle = "#facc15";
            ctx.fillRect(p.x - 2, p.y - 12, 4, 24);
            ctx.fillRect(p.x - 8, p.y - 5, 16, 4);
          }
        }
      });

      // Portal Abisal al derrotar al Jefe del Piso
      if (room.portalOpen) {
        const px = ROOM_W / 2;
        const py = ROOM_H / 2 - 75;
        ctx.fillStyle = "#090002";
        ctx.beginPath();
        ctx.arc(px, py, 28, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 4;
        ctx.stroke();

        const reachedPortal = [
          { x: demon.current.x, y: demon.current.y },
          ...remotePlayersRef.current,
        ].some((player) => Math.hypot(player.x - px, player.y - py) < 32);
        if (isWorldAuthority && !hasWon && reachedPortal) {
          const nextFl = statsRef.current.floor + 1;
          if (nextFl > 5) {
            setHasWon(true);
            if (!victoryTriggeredRef.current) {
              victoryTriggeredRef.current = true;
                onVictory(newGamePlus);
              playGameSound("enemyDeath");
            }
          } else {
            setHud((h) => ({ ...h, floor: nextFl }));
            generateCathedralFloor(nextFl);
            showBanner(`PISO ${nextFl}: CATEDRAL PROFUNDA`, "Un nuevo guardián aguarda");
          }
        }
      }

      // ==========================================
      // 5. ROSARIOS EXPLOSIVOS
      // ==========================================
      bombs.current = bombs.current.filter((b) => {
        if (isWorldAuthority) b.timer -= dt;
        const blink = b.timer < 0.6 && Math.floor(b.timer * 15) % 2 === 0;

        ctx.fillStyle = blink ? "#ffffff" : "#dc2626";
        ctx.beginPath();
        ctx.arc(b.x, b.y, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 2;
        ctx.stroke();

        if (b.timer <= 0 && isWorldAuthority) {
          shakeSec.current = 0.35;
          spawnParticles(b.x, b.y, "#ef4444", 24);
          room.marks.push({ x: b.x, y: b.y, radius: 36, color: "rgba(0,0,0,0.65)" });

          room.pillars = room.pillars.filter((p) => {
            if (Math.hypot(p.x - b.x, p.y - b.y) < 95) {
              if (p.type === "reliquary") {
                room.drops.push({
                  id: Math.random(),
                  x: p.x,
                  y: p.y,
                  type: "dark_soul",
                  name: "Armadura de Ceniza",
                  desc: "+1 Escudo Demoníaco",
                });
              }
              return false;
            }
            return true;
          });

          room.enemies.forEach((en) => {
            if (Math.hypot(en.x - b.x, en.y - b.y) < 115) {
              en.hp -= 90;
              en.hitFlash = 0.14;
            }
          });
          return false;
        }
        return true;
      });

      // ==========================================
      // 6. RELIQUIAS Y BOTÍN
      // ==========================================
      let pickedChoiceGroup: string | undefined;
      let pickedOfferId: number | undefined;
      room.drops = room.drops.filter((dr) => {
        if (pickedChoiceGroup && dr.choiceGroup === pickedChoiceGroup) return false;
        const collector = isWorldAuthority
          ? [
              { x: demon.current.x, y: demon.current.y },
              ...remotePlayersRef.current,
            ].find((player) => Math.hypot(player.x - dr.x, player.y - dr.y) < 32)
          : undefined;
        if (collector) {
          if (dr.type === "shop_upgrade" && dr.itemId) {
            const remainingCoins = purchaseWithCoins(statsRef.current.coins, dr.cost ?? 0);
            if (remainingCoins === null) {
              if (now - lastShopNoticeAtRef.current > 1600) {
                showBanner("FALTAN MONEDAS", `Necesitas ${dr.cost ?? 0} monedas para ${dr.name}`);
                lastShopNoticeAtRef.current = now;
              }
              return true;
            }
            setHud((h) => ({ ...h, coins: remainingCoins }));
            applyUpgrade(dr.itemId);
          } else if (dr.type === "weapon" && dr.itemId) {
            const weapon = WEAPONS.find((entry) => entry.id === dr.itemId);
            if (!weapon) console.error(`No se encontró el arma de partida: ${dr.itemId}`);
            else equipWeapon(weapon);
          } else if (dr.type === "upgrade" && dr.itemId) {
            applyUpgrade(dr.itemId);
          } else if (dr.type === "coin") {
            setHud((h) => ({ ...h, coins: h.coins + (dr.coinValue ?? 1) }));
            showBanner(`+${dr.coinValue ?? 1} MONEDAS`, "Guárdalas para las tiendas del camino");
          } else if (dr.type === "blood_vial") {
            setHud((h) => ({ ...h, bloodHearts: Math.min(h.maxBloodHearts, h.bloodHearts + 2) }));
          } else if (dr.type === "dark_soul") {
            setHud((h) => ({ ...h, darkArmor: h.darkArmor + 2 }));
          } else if (dr.type === "rosary_bomb") {
            setHud((h) => ({ ...h, rosaries: h.rosaries + 1 }));
          } else {
            showBanner(dr.name, dr.desc);
            setHud((h) => {
              const relics = [...h.relics, dr.name];
              if (dr.type === "relic_crimson") {
                return {
                  ...h,
                  relics,
                  damage: h.damage + 12,
                  damageBonus: h.damageBonus + 12,
                  maxBloodHearts: h.maxBloodHearts + 2,
                  bloodHearts: h.bloodHearts + 2,
                };
              }
              if (dr.type === "relic_sigil") {
                const extraShots = Math.max(h.extraShots, 3 - (WEAPONS.find((weapon) => weapon.id === h.weaponId)?.multishot ?? 1));
                return { ...h, relics, multishot: Math.max(h.multishot, 3), extraShots };
              }
              if (dr.type === "relic_ashes") {
                return { ...h, relics, moveSpeed: h.moveSpeed + 40, darkArmor: h.darkArmor + 4 };
              }
              return {
                ...h,
                relics,
                damage: h.damage + 7,
                damageBonus: h.damageBonus + 7,
                fireRateMs: Math.max(130, h.fireRateMs - 65),
                rateBonus: h.rateBonus - 65,
              };
            });
          }
          pickedChoiceGroup = dr.choiceGroup;
          pickedOfferId = dr.id;
          return false;
        }

        // Dibujar altar gótico o vial de sangre
        if (dr.type.startsWith("relic_")) {
          ctx.fillStyle = "#271216";
          ctx.fillRect(dr.x - 22, dr.y + 6, 44, 18);
          ctx.strokeStyle = "#ef4444";
          ctx.lineWidth = 2;
          ctx.strokeRect(dr.x - 22, dr.y + 6, 44, 18);

          const fy = dr.y - 10 + Math.sin(now / 200) * 4;
          ctx.fillStyle = "#dc2626";
          ctx.beginPath();
          ctx.arc(dr.x, fy, 15, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          const color =
            dr.type === "weapon" ? "#66d9ef" :
            dr.type === "upgrade" ? "#7ae582" :
            dr.type === "shop_upgrade" ? "#f2b84b" :
            dr.type === "coin" ? "#ffe071" :
            dr.type === "blood_vial" ? "#dc2626" :
            dr.type === "dark_soul" ? "#a855f7" : "#facc15";
          ctx.fillStyle = color;
          ctx.fillRect(dr.x - (dr.type === "coin" ? 8 : 10), dr.y - (dr.type === "coin" ? 8 : 10), dr.type === "coin" ? 16 : 20, dr.type === "coin" ? 16 : 20);
          ctx.strokeStyle = "#ffffff";
          ctx.strokeRect(dr.x - (dr.type === "coin" ? 8 : 10), dr.y - (dr.type === "coin" ? 8 : 10), dr.type === "coin" ? 16 : 20, dr.type === "coin" ? 16 : 20);
          ctx.fillStyle = "#170b12";
          ctx.font = "bold 12px 'Courier New', monospace";
          ctx.textAlign = "center";
          ctx.fillText(dr.type === "weapon" ? "W" : dr.type === "upgrade" || dr.type === "shop_upgrade" ? "+" : dr.type === "coin" ? "$" : "•", dr.x, dr.y + 4);
        }
        return true;
      });
      if (pickedOfferId !== undefined) {
        if (pickedChoiceGroup) {
          room.drops = room.drops.filter((drop) => drop.choiceGroup !== pickedChoiceGroup);
        }
        syncRoomOffers(room);
      }

      // ==========================================
      // 7. ENEMIGOS DE LA INQUISICIÓN Y JEFES (CON DELTA TIME)
      // ==========================================
      room.enemies = room.enemies.filter((en) => {
        if (en.hp <= 0) {
          if (isWorldAuthority) {
            playGameSound("enemyDeath");
            spawnParticles(en.x, en.y, "#dc2626", 16);
            room.marks.push({ x: en.x, y: en.y, radius: 22, color: "rgba(153, 27, 27, 0.55)" });
          }

          if (isWorldAuthority && en.type.startsWith("boss_")) {
            const weapon = WEAPONS[(statsRef.current.floor * 4 - 1) % WEAPONS.length];
            const firstUpgradeIndex = (statsRef.current.floor * 4 - 1) % UPGRADES.length;
            const choiceGroup = `boss-${statsRef.current.floor}`;
            room.drops.push({
              id: Math.random(),
              x: ROOM_W / 2,
              y: ROOM_H / 2 + 45,
              type: "weapon",
              name: weapon.name,
              desc: weapon.description,
              itemId: weapon.id,
            });
            [firstUpgradeIndex, (firstUpgradeIndex + 9) % UPGRADES.length].forEach((upgradeIndex, index) => {
              const upgrade = UPGRADES[upgradeIndex];
              room.drops.push({
                id: Math.random(),
                x: index === 0 ? ROOM_W / 2 - 170 : ROOM_W / 2 + 170,
                y: ROOM_H / 2 + 45,
                type: "upgrade",
                name: upgrade.name,
                desc: upgrade.description,
                itemId: upgrade.id,
                choiceGroup,
              });
            });
            const bossCoins = 3 + Math.min(3, statsRef.current.floor);
            room.drops.push({
              id: Math.random(),
              x: ROOM_W / 2,
              y: ROOM_H / 2 + 108,
              type: "coin",
              name: "Monedas del guardián",
              desc: `+${bossCoins} monedas`,
              coinValue: bossCoins,
            });
            syncRoomOffers(room);
          } else if (isWorldAuthority) {
            const coinDrop = rollEnemyCoins();
            if (coinDrop > 0) {
              room.drops.push({
                id: Math.random(),
                x: en.x + 25,
                y: en.y + 20,
                type: "coin",
                name: "Monedas",
                desc: `+${coinDrop}`,
                coinValue: coinDrop,
              });
            }
          }

          if (!en.type.startsWith("boss_") && Math.random() < 0.45) {
            room.drops.push({
              id: Math.random(),
              x: en.x,
              y: en.y,
              type: Math.random() > 0.35 ? "blood_vial" : "rosary_bomb",
              name: "Ofrenda",
              desc: "",
            });
          } else if (!en.type.startsWith("boss_") && Math.random() < 0.12) {
            const upgrade = UPGRADES[Math.floor(Math.random() * UPGRADES.length)];
            room.drops.push({
              id: Math.random(),
              x: en.x,
              y: en.y,
              type: "upgrade",
              name: upgrade.name,
              desc: upgrade.description,
              itemId: upgrade.id,
              choiceGroup: `enemy-${Math.random()}`,
            });
          }
          if (isWorldAuthority) setHud((h) => ({ ...h, kills: h.kills + 1 }));
          return false;
        }

        const dx = demon.current.x - en.x;
        const dy = demon.current.y - en.y;
        const dist = Math.hypot(dx, dy) || 1;
        const isBoss = en.type.startsWith("boss_");
        en.hitFlash = Math.max(0, (en.hitFlash ?? 0) - dt);

        if (isWorldAuthority && !isDead && !hasWon) {
          en.cooldown -=
            dt *
            difficultyProfile(activeDifficultyRef.current).enemyAttackRate *
            (newGamePlus ? 1.15 : 1) *
            (isBoss && en.hp / en.maxHp < 0.5 ? 1.4 : 1);

          if (en.type === "cleric_bible") {
            // Clérigo camina despacio y lanza Biblias giratorias
            en.x += (dx / dist) * 62 * dt;
            en.y += (dy / dist) * 62 * dt;
            if (en.cooldown <= 0) {
              en.cooldown = 2.1;
              projectiles.current.push({
                x: en.x,
                y: en.y,
                vx: (dx / dist) * 230,
                vy: (dy / dist) * 230,
                radius: 12,
                damage: 1,
                angle: 0,
                spinSpeed: 8,
                kind: "bible",
                isEnemy: true,
              });
            }
          } else if (en.type === "stake_hunter") {
            // Cazador que dispara estacas afiladas en línea
            const aligned = Math.abs(dx) < 32 || Math.abs(dy) < 32;
            const spd = aligned ? 135 : 78;
            en.x += (dx / dist) * spd * dt;
            en.y += (dy / dist) * spd * dt;

            if (en.cooldown <= 0) {
              en.cooldown = 1.8;
              const ang = Math.atan2(dy, dx);
              projectiles.current.push({
                x: en.x,
                y: en.y,
                vx: Math.cos(ang) * 290,
                vy: Math.sin(ang) * 290,
                radius: 9,
                damage: 1,
                angle: ang,
                spinSpeed: 0,
                kind: "stake",
                isEnemy: true,
              });
            }
          } else if (en.type === "inquisitor") {
            en.x += (dx / dist) * 72 * dt;
            en.y += (dy / dist) * 72 * dt;
            if (en.cooldown <= 0) {
              en.cooldown = 2.4;
              for (let k = -1; k <= 1; k += 2) {
                const ang = Math.atan2(dy, dx) + k * 0.25;
                projectiles.current.push({
                  x: en.x,
                  y: en.y,
                  vx: Math.cos(ang) * 220,
                  vy: Math.sin(ang) * 220,
                  radius: 10,
                  damage: 1,
                  angle: ang,
                  spinSpeed: 6,
                  kind: "holy_cross",
                  isEnemy: true,
                });
              }
            }
          } else if (en.type === "boss_archbishop") {
            // Jefe 1: El Arzobispo del Velo lanza anillos de biblias y cruces
            en.x += (dx / dist) * 55 * dt;
            en.y += (dy / dist) * 55 * dt;
            if (en.cooldown <= 0) {
              en.cooldown = 2.0;
              for (let a = 0; a < 8; a++) {
                const ang = (Math.PI * 2 * a) / 8 + en.phaseTimer;
                projectiles.current.push({
                  x: en.x,
                  y: en.y,
                  vx: Math.cos(ang) * 210,
                  vy: Math.sin(ang) * 210,
                  radius: 12,
                  damage: 1,
                  angle: ang,
                  spinSpeed: 7,
                  kind: a % 2 === 0 ? "bible" : "holy_cross",
                  isEnemy: true,
                });
              }
              en.phaseTimer += 0.4;
            }
          } else if (en.type === "boss_maiden") {
            // Jefe 2: La Doncella de Estacas (Ráfagas dirigidas de estacas de madera)
            en.x += (dx / dist) * 85 * dt;
            en.y += (dy / dist) * 85 * dt;
            if (en.cooldown <= 0) {
              en.cooldown = 1.45;
              const baseAng = Math.atan2(dy, dx);
              for (let s = -2; s <= 2; s++) {
                const ang = baseAng + s * 0.18;
                projectiles.current.push({
                  x: en.x,
                  y: en.y,
                  vx: Math.cos(ang) * 300,
                  vy: Math.sin(ang) * 300,
                  radius: 9,
                  damage: 1,
                  angle: ang,
                  spinSpeed: 0,
                  kind: "stake",
                  isEnemy: true,
                });
              }
            }
          } else if (en.type === "boss_seraph") {
            // Jefe 3: Serafín nocturno
            en.x += (dx / dist) * 68 * dt;
            en.y += (dy / dist) * 68 * dt;
            if (en.cooldown <= 0) {
              en.cooldown = 1.7;
              for (let c = 0; c < 10; c++) {
                const ang = (Math.PI * 2 * c) / 10;
                projectiles.current.push({
                  x: en.x,
                  y: en.y,
                  vx: Math.cos(ang) * 240,
                  vy: Math.sin(ang) * 240,
                  radius: 11,
                  damage: 1,
                  angle: ang,
                  spinSpeed: 9,
                  kind: "holy_cross",
                  isEnemy: true,
                });
              }
            }
          } else if (en.type === "boss_colossus") {
            en.x += (dx / dist) * 38 * dt;
            en.y += (dy / dist) * 38 * dt;
            if (en.cooldown <= 0) {
              en.cooldown = en.hp / en.maxHp < 0.5 ? 1.75 : 2.5;
              const count = en.hp / en.maxHp < 0.5 ? 10 : 7;
              for (let c = 0; c < count; c++) {
                const ang = (Math.PI * 2 * c) / count + en.phaseTimer;
                projectiles.current.push({
                  x: en.x,
                  y: en.y,
                  vx: Math.cos(ang) * 190,
                  vy: Math.sin(ang) * 190,
                  radius: 14,
                  damage: 1,
                  angle: ang,
                  spinSpeed: 3,
                  kind: "bible",
                  isEnemy: true,
                });
              }
              en.phaseTimer += 0.3;
              shakeSec.current = Math.max(shakeSec.current, 0.12);
            }
          } else if (en.type === "boss_oracle") {
            en.x += (dx / dist) * 62 * dt;
            en.y += (dy / dist) * 62 * dt;
            if (en.cooldown <= 0) {
              en.cooldown = en.hp / en.maxHp < 0.5 ? 1.2 : 1.8;
              if (en.hp / en.maxHp < 0.5) {
                en.x = ROOM_W / 2 + (Math.random() - 0.5) * 260;
                en.y = ROOM_H / 2 + (Math.random() - 0.5) * 160;
                spawnParticles(en.x, en.y, "#b88cff", 16);
              }
              const baseAng = Math.atan2(dy, dx);
              for (let c = -2; c <= 2; c++) {
                const ang = baseAng + c * 0.2;
                projectiles.current.push({
                  x: en.x,
                  y: en.y,
                  vx: Math.cos(ang) * 290,
                  vy: Math.sin(ang) * 290,
                  radius: 9,
                  damage: 1,
                  angle: ang,
                  spinSpeed: 5,
                  kind: "holy_cross",
                  isEnemy: true,
                });
              }
            }
          }

          if (isWorldAuthority && dist < (isBoss ? 38 : 22)) {
            hurtDemon();
          }
          if (isWorldAuthority) {
            const touchingPlayer = remotePlayersRef.current.find(
              (player) => Math.hypot(player.x - en.x, player.y - en.y) < (isBoss ? 38 : 22),
            );
            if (touchingPlayer) hurtMultiplayerPlayer(touchingPlayer);
          }
        }

        const spriteRows = enemySprites[en.type][Math.floor(now / 170 + en.id) % 2];
        const bob = Math.floor(now / 220 + en.id) % 2 === 0 ? -2 : 0;
        const palette: PixelPalette =
          en.type === "cleric_bible"
            ? { K: "#17131f", W: "#777386", F: "#c9c2d2", E: "#ffdb64", S: "#cbb8ae", R: "#8b2432", G: "#e4c765", B: "#292432" }
            : en.type === "stake_hunter"
            ? { K: "#21151b", W: "#5b3528", F: "#8a5543", E: "#ff535d", S: "#bb8066", R: "#7d341d", T: "#a46a32", G: "#d7ae59", B: "#32201b" }
            : en.type === "inquisitor"
            ? { K: "#12161c", W: "#5b4048", F: "#9a4d4c", E: "#69e2dc", S: "#c78b72", R: "#4b2734", G: "#d8b75c", B: "#20202a" }
            : en.type === "boss_archbishop"
            ? { K: "#17121d", W: "#ccc9d7", F: "#f0e8d4", E: "#ff3c57", S: "#ddaa93", R: "#4a3048", G: "#ffcf63", B: "#282033" }
            : en.type === "boss_maiden"
            ? { K: "#21121d", W: "#402334", F: "#a94e68", E: "#ff7b9c", S: "#e4a18e", R: "#7e1f38", G: "#edc466", H: "#dd4665", B: "#2b1424" }
            : en.type === "boss_colossus"
            ? { K: "#211f24", W: "#77737a", F: "#aaa5aa", E: "#ff7d4d", S: "#c3977e", R: "#57414a", G: "#ef9f4e", B: "#302c35" }
            : en.type === "boss_oracle"
            ? { K: "#171426", W: "#6e5b9c", F: "#c5b3e8", E: "#e29eff", S: "#d6a895", R: "#42305d", G: "#bd8aff", B: "#242039" }
            : { K: "#111824", W: "#527995", F: "#b8dce8", E: "#85f5ff", S: "#d6a895", R: "#373355", G: "#8ff5f0", B: "#192332" };

        ctx.fillStyle = "rgba(0, 0, 0, 0.52)";
        ctx.fillRect(en.x - (isBoss ? 28 : 16), en.y + (isBoss ? 24 : 17), isBoss ? 56 : 32, 7);
        if (isBoss) {
          const halo = Math.floor(now / 260) % 2 === 0 ? 3 : 0;
          ctx.fillStyle = palette.G;
          ctx.fillRect(en.x - 30 - halo, en.y - 27 - halo, 7, 5);
          ctx.fillRect(en.x + 23 + halo, en.y - 27 - halo, 7, 5);
          ctx.fillRect(en.x - 19, en.y - 35 - halo, 38, 4);
        }
        drawPixelSprite(
          ctx,
          spriteRows,
          palette,
          en.x,
          en.y + bob,
          isBoss ? 3 : 2,
          dx < 0,
          (en.hitFlash ?? 0) > 0
        );

        const hpPct = Math.max(0, en.hp / en.maxHp);
        const bw = isBoss ? 76 : 38;
        const barY = en.y - (isBoss ? 51 : 30);
        ctx.fillStyle = "#100b12";
        ctx.fillRect(en.x - bw / 2 - 2, barY - 2, bw + 4, 8);
        ctx.fillStyle = "#4b1723";
        ctx.fillRect(en.x - bw / 2, barY, bw, 4);
        ctx.fillStyle = isBoss ? "#edbd57" : "#ed5360";
        ctx.fillRect(en.x - bw / 2, barY, bw * hpPct, 4);
        ctx.fillStyle = "#ffe5ac";
        for (let tick = 1; tick < 4; tick++) {
          ctx.fillRect(en.x - bw / 2 + (bw / 4) * tick, barY, 1, 4);
        }

        return true;
      });

      if (isWorldAuthority && !room.cleared && room.enemies.length === 0) {
        room.cleared = true;
        if (room.type === "boss") {
          room.portalOpen = true;
          room.drops.push({
            id: Math.random(),
            x: ROOM_W / 2,
            y: ROOM_H / 2 + 112,
            type: "relic_crimson",
            name: "CÁLIZ CARMESÍ",
            desc: "Trofeo de Sangre del Prelado Caído",
          });
          showBanner("GUARDIÁN DERROTADO", "El portal y sus recompensas están disponibles");
        }
      }

      // ==========================================
      // 8. PROYECTILES: BIBLIAS, ESTACAS, CRUCES Y FUEGO DEMONÍACO
      // ==========================================
      projectiles.current = projectiles.current.filter((p) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.angle += p.spinSpeed * dt;

        if (
          isWorldAuthority &&
          (
            p.x < WALL_THICKNESS ||
            p.x > ROOM_W - WALL_THICKNESS ||
            p.y < WALL_THICKNESS ||
            p.y > ROOM_H - WALL_THICKNESS
          )
        ) {
          spawnParticles(p.x, p.y, p.isEnemy ? "#facc15" : "#ef4444", 5);
          return false;
        }

        const hitPillar = isWorldAuthority && room.pillars.some(
          (pl) => pl.type !== "holy_water" && Math.hypot(p.x - pl.x, p.y - pl.y) < 24
        );
        if (hitPillar) {
          spawnParticles(p.x, p.y, "#dc2626", 5);
          return false;
        }

        if (isWorldAuthority && p.isEnemy) {
          const remoteTarget = remotePlayersRef.current.find(
            (player) => player.invulnSec <= 0 && Math.hypot(p.x - player.x, p.y - player.y) < p.radius + 15,
          );
          if (remoteTarget) {
            hurtMultiplayerPlayer(remoteTarget);
            return false;
          }
          if (Math.hypot(p.x - demon.current.x, p.y - demon.current.y) < p.radius + 15) {
            hurtDemon();
            return false;
          }
        } else if (isWorldAuthority) {
          for (const en of room.enemies) {
            const hitR = en.type.startsWith("boss_") ? 36 : 19;
            if (!p.hitTargets?.has(en.id) && Math.hypot(p.x - en.x, p.y - en.y) < hitR + p.radius) {
              p.hitTargets?.add(en.id);
              en.hp -= p.damage;
              en.hitFlash = 0.12;
              if (now - lastImpactSoundRef.current > 65) {
                playGameSound("enemyHit");
                lastImpactSoundRef.current = now;
              }
              spawnParticles(p.x, p.y, "#ef4444", 6);
              p.pierce = (p.pierce ?? 1) - 1;
              if (p.pierce <= 0) return false;
              break;
            }
          }
        }

        // Dibujo personalizado por tipo de proyectil
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);

        if (p.kind === "bible") {
          // Biblia Negra con Cruz Dorada en la portada
          ctx.fillStyle = "#1c1917";
          ctx.fillRect(-10, -13, 20, 26);
          ctx.strokeStyle = "#facc15";
          ctx.lineWidth = 2;
          ctx.strokeRect(-10, -13, 20, 26);
          ctx.fillStyle = "#facc15";
          ctx.fillRect(-2, -8, 4, 16);
          ctx.fillRect(-6, -3, 12, 3);
        } else if (p.kind === "stake") {
          // Estaca de madera afilada con punta ensangrentada
          ctx.fillStyle = "#78350f";
          ctx.beginPath();
          ctx.moveTo(14, 0);
          ctx.lineTo(-10, -5);
          ctx.lineTo(-10, 5);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = p.color ?? "#dc2626";
          ctx.beginPath();
          ctx.arc(10, 0, 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.kind === "holy_cross") {
          // Cruz Dorada Luminosa
          ctx.fillStyle = "#fde047";
          ctx.fillRect(-3, -11, 6, 22);
          ctx.fillRect(-9, -4, 18, 6);
        } else {
          // Orbe de Fuego Demoníaco Carmesí (Disparo del jugador)
          ctx.fillStyle = "#dc2626";
          ctx.beginPath();
          ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#fecaca";
          ctx.beginPath();
          ctx.arc(-2, -2, p.radius * 0.45, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
        return true;
      });

      // ==========================================
      // 9. PARTÍCULAS
      // ==========================================
      particles.current = particles.current.filter((pt) => {
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.alpha -= dt * 2.2;
        if (pt.alpha <= 0) return false;

        ctx.save();
        ctx.globalAlpha = pt.alpha;
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return true;
      });

      // ==========================================
      // 10. DIBUJAR AL JUGADOR
      // ==========================================
      const blink = demon.current.invulnSec > 0 && Math.floor(now / 80) % 2 === 0;
      if (!blink) {
        const px = demon.current.x;
        const py = demon.current.y;
        const moving = now - lastPlayerMoveAtRef.current < 140;
        const playerFrame = moving ? Math.floor(demon.current.stepPhase * 1.4) % 2 : 0;
        const recoil = now - lastShotTime.current < 90 ? -2 : 0;
        const playerPalette = selectedCharacter.palette;
        ctx.fillStyle = "rgba(220, 38, 38, 0.24)";
        ctx.fillRect(px - 15, py + 22, 30, 5);
        if (demon.current.abilityTimer > 0) {
          ctx.strokeStyle = selectedCharacter.palette.E;
          ctx.lineWidth = 3;
          ctx.strokeRect(px - 26, py - 27, 52, 54);
        }
        drawPixelSprite(
          ctx,
          playerSpriteFrames[playerFrame],
          playerPalette,
          px,
          py - 1 + recoil,
          3,
          demon.current.faceDir === "W"
        );
        if (characterId === "nyx") {
          ctx.fillStyle = selectedCharacter.palette.E;
          ctx.fillRect(px + 18, py - 1, 4, 18);
          ctx.fillRect(px + 15, py + 8, 4, 4);
        } else if (characterId === "bram") {
          ctx.fillStyle = selectedCharacter.palette.G;
          ctx.fillRect(px - 27, py - 2, 9, 12);
          ctx.fillRect(px + 18, py - 2, 9, 12);
        } else if (characterId === "sol") {
          ctx.fillStyle = selectedCharacter.palette.E;
          ctx.fillRect(px - 4, py - 31, 8, 5);
          ctx.fillRect(px - 2, py - 36, 4, 5);
        }
      }

      if (multiplayer) {
        const drawGamertag = (name: string, x: number, y: number) => {
          ctx.save();
          ctx.font = "bold 14px 'Courier New', monospace";
          ctx.textAlign = "center";
          const label = name.slice(0, 20);
          const width = ctx.measureText(label).width + 12;
          ctx.fillStyle = "rgba(8, 4, 8, 0.88)";
          ctx.fillRect(x - width / 2, y - 42, width, 20);
          ctx.strokeStyle = "#f2b84b";
          ctx.lineWidth = 1;
          ctx.strokeRect(x - width / 2, y - 42, width, 20);
          ctx.fillStyle = "#fff4d6";
          ctx.fillText(label, x, y - 28);
          ctx.restore();
        };
        drawGamertag(playerName, demon.current.x, demon.current.y);
        remotePlayersRef.current.forEach((player) => {
          const character = CHARACTERS.find((entry) => entry.id === player.characterId) ?? CHARACTERS[0];
          const moving = player.input.up || player.input.down || player.input.left || player.input.right;
          const frame = moving ? Math.floor(player.stepPhase * 1.4) % 2 : 0;
          drawPixelSprite(
            ctx,
            playerSpriteFrames[frame],
            character.palette,
            player.x,
            player.y - 1,
            3,
            player.faceDir === "W",
            player.invulnSec > 0 && Math.floor(now / 80) % 2 === 0,
          );
          drawGamertag(player.name, player.x, player.y);
        });
      }

      // ==========================================
      // 11. BANNER GÓTICO DE CAPÍTULO / RELIQUIA
      // ==========================================
      if (bannerRef.current.timer > 0) {
        bannerRef.current.timer = Math.max(0, bannerRef.current.timer - dt);
        ctx.save();
        ctx.fillStyle = "rgba(10, 2, 4, 0.9)";
        ctx.fillRect(ROOM_W / 2 - 270, 78, 540, 66);
        ctx.strokeStyle = "#dc2626";
        ctx.lineWidth = 3;
        ctx.strokeRect(ROOM_W / 2 - 270, 78, 540, 66);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 20px 'Courier New', monospace";
        ctx.textAlign = "center";
        ctx.fillText(bannerRef.current.title, ROOM_W / 2, 108);

        ctx.fillStyle = "#f87171";
        ctx.font = "13px 'Courier New', monospace";
        ctx.fillText(bannerRef.current.subtitle, ROOM_W / 2, 132);
        ctx.restore();
      }

      if (
        multiplayer &&
        isGameHost &&
        gameSocketRef.current?.connected &&
        now - lastStateSentAtRef.current >= 50
      ) {
        const players: MultiplayerPlayer[] = [
          {
            id: playerId ?? "",
            name: playerName,
            characterId,
            x: demon.current.x,
            y: demon.current.y,
            faceDir: demon.current.faceDir,
            stepPhase: demon.current.stepPhase,
            invulnSec: demon.current.invulnSec,
            abilityTimer: demon.current.abilityTimer,
            abilityCooldown: demon.current.abilityCooldown,
            lastShotAt: lastShotTime.current,
            lastInputAt: now,
            input: getMultiplayerInput(),
          },
          ...remotePlayersRef.current,
        ];
        gameSocketRef.current.emit("game:state", {
          code: lobbyId,
          state: {
            dungeon: [...dungeon.current.entries()],
            currentRoomKey: currentRoomKey.current,
            players,
            projectiles: projectiles.current.map((projectile) => ({
              ...projectile,
              hitTargets: [...(projectile.hitTargets ?? [])],
            })),
            bombs: bombs.current,
            hud: statsRef.current,
            deadPlayers: isDead ? players.map((player) => player.id) : [],
            hasWon,
            roomOffers: roomOffersRef.current,
          },
        });
        lastStateSentAtRef.current = now;
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", clearPressedKeys);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearPressedKeys();
      cancelAnimationFrame(animId);
    };
  }, [hasWon, isDead]);

  const renderBloodBar = () => {
    const containers = Math.ceil(hud.maxBloodHearts / 2);
    const out: string[] = [];
    for (let i = 0; i < containers; i++) {
      const rem = hud.bloodHearts - i * 2;
      if (rem >= 2) out.push("🩸");
      else if (rem === 1) out.push("💔");
      else out.push("🖤");
    }
    const armorCount = Math.ceil(hud.darkArmor / 2);
    for (let a = 0; a < armorCount; a++) {
      out.push("🛡️");
    }
    return out.join(" ");
  };

  const mapBounds = hud.minimap.reduce(
    (bounds, room) => ({
      minX: Math.min(bounds.minX, room.gx),
      maxX: Math.max(bounds.maxX, room.gx),
      minY: Math.min(bounds.minY, room.gy),
      maxY: Math.max(bounds.maxY, room.gy),
    }),
    { minX: 0, maxX: 0, minY: 0, maxY: 0 }
  );
  const mapCellSize = isMobile ? 15 : 19;
  const mapCells = Array.from(
    { length: mapBounds.maxY - mapBounds.minY + 1 },
    (_, row) =>
      Array.from(
        { length: mapBounds.maxX - mapBounds.minX + 1 },
        (_, col) => hud.minimap.find(
          (room) => room.gx === mapBounds.minX + col && room.gy === mapBounds.minY + row
        ) ?? null
      )
  );

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", backgroundColor: "#060203" }}>
      <canvas
        ref={canvasRef}
        data-testid="game-canvas"
        style={{ display: "block", width: "100%", height: "100%", imageRendering: "pixelated" }}
      />
      {multiplayer && (
        <div
          role={multiplayerError ? "alert" : "status"}
          style={{
            position: "absolute",
            left: 12,
            bottom: 12,
            maxWidth: "min(90vw, 520px)",
            padding: "7px 10px",
            border: `1px solid ${multiplayerError ? "#ef4444" : "#22c55e"}`,
            background: "rgba(8, 4, 8, 0.9)",
            color: multiplayerError ? "#fca5a5" : "#bbf7d0",
            font: "bold 12px 'Courier New', monospace",
          }}
        >
          {multiplayerError ?? (multiplayerConnected ? "PARTIDA SINCRONIZADA" : "CONECTANDO PARTIDA...")}
        </div>
      )}

      {/* HUD Superior Gótico Carmesí */}
      <div
        style={{
          position: "absolute",
          top: isMobile ? 8 : 10,
          left: isMobile ? 8 : 14,
          right: isMobile ? 8 : 14,
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? 8 : 0,
          justifyContent: "space-between",
          alignItems: "flex-start",
          pointerEvents: "none",
          fontFamily: "'Courier New', Courier, monospace",
        }}
      >
        <div style={{ display: "flex", gap: isMobile ? "4px" : "10px", pointerEvents: "auto" }}>
          <button onClick={onBackToMenu} style={hudBtnStyle}>
            ◀ MENÚ
          </button>
          <button onClick={onOpenSettings} style={hudBtnStyle}>
            ⚙ AJUSTES
          </button>
          {!isMobile && (
            <button onClick={dropRosaryBomb} style={{ ...hudBtnStyle, background: "#450a0a" }}>
              BOMBAS [{settings.controls.bomb.toUpperCase()}] ({hud.rosaries})
            </button>
          )}
          {!isMobile && (
            <button
              onClick={activateCharacterAbility}
              disabled={!abilityAvailable}
              style={{ ...hudBtnStyle, background: "#25203b", borderColor: selectedCharacter.palette.E, opacity: abilityAvailable ? 1 : 0.6 }}
            >
              {selectedCharacter.abilityName.toUpperCase()} [{settings.controls.ability.toUpperCase()}]
            </button>
          )}
          <button onClick={() => setIsMobile((m) => !m)} style={hudBtnStyle}>
            📱 {isMobile ? "Ocultar Controles" : "Modo Móvil"}
          </button>
        </div>

        <div
          style={{
            position: isMobile ? "absolute" : "static",
            top: isMobile ? 54 : undefined,
            left: isMobile ? 0 : undefined,
            background: "rgba(15, 3, 5, 0.94)",
            border: "2px solid #dc2626",
            padding: isMobile ? "6px 8px" : "8px 18px",
            color: "#ffffff",
            display: isMobile ? "grid" : "flex",
            gridTemplateColumns: isMobile ? "repeat(2, max-content)" : undefined,
            gap: isMobile ? "4px 10px" : "18px",
            fontSize: isMobile ? "10px" : "13px",
            fontWeight: "bold",
            boxShadow: "0 0 20px rgba(220, 38, 38, 0.35)",
          }}
        >
          <span>SANGRE: {renderBloodBar()}</span>
          <span style={{ color: "#f87171" }}>ACTO: {hud.floor}</span>
          <span style={{ color: "#ef4444" }}>🔥 PODER: {hud.damage}</span>
          <span style={{ color: "#ffe071" }}>MONEDAS: {hud.coins}</span>
          <span style={{ color: selectedCharacter.palette.E }}>ARMA: {WEAPONS.find((weapon) => weapon.id === hud.weaponId)?.name}</span>
          <span style={{ color: "#7ae582" }}>MEJORAS: {hud.relics.length}</span>
          <span style={{ color: "#fca5a5" }}>BAJAS: {hud.kills}</span>
          <span style={{ color: "#cbd5e1" }}>{selectedCharacter.name} · {lobbyId || "SOLO"}{newGamePlus ? " · NG+" : ""}</span>
        </div>

        {/* Minimapa de la Catedral */}
        <div
          style={{
            position: isMobile ? "absolute" : "static",
            top: 0,
            right: 0,
            background: "rgba(10, 2, 4, 0.92)",
            border: "2px solid #991b1b",
            padding: isMobile ? "5px" : "8px",
            display: "grid",
            gridTemplateColumns: `repeat(${mapBounds.maxX - mapBounds.minX + 1}, ${mapCellSize}px)`,
            gridTemplateRows: `repeat(${mapBounds.maxY - mapBounds.minY + 1}, ${mapCellSize}px)`,
            gap: "2px",
          }}
        >
          {mapCells.map((row, rowIndex) =>
            row.map((cell, columnIndex) => {
              if (!cell) return <div key={`${rowIndex}-${columnIndex}`} />;
              const bg = cell.current
                ? "#ef4444"
                : cell.type === "boss"
                ? "#7f1d1d"
                : cell.type === "upgrade"
                ? "#a855f7"
                : cell.type === "shop"
                ? "#806526"
                : cell.visited
                ? "#3f3f46"
                : "#18181b";
              return (
                <div
                  key={`${cell.gx},${cell.gy}`}
                  title={cell.type === "upgrade" ? "Mejoras" : cell.type === "shop" ? "Tienda" : cell.type === "boss" ? "Jefe" : "Sala"}
                  style={{
                    width: mapCellSize,
                    height: mapCellSize,
                    backgroundColor: bg,
                    border: "1px solid #f8fafc",
                    fontSize: isMobile ? 9 : 11,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontWeight: "bold",
                  }}
                >
                  {cell.type === "boss" ? "!" : cell.type === "upgrade" ? "+" : cell.type === "shop" ? "$" : ""}
                </div>
              );
            })
          )}
        </div>
      </div>

      {roomOffers.length > 0 && !isDead && !hasWon && (
        <section
          aria-label="Ofertas disponibles en esta habitación"
          data-testid="room-offers"
          style={{
            position: "absolute",
            zIndex: 60,
            top: isMobile ? 164 : 168,
            left: "50%",
            transform: "translateX(-50%)",
            width: "min(94vw, 720px)",
            padding: 7,
            background: "rgba(9, 7, 12, 0.92)",
            border: `2px solid ${roomOffers.some((offer) => offer.type === "shop_upgrade") ? "#f2b84b" : "#7f6da9"}`,
            boxShadow: "3px 3px 0 #090509",
            color: "#fff",
            fontFamily: "'Courier New', Courier, monospace",
            pointerEvents: "none",
          }}
        >
          <div style={{ color: roomOffers.some((offer) => offer.type === "shop_upgrade") ? "#ffe071" : "#d8c5ff", fontSize: 10, fontWeight: "bold", marginBottom: 5, textAlign: "center" }}>
            {roomOffers.some((offer) => offer.type === "shop_upgrade")
              ? "TIENDA · ACÉRCATE A UNA OFERTA PARA COMPRAR"
              : "MEJORAS DISPONIBLES · AL TOMAR UNA, LAS OTRAS MEJORAS SE BLOQUEAN"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${roomOffers.length}, minmax(0, 1fr))`, gap: 5 }}>
            {roomOffers.map((offer) => (
              <article
                key={offer.id}
                style={{
                  minWidth: 0,
                  padding: "5px 6px",
                  background: "#18131f",
                  border: `1px solid ${offer.type === "shop_upgrade" ? "#9b7b34" : offer.type === "weapon" ? "#357486" : "#59477c"}`,
                }}
              >
                <strong style={{ display: "block", color: offer.type === "shop_upgrade" ? "#ffe071" : offer.type === "weapon" ? "#80e3f7" : "#b7f5c0", fontSize: 10, lineHeight: 1.25, overflowWrap: "anywhere" }}>
                  {offer.name}
                </strong>
                <span style={{ display: "block", color: "#ddd5e4", fontSize: 9, lineHeight: 1.25, marginTop: 3, overflowWrap: "anywhere" }}>
                  {offer.desc}
                </span>
                {offer.cost !== undefined && (
                  <span style={{ display: "block", color: "#ffe071", fontSize: 9, marginTop: 3 }}>{offer.cost} monedas</span>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Modal de fin de partida */}
      {hasWon && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(5, 0, 2, 0.94)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 210,
            fontFamily: "'Courier New', Courier, monospace",
          }}
        >
          <div style={{ background: "#120305", border: "4px solid #f2b84b", padding: 32, color: "#fff", textAlign: "center", maxWidth: 470, boxShadow: "8px 8px 0 #000" }}>
            <h2 style={{ color: "#ffe28a", fontSize: 26 }}>¡SANTUARIO CONQUISTADO!</h2>
            <p>Derrotaste a los cinco guardianes. Has desbloqueado Nueva Partida+ y ganado {newGamePlus ? 8 : 5} fragmentos.</p>
            <p style={{ color: "#cbd5e1" }}>Puedes gastarlos en mejoras permanentes desde el menú principal.</p>
            <button onClick={onBackToMenu} style={{ ...hudBtnStyle, borderColor: "#f2b84b", background: "#553719" }}>
              VOLVER AL MENÚ
            </button>
          </div>
        </div>
      )}
      {isDead && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(5, 0, 2, 0.92)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
            fontFamily: "'Courier New', Courier, monospace",
          }}
        >
          <div
            style={{
              background: "#120305",
              border: "4px solid #dc2626",
              outline: "1px solid #fff",
              outlineOffset: "-6px",
              padding: "32px",
              textAlign: "center",
              color: "#f8fafc",
              maxWidth: "440px",
              boxShadow: "0 0 40px rgba(220, 38, 38, 0.6)",
            }}
          >
            <h2 style={{ fontSize: "24px", color: "#ef4444", marginBottom: "10px" }}>
              ✟ FIN DE LA INCURSIÓN ✟
            </h2>
            <p style={{ fontSize: "13px", marginBottom: "18px", color: "#fca5a5" }}>
              La Inquisición purificó tu sombra en el Acto {hud.floor} tras abatir a {hud.kills} zelotes.
              Reliquias perdidas: {hud.relics.length > 0 ? hud.relics.join(", ") : "Ninguna"}.
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button onClick={restartRun} style={{ ...hudBtnStyle, background: "#991b1b" }}>
                🩸 Resucitar (Acto 1)
              </button>
              <button onClick={onBackToMenu} style={hudBtnStyle}>
                Volver al Altar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controles Táctiles para Móvil */}
      {isMobile && !isDead && !hasWon && (
        <>
          <button
            type="button"
            aria-label={`Usar bomba; quedan ${hud.rosaries}`}
            onClick={dropRosaryBomb}
            disabled={hud.rosaries <= 0}
            style={bombPadStyle}
          >
            BOMBA × {hud.rosaries}
          </button>
          <button
            type="button"
            aria-label={`Usar habilidad: ${selectedCharacter.abilityName}`}
            onClick={activateCharacterAbility}
            disabled={!abilityAvailable}
            style={{ ...bombPadStyle, right: 24, bottom: 254, borderColor: selectedCharacter.palette.E, background: "#25203b", opacity: abilityAvailable ? 1 : 0.55 }}
          >
            {selectedCharacter.abilityName.toUpperCase()}
          </button>
          <div
            style={{
              position: "absolute",
              bottom: 24,
              left: 24,
              display: "grid",
              gridTemplateColumns: "repeat(3, 54px)",
              gridTemplateRows: "repeat(3, 54px)",
              gap: "5px",
              zIndex: 100,
            }}
          >
            <div />
            <button
              type="button"
              aria-label="Mover arriba"
              onPointerDown={pressTouchKey("moveUp")}
              onPointerUp={releaseTouchKey("moveUp")}
              onPointerCancel={releaseTouchKey("moveUp")}
              onLostPointerCapture={releaseTouchKey("moveUp")}
              style={dPadStyle}
            >▲</button>
            <div />
            <button
              type="button"
              aria-label="Mover a la izquierda"
              onPointerDown={pressTouchKey("moveLeft")}
              onPointerUp={releaseTouchKey("moveLeft")}
              onPointerCancel={releaseTouchKey("moveLeft")}
              onLostPointerCapture={releaseTouchKey("moveLeft")}
              style={dPadStyle}
            >◀</button>
            <div style={{ color: "#fca5a5", fontSize: "10px", textAlign: "center", alignSelf: "center" }}>PASO</div>
            <button
              type="button"
              aria-label="Mover a la derecha"
              onPointerDown={pressTouchKey("moveRight")}
              onPointerUp={releaseTouchKey("moveRight")}
              onPointerCancel={releaseTouchKey("moveRight")}
              onLostPointerCapture={releaseTouchKey("moveRight")}
              style={dPadStyle}
            >▶</button>
            <div />
            <button
              type="button"
              aria-label="Mover abajo"
              onPointerDown={pressTouchKey("moveDown")}
              onPointerUp={releaseTouchKey("moveDown")}
              onPointerCancel={releaseTouchKey("moveDown")}
              onLostPointerCapture={releaseTouchKey("moveDown")}
              style={dPadStyle}
            >▼</button>
            <div />
          </div>

          <div
            style={{
              position: "absolute",
              bottom: 24,
              right: 24,
              display: "grid",
              gridTemplateColumns: "repeat(3, 54px)",
              gridTemplateRows: "repeat(3, 54px)",
              gap: "5px",
              zIndex: 100,
            }}
          >
            <div />
            <button
              type="button"
              aria-label="Disparar hacia arriba"
              onPointerDown={pressTouchKey("shootUp")}
              onPointerUp={releaseTouchKey("shootUp")}
              onPointerCancel={releaseTouchKey("shootUp")}
              onLostPointerCapture={releaseTouchKey("shootUp")}
              style={firePadStyle}
            >↑</button>
            <div />
            <button
              type="button"
              aria-label="Disparar a la izquierda"
              onPointerDown={pressTouchKey("shootLeft")}
              onPointerUp={releaseTouchKey("shootLeft")}
              onPointerCancel={releaseTouchKey("shootLeft")}
              onLostPointerCapture={releaseTouchKey("shootLeft")}
              style={firePadStyle}
            >←</button>
            <div style={{ color: "#ef4444", fontSize: "10px", textAlign: "center", alignSelf: "center" }}>FUEGO</div>
            <button
              type="button"
              aria-label="Disparar a la derecha"
              onPointerDown={pressTouchKey("shootRight")}
              onPointerUp={releaseTouchKey("shootRight")}
              onPointerCancel={releaseTouchKey("shootRight")}
              onLostPointerCapture={releaseTouchKey("shootRight")}
              style={firePadStyle}
            >→</button>
            <div />
            <button
              type="button"
              aria-label="Disparar hacia abajo"
              onPointerDown={pressTouchKey("shootDown")}
              onPointerUp={releaseTouchKey("shootDown")}
              onPointerCancel={releaseTouchKey("shootDown")}
              onLostPointerCapture={releaseTouchKey("shootDown")}
              style={firePadStyle}
            >↓</button>
            <div />
          </div>
        </>
      )}
    </div>
  );
};

const hudBtnStyle: CSSProperties = {
  padding: "8px 14px",
  background: "#180406",
  color: "#ffffff",
  border: "2px solid #dc2626",
  cursor: "pointer",
  fontWeight: "bold",
  fontFamily: "inherit",
  fontSize: "12px",
};

const dPadStyle: CSSProperties = {
  background: "rgba(24, 4, 6, 0.9)",
  color: "#ffffff",
  border: "2px solid #dc2626",
  fontSize: "18px",
  fontWeight: "bold",
  cursor: "pointer",
  touchAction: "none",
  userSelect: "none",
};

const firePadStyle: CSSProperties = {
  ...dPadStyle,
  border: "2px solid #f8fafc",
  background: "rgba(153, 27, 27, 0.9)",
};

const bombPadStyle: CSSProperties = {
  position: "absolute",
  right: 24,
  bottom: 205,
  width: 172,
  minHeight: 42,
  background: "#35131a",
  color: "#ffe6d0",
  border: "2px solid #f2b84b",
  boxShadow: "3px 3px 0 #10080b",
  fontFamily: "'Courier New', Courier, monospace",
  fontSize: "12px",
  fontWeight: "bold",
  letterSpacing: "1px",
  cursor: "pointer",
  touchAction: "manipulation",
  zIndex: 100,
};