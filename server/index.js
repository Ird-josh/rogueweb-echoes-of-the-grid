require("dotenv").config();

const http = require("node:http");
const { Pool } = require("pg");
const { createApp } = require("./app");
const { createSupabaseAuthenticator } = require("./auth");
const { createSocketServer } = require("./socket");

const requiredEnvironment = ["DATABASE_URL", "SUPABASE_URL", "SUPABASE_ANON_KEY"];
const missingEnvironment = requiredEnvironment.filter((name) => !process.env[name]);
if (missingEnvironment.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvironment.join(", ")}`);
  process.exit(1);
}

const clientOrigin =
  process.env.CLIENT_ORIGIN ||
  "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174";
const telemetryAdminEmails = (process.env.TELEMETRY_ADMIN_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL connection error:", error.message);
});
const authenticateAccessToken = createSupabaseAuthenticator({
  supabaseUrl: process.env.SUPABASE_URL,
  anonKey: process.env.SUPABASE_ANON_KEY,
});
const app = createApp({ pool, authenticateAccessToken, clientOrigin, telemetryAdminEmails });
const httpServer = http.createServer(app);
createSocketServer(httpServer, { pool, authenticateAccessToken, clientOrigin });

const port = Number(process.env.PORT || 3000);
httpServer.listen(port, () => console.log(`RogueWeb API listening on port ${port}.`));

async function shutdown(signal) {
  console.log(`${signal} received; shutting down the API.`);
  httpServer.close(async (error) => {
    await pool.end();
    if (error) {
      console.error("HTTP server shutdown failed:", error.message);
      process.exitCode = 1;
    }
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
