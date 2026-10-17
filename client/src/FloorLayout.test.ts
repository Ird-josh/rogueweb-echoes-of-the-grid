import { describe, expect, it } from "vitest";
import {
  areAllFloorRoomsConnected,
  claimExclusiveOffer,
  chooseShopPrice,
  generateFloorLayout,
  purchaseWithCoins,
  rollEnemyCoins,
} from "./FloorLayout";
import { UPGRADES, WEAPONS } from "./RunContent";

const seededRandom = (seed: number) => {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
};

describe("floor layout generation", () => {
  it("always includes a single start, upgrade and boss room", () => {
    const rooms = generateFloorLayout(1, seededRandom(1));
    expect(rooms.filter((room) => room.type === "start")).toHaveLength(1);
    expect(rooms.filter((room) => room.type === "upgrade")).toHaveLength(1);
    expect(rooms.filter((room) => room.type === "boss")).toHaveLength(1);
  });

  it("keeps every generated room accessible", () => {
    for (let floor = 1; floor <= 40; floor++) {
      expect(areAllFloorRoomsConnected(generateFloorLayout(floor, seededRandom(floor)))).toBe(true);
    }
  });

  it("creates a path from the entrance to the boss", () => {
    const rooms = generateFloorLayout(8, seededRandom(8));
    const boss = rooms.find((room) => room.type === "boss");
    expect(boss).toBeDefined();
    expect(areAllFloorRoomsConnected(rooms.filter((room) => room.type !== "boss").concat(boss!))).toBe(true);
  });

  it("changes the route between different floors", () => {
    const shapes = [1, 2, 3, 4].map((floor) =>
      generateFloorLayout(floor, seededRandom(123)).map(({ gx, gy }) => `${gx},${gy}`).join("|")
    );
    expect(new Set(shapes).size).toBe(shapes.length);
  });

  it("does not create duplicate grid positions", () => {
    const rooms = generateFloorLayout(12, seededRandom(12));
    expect(new Set(rooms.map(({ gx, gy }) => `${gx},${gy}`)).size).toBe(rooms.length);
  });

  it("keeps room coordinates within the supported map bounds", () => {
    const rooms = generateFloorLayout(17, seededRandom(17));
    expect(rooms.every(({ gx, gy }) => Math.abs(gx) <= 4 && Math.abs(gy) <= 4)).toBe(true);
  });

  it("can generate a rare shop room", () => {
    const rooms = generateFloorLayout(2, () => 0.1);
    expect(rooms.filter((room) => room.type === "shop")).toHaveLength(1);
  });

  it("does not always generate a shop room", () => {
    const rooms = generateFloorLayout(2, () => 0.9);
    expect(rooms.some((room) => room.type === "shop")).toBe(false);
  });
});

describe("upgrade and shop rules", () => {
  it("offers at least twenty distinct upgrades with readable descriptions", () => {
    expect(UPGRADES.length).toBeGreaterThanOrEqual(20);
    expect(new Set(UPGRADES.map((upgrade) => upgrade.id)).size).toBe(UPGRADES.length);
    expect(UPGRADES.every((upgrade) => upgrade.description.trim().length > 10)).toBe(true);
  });

  it("keeps at least twenty distinct weapons available", () => {
    expect(WEAPONS.length).toBeGreaterThanOrEqual(20);
    expect(new Set(WEAPONS.map((weapon) => weapon.id)).size).toBe(WEAPONS.length);
  });

  it("increases store prices by floor and offer slot", () => {
    expect(chooseShopPrice(1, 0)).toBe(6);
    expect(chooseShopPrice(3, 0)).toBe(8);
    expect(chooseShopPrice(1, 2)).toBe(10);
  });

  it("only completes a purchase when the player can afford it", () => {
    expect(purchaseWithCoins(9, 6)).toBe(3);
    expect(purchaseWithCoins(5, 6)).toBeNull();
  });

  it("sometimes awards a small amount of coins for an enemy kill", () => {
    expect(rollEnemyCoins(() => 0.9)).toBe(0);
    expect(rollEnemyCoins(() => 0.1)).toBe(1);
    expect(rollEnemyCoins(() => 0.39)).toBe(1);
  });

  it("caps a single enemy coin drop at two coins", () => {
    let call = 0;
    expect(rollEnemyCoins(() => (call++ === 0 ? 0.1 : 0.99))).toBe(2);
  });

  it("removes the rejected upgrade from an exclusive reward pair", () => {
    const offers = [
      { id: 1, choiceGroup: "boss", name: "Power" },
      { id: 2, choiceGroup: "boss", name: "Health" },
      { id: 3, name: "Weapon" },
    ];
    expect(claimExclusiveOffer(offers, 1)).toEqual([{ id: 3, name: "Weapon" }]);
  });

  it("does not remove unrelated offers after claiming a non-exclusive item", () => {
    const offers = [{ id: 1, name: "Weapon" }, { id: 2, name: "Upgrade" }];
    expect(claimExclusiveOffer(offers, 1)).toEqual([{ id: 2, name: "Upgrade" }]);
  });
});
