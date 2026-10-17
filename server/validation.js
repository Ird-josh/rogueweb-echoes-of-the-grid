const CHARACTER_IDS = new Set(["vesper", "nyx", "bram", "sol"]);
const RUN_STATUSES = new Set(["victory", "defeat", "abandoned"]);

function isIntegerBetween(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max;
}

function validateRun(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return "La partida debe enviarse como un objeto.";
  }
  if (!CHARACTER_IDS.has(payload.characterId)) return "El personaje no es válido.";
  if (!RUN_STATUSES.has(payload.status)) return "El estado de la partida no es válido.";
  if (!isIntegerBetween(payload.floor, 1, 1000)) return "El nivel debe estar entre 1 y 1000.";
  if (!isIntegerBetween(payload.kills, 0, 1000000)) return "El número de bajas no es válido.";
  if (!isIntegerBetween(payload.durationSeconds, 0, 2147483647)) {
    return "La duración de la partida no es válida.";
  }
  if (payload.newGamePlus !== undefined && typeof payload.newGamePlus !== "boolean") {
    return "El valor de Nueva Partida+ no es válido.";
  }
  if (payload.inventory !== undefined && !Array.isArray(payload.inventory)) {
    return "El inventario debe ser una lista.";
  }
  if (JSON.stringify(payload.inventory ?? []).length > 10000) {
    return "El inventario es demasiado grande.";
  }
  if (
    payload.lobbyCode !== undefined &&
    payload.lobbyCode !== null &&
    (typeof payload.lobbyCode !== "string" || !/^[A-Z0-9]{6}$/.test(payload.lobbyCode))
  ) {
    return "El código del lobby no es válido.";
  }

  return null;
}

function parsePagination(query) {
  const page = Number(query.page ?? 1);
  const pageSize = Number(query.pageSize ?? 8);
  if (!Number.isSafeInteger(page) || page < 1 || page > 1000000) return null;
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) return null;
  return { page, pageSize, offset: (page - 1) * pageSize };
}

module.exports = { parsePagination, validateRun };
