import type { QueryClient } from "@tanstack/react-query"
import type { Cart, Facets, Nft, NftUpdatedEvent, Order, OrderUpdatedEvent, Paginated } from "@/types/domain"
import { qk } from "@/lib/query-keys"

/**
 * Reconciliação Socket.IO <-> cache do TanStack Query.
 *
 * Regra de ouro: cada evento carrega `version`. Só aplicamos se for MAIOR que a versão que
 * já conhecemos (cache REST ou evento anterior). Assim:
 *   - eventos duplicados são ignorados (mesma versão),
 *   - eventos atrasados não regridem o estado (versão menor),
 *   - efeitos colaterais (toast, etc.) só disparam quando algo realmente mudou.
 * Depois de qualquer reconexão chamamos `resync`, e o REST passa a ser a fonte da verdade.
 */
const seenVersions = new Map<string, number>()

function isNewer(key: string, version: number, knownVersion?: number) {
  const known = Math.max(seenVersions.get(key) ?? 0, knownVersion ?? 0)
  if (version <= known) return false
  seenVersions.set(key, version)
  return true
}

export type NftEffect = { type: "nft"; id: string; previousPriceEth?: string; priceEth: string; available: number }
export type OrderEffect = { type: "order"; id: string; status: Order["status"] }

export function applyNftEvent(queryClient: QueryClient, event: NftUpdatedEvent): NftEffect | null {
  const cached = queryClient.getQueryData<Nft>(qk.nfts.detail(event.id))
  if (!isNewer(`nft:${event.id}`, event.version, cached?.version)) return null

  const merge = <T extends Nft>(nft: T): T => (nft.id === event.id ? { ...nft, priceEth: event.priceEth, available: event.available, version: event.version } : nft)

  queryClient.setQueryData<Nft>(qk.nfts.detail(event.id), (old) => (old ? merge(old) : old))
  queryClient.setQueriesData<Paginated<Nft>>({ queryKey: ["nfts", "list"] }, (old) => (old ? { ...old, items: old.items.map(merge) } : old))
  queryClient.setQueryData<Facets>(qk.nfts.facets, (old) => (old ? { ...old, featured: merge(old.featured) } : old))
  // Carrinhos (de qualquer usuário em cache) mostram o preço/estoque novo imediatamente.
  queryClient.setQueriesData<Cart>({ queryKey: ["user"], predicate: (query) => query.queryKey[2] === "cart" }, (old) =>
    old ? { ...old, items: old.items.map((item) => ({ ...item, nft: merge(item.nft) })) } : old,
  )
  // Cotações ficam obsoletas: refaz para o total refletir o preço novo.
  void queryClient.invalidateQueries({ queryKey: ["user"], predicate: (query) => query.queryKey[2] === "quote" })

  return { type: "nft", id: event.id, previousPriceEth: cached?.priceEth, priceEth: event.priceEth, available: event.available }
}

export function applyOrderEvent(queryClient: QueryClient, event: OrderUpdatedEvent): OrderEffect | null {
  const detailQueries = queryClient.getQueriesData<Order>({ queryKey: ["user"], predicate: (query) => query.queryKey[2] === "orders" && query.queryKey[3] === event.id })
  const knownVersion = detailQueries.reduce((max, [, order]) => Math.max(max, order?.version ?? 0), 0)
  if (!isNewer(`order:${event.id}`, event.version, knownVersion)) return null

  const patch = (order: Order): Order => (order.id === event.id ? { ...order, status: event.status, version: event.version, transactionId: event.transactionId } : order)
  queryClient.setQueriesData<Order>({ queryKey: ["user"], predicate: (query) => query.queryKey[2] === "orders" && query.queryKey[3] === event.id }, (old) => (old ? patch(old) : old))
  queryClient.setQueriesData<{ items: Order[] }>({ queryKey: ["user"], predicate: (query) => query.queryKey[2] === "orders" && query.queryKey.length === 3 }, (old) => (old ? { items: old.items.map(patch) } : old))

  return { type: "order", id: event.id, status: event.status }
}

/** Depois de reconectar, descarta o que o socket possa ter perdido e relê tudo via REST. */
export function resync(queryClient: QueryClient) {
  seenVersions.clear()
  void queryClient.invalidateQueries()
}
