const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { createApp } = require("./app");

const authenticatedUser = {
  id: "9d8e62da-81dd-4237-beb6-5d1d1b176d11",
  email: "admin@example.test",
  name: "Admin",
};
const regularUser = { ...authenticatedUser, id: "user-2", email: "player@example.test", name: "Player" };

let server;
let origin;
const queries = [];
const pool = {
  async query(sql, params = []) {
    queries.push({ sql, params });
    if (sql.includes("SELECT 1")) return { rowCount: 1, rows: [{ "?column?": 1 }] };
    if (sql.includes("INSERT INTO public.game_runs")) {
      return { rowCount: 1, rows: [{ id: "run-1", created_at: "2026-01-01T00:00:00Z" }] };
    }
    if (sql.includes("count(*)::integer AS total")) {
      return { rowCount: 1, rows: [{ total: 9 }] };
    }
    if (sql.includes("FROM public.game_runs")) {
      return { rowCount: 1, rows: [{ id: "run-1", character_id: "vesper" }] };
    }
    throw new Error(`Unexpected SQL in test: ${sql}`);
  },
};

before(async () => {
  const app = createApp({
    pool,
    authenticateAccessToken: async (token) => {
      if (token === "valid-token") return authenticatedUser;
      if (token === "player-token") return regularUser;
      return null;
    },
    clientOrigin: "http://localhost:5173",
    telemetryAdminEmails: ["admin@example.test"],
  });
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("health endpoint checks the database connection", async () => {
  const response = await fetch(`${origin}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok", database: "ok" });
});

test("auth endpoint rejects missing or invalid bearer tokens", async () => {
  const missing = await fetch(`${origin}/api/auth/me`);
  assert.equal(missing.status, 401);
  const invalid = await fetch(`${origin}/api/auth/me`, {
    headers: { authorization: "Bearer invalid-token" },
  });
  assert.equal(invalid.status, 401);
});

test("run telemetry is validated and stored with the verified user identity", async () => {
  queries.length = 0;
  const unauthenticated = await fetch(`${origin}/api/runs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ characterId: "vesper", status: "victory", floor: 1, kills: 1, durationSeconds: 1 }),
  });
  assert.equal(unauthenticated.status, 401);

  const response = await fetch(`${origin}/api/runs`, {
    method: "POST",
    headers: {
      authorization: "Bearer valid-token",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      characterId: "nyx",
      status: "victory",
      floor: 3,
      kills: 12,
      durationSeconds: 240,
      inventory: ["reliquia"],
    }),
  });
  assert.equal(response.status, 201);
  assert.equal(queries[0].params[0], authenticatedUser.id);
  assert.equal(queries[0].params[2], "nyx");

  const invalid = await fetch(`${origin}/api/runs`, {
    method: "POST",
    headers: {
      authorization: "Bearer valid-token",
      "content-type": "application/json",
    },
    body: JSON.stringify({ characterId: "invalid" }),
  });
  assert.equal(invalid.status, 400);
});

test("telemetry is paginated and restricted to allowlisted admins", async () => {
  const unauthenticated = await fetch(`${origin}/api/telemetry`);
  assert.equal(unauthenticated.status, 401);

  const forbidden = await fetch(`${origin}/api/telemetry`, {
    headers: { authorization: "Bearer player-token" },
  });
  assert.equal(forbidden.status, 403);

  const invalidPage = await fetch(`${origin}/api/telemetry?page=0`, {
    headers: { authorization: "Bearer valid-token" },
  });
  assert.equal(invalidPage.status, 400);

  const response = await fetch(`${origin}/api/telemetry?page=2&pageSize=4`, {
    headers: { authorization: "Bearer valid-token" },
  });
  assert.equal(response.status, 200);
  const page = await response.json();
  assert.equal(page.total, 9);
  assert.equal(page.totalPages, 3);
  assert.equal(page.records.length, 1);

  const recordsQuery = queries.find(({ sql }) => sql.includes("ORDER BY created_at DESC"));
  assert.deepEqual(recordsQuery.params, [4, 4]);
});

test("lobby endpoints require a valid name, code, and password", async () => {
  const createResponse = await fetch(`${origin}/api/lobbies`, {
    method: "POST",
    headers: {
      authorization: "Bearer valid-token",
      "content-type": "application/json",
    },
    body: JSON.stringify({ name: "Friends", password: "123", characterId: "vesper" }),
  });
  assert.equal(createResponse.status, 400);
  assert.match((await createResponse.json()).error, /contraseña/);

  const joinResponse = await fetch(`${origin}/api/lobbies/ABC123/join`, {
    method: "POST",
    headers: {
      authorization: "Bearer valid-token",
      "content-type": "application/json",
    },
    body: JSON.stringify({ characterId: "vesper" }),
  });
  assert.equal(joinResponse.status, 400);
  assert.match((await joinResponse.json()).error, /contraseña/);
});
