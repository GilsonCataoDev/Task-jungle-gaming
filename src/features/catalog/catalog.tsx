import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Search, SlidersHorizontal } from "lucide-react"
import { useState, type FormEvent } from "react"
import { Modal } from "@/components/modal"
import { NftCard } from "@/components/nft-card"
import { NftImage } from "@/components/nft-image"
import { Pagination } from "@/components/pagination"
import { PriceRange } from "@/components/price-range"
import { Skeleton } from "@/components/ui/skeleton"
import { nftFacetsQuery, nftListQuery } from "@/features/nfts/queries"
import { PAGE_SIZE, SORT_LABELS, TAB_LABELS, toListParams, type NftSearch } from "@/features/nfts/search"
import { getApiError } from "@/lib/api"
import { formatEth } from "@/lib/format"
import { useMediaQuery } from "@/lib/use-media-query"
import { cn } from "@/lib/utils"
import { CATEGORIES, NETWORKS, type NftSort, type NftTab } from "@/types/domain"

type Change = (patch: Partial<NftSearch>, options?: { keepPage?: boolean }) => void
type Props = { search: NftSearch; onChange: Change; onReset: () => void }

/** Item de lista com contagem à direita ("Arte digital (33)"); laranja quando selecionado. */
function FacetList<T extends string>({ title, items, counts, selected, onSelect }: { title: string; items: readonly T[]; counts?: Record<T, number>; selected?: T; onSelect: (value: T | undefined) => void }) {
  return (
    <section aria-labelledby={`facet-${title}`}>
      <h2 id={`facet-${title}`} className="text-lg">{title}</h2>
      <ul className="mt-3 space-y-1">
        {items.map((item) => (
          <li key={item}>
            <button
              type="button"
              aria-pressed={selected === item}
              onClick={() => onSelect(selected === item ? undefined : item)}
              className={cn("flex w-full items-center justify-between rounded-sm px-3 py-1.5 text-left hover:text-primary", selected === item ? "font-bold text-primary" : "text-foreground/90")}
            >
              <span>{item}</span>
              <span className="text-tan">({counts?.[item] ?? 0})</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Barra lateral: coleções, faixa de preço, rede e NFT em destaque. No mobile vai para uma gaveta. */
function Sidebar({ search, onChange }: Pick<Props, "search" | "onChange">) {
  const { data: facets } = useQuery(nftFacetsQuery)
  return (
    <div className="space-y-6">
      <div className="space-y-8 bg-card p-5">
        <FacetList title="Coleções" items={CATEGORIES} counts={facets?.categories} selected={search.category} onSelect={(category) => onChange({ category })} />
        {facets && (
          // `key` recria o controle quando a faixa muda por fora (histórico, limpar filtros).
          <PriceRange key={`${search.minPrice ?? ""}-${search.maxPrice ?? ""}`} bounds={facets.priceRange} value={{ min: search.minPrice, max: search.maxPrice }} onApply={({ min, max }) => onChange({ minPrice: min, maxPrice: max })} />
        )}
        <FacetList title="Rede" items={NETWORKS} counts={facets?.networks} selected={search.network} onSelect={(network) => onChange({ network })} />
      </div>

      {facets && (
        <Link to="/nfts/$nftId" params={{ nftId: facets.featured.id }} className="block bg-card p-5 hover:bg-card/80">
          <p className="text-xl font-bold uppercase text-primary">NFT em destaque</p>
          <p className="mt-2 text-center text-lg font-bold uppercase">Oferta limitada</p>
          <NftImage image={facets.featured.image} name={facets.featured.name} className="mt-3 aspect-[5/6] rounded-xl" />
          <p className="mt-3 font-bold text-primary">{formatEth(facets.featured.priceEth)}</p>
        </Link>
      )}
    </div>
  )
}

function FiltersButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} aria-label="Abrir filtros" className={cn("grid size-11 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground hover:bg-primary/85", className)}>
      <SlidersHorizontal className="size-5" aria-hidden />
    </button>
  )
}

export function Catalog({ search, onChange, onReset }: Props) {
  const params = toListParams(search)
  const list = useQuery(nftListQuery(params))
  const [filtersOpen, setFiltersOpen] = useState(false)
  const isDesktop = useMediaQuery("(min-width: 1024px)", false)
  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / PAGE_SIZE)) : 1
  const hasFilters = !!(search.search || search.category || search.network || search.minPrice || search.maxPrice || (search.tab && search.tab !== "all"))

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onChange({ search: String(new FormData(event.currentTarget).get("search") ?? "").trim() || undefined })
  }

  return (
    <section id="mercado" aria-label="Mercado de NFTs" className="page-shell scroll-mt-4 py-8 md:py-12">
      {/* Mobile: busca + filtros no topo, como no Figma. */}
      <form role="search" onSubmit={submitSearch} className="mb-5 flex items-center gap-3 md:hidden">
        <label htmlFor="busca-mobile" className="sr-only">Explorar coleções</label>
        <div className="flex h-11 flex-1 items-center gap-2 rounded-md bg-card px-3">
          <Search className="size-5 text-tan" aria-hidden />
          <input key={search.search ?? ""} id="busca-mobile" name="search" type="search" defaultValue={search.search ?? ""} placeholder="Explorar coleções" className="min-w-0 flex-1 bg-transparent text-sm font-bold text-tan outline-none placeholder:text-tan" />
        </div>
        <FiltersButton onClick={() => setFiltersOpen(true)} />
      </form>

      <div className="grid gap-12 lg:grid-cols-[19.375rem_minmax(0,1fr)]">
        <aside aria-label="Filtros" className="hidden lg:block">{isDesktop && <Sidebar search={search} onChange={onChange} />}</aside>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <div role="group" aria-label="Listagem" className="flex flex-wrap gap-x-6 gap-y-2 text-sm md:text-base">
              {(Object.keys(TAB_LABELS) as NftTab[]).map((tab) => {
                const active = (search.tab ?? "all") === tab
                return (
                  <button key={tab} type="button" aria-pressed={active} onClick={() => onChange({ tab: tab === "all" ? undefined : tab })} className={cn("border-b-2 pb-1 hover:text-primary", active ? "border-primary font-bold text-primary" : "border-transparent")}>
                    {TAB_LABELS[tab]}
                  </button>
                )
              })}
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="ordenar" className="hidden text-sm md:inline">Ordenar por:</label>
              <select id="ordenar" aria-label="Ordenar por" value={search.sort ?? "recent"} onChange={(event) => onChange({ sort: event.target.value as NftSort })} className="h-9 rounded-sm border-0 bg-transparent text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary max-md:hidden">
                {(Object.keys(SORT_LABELS) as NftSort[]).map((sort) => <option key={sort} value={sort} className="bg-card">{SORT_LABELS[sort]}</option>)}
              </select>
              <FiltersButton onClick={() => setFiltersOpen(true)} className="hidden size-9 md:grid lg:hidden" />
            </div>
          </div>

          <p aria-live="polite" className="sr-only">{list.data ? `${list.data.total} resultados` : ""}</p>

          {list.isPending && (
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-8" aria-busy="true" aria-label="Carregando NFTs">
              {Array.from({ length: PAGE_SIZE }, (_, index) => <Skeleton key={index} className="aspect-[4/5] rounded-md bg-card" />)}
            </div>
          )}
          {list.isError && !list.data && (
            <div role="alert" className="mt-10 rounded-md bg-card p-8 text-center">
              <p>{getApiError(list.error).message}</p>
              <button type="button" onClick={() => void list.refetch()} className="mt-3 font-bold text-primary underline">Tentar novamente</button>
            </div>
          )}
          {list.data && list.data.items.length === 0 && (
            <div className="mt-10 rounded-md bg-card p-8 text-center">
              <p>Nenhum NFT encontrado.</p>
              {hasFilters && <button type="button" onClick={onReset} className="mt-3 font-bold text-primary underline">Limpar filtros</button>}
            </div>
          )}
          {list.data && list.data.items.length > 0 && (
            <>
              <div className={cn("mt-6 grid grid-cols-2 gap-x-4 gap-y-6 transition-opacity max-md:[&>*:nth-child(even)]:mt-8 md:grid-cols-3 md:gap-8", list.isPlaceholderData && "opacity-60")} aria-busy={list.isFetching}>
                {list.data.items.map((nft, index) => <NftCard key={nft.id} nft={nft} priority={index < 3} />)}
              </div>
              <Pagination page={params.page} totalPages={totalPages} onChange={(page) => onChange({ page }, { keepPage: true })} className="mt-10" />
            </>
          )}
        </div>
      </div>

      {filtersOpen && (
        <Modal label="Filtros" onClose={() => setFiltersOpen(false)} className="md:w-[24rem]">
          <div className="p-5 pt-12">
            <Sidebar search={search} onChange={onChange} />
            <div className="mt-6 flex flex-col gap-1.5">
              <label htmlFor="ordenar-gaveta" className="text-lg">Ordenar por</label>
              <select id="ordenar-gaveta" value={search.sort ?? "recent"} onChange={(event) => onChange({ sort: event.target.value as NftSort })} className="field-control">
                {(Object.keys(SORT_LABELS) as NftSort[]).map((sort) => <option key={sort} value={sort}>{SORT_LABELS[sort]}</option>)}
              </select>
            </div>
            <button type="button" onClick={() => setFiltersOpen(false)} className="mt-5 h-11 w-full rounded-md bg-primary font-bold text-primary-foreground hover:bg-primary/85">Ver resultados</button>
          </div>
        </Modal>
      )}
    </section>
  )
}
