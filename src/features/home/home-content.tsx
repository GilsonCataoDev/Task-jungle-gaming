import { Catalog } from "@/features/catalog/catalog"
import type { NftSearch } from "@/features/nfts/search"
import { Hero } from "./hero"
import { MintDiary, Promos } from "./editorial"

type Props = { search: NftSearch; onChange: (patch: Partial<NftSearch>, options?: { keepPage?: boolean }) => void; onReset: () => void }

/** A home inteira. Também serve de fundo para os modais de login, cadastro e confirmação. */
export function HomeContent(props: Props) {
  return (
    <>
      <Hero />
      <Catalog {...props} />
      <Promos />
      <MintDiary />
    </>
  )
}
