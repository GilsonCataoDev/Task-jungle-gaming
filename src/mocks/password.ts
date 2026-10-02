/**
 * Senhas nunca ficam em claro no banco simulado: guardamos `pbkdf2$<sal>$<hash>` (PBKDF2-SHA-256, sal por usuário).
 * Em um backend real isto seria argon2/bcrypt no servidor; aqui o MSW roda no navegador, então usamos WebCrypto.
 */
const ITERATIONS = 100_000

const toHex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
const fromHex = (hex: string) => Uint8Array.from(hex.match(/../g) ?? [], (pair) => parseInt(pair, 16))

async function derive(password: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"])
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: ITERATIONS }, key, 256)
  return toHex(new Uint8Array(bits))
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return `pbkdf2$${toHex(salt)}$${await derive(password, salt)}`
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, salt, hash] = stored.split("$")
  if (scheme !== "pbkdf2" || !salt || !hash) return false
  return (await derive(password, fromHex(salt))) === hash
}
