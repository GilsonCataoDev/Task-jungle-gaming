import { useState } from "react"
import { Catalog, MobileSearchBar } from "@/features/catalog/catalog"
import type { NftSearch } from "@/features/nfts/search"
import { Hero } from "./hero"
import { MintDiary, Promos } from "./editorial"

type Props = { search: NftSearch; onChange: (patch: Partial<NftSearch>, options?: { keepPage?: boolean }) => void; onReset: () => void }

/** A home inteira. Também serve de fundo para os modais de login, cadastro e confirmação. */
export function HomeContent(props: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  return (
    <>
      {/* Mobile (Figma): a busca vem antes do banner. O estado do painel de filtros fica aqui para os dois o usarem. */}
      <div className="page-shell pt-5 md:hidden">
        <MobileSearchBar search={props.search} onChange={props.onChange} onOpenFilters={() => setFiltersOpen(true)} className="mb-0" />
      </div>
      <Hero />
      <Catalog {...props} filtersOpen={filtersOpen} onFiltersOpenChange={setFiltersOpen} hideMobileSearch />
      <Promos />
      <MintDiary />
    </>
  )
}
