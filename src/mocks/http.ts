import { delay, HttpResponse } from "msw"
import type { ApiErrorBody } from "@/types/domain"
import { db, mutate } from "./db"
import type { StoredUser } from "./fixtures"
import { getScenario, latencyMs } from "./scenarios"

export function fail(status: number, code: string, message: string, fields?: Record<string, string>) {
  const body: ApiErrorBody = { code, message, ...(fields ? { fields } : {}) }
  return HttpResponse.json(body, { status })
}

export type AuthContext = { user: StoredUser; token: string }
type Options = { mutation?: boolean }

const expired = () => fail(401, "session_expired", "Sua sessão expirou. Entre novamente.")

/** Latência do cenário + erros globais. Devolve uma Response para interromper o handler. */
async function preflight(options: Options): Promise<Response | null> {
  await delay(latencyMs())
  const scenario = getScenario()
  if (scenario === "server-error") return fail(503, "server_error", "Serviço indisponível. Tente novamente em instantes.")
  if (scenario === "mutation-error" && options.mutation) return fail(500, "mutation_failed", "Não foi possível salvar a alteração.")
  return null
}

function readSession(request: Request) {
  const header = request.headers.get("Authorization")
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null
  const session = token ? db().sessions[token] : undefined
  const user = session ? db().users.find((u) => u.id === session.userId) : undefined
  return { token, session, user }
}

/** Rotas públicas (ex.: catálogo). */
export async function beginPublic(options: Options = {}): Promise<Response | null> {
  return preflight(options)
}

/** Rotas privadas: valida token, expiração e cenário de sessão expirada. */
export async function beginAuth(request: Request, options: Options = {}): Promise<AuthContext | Response> {
  const early = await preflight(options)
  if (early) return early
  return authenticate(request)
}

/**
 * Carrinho e cotação: com token, é o da conta (mesmas regras de sessão de `beginAuth`); sem token, é o do visitante,
 * identificado pelo cabeçalho `X-Visitor-Id`. Pedido, perfil, carteiras e favoritos continuam exigindo login.
 */
export type CartContext = { ownerId: string; user: StoredUser | null }
export async function beginCart(request: Request, options: Options = {}): Promise<CartContext | Response> {
  const early = await preflight(options)
  if (early) return early
  if (request.headers.get("Authorization")) {
    const ctx = authenticate(request)
    return ctx instanceof Response ? ctx : { ownerId: ctx.user.id, user: ctx.user }
  }
  return { ownerId: visitorOwner(request), user: null }
}

export const visitorOwner = (request: Request) => `visitor:${request.headers.get("X-Visitor-Id") ?? "anonymous"}`

function authenticate(request: Request): AuthContext | Response {
  const { token, session, user } = readSession(request)
  if (!token || !session || !user) return fail(401, "unauthenticated", "Faça login para continuar.")

  const isExpired = getScenario() === "session-expired" || new Date(session.expiresAt).getTime() < Date.now()
  if (isExpired) {
    mutate((state) => delete state.sessions[token])
    return expired()
  }
  return { user, token }
}
