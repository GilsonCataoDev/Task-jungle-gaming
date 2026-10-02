import { http, HttpResponse } from "msw"
import type { AuthResponse, Session } from "@/types/domain"
import { createSession, db, mutate, nextId } from "../db"
import type { StoredUser } from "../fixtures"
import { beginAuth, beginPublic, fail } from "../http"
import { EMAIL_REGEX } from "../validation"

export const toPublicUser = ({ id, name, username, email, avatarUrl, ens, walletNickname }: StoredUser) => ({ id, name, username, email, avatarUrl, ens, walletNickname })

export const authHandlers = [
  http.post("/api/auth/register", async ({ request }) => {
    const early = await beginPublic({ mutation: true })
    if (early) return early

    const body = (await request.json()) as { username?: string; email?: string; password?: string }
    const fields: Record<string, string> = {}
    if (!body.username?.trim() || body.username.trim().length < 3) fields.username = "Informe um nome de usuário com ao menos 3 caracteres."
    if (!body.email || !EMAIL_REGEX.test(body.email)) fields.email = "Informe um e-mail válido."
    if (!body.password || body.password.length < 8) fields.password = "A senha precisa ter ao menos 8 caracteres."
    if (Object.keys(fields).length) return fail(422, "validation_error", "Corrija os campos destacados.", fields)

    const email = body.email!.toLowerCase()
    if (db().users.some((user) => user.email === email)) return fail(409, "email_taken", "Este e-mail já está cadastrado.", { email: "Este e-mail já está cadastrado." })
    if (db().users.some((user) => user.username.toLowerCase() === body.username!.trim().toLowerCase())) {
      return fail(409, "username_taken", "Este nome de usuário já está em uso.", { username: "Este nome de usuário já está em uso." })
    }

    const username = body.username!.trim()
    const user: StoredUser = { id: `u_${nextId("user")}`, name: username, username, email, password: body.password!, avatarUrl: null, ens: "", walletNickname: "" }
    mutate((state) => {
      state.users.push(user)
      state.favorites[user.id] = []
      state.wallets[user.id] = []
    })
    const { token, expiresAt } = createSession(user.id)
    const response: AuthResponse = { token, user: toPublicUser(user), expiresAt }
    return HttpResponse.json(response, { status: 201 })
  }),

  http.post("/api/auth/login", async ({ request }) => {
    const early = await beginPublic()
    if (early) return early

    const body = (await request.json()) as { email?: string; password?: string }
    if (!body.email || !body.password) return fail(422, "validation_error", "Preencha e-mail e senha.", { email: body.email ? "" : "Informe seu e-mail.", password: body.password ? "" : "Informe sua senha." })

    const user = db().users.find((item) => item.email === body.email!.toLowerCase())
    if (!user || user.password !== body.password) return fail(401, "invalid_credentials", "E-mail ou senha incorretos.")

    const { token, expiresAt } = createSession(user.id)
    const response: AuthResponse = { token, user: toPublicUser(user), expiresAt }
    return HttpResponse.json(response)
  }),

  /** Recuperação de sessão: o cliente chama no boot com o token salvo. */
  http.get("/api/auth/session", async ({ request }) => {
    const ctx = await beginAuth(request)
    if (ctx instanceof Response) return ctx
    const response: Session = { user: toPublicUser(ctx.user), expiresAt: db().sessions[ctx.token].expiresAt }
    return HttpResponse.json(response)
  }),

  http.post("/api/auth/logout", async ({ request }) => {
    const ctx = await beginAuth(request)
    if (ctx instanceof Response) return ctx
    mutate((state) => delete state.sessions[ctx.token])
    return new HttpResponse(null, { status: 204 })
  }),
]
