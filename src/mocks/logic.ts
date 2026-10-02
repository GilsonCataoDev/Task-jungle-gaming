import { addEth, compareEth, mulEth, percentOfEth, subEth, sumEth } from "@/lib/money"
import type { Cart, CartItem, Nft, Order, OrderUpdatedEvent, Quote, QuoteIssue } from "@/types/domain"
import { db, mutate, type StoredOrder } from "./db"
import { COUPONS, NETWORK_FEE_ETH } from "./fixtures"
import { publish } from "./realtime"

export function publicNft(nft: Nft, userName?: string): Nft & { canEdit: boolean } {
  return { ...nft, canEdit: !!userName && nft.creator === userName }
}

/** Único ponto que altera um NFT: incrementa a versão e emite `nft.updated` pelo "servidor". */
export function updateNft(id: string, patch: Partial<Pick<Nft, "priceEth" | "available" | "name" | "description">>) {
  const updated = mutate((state) => {
    const nft = state.nfts.find((item) => item.id === id)
    if (!nft) return null
    Object.assign(nft, patch)
    nft.version += 1
    return { ...nft }
  })
  if (updated) publish("nft.updated", { id: updated.id, version: updated.version, priceEth: updated.priceEth, available: updated.available })
  return updated
}

export function buildCart(userId: string): Cart {
  const cart = db().carts[userId]
  const items: CartItem[] = (cart?.lines ?? []).flatMap((line) => {
    const nft = db().nfts.find((item) => item.id === line.nftId)
    return nft ? [{ nft, quantity: line.quantity, edition: line.edition }] : []
  })
  return { items, updatedAt: cart?.updatedAt ?? new Date(0).toISOString() }
}

export function computeQuote(userId: string, couponInput: string | null): Quote {
  const { items } = buildCart(userId)
  const issues: QuoteIssue[] = []

  for (const item of items) {
    if (item.quantity > item.nft.available) issues.push({ code: "unavailable", nftId: item.nft.id, available: item.nft.available })
  }

  const subtotalEth = sumEth(items.map((item) => mulEth(item.nft.priceEth, item.quantity)))
  const code = couponInput?.trim().toUpperCase() || null
  let discountEth = "0"
  let appliedCoupon: string | null = null

  if (code) {
    const coupon = COUPONS[code]
    if (!coupon) {
      issues.push({ code: "invalid_coupon", message: "Cupom inválido." })
    } else if (coupon.expiresAt && Date.parse(coupon.expiresAt) < Date.now()) {
      issues.push({ code: "invalid_coupon", message: "Cupom expirado." })
    } else {
      appliedCoupon = code
      const raw = coupon.kind === "percent" ? percentOfEth(subtotalEth, coupon.basisPoints) : coupon.eth
      discountEth = compareEth(raw, subtotalEth) > 0 ? subtotalEth : raw
    }
  }

  const networkFeeEth = items.length ? NETWORK_FEE_ETH : "0"
  const totalEth = addEth(subEth(subtotalEth, discountEth), networkFeeEth)
  return { items, subtotalEth, discountEth, networkFeeEth, totalEth, coupon: appliedCoupon, issues }
}

// ---- Pedidos: o status avança com o tempo, calculado de forma determinística ----
const PROCESSING_AFTER_MS = 1_500
const CONFIRMED_AFTER_MS = 3_500

/** Hash de 64 caracteres hexadecimais, determinístico (FNV-1a repetido): parece um hash de transação. */
function fakeTxHash(seed: string): string {
  let hash = 0x811c9dc5
  let hex = ""
  for (let index = 0; hex.length < 64; index++) {
    hash ^= seed.charCodeAt(index % seed.length) + index
    hash = Math.imul(hash, 0x01000193) >>> 0
    hex += hash.toString(16).padStart(8, "0")
  }
  return `0x${hex.slice(0, 64)}`
}

export function toPublicOrder(order: StoredOrder): Order {
  const { userId: _userId, ...rest } = order
  void _userId
  return rest
}

function statusAt(order: StoredOrder): { status: Order["status"]; version: number } {
  if (order.status === "failed" || order.status === "confirmed") return { status: order.status, version: order.version }
  const elapsed = Date.now() - new Date(order.createdAt).getTime()
  if (elapsed >= CONFIRMED_AFTER_MS) return { status: "confirmed", version: 3 }
  if (elapsed >= PROCESSING_AFTER_MS) return { status: "processing", version: 2 }
  return { status: "pending", version: 1 }
}

/**
 * Aplica a transição devida e emite `order.updated`. É chamado pelos timers (enquanto a aba
 * vive) e pelo GET /orders/:id (para recuperar pedidos pendentes depois de um reload).
 */
export function advanceOrder(orderId: string): StoredOrder | undefined {
  const current = db().orders.find((item) => item.id === orderId)
  if (!current) return undefined
  const next = statusAt(current)
  if (next.version === current.version) return current

  const updated = mutate((state) => {
    const order = state.orders.find((item) => item.id === orderId)!
    order.status = next.status
    order.version = next.version
    if (next.status === "confirmed") order.transactionId = fakeTxHash(`${order.id}:${order.totalEth}`)
    return { ...order }
  })
  const event: OrderUpdatedEvent = { id: updated.id, version: updated.version, status: updated.status, transactionId: updated.transactionId }
  publish("order.updated", event)
  return updated
}

export function scheduleOrderProgress(orderId: string) {
  setTimeout(() => advanceOrder(orderId), PROCESSING_AFTER_MS + 50)
  setTimeout(() => advanceOrder(orderId), CONFIRMED_AFTER_MS + 50)
}

/** JSON com chaves ordenadas em qualquer nível: mesma intenção => mesmo hash. */
export function hashOrderInput(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(hashOrderInput).join(",")}]`
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))
    return `{${entries.map(([key, val]) => `${JSON.stringify(key)}:${hashOrderInput(val)}`).join(",")}}`
  }
  return JSON.stringify(value)
}
