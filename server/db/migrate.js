require("dotenv").config();

const { readFile } = require("node:fs/promises");
const path = require("node:path");
const { Pool } = require("pg");

async function migrate() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to apply the Supabase schema.");
  }

  const pool = new Pool({ connectionString, max: 1 });
  try {
    const schema = await readFile(path.join(__dirname, "schema.sql"), "utf8");
    await pool.query(schema);
    console.log("Supabase schema applied successfully.");
  } finally {
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error("Database migration failed:", error.message);
  process.exitCode = 1;
});
