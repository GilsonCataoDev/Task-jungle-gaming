import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { NftImage } from "@/components/nft-image"
import type { NftImage as NftImageKey } from "@/types/domain"

type Promo = { title: string; text: string; image: NftImageKey; alt: string; search: { tab?: "new" | "trending"; category?: "Arte digital" } }

const PROMOS: Promo[] = [
  { title: "Lançamentos gênesis de edição limitada", text: "Colecione edições escassas diretamente dos criadores antes da revelação pública.", image: "emerald-ape", alt: "Emerald Ape", search: { tab: "new" } },
  { title: "Arte digital selecionada e muito mais", text: "Explore novos artistas, coleções verificadas e obras digitais que definem a cultura da internet.", image: "ivory-baron", alt: "Ivory Baron", search: { category: "Arte digital" } },
]

/** Dois cartões promocionais (imagem + texto + "Explorar"). */
export function Promos() {
  return (
    <section aria-label="Destaques do mercado" className="page-shell grid gap-6 py-10 md:grid-cols-2">
      {PROMOS.map((promo) => (
        <article key={promo.title} className="flex overflow-hidden rounded-md bg-card">
          <NftImage image={promo.image} name={promo.alt} className="aspect-square w-[40%] shrink-0 rounded-r-none rounded-l-2xl object-cover md:w-[46%]" />
          <div className="flex flex-1 flex-col items-end justify-center gap-2 p-5 text-right">
            <h2 className="text-lg leading-snug">{promo.title}</h2>
            <p className="text-sm leading-6 text-tan">{promo.text}</p>
            <Link to="/mercado" search={promo.search} className="mt-1 inline-flex h-9 items-center gap-2 rounded-sm bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/85">
              Explorar <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </article>
      ))}
    </section>
  )
}

const POSTS: { date: string; read: string; title: string; text: string; image: NftImageKey }[] = [
  { date: "12 de setembro", read: "Leitura de 6 min", title: "Como funciona a propriedade de NFTs", text: "Aprenda a colecionar, negociar e verificar ativos digitais.", image: "ivory-baron" },
  { date: "13 de setembro", read: "Leitura de 2 min", title: "10 artistas digitais para acompanhar", text: "Conheça criadores que moldam a cultura digital.", image: "emerald-ape" },
  { date: "15 de setembro", read: "Leitura de 3 min", title: "Raridade, atributos e procedência", text: "Entenda raridade, procedência, direitos autorais e utilidade.", image: "violet-nomad" },
  { date: "15 de setembro", read: "Leitura de 2 min", title: "Como proteger sua carteira", text: "Proteja sua carteira, seus ativos e sua identidade.", image: "golden-beat" },
]

/** "Diário da Cunhagem": quatro chamadas editoriais (conteúdo estático de demonstração). */
export function MintDiary() {
  return (
    <section aria-labelledby="diario" className="page-shell py-12">
      <h2 id="diario" className="text-center text-3xl">Diário da Cunhagem</h2>
      <p className="mt-3 text-center text-tan">Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.</p>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {POSTS.map((post) => (
          <article key={post.title} className="overflow-hidden rounded-md bg-card">
            <NftImage image={post.image} name={post.title} className="aspect-[1.03] rounded-none" />
            <div className="p-4">
              <p className="text-xs text-tan">{post.date} <span aria-hidden>|</span> {post.read}</p>
              <h3 className="mt-2 text-lg leading-snug">{post.title}</h3>
              <p className="mt-2 text-xs leading-5 text-tan">{post.text}</p>
              <button type="button" disabled title="Em breve na demonstração" className="mt-3 cursor-not-allowed text-xs font-bold text-primary">Ler mais →</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
