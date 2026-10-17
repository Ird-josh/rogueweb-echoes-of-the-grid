const { test } = require("node:test");
const assert = require("node:assert/strict");
const { isValidGameInput, isValidGameState } = require("./socket");

test("multiplayer input requires explicit boolean controls", () => {
  const input = {
    up: false,
    down: true,
    left: false,
    right: false,
    shootUp: false,
    shootDown: false,
    shootLeft: false,
    shootRight: true,
    bomb: false,
    ability: false,
  };
  assert.equal(isValidGameInput(input), true);
  assert.equal(isValidGameInput({ ...input, bomb: "yes" }), false);
  assert.equal(isValidGameInput({ ...input, ability: undefined }), false);
  assert.equal(isValidGameInput(null), false);
});

test("multiplayer snapshots must be serializable and stay within the payload limit", () => {
  assert.equal(isValidGameState({ room: "0,0", players: [] }), true);
  assert.equal(isValidGameState({ value: "x".repeat(512 * 1024) }), false);
  const circular = {};
  circular.self = circular;
  assert.equal(isValidGameState(circular), false);
});
