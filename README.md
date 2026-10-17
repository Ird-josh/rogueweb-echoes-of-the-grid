# RogueWeb: Ecos del Grid

Roguelike web client with an Express API, Supabase Auth/PostgreSQL, and Socket.IO co-op lobbies.

## Backend setup (Supabase)

1. Create a Supabase project and save its database password somewhere private.
2. In **Authentication → URL Configuration**, set the local site URL to `http://localhost:5173` and allow these redirects:
   - `http://localhost:5173`
   - `http://localhost:5174`
   - `http://127.0.0.1:5173`
   - `http://127.0.0.1:5174`
3. In **Authentication → Providers**, enable Google. In Google's OAuth application, use the Supabase callback URL shown on the Google provider page (it has the form `https://<project-ref>.supabase.co/auth/v1/callback`). Supabase keeps the provider secret; do not put it in the client.
4. To enable GitHub sign-in, create a GitHub OAuth App with the public client URL as its Homepage URL and the Supabase callback URL shown in **Authentication → Providers → GitHub** as its Authorization callback URL. Enter that app's Client ID and Client secret in Supabase, then enable the GitHub provider. Keep the secret in Supabase, never in the client.
5. Copy `.env.example` to `.env` at the repository root and `client/.env.example` to `client/.env.local`.
6. In the root `.env`, set:
   - `SUPABASE_URL` and `SUPABASE_ANON_KEY` from the Supabase project API settings.
   - `DATABASE_URL` to the project's PostgreSQL **Session pooler** connection string from **Connect**. Keep the password private and preserve `sslmode=require`.
   - `TELEMETRY_ADMIN_EMAILS` to the comma-separated email addresses allowed to see all saved runs.
7. In `client/.env.local`, use the same Supabase URL and anon/publishable key, and set `VITE_API_URL=http://localhost:3000`. The anon key is intended for browser use; never put the database password or a service-role key in a `VITE_` variable.
8. Install dependencies and apply the schema:

   ```powershell
   npm install
   npm run db:migrate
   ```

   Alternatively, paste `server/db/schema.sql` into the Supabase SQL Editor and run it once.
9. Start the API and client in separate terminals:

   ```powershell
   npm run dev
   npm --prefix client run dev
   ```

   The API health check is `http://localhost:3000/api/health`.

For Google or GitHub sign-in on a phone, open the public Render client URL rather than `localhost`. A phone's `localhost` points to the phone itself, not the computer running the development server, so the OAuth return cannot reach a desktop's local Vite server.

The API validates Supabase access tokens, persists completed runs for signed-in players, and restricts the telemetry dashboard to `TELEMETRY_ADMIN_EMAILS`. The database tables have row-level security enabled and direct access revoked from Supabase's `anon` and `authenticated` roles; server queries use the private PostgreSQL connection string.

Lobby codes are six characters. Each lobby has a 3–32 character name, a 6–128 character password, and a maximum of three players. The server stores salted scrypt password hashes, never plaintext lobby passwords. Lobby membership and ready state are stored in PostgreSQL and broadcast through Socket.IO. During co-op runs, the lobby host is authoritative: the host simulates the shared rooms, enemies, bosses, projectiles, drops, pickups, and floor progression, then relays snapshots to the other players. Players send movement and combat inputs to the host, and each character's gamertag is drawn above its sprite. The host must remain connected; if it disconnects, the shared run cannot continue. This client-hosted simulation is intended for cooperative play, not anti-cheat enforcement. Run telemetry is client-reported and is intended for game history. The history starts empty and shows only real saved runs.

## Deploy publicly with Render

The root `render.yaml` defines the Node API/Socket.IO server and the Vite static client. From the Render dashboard, create a Blueprint connected to the GitHub repository and select the `main` branch. Keep both services in the same Blueprint so Render can wire the client API URL and server CORS origin automatically.

When Render prompts for environment variables, use the values from your private local files:

- API service: `DATABASE_URL`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY`.
- Client service: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (the same Supabase project URL and anon/publishable key).
- Optional client service: `VITE_GAME_MUSIC_URL` for a track you own or are licensed to publish. The local `client/public/audio/game-music.wav` file is intentionally git-ignored and is used only by the development server.

Never enter the PostgreSQL password or a Supabase service-role key in a `VITE_` variable. The game's current 8-bit cover of a commercial song is not included in the public deployment; an 8-bit arrangement may still be a copyrighted derivative. The free Render web service may sleep when idle, so its first request and Socket.IO connection can take a little while to wake up.

After Render publishes the static client, copy its `https://...onrender.com` URL into Supabase **Authentication → URL Configuration** as the Site URL and an allowed redirect URL. Also add that same public URL to the Redirect URLs allowlist; the static client's `VITE_AUTH_REDIRECT_URL` makes OAuth return to Render even when sign-in starts from localhost on a phone. Google and GitHub sign-in should each use the Supabase callback URL configured in that provider's settings. Render injects the client's host into the API's CORS allowlist and the API host into the client's build settings.

The Supabase database schema must already be applied before the API can become healthy. Check the deployed API at `https://<api-service>.onrender.com/api/health`; it should return `{"status":"ok","database":"ok"}`. Share the static client's URL with players. Both users need access to the deployed API, and the host must remain connected during a co-op run.
