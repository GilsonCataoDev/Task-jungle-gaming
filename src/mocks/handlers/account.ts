import { http, HttpResponse } from "msw"
import type { User, Wallet, WalletInput } from "@/types/domain"
import { db, mutate, nextId } from "../db"
import { beginAuth, fail } from "../http"
import { hashPassword, verifyPassword } from "../password"
import { EMAIL_REGEX, validateWallet } from "../validation"
import { toPublicUser } from "./auth"

const MAX_AVATAR_BYTES = 1_000_000
/** Uma carteira principal e, no máximo, uma secundária. */
const MAX_WALLETS = 2

function validation(fields: Record<string, string>) {
  return fail(422, "validation_error", "Corrija os campos destacados.", fields)
}

const WALLET_KEYS: (keyof WalletInput)[] = ["nickname", "network", "address", "type", "secondaryRef", "displayName", "profileName", "referralCode", "email", "ens"]

function pickWalletFields(body: Partial<WalletInput>): Partial<WalletInput> {
  const picked: Record<string, unknown> = {}
  for (const key of WALLET_KEYS) if (body[key] !== undefined) picked[key] = typeof body[key] === "string" ? String(body[key]).trim() : body[key]
  return picked as Partial<WalletInput>
}

export const accountHandlers = [
  // ---- Perfil ----
  http.get("/api/profile", async ({ request }) => {
    const ctx = await beginAuth(request)
    if (ctx instanceof Response) return ctx
    return HttpResponse.json<User>(toPublicUser(ctx.user))
  }),

  http.patch("/api/profile", async ({ request }) => {
    const ctx = await beginAuth(request, { mutation: true })
    if (ctx instanceof Response) return ctx
    const body = (await request.json()) as Partial<Pick<User, "name" | "username" | "email" | "ens" | "walletNickname">>
    const fields: Record<string, string> = {}
    if (body.name !== undefined && !body.name.trim()) fields.name = "Informe o nome de exibição."
    if (body.username !== undefined && body.username.trim().length < 3) fields.username = "Informe um nome de usuário com ao menos 3 caracteres."
    if (body.username && db().users.some((user) => user.id !== ctx.user.id && user.username.toLowerCase() === body.username!.trim().toLowerCase())) fields.username = "Este nome de usuário já está em uso."
    if (body.email !== undefined && !EMAIL_REGEX.test(body.email)) fields.email = "Informe um e-mail válido."
    if (body.email && db().users.some((user) => user.id !== ctx.user.id && user.email === body.email!.toLowerCase())) fields.email = "Este e-mail já está em uso."
    if (body.ens !== undefined && !body.ens.trim()) fields.ens = "Informe o nome ENS."
    if (body.walletNickname !== undefined && !body.walletNickname.trim()) fields.walletNickname = "Informe o apelido da carteira."
    if (Object.keys(fields).length) return validation(fields)

    const updated = mutate((state) => {
      const user = state.users.find((item) => item.id === ctx.user.id)!
      if (body.name !== undefined) user.name = body.name.trim()
      if (body.username !== undefined) user.username = body.username.trim()
      if (body.email !== undefined) user.email = body.email.toLowerCase()
      if (body.ens !== undefined) user.ens = body.ens.trim()
      if (body.walletNickname !== undefined) user.walletNickname = body.walletNickname.trim()
      return { ...user }
    })
    return HttpResponse.json<User>(toPublicUser(updated))
  }),

  http.post("/api/profile/avatar", async ({ request }) => {
    const ctx = await beginAuth(request, { mutation: true })
    if (ctx instanceof Response) return ctx
    const file = (await request.formData()).get("avatar")
    if (!(file instanceof File)) return validation({ avatar: "Selecione uma imagem." })
    if (!file.type.startsWith("image/")) return validation({ avatar: "O arquivo precisa ser uma imagem." })
    if (file.size > MAX_AVATAR_BYTES) return validation({ avatar: "A imagem deve ter no máximo 1 MB." })

    const bytes = new Uint8Array(await file.arrayBuffer())
    let binary = ""
    bytes.forEach((byte) => (binary += String.fromCharCode(byte)))
    const avatarUrl = `data:${file.type};base64,${btoa(binary)}`
    const updated = mutate((state) => {
      const user = state.users.find((item) => item.id === ctx.user.id)!
      user.avatarUrl = avatarUrl
      return { ...user }
    })
    return HttpResponse.json<User>(toPublicUser(updated))
  }),

  /** "Remover" do avatar. */
  http.delete("/api/profile/avatar", async ({ request }) => {
    const ctx = await beginAuth(request, { mutation: true })
    if (ctx instanceof Response) return ctx
    const updated = mutate((state) => {
      const user = state.users.find((item) => item.id === ctx.user.id)!
      user.avatarUrl = null
      return { ...user }
    })
    return HttpResponse.json<User>(toPublicUser(updated))
  }),

  http.post("/api/profile/password", async ({ request }) => {
    const ctx = await beginAuth(request, { mutation: true })
    if (ctx instanceof Response) return ctx
    const body = (await request.json()) as { currentPassword?: string; newPassword?: string }
    if (!body.currentPassword || !(await verifyPassword(body.currentPassword, ctx.user.passwordHash))) return validation({ currentPassword: "Senha atual incorreta." })
    if (!body.newPassword || body.newPassword.length < 8) return validation({ newPassword: "A nova senha precisa ter ao menos 8 caracteres." })
    if (body.newPassword === body.currentPassword) return validation({ newPassword: "A nova senha deve ser diferente da atual." })
    const passwordHash = await hashPassword(body.newPassword)
    mutate((state) => {
      state.users.find((item) => item.id === ctx.user.id)!.passwordHash = passwordHash
    })
    return new HttpResponse(null, { status: 204 })
  }),

  // ---- Carteiras (principal + secundária) ----
  http.get("/api/wallets", async ({ request }) => {
    const ctx = await beginAuth(request)
    if (ctx instanceof Response) return ctx
    return HttpResponse.json({ items: db().wallets[ctx.user.id] ?? [] })
  }),

  http.post("/api/wallets", async ({ request }) => {
    const ctx = await beginAuth(request, { mutation: true })
    if (ctx instanceof Response) return ctx
    const input = pickWalletFields((await request.json()) as Partial<WalletInput>)
    const fields = validateWallet(input)
    const existing = db().wallets[ctx.user.id] ?? []
    if (!fields.address && existing.some((wallet) => wallet.address.toLowerCase() === input.address!.toLowerCase())) fields.address = "Esta carteira já foi cadastrada."
    if (Object.keys(fields).length) return validation(fields)
    if (existing.length >= MAX_WALLETS) return fail(409, "wallet_limit", "Você já tem uma carteira principal e uma secundária.")

    const wallet = mutate((state) => {
      const list = (state.wallets[ctx.user.id] ??= [])
      const created: Wallet = { ...(input as WalletInput), secondaryRef: input.secondaryRef ?? "", id: `w_${nextId("wallet")}`, isPrimary: list.length === 0 }
      list.push(created)
      return created
    })
    return HttpResponse.json<Wallet>(wallet, { status: 201 })
  }),

  http.patch("/api/wallets/:id", async ({ params, request }) => {
    const ctx = await beginAuth(request, { mutation: true })
    if (ctx instanceof Response) return ctx
    const wallet = db().wallets[ctx.user.id]?.find((item) => item.id === params.id)
    if (!wallet) return fail(404, "not_found", "Carteira não encontrada.")
    const body = (await request.json()) as Partial<WalletInput> & { isPrimary?: boolean }
    const patch = pickWalletFields(body)
    const fields = validateWallet({ ...wallet, ...patch })
    if (!fields.address && patch.address && db().wallets[ctx.user.id].some((other) => other.id !== wallet.id && other.address.toLowerCase() === patch.address!.toLowerCase())) fields.address = "Esta carteira já foi cadastrada."
    if (body.isPrimary === false && wallet.isPrimary) fields.isPrimary = "Defina outra carteira como principal primeiro."
    if (Object.keys(fields).length) return validation(fields)

    mutate((state) => {
      const list = state.wallets[ctx.user.id]
      const target = list.find((item) => item.id === wallet.id)!
      Object.assign(target, patch)
      if (body.isPrimary) list.forEach((item) => (item.isPrimary = item.id === target.id))
    })
    return HttpResponse.json({ items: db().wallets[ctx.user.id] })
  }),
]
