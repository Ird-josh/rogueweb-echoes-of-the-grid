const { randomBytes } = require("node:crypto");
const { hashLobbyPassword, verifyLobbyPassword } = require("./passwords");

const CHARACTER_IDS = new Set(["vesper", "nyx", "bram", "sol"]);
const MAX_LOBBY_PLAYERS = 3;

class LobbyError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

function lobbyCode(value) {
  if (typeof value !== "string" || !/^[A-Z0-9]{6}$/.test(value)) {
    throw new LobbyError("El código del lobby no es válido.");
  }
  return value;
}

function characterId(value) {
  if (!CHARACTER_IDS.has(value)) throw new LobbyError("El personaje no es válido.");
  return value;
}

function lobbyName(value) {
  if (typeof value !== "string") throw new LobbyError("Escribe un nombre para el lobby.");
  const name = value.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  if (name.length < 3 || name.length > 32) {
    throw new LobbyError("El nombre del lobby debe tener entre 3 y 32 caracteres.");
  }
  return name;
}

function lobbyPassword(value) {
  if (typeof value !== "string" || value.length < 6 || value.length > 128) {
    throw new LobbyError("La contraseña debe tener entre 6 y 128 caracteres.");
  }
  return value;
}

function playerName(user) {
  const name = String(user.name || user.email.split("@")[0])
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 40);
  return name || "Explorador";
}

async function getLobby(pool, code) {
  const result = await pool.query(
    `SELECT l.code, l.name, l.status, l.host_user_id,
            m.user_id, m.player_name, m.character_id, m.is_ready
       FROM public.game_lobbies AS l
       LEFT JOIN public.game_lobby_members AS m ON m.lobby_code = l.code
      WHERE l.code = $1
      ORDER BY m.joined_at, m.user_id`,
    [lobbyCode(code)],
  );
  if (result.rowCount === 0) return null;

  const first = result.rows[0];
  return {
    code: first.code,
    name: first.name,
    status: first.status,
    hostUserId: first.host_user_id,
    maxPlayers: MAX_LOBBY_PLAYERS,
    members: result.rows
      .filter((row) => row.user_id !== null)
      .map((row) => ({
        userId: row.user_id,
        name: row.player_name,
        characterId: row.character_id,
        ready: row.is_ready,
      })),
  };
}

async function getActiveLobbyForMember(pool, code, userId) {
  const lobby = await getLobby(pool, code);
  if (!lobby) throw new LobbyError("No existe ese lobby.", 404);
  if (lobby.status !== "in_game") throw new LobbyError("La partida todavía no ha iniciado.", 409);
  if (!lobby.members.some((member) => member.userId === userId)) {
    throw new LobbyError("No perteneces a esa partida.", 403);
  }
  return lobby;
}

async function createLobby(pool, user, { name: requestedName, password: requestedPassword, characterId: requestedCharacterId }) {
  const selectedCharacter = characterId(requestedCharacterId);
  const name = lobbyName(requestedName);
  const password = lobbyPassword(requestedPassword);
  const passwordHash = await hashLobbyPassword(password);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const code = randomBytes(3).toString("hex").toUpperCase();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const inserted = await client.query(
        `INSERT INTO public.game_lobbies (code, name, password_hash, host_user_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (code) DO NOTHING
         RETURNING code`,
        [code, name, passwordHash, user.id],
      );
      if (inserted.rowCount === 0) {
        await client.query("ROLLBACK");
        continue;
      }
      await client.query(
        `INSERT INTO public.game_lobby_members
           (lobby_code, user_id, player_name, character_id)
         VALUES ($1, $2, $3, $4)`,
        [code, user.id, playerName(user), selectedCharacter],
      );
      await client.query("COMMIT");
      return await getLobby(pool, code);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  throw new LobbyError("No se pudo generar un código de lobby. Intenta de nuevo.", 503);
}

