const { randomBytes, scrypt: scryptCallback, timingSafeEqual } = require("node:crypto");
const { promisify } = require("node:util");

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

async function hashLobbyPassword(password) {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString("hex")}$${derivedKey.toString("hex")}`;
}

async function verifyLobbyPassword(password, storedHash) {
  if (typeof storedHash !== "string") return false;
  const [algorithm, saltHex, keyHex, ...extra] = storedHash.split("$");
  if (algorithm !== "scrypt" || !/^[a-f0-9]{32}$/i.test(saltHex) ||
      !/^[a-f0-9]{128}$/i.test(keyHex) || extra.length > 0) {
    throw new Error("Stored lobby password hash has an invalid format.");
  }
  const expectedKey = Buffer.from(keyHex, "hex");
  const actualKey = await scrypt(password, Buffer.from(saltHex, "hex"), KEY_LENGTH);
  return timingSafeEqual(actualKey, expectedKey);
}

module.exports = { hashLobbyPassword, verifyLobbyPassword };
