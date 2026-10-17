function createSupabaseAuthenticator({ supabaseUrl, anonKey, fetchImpl = fetch }) {
  if (!supabaseUrl || !anonKey) {
    throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY are required.");
  }

  const userEndpoint = new URL("/auth/v1/user", supabaseUrl).toString();

  return async function authenticateAccessToken(accessToken) {
    let response;
    try {
      response = await fetchImpl(userEndpoint, {
        headers: {
          apikey: anonKey,
          authorization: `Bearer ${accessToken}`,
        },
      });
    } catch {
      const error = new Error("Supabase Auth is currently unavailable.");
      error.statusCode = 503;
      throw error;
    }

    if (response.status === 401 || response.status === 403) return null;
    if (!response.ok) {
      const error = new Error(`Supabase Auth returned HTTP ${response.status}.`);
      error.statusCode = response.status >= 500 || response.status === 429 ? 503 : 502;
      throw error;
    }

    const user = await response.json();
    if (typeof user.id !== "string" || typeof user.email !== "string") return null;

    return {
      id: user.id,
      email: user.email.toLowerCase(),
      name:
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        user.email.split("@")[0],
      avatarUrl: user.user_metadata?.avatar_url ?? null,
    };
  };
}

function bearerToken(request) {
  const authorization = request.headers.authorization;
  if (typeof authorization !== "string") return null;

  const match = /^Bearer ([^\s]+)$/i.exec(authorization);
  return match ? match[1] : null;
}

function createAuthMiddleware(authenticateAccessToken) {
  async function requireAuth(request, response, next) {
    const token = bearerToken(request);
    if (!token) {
      response.status(401).json({ error: "Se requiere iniciar sesión." });
      return;
    }

    try {
      const user = await authenticateAccessToken(token);
      if (!user) {
        response.status(401).json({ error: "La sesión no es válida o expiró." });
        return;
      }

      request.user = user;
      next();
    } catch (error) {
      next(error);
    }
  }

  return { requireAuth };
}

module.exports = { bearerToken, createAuthMiddleware, createSupabaseAuthenticator };
