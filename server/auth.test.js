const { test } = require("node:test");
const assert = require("node:assert/strict");
const { bearerToken, createSupabaseAuthenticator } = require("./auth");

test("extracts only a valid bearer token from authorization headers", () => {
  assert.equal(bearerToken({ headers: { authorization: "Bearer token-123" } }), "token-123");
  assert.equal(bearerToken({ headers: { authorization: "Basic token-123" } }), null);
  assert.equal(bearerToken({ headers: {} }), null);
});

test("verifies Supabase access tokens with Auth and maps the verified profile", async () => {
  let requestedUrl = "";
  let requestedAuthorization = "";
  const authenticate = createSupabaseAuthenticator({
    supabaseUrl: "https://project.supabase.co",
    anonKey: "public-anon-key",
    fetchImpl: async (url, options) => {
      requestedUrl = url;
      requestedAuthorization = options.headers.authorization;
      return Response.json({
        id: "user-123",
        email: "Player@Example.test",
        user_metadata: { full_name: "Player One", avatar_url: "https://example.test/avatar.png" },
      });
    },
  });

  assert.deepEqual(await authenticate("access-token"), {
    id: "user-123",
    email: "player@example.test",
    name: "Player One",
    avatarUrl: "https://example.test/avatar.png",
  });
  assert.equal(requestedUrl, "https://project.supabase.co/auth/v1/user");
  assert.equal(requestedAuthorization, "Bearer access-token");
});

test("treats rejected credentials as unauthenticated and exposes provider outages", async () => {
  const rejected = createSupabaseAuthenticator({
    supabaseUrl: "https://project.supabase.co",
    anonKey: "public-anon-key",
    fetchImpl: async () => new Response(null, { status: 401 }),
  });
  assert.equal(await rejected("expired-token"), null);

  const unavailable = createSupabaseAuthenticator({
    supabaseUrl: "https://project.supabase.co",
    anonKey: "public-anon-key",
    fetchImpl: async () => new Response(null, { status: 503 }),
  });
  await assert.rejects(unavailable("access-token"), /HTTP 503/);
});
