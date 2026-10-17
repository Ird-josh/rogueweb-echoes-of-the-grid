CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.game_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_name text NOT NULL DEFAULT 'Explorador',
  character_id text NOT NULL CHECK (character_id IN ('vesper', 'nyx', 'bram', 'sol')),
  new_game_plus boolean NOT NULL DEFAULT false,
  status text NOT NULL CHECK (status IN ('victory', 'defeat', 'abandoned')),
  floor integer NOT NULL CHECK (floor > 0),
  kills integer NOT NULL CHECK (kills >= 0),
  duration_seconds integer NOT NULL CHECK (duration_seconds >= 0),
  inventory jsonb NOT NULL DEFAULT '[]'::jsonb,
  lobby_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS game_runs_created_at_id_idx
  ON public.game_runs (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS game_runs_user_id_created_at_idx
  ON public.game_runs (user_id, created_at DESC);
ALTER TABLE public.game_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.game_runs FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.game_lobbies (
  code text PRIMARY KEY CHECK (code ~ '^[A-Z0-9]{6}$'),
  name text NOT NULL DEFAULT 'Lobby',
  password_hash text,
  host_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'in_game', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.game_lobbies
  ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT 'Lobby';
ALTER TABLE public.game_lobbies
  ADD COLUMN IF NOT EXISTS password_hash text;

CREATE TABLE IF NOT EXISTS public.game_lobby_members (
  lobby_code text NOT NULL REFERENCES public.game_lobbies(code) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_name text NOT NULL,
  character_id text NOT NULL CHECK (character_id IN ('vesper', 'nyx', 'bram', 'sol')),
  is_ready boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (lobby_code, user_id)
);

CREATE INDEX IF NOT EXISTS game_lobby_members_user_id_idx
  ON public.game_lobby_members (user_id);
ALTER TABLE public.game_lobbies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_lobby_members ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.game_lobbies FROM anon, authenticated;
REVOKE ALL ON TABLE public.game_lobby_members FROM anon, authenticated;
