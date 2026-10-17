const { test } = require("node:test");
const assert = require("node:assert/strict");
const { hashLobbyPassword, verifyLobbyPassword } = require("./passwords");

test("lobby passwords are stored as salted scrypt hashes and checked securely", async () => {
  const hash = await hashLobbyPassword("correct horse battery");
  assert.match(hash, /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/);
  assert.notEqual(hash, "correct horse battery");
  assert.equal(await verifyLobbyPassword("correct horse battery", hash), true);
  assert.equal(await verifyLobbyPassword("wrong password", hash), false);
});

test("malformed stored password hashes fail explicitly", async () => {
  await assert.rejects(verifyLobbyPassword("any password", "not-a-scrypt-hash"), /invalid format/);
});
