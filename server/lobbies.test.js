const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createLobby, getActiveLobbyForMember, joinLobby, MAX_LOBBY_PLAYERS, setReady } = require("./lobbies");
const { hashLobbyPassword, verifyLobbyPassword } = require("./passwords");

test("lobby services reject malformed codes and unsupported characters before querying", async () => {
  let databaseCalls = 0;
  const pool = {
    async connect() {
      databaseCalls += 1;
      throw new Error("Invalid lobby data should not reach the database.");
    },
    async query() {
      databaseCalls += 1;
      throw new Error("Invalid lobby data should not reach the database.");
    },
  };

  await assert.rejects(
    joinLobby(pool, "BAD-CODE", { id: "u1", email: "u@example.test" }, {
      password: "secret1",
      characterId: "vesper",
    }),
    {
    message: "El código del lobby no es válido.",
    },
  );
  await assert.rejects(createLobby(pool, { id: "u1", email: "u@example.test" }, {
    name: "  ",
    password: "secret1",
    characterId: "vesper",
  }), {
    message: "El nombre del lobby debe tener entre 3 y 32 caracteres.",
  });
  await assert.rejects(createLobby(pool, { id: "u1", email: "u@example.test" }, {
    name: "Lobby válido",
    password: "123",
    characterId: "vesper",
  }), {
    message: "La contraseña debe tener entre 6 y 128 caracteres.",
  });
  await assert.rejects(createLobby(pool, { id: "u1", email: "u@example.test" }, {
    name: "Lobby válido",
    password: "secret1",
    characterId: "invalid",
  }), {
    message: "El personaje no es válido.",
  });
  await assert.rejects(setReady(pool, "A1B2C3", "u1", "yes"), {
    message: "El estado de listo no es válido.",
  });
  assert.equal(databaseCalls, 0);
});

test("creating a lobby persists its name and a password hash, never the plaintext password", async () => {
  let savedLobby;
  const client = {
    async query(sql, params = []) {
      if (sql.includes("INSERT INTO public.game_lobbies")) {
        savedLobby = {
          code: params[0],
          name: params[1],
          passwordHash: params[2],
          hostId: params[3],
        };
        return { rowCount: 1, rows: [{ code: params[0] }] };
      }
      if (sql.includes("INSERT INTO public.game_lobby_members")) return { rowCount: 1, rows: [] };
      return { rowCount: 1, rows: [] };
    },
    release() {},
  };
  const pool = {
    async connect() {
      return client;
    },
    async query(sql) {
      assert.match(sql, /SELECT l\.code, l\.name/);
      return {
        rowCount: 1,
        rows: [{
          code: savedLobby.code,
          name: savedLobby.name,
          status: "waiting",
          host_user_id: savedLobby.hostId,
          user_id: savedLobby.hostId,
          player_name: "Host",
          character_id: "vesper",
          is_ready: false,
        }],
      };
    },
  };
  const result = await createLobby(
    pool,
    { id: "user-1", email: "host@example.test", name: "Host" },
    { name: "Los exploradores", password: "secret123", characterId: "vesper" },
  );

  assert.equal(result.name, "Los exploradores");
  assert.equal(result.code, savedLobby.code);
  assert.notEqual(savedLobby.passwordHash, "secret123");
  assert.equal(await verifyLobbyPassword("secret123", savedLobby.passwordHash), true);
});

test("joining a protected lobby rejects an incorrect password before adding a member", async () => {
  const passwordHash = await hashLobbyPassword("secret123");
  let memberInsertAttempted = false;
  const client = {
    async query(sql) {
      if (sql.includes("SELECT status, password_hash")) {
        return {
          rowCount: 1,
          rows: [{ status: "waiting", password_hash: passwordHash }],
        };
      }
      if (sql.includes("INSERT INTO public.game_lobby_members")) memberInsertAttempted = true;
      return { rowCount: 1, rows: [] };
    },
    release() {},
  };
  const pool = {
    async connect() {
      return client;
    },
  };

  await assert.rejects(
    joinLobby(pool, "ABC123", { id: "user-2", email: "guest@example.test" }, {
      password: "incorrect",
      characterId: "nyx",
    }),
    { message: "La contraseña del lobby es incorrecta.", statusCode: 403 },
  );
  assert.equal(memberInsertAttempted, false);
});

test("joining a lobby rejects a fourth player", async () => {
  const passwordHash = await hashLobbyPassword("secret123");
  let memberInsertAttempted = false;
  const client = {
    async query(sql) {
      if (sql.includes("SELECT status, password_hash")) {
        return { rowCount: 1, rows: [{ status: "waiting", password_hash: passwordHash }] };
      }
      if (sql.includes("SELECT 1 FROM public.game_lobby_members")) {
        return { rowCount: 0, rows: [] };
      }
      if (sql.includes("SELECT count(*)::integer AS count")) {
        return { rowCount: 1, rows: [{ count: MAX_LOBBY_PLAYERS }] };
      }
      if (sql.includes("INSERT INTO public.game_lobby_members")) memberInsertAttempted = true;
      return { rowCount: 1, rows: [] };
    },
    release() {},
  };
  const pool = {
    async connect() {
      return client;
    },
  };

  await assert.rejects(
    joinLobby(pool, "ABC123", { id: "user-4", email: "fourth@example.test" }, {
      password: "secret123",
      characterId: "sol",
    }),
    { message: "El lobby está lleno (máximo 3 jugadores).", statusCode: 409 },
  );
  assert.equal(MAX_LOBBY_PLAYERS, 3);
  assert.equal(memberInsertAttempted, false);
});

test("active game reconnect is limited to existing members after the lobby starts", async () => {
  let status = "in_game";
  const pool = {
    async query() {
      return {
        rowCount: 2,
        rows: [
          {
            code: "ABC123",
            name: "Friends",
            status,
            host_user_id: "host-1",
            user_id: "host-1",
            player_name: "Host",
            character_id: "vesper",
            is_ready: true,
          },
          {
            code: "ABC123",
            name: "Friends",
            status,
            host_user_id: "host-1",
            user_id: "player-2",
            player_name: "Player",
            character_id: "nyx",
            is_ready: true,
          },
        ],
      };
    },
  };

  const lobby = await getActiveLobbyForMember(pool, "ABC123", "player-2");
  assert.equal(lobby.status, "in_game");
  assert.equal(lobby.members.length, 2);
  await assert.rejects(getActiveLobbyForMember(pool, "ABC123", "stranger"), {
    message: "No perteneces a esa partida.",
    statusCode: 403,
  });
  status = "waiting";
  await assert.rejects(getActiveLobbyForMember(pool, "ABC123", "player-2"), {
    message: "La partida todavía no ha iniciado.",
    statusCode: 409,
  });
});
