const { test } = require("node:test");
const assert = require("node:assert/strict");
const { parseClientOrigins } = require("./client-origins");

test("client origins accept Render hosts and preserve explicit local HTTP origins", () => {
  assert.deepEqual(
    parseClientOrigins("rogueweb-client.onrender.com,http://localhost:5173/"),
    ["https://rogueweb-client.onrender.com", "http://localhost:5173"],
  );
});

test("invalid configured client origins fail explicitly", () => {
  assert.throws(
    () => parseClientOrigins("not an origin"),
    { message: "Invalid client origin in CLIENT_ORIGIN: not an origin" },
  );
});
