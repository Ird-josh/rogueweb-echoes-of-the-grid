import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

const configuredApiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
export const apiUrl = `${/^https?:\/\//i.test(configuredApiUrl) ? "" : "https://"}${configuredApiUrl}`
  .replace(/\/+$/, "");

export interface LobbyMember {
  userId: string;
  name: string;
  characterId: string;
  ready: boolean;
}

export interface LobbySnapshot {
  code: string;
  name: string;
  status: "waiting" | "in_game" | "closed";
  hostUserId: string;
  maxPlayers: number;
  members: LobbyMember[];
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  requireAuth = false,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  if (supabase) {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error(`No se pudo recuperar la sesión: ${error.message}`);
    if (data.session?.access_token) {
      headers.set("Authorization", `Bearer ${data.session.access_token}`);
    } else if (requireAuth) {
      throw new Error("Inicia sesión antes de continuar.");
    }
  } else if (requireAuth) {
    throw new Error("Configura Supabase en client/.env.local para usar esta función.");
  }

  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, { ...init, headers });
  } catch {
    throw new Error("No se pudo conectar con el servidor. Comprueba que el backend esté iniciado.");
  }

  let body: { error?: string } & T;
  try {
    body = (await response.json()) as { error?: string } & T;
  } catch {
    throw new Error("El servidor devolvió una respuesta que no es JSON válida.");
  }
  if (!response.ok) {
    throw new Error(body.error || `El servidor respondió con el código ${response.status}.`);
  }
  return body;
}
