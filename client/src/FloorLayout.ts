export type FloorRoomType = "start" | "normal" | "upgrade" | "shop" | "boss";

export interface FloorRoomLayout {
  gx: number;
  gy: number;
  type: FloorRoomType;
}

type Coordinate = Pick<FloorRoomLayout, "gx" | "gy">;
type Direction = Coordinate;

const DIRECTIONS: Direction[] = [
  { gx: 1, gy: 0 },
  { gx: 0, gy: 1 },
  { gx: -1, gy: 0 },
  { gx: 0, gy: -1 },
];

const keyOf = ({ gx, gy }: Coordinate) => `${gx},${gy}`;
const add = (point: Coordinate, direction: Direction): Coordinate => ({
  gx: point.gx + direction.gx,
  gy: point.gy + direction.gy,
});

export const generateFloorLayout = (
  floorNumber: number,
  random: () => number = Math.random
): FloorRoomLayout[] => {
  const floor = Math.max(1, Math.floor(floorNumber));
  const mainPath: Coordinate[] = [{ gx: 0, gy: 0 }];
  const occupied = new Set([keyOf(mainPath[0])]);
  const bounds = 4;
  const firstDirection = DIRECTIONS[(floor - 1) % DIRECTIONS.length];
  mainPath.push(add(mainPath[0], firstDirection));
  occupied.add(keyOf(mainPath[1]));

  const pathLength = 5 + ((floor - 1) % 3);
  for (let index = 2; index < pathLength; index++) {
    const previous = mainPath[index - 1];
    const previousBefore = mainPath[index - 2];
    const options = DIRECTIONS
      .map((direction) => add(previous, direction))
      .filter((candidate) =>
        Math.abs(candidate.gx) <= bounds &&
        Math.abs(candidate.gy) <= bounds &&
        !occupied.has(keyOf(candidate)) &&
        keyOf(candidate) !== keyOf(previousBefore)
      );
    const next = options[Math.floor(random() * options.length)] ?? add(previous, firstDirection);
    mainPath.push(next);
    occupied.add(keyOf(next));
  }

  const branches: Coordinate[] = [];
  const branchCount = 2 + Math.floor(random() * 2);
  while (branches.length < branchCount) {
    const candidates = mainPath
      .flatMap((room) => DIRECTIONS.map((direction) => add(room, direction)))
      .filter((candidate) =>
        Math.abs(candidate.gx) <= bounds &&
        Math.abs(candidate.gy) <= bounds &&
        !occupied.has(keyOf(candidate))
      );
    if (!candidates.length) break;
    const next = candidates[Math.floor(random() * candidates.length)];
    occupied.add(keyOf(next));
    branches.push(next);
  }

  const rooms: FloorRoomLayout[] = mainPath.map((room, index) => ({
    ...room,
    type:
      index === 0
        ? "start"
        : index === mainPath.length - 1
        ? "boss"
        : index === 2
        ? "upgrade"
        : "normal",
  }));
  branches.forEach((room, index) => {
    rooms.push({
      ...room,
      type: index === 0 && random() < 0.18 ? "shop" : "normal",
    });
  });

  return rooms;
};

export const areAllFloorRoomsConnected = (rooms: FloorRoomLayout[]): boolean => {
  if (!rooms.length) return true;
  const roomKeys = new Set(rooms.map(keyOf));
  const visited = new Set<string>();
  const queue: Coordinate[] = [rooms[0]];

  while (queue.length) {
    const current = queue.shift()!;
    const currentKey = keyOf(current);
    if (visited.has(currentKey)) continue;
    visited.add(currentKey);
    DIRECTIONS
      .map((direction) => add(current, direction))
      .filter((neighbor) => roomKeys.has(keyOf(neighbor)) && !visited.has(keyOf(neighbor)))
      .forEach((neighbor) => queue.push(neighbor));
  }

  return visited.size === rooms.length;
};

export const chooseShopPrice = (floorNumber: number, offerIndex: number): number =>
  6 + Math.max(0, Math.floor(floorNumber) - 1) + offerIndex * 2;

export const purchaseWithCoins = (coins: number, price: number): number | null =>
  coins >= price && price > 0 ? coins - price : null;

export const rollEnemyCoins = (random: () => number = Math.random): number =>
  random() < 0.4 ? 1 + Math.floor(random() * 2) : 0;

export const claimExclusiveOffer = <T extends { choiceGroup?: string; id: number }>(
  offers: T[],
  selectedId: number
): T[] => {
  const selected = offers.find((offer) => offer.id === selectedId);
  if (!selected?.choiceGroup) return offers.filter((offer) => offer.id !== selectedId);
  return offers.filter(
    (offer) => offer.id !== selectedId && offer.choiceGroup !== selected.choiceGroup
  );
};
