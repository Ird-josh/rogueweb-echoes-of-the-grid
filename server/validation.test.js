const { test } = require("node:test");
const assert = require("node:assert/strict");
const { parsePagination, validateRun } = require("./validation");

test("validates complete run telemetry before it reaches SQL", () => {
  assert.equal(
    validateRun({
      characterId: "vesper",
      status: "victory",
      floor: 4,
      kills: 18,
      durationSeconds: 725,
      newGamePlus: false,
      inventory: ["orbe"],
    }),
    null,
  );
});

test("rejects invalid run status, character, and oversized inventory", () => {
  const validRun = {
    characterId: "vesper",
    status: "victory",
    floor: 1,
    kills: 0,
    durationSeconds: 0,
  };
  assert.match(validateRun({ ...validRun, status: "running" }), /estado/);
  assert.match(validateRun({ ...validRun, characterId: "admin" }), /personaje/);
  assert.match(validateRun({ ...validRun, inventory: ["x".repeat(10001)] }), /grande/);
});

test("bounds telemetry pagination and caps the page size", () => {
  assert.deepEqual(parsePagination({ page: "3", pageSize: "8" }), {
    page: 3,
    pageSize: 8,
    offset: 16,
  });
  assert.equal(parsePagination({ page: "0" }), null);
  assert.equal(parsePagination({ pageSize: "101" }), null);
  assert.equal(parsePagination({ page: "1e100" }), null);
});
