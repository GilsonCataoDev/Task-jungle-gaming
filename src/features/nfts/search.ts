import { CATEGORIES, NETWORKS, type EthString, type NftListParams, type NftSort, type NftTab } from "@/types/domain"
import { isEthString } from "@/lib/money"

export const PAGE_SIZE = 9
const SORTS: NftSort[] = ["recent", "price-asc", "price-desc", "name"]
const TABS: NftTab[] = ["all", "new", "trending"]

export const SORT_LABELS: Record<NftSort, string> = { recent: "Listados recentemente", "price-asc": "Menor preço", "price-desc": "Maior preço", name: "Nome (A–Z)" }
export const TAB_LABELS: Record<NftTab, string> = { all: "Todos os NFTs", new: "Novos lançamentos", trending: "Em alta" }

/**
 * Os filtros vivem na URL (search params do TanStack Router): voltar/avançar no histórico,
 * recarregar e compartilhar o link restauram exatamente a mesma listagem.
 */
export type NftSearch = Partial<Omit<NftListParams, "pageSize">>

/** O router converte "0.5" ou "123" digitados na URL em number: aceitamos os dois formatos. */
const asText = (value: unknown) => (typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "")
const text = (value: unknown) => asText(value) || undefined
const eth = (value: unknown): EthString | undefined => (isEthString(asText(value)) ? asText(value) : undefined)

export function validateNftSearch(raw: Record<string, unknown>): NftSearch {
  const category = CATEGORIES.find((item) => item === raw.category)
  const network = NETWORKS.find((item) => item === raw.network)
  const tab = TABS.find((item) => item === raw.tab)
  const sort = SORTS.find((item) => item === raw.sort)
  const page = Number(raw.page)
  return {
    search: text(raw.search),
    category,
    network,
    minPrice: eth(raw.minPrice),
    maxPrice: eth(raw.maxPrice),
    tab: tab && tab !== "all" ? tab : undefined,
    sort: sort && sort !== "recent" ? sort : undefined,
    page: Number.isInteger(page) && page > 1 ? page : undefined,
  }
}

export function toListParams(search: NftSearch): NftListParams {
  return { ...search, tab: search.tab ?? "all", sort: search.sort ?? "recent", page: search.page ?? 1, pageSize: PAGE_SIZE }
}
