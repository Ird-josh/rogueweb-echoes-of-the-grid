const { Server } = require("socket.io");
const {
  LobbyError,
  getActiveLobbyForMember,
  getLobby,
  joinLobby,
  leaveLobby,
  setReady,
  startLobby,
} = require("./lobbies");
const { parseClientOrigins } = require("./client-origins");

function createSocketServer(httpServer, { pool, authenticateAccessToken, clientOrigin }) {
  const allowedOrigins = parseClientOrigins(clientOrigin);
  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
    },
  });
  const gameHosts = new Map();

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.accessToken;
    if (typeof token !== "string" || token.length === 0) {
      next(new Error("unauthorized"));
      return;
    }
    try {
      const user = await authenticateAccessToken(token);
      if (!user) {
        next(new Error("unauthorized"));
        return;
      }
      socket.data.user = user;
      next();
    } catch (error) {
      console.error("Socket authentication failed:", error.message);
      next(new Error("authentication_unavailable"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user;
    let activeLobbyCode = null;
    let activeGameCode = null;
    let lastGameInputAt = 0;
    let lastGameStateAt = 0;

    const publishLobby = async (code) => {
      const lobby = await getLobby(pool, code);
      if (lobby) io.to(code).emit("lobby:update", lobby);
      else io.to(code).emit("lobby:closed", { code });
    };

    socket.on("lobby:join", async (payload, acknowledge) => {
      try {
        const lobby = await joinLobby(pool, payload?.code, user, payload ?? {});
        if (activeLobbyCode && activeLobbyCode !== lobby.code) {
          await leaveLobby(pool, activeLobbyCode, user.id);
          socket.leave(activeLobbyCode);
          await publishLobby(activeLobbyCode);
        }
        activeLobbyCode = lobby.code;
        await socket.join(lobby.code);
        io.to(lobby.code).emit("lobby:update", lobby);
        if (typeof acknowledge === "function") acknowledge({ ok: true, lobby });
      } catch (error) {
        reportSocketError(socket, error, acknowledge);
      }
    });

    socket.on("game:join", async (payload, acknowledge) => {
      try {
        if (typeof payload?.code !== "string") {
          throw new LobbyError("El código de la partida no es válido.");
        }
        const lobby = await getActiveLobbyForMember(pool, payload.code, user.id);
        if (activeGameCode && activeGameCode !== lobby.code) {
          socket.leave(`game:${activeGameCode}`);
          if (gameHosts.get(activeGameCode) === socket.id) gameHosts.delete(activeGameCode);
        }
        activeGameCode = lobby.code;
        activeLobbyCode = lobby.code;
        await socket.join(`game:${lobby.code}`);
        if (lobby.hostUserId === user.id) gameHosts.set(lobby.code, socket.id);
        if (typeof acknowledge === "function") acknowledge({ ok: true, lobby });
      } catch (error) {
        reportSocketError(socket, error, acknowledge);
      }
    });

    socket.on("game:input", (payload) => {
      if (!activeGameCode || payload?.code !== activeGameCode) return;
      if (!isValidGameInput(payload?.input)) {
        socket.emit("game:error", { error: "Los controles enviados a la partida no son válidos." });
        return;
      }
      const now = Date.now();
      if (now - lastGameInputAt < 25) return;
      lastGameInputAt = now;
      const hostSocketId = gameHosts.get(activeGameCode);
      if (!hostSocketId) {
        socket.emit("game:error", { error: "El anfitrión perdió conexión con la partida." });
        return;
      }
      io.to(hostSocketId).emit("game:input", { playerId: user.id, input: payload.input });
    });

    socket.on("game:state", (payload) => {
      if (!activeGameCode || payload?.code !== activeGameCode) return;
      const hostSocketId = gameHosts.get(activeGameCode);
      if (socket.id !== hostSocketId) return;
      if (!payload.state || !isValidGameState(payload.state)) {
        socket.emit("game:error", { error: "No se pudo sincronizar el estado actual de la partida." });
        return;
      }
      const now = Date.now();
      if (now - lastGameStateAt < 50) return;
      lastGameStateAt = now;
      socket.to(`game:${activeGameCode}`).emit("game:state", payload.state);
    });

    socket.on("lobby:ready", async (payload, acknowledge) => {
      try {
        ensureActiveLobby(activeLobbyCode, payload?.code);
        const lobby = await setReady(pool, activeLobbyCode, user.id, payload?.ready);
        io.to(activeLobbyCode).emit("lobby:update", lobby);
        if (typeof acknowledge === "function") acknowledge({ ok: true, lobby });
      } catch (error) {
        reportSocketError(socket, error, acknowledge);
      }
    });

    socket.on("lobby:start", async (payload, acknowledge) => {
      try {
        ensureActiveLobby(activeLobbyCode, payload?.code);
        const lobby = await startLobby(pool, activeLobbyCode, user.id);
        io.to(activeLobbyCode).emit("lobby:update", lobby);
        io.to(activeLobbyCode).emit("lobby:started", lobby);
        if (typeof acknowledge === "function") acknowledge({ ok: true, lobby });
      } catch (error) {
        reportSocketError(socket, error, acknowledge);
      }
    });

    socket.on("lobby:leave", async (payload, acknowledge) => {
      try {
        ensureActiveLobby(activeLobbyCode, payload?.code);
        const previousCode = activeLobbyCode;
        const currentLobby = await getLobby(pool, previousCode);
        const lobby = currentLobby?.status === "waiting"
          ? await leaveLobby(pool, previousCode, user.id)
          : currentLobby;
        socket.leave(previousCode);
        activeLobbyCode = null;
        if (lobby) io.to(previousCode).emit("lobby:update", lobby);
        else io.to(previousCode).emit("lobby:closed", { code: previousCode });
        if (typeof acknowledge === "function") acknowledge({ ok: true });
      } catch (error) {
        reportSocketError(socket, error, acknowledge);
      }
    });

    socket.on("disconnect", async () => {
      if (activeGameCode && gameHosts.get(activeGameCode) === socket.id) {
        gameHosts.delete(activeGameCode);
        socket.to(`game:${activeGameCode}`).emit("game:error", {
          error: "El anfitrión se desconectó; esta partida ya no puede continuar.",
        });
      }
      if (!activeLobbyCode) return;
      try {
        const previousCode = activeLobbyCode;
        const currentLobby = await getLobby(pool, previousCode);
        const lobby = currentLobby?.status === "waiting"
          ? await leaveLobby(pool, previousCode, user.id)
          : currentLobby;
        if (lobby) io.to(previousCode).emit("lobby:update", lobby);
        else io.to(previousCode).emit("lobby:closed", { code: previousCode });
      } catch (error) {
        console.error("Could not remove disconnected lobby member:", error.message);
      }
    });
  });

  return io;
}

function isValidGameInput(input) {
  return input !== null &&
    typeof input === "object" &&
    ["up", "down", "left", "right", "shootUp", "shootDown", "shootLeft", "shootRight", "bomb", "ability"]
      .every((key) => typeof input[key] === "boolean");
}

function isValidGameState(state) {
  if (state === null || typeof state !== "object") return false;
  try {
    return Buffer.byteLength(JSON.stringify(state), "utf8") <= 512 * 1024;
  } catch {
    return false;
  }
}

function ensureActiveLobby(activeCode, requestedCode) {
  if (!activeCode || requestedCode !== activeCode) {
    throw new LobbyError("No perteneces a ese lobby.", 403);
  }
}

function reportSocketError(socket, error, acknowledge) {
  const response = {
    error: error instanceof LobbyError ? error.message : "No se pudo completar la acción del lobby.",
  };
  if (typeof acknowledge === "function") acknowledge({ ok: false, ...response });
  else socket.emit("lobby:error", response);
  if (!(error instanceof LobbyError)) console.error("Lobby socket action failed:", error.message);
}

module.exports = { createSocketServer, isValidGameInput, isValidGameState };
