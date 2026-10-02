import type { NftListParams } from "@/types/domain"

/**
 * Toda query privada leva o userId na chave: trocar de usuário nunca reaproveita
 * cache do usuário anterior (isolamento de dados). Params entram na chave para que
 * respostas de buscas diferentes nunca se misturem.
 */
export const qk = {
  session: ["session"] as const,
  nfts: {
    all: ["nfts"] as const,
    list: (params: NftListParams) => ["nfts", "list", params] as const,
    detail: (id: string) => ["nfts", "detail", id] as const,
    facets: ["nfts", "facets"] as const,
  },
  favorites: (userId: string) => ["user", userId, "favorites"] as const,
  cart: (userId: string) => ["user", userId, "cart"] as const,
  quote: (userId: string, coupon: string | null, cartUpdatedAt: string) =>
    ["user", userId, "quote", coupon, cartUpdatedAt] as const,
  orders: {
    list: (userId: string) => ["user", userId, "orders"] as const,
    detail: (userId: string, id: string) => ["user", userId, "orders", id] as const,
  },
  profile: (userId: string) => ["user", userId, "profile"] as const,
  wallets: (userId: string) => ["user", userId, "wallets"] as const,
}
