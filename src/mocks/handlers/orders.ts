import { delay, http, HttpResponse } from "msw"
import { addEth, compareEth, percentOfEth } from "@/lib/money"
import { WALLET_TYPES, type CreateOrderInput, type Order } from "@/types/domain"
import { db, mutate, nextId, type StoredOrder } from "../db"
import { beginAuth, fail } from "../http"
import { advanceOrder, buildCart, computeQuote, hashOrderInput, scheduleOrderProgress, toPublicOrder, updateNft } from "../logic"
import { consumeScenario, getScenario } from "../scenarios"
import { validateCollector } from "../validation"

const CLIENT_TIMEOUT_OVERRUN_MS = 12_000

export const orderHandlers = [
  http.post("/api/orders", async ({ request }) => {
    const ctx = await beginAuth(request)
    if (ctx instanceof Response) return ctx
    const userId = ctx.user.id

    const key = request.headers.get("Idempotency-Key")
    if (!key) return fail(400, "idempotency_key_required", "O cabeçalho Idempotency-Key é obrigatório.")

    const body = (await request.json()) as CreateOrderInput
    const hash = hashOrderInput(body)
    const recorded = db().idempotency[`${userId}:${key}`]

    // Mesma chave + mesmo conteúdo => mesmo pedido. Mesma chave + conteúdo diferente => conflito.
    if (recorded) {
      if (recorded.hash !== hash) return fail(409, "idempotency_conflict", "Esta chave de idempotência já foi usada com outro conteúdo.")
      const existing = advanceOrder(recorded.orderId)!
      return HttpResponse.json<Order>(toPublicOrder(existing), { status: 200, headers: { "Idempotent-Replayed": "true" } })
    }

    const wallet = db().wallets[userId]?.find((item) => item.id === body.walletId)
    if (!wallet) return fail(422, "validation_error", "Selecione uma carteira válida.", { walletId: "Selecione uma carteira." })
    if (!(WALLET_TYPES as readonly string[]).includes(body.provider)) return fail(422, "validation_error", "Selecione a carteira e a rede.", { provider: "Selecione a carteira e a rede." })
    const collectorErrors = validateCollector(body.collector ?? {})
    if (Object.keys(collectorErrors).length) return fail(422, "validation_error", "Corrija os campos destacados.", collectorErrors)

    // Cenários que mexem no mundo ANTES da validação, como aconteceria numa corrida real.
    if (consumeScenario("price-change")) {
      for (const item of buildCart(userId).items) updateNft(item.nft.id, { priceEth: addEth(item.nft.priceEth, percentOfEth(item.nft.priceEth, 1000)) })
    }
    if (consumeScenario("inventory-conflict")) {
      const first = buildCart(userId).items[0]
      if (first) updateNft(first.nft.id, { available: 0 })
    }

    const quote = computeQuote(userId, body.coupon)
    if (!quote.items.length) return fail(409, "empty_cart", "Seu carrinho está vazio.")
    const couponIssue = quote.issues.find((issue) => issue.code === "invalid_coupon")
    if (couponIssue && "message" in couponIssue) return fail(422, "invalid_coupon", couponIssue.message)
    if (quote.issues.some((issue) => issue.code === "unavailable")) return fail(409, "inventory_conflict", "Alguns itens ficaram indisponíveis. Revise o carrinho.")
    if (compareEth(quote.totalEth, body.expectedTotalEth) !== 0) {
      return fail(409, "price_changed", `O total mudou para ${quote.totalEth} ETH. Revise antes de confirmar.`)
    }
    if (getScenario() === "payment-rejected") {
      return fail(402, "payment_rejected", "Transação recusada pela carteira. Tente outra carteira.")
    }

    const orderNumber = nextId("order")
    const order: StoredOrder = {
      id: `GM-${orderNumber}`,
      userId,
      status: "pending",
      version: 1,
      transactionId: null,
      walletId: wallet.id,
      provider: body.provider,
      collector: { ...body.collector, note: body.collector.note ?? "" },
      items: quote.items.map((item) => ({ nft: { ...item.nft }, quantity: item.quantity, edition: item.edition })),
      subtotalEth: quote.subtotalEth,
      discountEth: quote.discountEth,
      networkFeeEth: quote.networkFeeEth,
      totalEth: quote.totalEth,
      createdAt: new Date().toISOString(),
    }
    mutate((state) => {
      state.orders.push(order)
      state.idempotency[`${userId}:${key}`] = { userId, hash, orderId: order.id }
      state.carts[userId] = { lines: [], updatedAt: new Date().toISOString() }
    })
    for (const item of quote.items) updateNft(item.nft.id, { available: Math.max(0, item.nft.available - item.quantity) })
    scheduleOrderProgress(order.id)

    // Timeout simulado: o servidor JÁ criou o pedido, mas a resposta chega tarde demais.
    // Quem repetir com a mesma Idempotency-Key recupera este mesmo pedido.
    if (consumeScenario("timeout")) await delay(CLIENT_TIMEOUT_OVERRUN_MS)

    return HttpResponse.json<Order>(toPublicOrder(order), { status: 201 })
  }),

  http.get("/api/orders", async ({ request }) => {
    const ctx = await beginAuth(request)
    if (ctx instanceof Response) return ctx
    const mine = db().orders.filter((order) => order.userId === ctx.user.id)
    const items = mine.map((order) => toPublicOrder(advanceOrder(order.id) ?? order)).reverse()
    return HttpResponse.json({ items })
  }),

  http.get("/api/orders/:id", async ({ params, request }) => {
    const ctx = await beginAuth(request)
    if (ctx instanceof Response) return ctx
    const order = db().orders.find((item) => item.id === params.id && item.userId === ctx.user.id)
    // 404 (e não 403) para pedido de outro usuário: não revela que ele existe.
    if (!order) return fail(404, "not_found", "Pedido não encontrado.")
    return HttpResponse.json<Order>(toPublicOrder(advanceOrder(order.id) ?? order))
  }),
]