async function joinLobby(pool, code, user, { password: requestedPassword, characterId: requestedCharacterId }) {
  const normalizedCode = lobbyCode(code);
  const selectedCharacter = characterId(requestedCharacterId);
  const password = lobbyPassword(requestedPassword);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const lobby = await client.query(
      "SELECT status, password_hash FROM public.game_lobbies WHERE code = $1 FOR UPDATE",
      [normalizedCode],
    );
    if (lobby.rowCount === 0) throw new LobbyError("No existe ese lobby.", 404);
    if (lobby.rows[0].status !== "waiting") {
      throw new LobbyError("Ese lobby ya inició o está cerrado.", 409);
    }
    if (!lobby.rows[0].password_hash) {
      throw new LobbyError("Este lobby es anterior a la actualización. Crea uno nuevo.", 409);
    }
    if (!(await verifyLobbyPassword(password, lobby.rows[0].password_hash))) {
      throw new LobbyError("La contraseña del lobby es incorrecta.", 403);
    }

    const currentMember = await client.query(
      `SELECT 1 FROM public.game_lobby_members
        WHERE lobby_code = $1 AND user_id = $2`,
      [normalizedCode, user.id],
    );
    if (currentMember.rowCount === 0) {
      const count = await client.query(
        "SELECT count(*)::integer AS count FROM public.game_lobby_members WHERE lobby_code = $1",
        [normalizedCode],
      );
      if (count.rows[0].count >= MAX_LOBBY_PLAYERS) throw new LobbyError("El lobby está lleno (máximo 3 jugadores).", 409);
    }

    await client.query(
      `INSERT INTO public.game_lobby_members
         (lobby_code, user_id, player_name, character_id, is_ready)
       VALUES ($1, $2, $3, $4, false)
       ON CONFLICT (lobby_code, user_id) DO UPDATE
         SET player_name = EXCLUDED.player_name,
             character_id = EXCLUDED.character_id,
             is_ready = false`,
      [normalizedCode, user.id, playerName(user), selectedCharacter],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return getLobby(pool, normalizedCode);
}

async function setReady(pool, code, userId, ready) {
  const normalizedCode = lobbyCode(code);
  if (typeof ready !== "boolean") throw new LobbyError("El estado de listo no es válido.");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const lobby = await client.query(
      "SELECT status FROM public.game_lobbies WHERE code = $1 FOR UPDATE",
      [normalizedCode],
    );
    if (lobby.rowCount === 0) throw new LobbyError("No existe ese lobby.", 404);
    if (lobby.rows[0].status !== "waiting") throw new LobbyError("El lobby ya inició.", 409);
    const result = await client.query(
      `UPDATE public.game_lobby_members SET is_ready = $3
        WHERE lobby_code = $1 AND user_id = $2
        RETURNING user_id`,
      [normalizedCode, userId, ready],
    );
    if (result.rowCount === 0) throw new LobbyError("No perteneces a ese lobby.", 404);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return getLobby(pool, normalizedCode);
}

async function leaveLobby(pool, code, userId) {
  const normalizedCode = lobbyCode(code);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const lobby = await client.query(
      "SELECT host_user_id, status FROM public.game_lobbies WHERE code = $1 FOR UPDATE",
      [normalizedCode],
    );
    if (lobby.rowCount === 0) {
      await client.query("COMMIT");
      return null;
    }
    if (lobby.rows[0].status === "in_game") {
      await client.query("COMMIT");
      return getLobby(pool, normalizedCode);
    }
    await client.query(
      "DELETE FROM public.game_lobby_members WHERE lobby_code = $1 AND user_id = $2",
      [normalizedCode, userId],
    );
    const remaining = await client.query(
      `SELECT user_id FROM public.game_lobby_members
        WHERE lobby_code = $1 ORDER BY joined_at, user_id`,
      [normalizedCode],
    );
    if (remaining.rowCount === 0) {
      await client.query("DELETE FROM public.game_lobbies WHERE code = $1", [normalizedCode]);
      await client.query("COMMIT");
      return null;
    }
    if (lobby.rows[0].host_user_id === userId) {
      await client.query(
        `UPDATE public.game_lobbies SET host_user_id = $2, updated_at = now()
          WHERE code = $1`,
        [normalizedCode, remaining.rows[0].user_id],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return getLobby(pool, normalizedCode);
}

async function startLobby(pool, code, userId) {
  const normalizedCode = lobbyCode(code);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const lobby = await client.query(
      "SELECT host_user_id, status FROM public.game_lobbies WHERE code = $1 FOR UPDATE",
      [normalizedCode],
    );
    if (lobby.rowCount === 0) throw new LobbyError("No existe ese lobby.", 404);
    if (lobby.rows[0].host_user_id !== userId) {
      throw new LobbyError("Solo quien creó el lobby puede iniciar la partida.", 403);
    }
    if (lobby.rows[0].status !== "waiting") throw new LobbyError("El lobby ya inició.", 409);

    const readiness = await client.query(
      `SELECT count(*)::integer AS total,
              count(*) FILTER (WHERE is_ready)::integer AS ready
         FROM public.game_lobby_members WHERE lobby_code = $1`,
      [normalizedCode],
    );
    if (readiness.rows[0].total === 0 || readiness.rows[0].total !== readiness.rows[0].ready) {
      throw new LobbyError("Todos los jugadores deben estar listos.", 409);
    }
    await client.query(
      "UPDATE public.game_lobbies SET status = 'in_game', updated_at = now() WHERE code = $1",
      [normalizedCode],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return getLobby(pool, normalizedCode);
}

module.exports = {
  LobbyError,
  MAX_LOBBY_PLAYERS,
  createLobby,
  getLobby,
  getActiveLobbyForMember,
  joinLobby,
  lobbyName,
  lobbyPassword,
  leaveLobby,
  setReady,
  startLobby,
};
