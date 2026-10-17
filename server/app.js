const cors = require("cors");
const express = require("express");
const { createAuthMiddleware } = require("./auth");
const {
  LobbyError,
  createLobby,
  getLobby,
  joinLobby,
} = require("./lobbies");
const { parsePagination, validateRun } = require("./validation");
const { parseClientOrigins } = require("./client-origins");

function createApp({
  pool,
  authenticateAccessToken,
  clientOrigin,
  telemetryAdminEmails = [],
}) {
  const app = express();
  const { requireAuth } = createAuthMiddleware(authenticateAccessToken);
  const adminEmails = new Set(telemetryAdminEmails.map((email) => email.trim().toLowerCase()).filter(Boolean));
  const allowedOrigins = parseClientOrigins(clientOrigin);

  app.disable("x-powered-by");
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) callback(null, true);
      else {
        const error = new Error("The request origin is not allowed.");
        error.statusCode = 403;
        callback(error);
      }
    },
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }));
  app.use(express.json({ limit: "32kb" }));

  app.get("/api/health", async (request, response, next) => {
    try {
      await pool.query("SELECT 1");
      response.json({ status: "ok", database: "ok" });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/auth/me", requireAuth, (request, response) => {
    response.json({ user: request.user });
  });

  app.post("/api/runs", requireAuth, async (request, response, next) => {
    const validationError = validateRun(request.body);
    if (validationError) {
      response.status(400).json({ error: validationError });
      return;
    }

    try {
      const run = request.body;
      const result = await pool.query(
        `INSERT INTO public.game_runs
           (user_id, player_name, character_id, new_game_plus, status, floor,
            kills, duration_seconds, inventory, lobby_code)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)
         RETURNING id, created_at`,
        [
          request.user.id,
          request.user.name,
          run.characterId,
          run.newGamePlus ?? false,
          run.status,
          run.floor,
          run.kills,
          run.durationSeconds,
          JSON.stringify(run.inventory ?? []),
          run.lobbyCode ?? null,
        ],
      );
      response.status(201).json({ id: result.rows[0].id, createdAt: result.rows[0].created_at });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/telemetry", requireAuth, async (request, response, next) => {
    if (!adminEmails.has(request.user.email)) {
      response.status(403).json({ error: "No tienes permiso para consultar la telemetría." });
      return;
    }

    const pagination = parsePagination(request.query);
    if (!pagination) {
      response.status(400).json({ error: "La página o el tamaño de página no son válidos." });
      return;
    }

    try {
      const [countResult, recordsResult] = await Promise.all([
        pool.query("SELECT count(*)::integer AS total FROM public.game_runs"),
        pool.query(
          `SELECT id, player_name, character_id, new_game_plus, status, floor,
                  kills, duration_seconds, inventory, lobby_code, created_at
             FROM public.game_runs
            ORDER BY created_at DESC, id DESC
            LIMIT $1 OFFSET $2`,
          [pagination.pageSize, pagination.offset],
        ),
      ]);
      const total = countResult.rows[0].total;
      response.json({
        records: recordsResult.rows,
        total,
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalPages: Math.ceil(total / pagination.pageSize),
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/lobbies", requireAuth, async (request, response, next) => {
    try {
      const lobby = await createLobby(pool, request.user, request.body ?? {});
      response.status(201).json({ lobby });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/lobbies/:code", requireAuth, async (request, response, next) => {
    try {
      const lobby = await getLobby(pool, request.params.code);
      if (!lobby) {
        response.status(404).json({ error: "No existe ese lobby." });
        return;
      }
      if (!lobby.members.some((member) => member.userId === request.user.id)) {
        response.status(403).json({ error: "No perteneces a ese lobby." });
        return;
      }
      response.json({ lobby });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/lobbies/:code/join", requireAuth, async (request, response, next) => {
    try {
      const lobby = await joinLobby(
        pool,
        request.params.code,
        request.user,
        request.body ?? {},
      );
      response.json({ lobby });
    } catch (error) {
      next(error);
    }
  });

  app.use("/api", (request, response) => {
    response.status(404).json({ error: "La ruta de API solicitada no existe." });
  });

  app.use((error, request, response, next) => {
    if (response.headersSent) {
      next(error);
      return;
    }
    if (error instanceof LobbyError) {
      response.status(error.statusCode).json({ error: error.message });
      return;
    }
    if (error.type === "entity.parse.failed") {
      response.status(400).json({ error: "El cuerpo de la solicitud no contiene JSON válido." });
      return;
    }
    if (error.statusCode === 403) {
      response.status(403).json({ error: "El origen de la solicitud no está permitido." });
      return;
    }
    if (error.statusCode === 503 || error.statusCode === 502) {
      response.status(error.statusCode).json({ error: "El servicio de autenticación no está disponible temporalmente." });
      return;
    }
    console.error("API request failed:", error.message);
    response.status(500).json({ error: "Ocurrió un error interno al procesar la solicitud." });
  });

  return app;
}

module.exports = { createApp };
