import { http, HttpResponse } from "msw"
import { EDITIONS, maxQuantity, type Cart, type Edition, type Quote } from "@/types/domain"
import { db, mutate } from "../db"
import { beginAuth, beginCart, fail, visitorOwner } from "../http"
import { buildCart, computeQuote } from "../logic"

/** Favoritos exigem login. Carrinho e cotação valem também para visitante (dono = `visitor:<id>`). */
function touchCart(userId: string, change: (lines: { nftId: string; quantity: number; edition: Edition }[]) => void) {
  mutate((state) => {
    const cart = (state.carts[userId] ??= { lines: [], updatedAt: new Date().toISOString() })
    change(cart.lines)
    cart.lines = cart.lines.filter((line) => line.quantity > 0)
    cart.updatedAt = new Date().toISOString()
  })
}

export const shoppingHandlers = [
  // ---- Favoritos ----
  http.get("/api/favorites", async ({ request }) => {
    const ctx = await beginAuth(request)
    if (ctx instanceof Response) return ctx
    return HttpResponse.json({ nftIds: db().favorites[ctx.user.id] ?? [] })
  }),
  http.put("/api/favorites/:nftId", async ({ params, request }) => {
    const ctx = await beginAuth(request, { mutation: true })
    if (ctx instanceof Response) return ctx
    if (!db().nfts.some((nft) => nft.id === params.nftId)) return fail(404, "not_found", "NFT não encontrado.")
    mutate((state) => {
      const list = (state.favorites[ctx.user.id] ??= [])
      if (!list.includes(String(params.nftId))) list.push(String(params.nftId))
    })
    return HttpResponse.json({ nftIds: db().favorites[ctx.user.id] })
  }),
  http.delete("/api/favorites/:nftId", async ({ params, request }) => {
    const ctx = await beginAuth(request, { mutation: true })
    if (ctx instanceof Response) return ctx
    mutate((state) => {
      state.favorites[ctx.user.id] = (state.favorites[ctx.user.id] ?? []).filter((id) => id !== params.nftId)
    })
    return HttpResponse.json({ nftIds: db().favorites[ctx.user.id] })
  }),

  // ---- Carrinho ----
  http.get("/api/cart", async ({ request }) => {
    const ctx = await beginCart(request)
    if (ctx instanceof Response) return ctx
    return HttpResponse.json<Cart>(buildCart(ctx.ownerId))
  }),
  http.post("/api/cart/items", async ({ request }) => {
    const ctx = await beginCart(request, { mutation: true })
    if (ctx instanceof Response) return ctx
    const body = (await request.json()) as { nftId?: string; quantity?: number; edition?: string }
    const nft = db().nfts.find((item) => item.id === body.nftId)
    if (!nft) return fail(404, "not_found", "NFT não encontrado.")
    if (nft.available <= 0) return fail(409, "unavailable", "Este NFT está esgotado.")
    const quantity = Math.max(1, Math.floor(body.quantity ?? 1))
    const edition = (EDITIONS as readonly string[]).includes(body.edition ?? "") ? (body.edition as Edition) : nft.edition
    if (nft.unavailableEditions.includes(edition)) return fail(409, "edition_unavailable", `A edição ${edition} não está disponível para este NFT.`)
    const limit = maxQuantity(nft, edition)
    touchCart(ctx.ownerId, (lines) => {
      const line = lines.find((item) => item.nftId === nft.id)
      if (line) {
        line.quantity = Math.min(limit, line.quantity + quantity)
        line.edition = edition
      } else lines.push({ nftId: nft.id, quantity: Math.min(limit, quantity), edition })
    })
    return HttpResponse.json<Cart>(buildCart(ctx.ownerId), { status: 201 })
  }),
  http.patch("/api/cart/items/:nftId", async ({ params, request }) => {
    const ctx = await beginCart(request, { mutation: true })
    if (ctx instanceof Response) return ctx
    const body = (await request.json()) as { quantity?: number }
    const nft = db().nfts.find((item) => item.id === params.nftId)
    if (!nft) return fail(404, "not_found", "NFT não encontrado.")
    const quantity = Math.floor(Number(body.quantity))
    if (!Number.isFinite(quantity) || quantity < 0) return fail(422, "validation_error", "Quantidade inválida.")
    touchCart(ctx.ownerId, (lines) => {
      const line = lines.find((item) => item.nftId === nft.id)
      if (line) line.quantity = Math.min(quantity, maxQuantity(nft, line.edition))
    })
    return HttpResponse.json<Cart>(buildCart(ctx.ownerId))
  }),
  http.delete("/api/cart/items/:nftId", async ({ params, request }) => {
    const ctx = await beginCart(request, { mutation: true })
    if (ctx instanceof Response) return ctx
    touchCart(ctx.ownerId, (lines) => {
      const line = lines.find((item) => item.nftId === params.nftId)
      if (line) line.quantity = 0
    })
    return HttpResponse.json<Cart>(buildCart(ctx.ownerId))
  }),

  // Ao entrar, o carrinho do visitante passa para a conta: soma quantidades (limitadas ao estoque) e apaga o do visitante.
  http.post("/api/cart/merge", async ({ request }) => {
    const ctx = await beginAuth(request, { mutation: true })
    if (ctx instanceof Response) return ctx
    const visitor = visitorOwner(request)
    const guestLines = db().carts[visitor]?.lines ?? []
    if (guestLines.length) {
      touchCart(ctx.user.id, (lines) => {
        for (const guest of guestLines) {
          const nft = db().nfts.find((item) => item.id === guest.nftId)
          if (!nft || maxQuantity(nft, guest.edition) <= 0) continue
          const line = lines.find((item) => item.nftId === guest.nftId)
          if (line) line.quantity = Math.min(maxQuantity(nft, line.edition), line.quantity + guest.quantity)
          else lines.push({ ...guest, quantity: Math.min(maxQuantity(nft, guest.edition), guest.quantity) })
        }
      })
      mutate((state) => delete state.carts[visitor])
    }
    return HttpResponse.json<Cart>(buildCart(ctx.user.id))
  }),

  // ---- Cotação: cupom, disponibilidade, descontos, taxa de rede e total ----
  http.post("/api/quote", async ({ request }) => {
    const ctx = await beginCart(request)
    if (ctx instanceof Response) return ctx
    const body = (await request.json().catch(() => ({}))) as { coupon?: string | null }
    return HttpResponse.json<Quote>(computeQuote(ctx.ownerId, body.coupon ?? null))
  }),
]
