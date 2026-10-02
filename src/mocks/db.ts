import type { Edition, Nft, Order, Wallet } from "@/types/domain"
import { FIXTURE_NFTS, FIXTURE_USERS, FIXTURE_WALLETS, type StoredUser } from "./fixtures"

const DB_KEY = "kurio:mock-db:v2"
const SESSION_TTL_MS = 30 * 60 * 1000

export type StoredOrder = Order & { userId: string }

export type Db = {
  users: StoredUser[]
  sessions: Record<string, { userId: string; expiresAt: string }>
  nfts: Nft[]
  /** Tudo abaixo é indexado por userId: nenhum dado privado é compartilhado entre usuários. */
  favorites: Record<string, string[]>
  carts: Record<string, { lines: { nftId: string; quantity: number; edition: Edition }[]; updatedAt: string }>
  wallets: Record<string, Wallet[]>
  orders: StoredOrder[]
  idempotency: Record<string, { userId: string; hash: string; orderId: string }>
  counters: { order: number; user: number; wallet: number; token: number }
}

function seed(): Db {
  return {
    users: structuredClone(FIXTURE_USERS),
    sessions: {},
    nfts: structuredClone(FIXTURE_NFTS),
    favorites: { u_demo: ["emerald-ape-042"], u_maya: [] },
    carts: {},
    wallets: structuredClone(FIXTURE_WALLETS),
    orders: [],
    idempotency: {},
    counters: { order: 1000, user: 100, wallet: 100, token: 0 },
  }
}

let cache: Db | null = null

function load(): Db {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(DB_KEY)
    cache = raw ? (JSON.parse(raw) as Db) : seed()
  } catch {
    cache = seed()
  }
  return cache
}

function persist() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(cache))
  } catch {
    /* storage cheio/bloqueado: o mock continua funcionando só em memória */
  }
}

export function db(): Db {
  return load()
}

/** Toda escrita passa por aqui para garantir persistência. */
export function mutate<T>(fn: (state: Db) => T): T {
  const result = fn(load())
  persist()
  return result
}

export function resetDb() {
  cache = seed()
  persist()
}

export function createSession(userId: string): { token: string; expiresAt: string } {
  return mutate((state) => {
    state.counters.token += 1
    const token = `tok_${userId}_${state.counters.token}`
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
    state.sessions[token] = { userId, expiresAt }
    return { token, expiresAt }
  })
}

export function nextId(kind: "order" | "user" | "wallet") {
  return mutate((state) => ++state.counters[kind])
}
