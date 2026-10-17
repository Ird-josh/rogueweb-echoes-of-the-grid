function parseClientOrigins(value) {
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => {
      const normalized = /^[a-z][a-z\d+.-]*:\/\//i.test(origin) ? origin : `https://${origin}`;
      try {
        return new URL(normalized).origin;
      } catch {
        throw new Error(`Invalid client origin in CLIENT_ORIGIN: ${origin}`);
      }
    });
}

module.exports = { parseClientOrigins };
