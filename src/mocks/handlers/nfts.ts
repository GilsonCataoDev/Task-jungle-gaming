import { http, HttpResponse } from "msw"
import { compareEth } from "@/lib/money"
import { CATEGORIES, NETWORKS, type Category, type Facets, type Network, type Nft, type NftDetail, type NftSort, type NftTab, type Paginated } from "@/types/domain"
import { db } from "../db"
import { reviewsFor } from "../fixtures"
import { beginAuth, beginPublic, fail } from "../http"
import { publicNft, updateNft } from "../logic"

const SORTERS: Record<NftSort, (a: Nft, b: Nft) => number> = {
  recent: (a, b) => b.listedAt.localeCompare(a.listedAt),
  "price-asc": (a, b) => compareEth(a.priceEth, b.priceEth),
  "price-desc": (a, b) => compareEth(b.priceEth, a.priceEth),
  name: (a, b) => a.name.localeCompare(b.name),
}

const TAB_SIZE = 12

/** "Novos lançamentos" = os 12 listados mais recentemente; "Em alta" = os 12 com mais curtidas. */
function tabMembers(tab: NftTab): Set<string> | null {
  if (tab === "all") return null
  const ranked = [...db().nfts].sort(tab === "new" ? SORTERS.recent : (a, b) => b.likes - a.likes || a.id.localeCompare(b.id))
  return new Set(ranked.slice(0, TAB_SIZE).map((nft) => nft.id))
}

/** Usuário opcional: só serve para calcular `canEdit` sem exigir login no catálogo. */
function optionalUserName(request: Request) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "")
  const userId = token ? db().sessions[token]?.userId : undefined
  return db().users.find((user) => user.id === userId)?.name
}

export const nftHandlers = [
  http.get("/api/nfts", async ({ request }) => {
    const early = await beginPublic()
    if (early) return early

    const url = new URL(request.url)
    const search = url.searchParams.get("search")?.trim().toLowerCase() ?? ""
    const category = url.searchParams.get("category") as Category | null
    const network = url.searchParams.get("network") as Network | null
    const minPrice = url.searchParams.get("minPrice")
    const maxPrice = url.searchParams.get("maxPrice")
    const tabParam = url.searchParams.get("tab")
    const tab: NftTab = tabParam === "new" || tabParam === "trending" ? tabParam : "all"
    const sortParam = url.searchParams.get("sort") as NftSort
    const sort: NftSort = sortParam in SORTERS ? sortParam : "recent"
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1)
    const pageSize = Math.min(48, Math.max(1, Number(url.searchParams.get("pageSize")) || 9))

    const members = tabMembers(tab)
    const items = db()
      .nfts.filter((nft) => {
        if (members && !members.has(nft.id)) return false
        if (search && !`${nft.name} ${nft.collection} ${nft.creator} ${nft.tokenId}`.toLowerCase().includes(search)) return false
        if (category && (CATEGORIES as readonly string[]).includes(category) && nft.category !== category) return false
        if (network && (NETWORKS as readonly string[]).includes(network) && nft.network !== network) return false
        if (minPrice && compareEth(nft.priceEth, minPrice) < 0) return false
        if (maxPrice && compareEth(nft.priceEth, maxPrice) > 0) return false
        return true
      })
      .sort(SORTERS[sort])

    const userName = optionalUserName(request)
    const response: Paginated<Nft> = {
      items: items.slice((page - 1) * pageSize, page * pageSize).map((nft) => publicNft(nft, userName)),
      total: items.length,
      page,
      pageSize,
    }
    return HttpResponse.json(response)
  }),

  /** Contagens da barra lateral, limites de preço e o NFT em destaque. */
  http.get("/api/nfts/facets", async () => {
    const early = await beginPublic()
    if (early) return early
    const nfts = db().nfts
    const categories = Object.fromEntries(CATEGORIES.map((name) => [name, nfts.filter((nft) => nft.category === name).length])) as Facets["categories"]
    const networks = Object.fromEntries(NETWORKS.map((name) => [name, nfts.filter((nft) => nft.network === name).length])) as Facets["networks"]
    const byPrice = [...nfts].sort(SORTERS["price-asc"])
    const featured = [...nfts].filter((nft) => nft.available > 0).sort((a, b) => b.likes - a.likes || a.id.localeCompare(b.id))[0]
    const response: Facets = { categories, networks, priceRange: { min: byPrice[0].priceEth, max: byPrice[byPrice.length - 1].priceEth }, featured }
    return HttpResponse.json(response)
  }),

  http.get("/api/nfts/:id", async ({ params, request }) => {
    const early = await beginPublic()
    if (early) return early
    const nft = db().nfts.find((item) => item.id === params.id)
    if (!nft) return fail(404, "not_found", "NFT não encontrado.")
    const detail: NftDetail = { ...publicNft(nft, optionalUserName(request)), reviews: reviewsFor(nft) }
    return HttpResponse.json(detail)
  }),

  /** Edição: somente o criador do NFT pode alterar nome e descrição. */
  http.patch("/api/nfts/:id", async ({ params, request }) => {
    const ctx = await beginAuth(request, { mutation: true })
    if (ctx instanceof Response) return ctx

    const nft = db().nfts.find((item) => item.id === params.id)
    if (!nft) return fail(404, "not_found", "NFT não encontrado.")
    if (nft.creator !== ctx.user.name) return fail(403, "forbidden", "Você não pode editar este NFT.")

    const body = (await request.json()) as { name?: string; description?: string }
    const fields: Record<string, string> = {}
    if (body.name !== undefined && body.name.trim().length < 3) fields.name = "O nome precisa ter ao menos 3 caracteres."
    if (body.description !== undefined && body.description.trim().length < 10) fields.description = "A descrição precisa ter ao menos 10 caracteres."
    if (Object.keys(fields).length) return fail(422, "validation_error", "Corrija os campos destacados.", fields)

    const updated = updateNft(nft.id, { name: body.name?.trim(), description: body.description?.trim() })
    return HttpResponse.json(publicNft(updated!, ctx.user.name))
  }),
]
