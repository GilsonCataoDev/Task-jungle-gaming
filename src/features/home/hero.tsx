import { ArrowRight } from "lucide-react"
import { useState } from "react"
import { NftImage } from "@/components/nft-image"
import { cn } from "@/lib/utils"
import type { NftImage as NftImageKey } from "@/types/domain"

type Slide = { title: string; mobileTitle: string; text: string; mobileText: string; image: NftImageKey; alt: string; second: NftImageKey }

const SLIDES: Slide[] = [
  {
    title: "Seja dono do futuro da arte digital",
    mobileTitle: "Seja dono da cultura digital",
    text: "Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.",
    mobileText: "Descubra NFTs selecionados de criadores do mundo todo.",
    image: "emerald-ape",
    second: "violet-nomad",
    alt: "Emerald Ape #042",
  },
  {
    title: "Colecione edições raras de verdade",
    mobileTitle: "Edições raras, direto do criador",
    text: "Explore coleções verificadas, com procedência registrada na rede e edições limitadas assinadas pelos próprios artistas.",
    mobileText: "Coleções verificadas e edições limitadas.",
    image: "ivory-baron",
    second: "emerald-ape",
    alt: "Ivory Baron #088",
  },
  {
    title: "Apoie quem cria a cultura da internet",
    mobileTitle: "Apoie quem cria a cultura",
    text: "Cada compra passa direto ao criador, com direitos autorais de 5% nas vendas secundárias pagos automaticamente.",
    mobileText: "Cada compra vai direto ao criador.",
    image: "golden-beat",
    second: "ivory-baron",
    alt: "Golden Beat #207",
  },
]

/** Carrossel do herói. Sem rotação automática (conteúdo que se mexe sozinho atrapalha a leitura). */
export function Hero() {
  const [index, setIndex] = useState(0)
  const slide = SLIDES[index]

  const dots = (
    <div role="group" aria-label="Escolher destaque" className="flex items-center">
      {SLIDES.map((_, position) => (
        <button
          key={position}
          type="button"
          aria-label={`Destaque ${position + 1} de ${SLIDES.length}`}
          aria-current={position === index ? "true" : undefined}
          onClick={() => setIndex(position)}
          className="group grid size-6 place-items-center"
        >
          <span className={cn("size-2.5 rounded-full transition-opacity", position === index ? "bg-primary" : "bg-primary/45 group-hover:bg-primary/70")} />
        </button>
      ))}
    </div>
  )

  return (
    <section aria-roledescription="carrossel" aria-label="Destaques" className="page-shell pt-8 md:pt-6">
      {/* Mobile: cartão compacto com duas artes sobrepostas. */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#5b3a22] to-card p-5 md:hidden">
        <div className="max-w-[55%]">
          <p className="text-xs">Bem-vindo à Kurio</p>
          <h1 className="mt-2 text-lg font-bold uppercase leading-snug">{slide.mobileTitle}</h1>
          <p className="mt-2 text-xs leading-5 text-tan">{slide.mobileText}</p>
          <a href="#mercado" className="mt-3 inline-flex items-center gap-1 text-sm font-bold uppercase text-primary">Explorar <ArrowRight className="size-4" aria-hidden /></a>
        </div>
        <div aria-hidden className="absolute right-4 top-4 w-[38%]">
          <NftImage image={slide.image} name={slide.alt} className="rounded-xl" />
          <NftImage image={slide.second} name="destaque" className="-ml-6 -mt-10 w-1/2 rounded-xl border-2 border-card" />
        </div>
        <div className="mt-6 flex justify-center">{dots}</div>
      </div>

      {/* Desktop e tablet. */}
      <div className="hidden items-center gap-10 md:grid md:grid-cols-[1fr_minmax(0,20rem)] lg:grid-cols-[1fr_28rem]">
        <div className="relative py-8 lg:min-h-[26rem] lg:pl-10">
          <p className="text-sm">Bem-vindo à Kurio</p>
          <h1 className="hero-title mt-3 max-w-[34rem]" style={{ textWrap: "balance" }}>{slide.title}</h1>
          <p className="mt-2 max-w-[35rem] text-sm leading-6 text-tan">{slide.text}</p>
          <a href="#mercado" className="mt-8 inline-flex h-10 items-center rounded-sm bg-primary px-6 text-sm font-bold uppercase text-primary-foreground hover:bg-primary/85">Explorar</a>
          <div className="absolute bottom-4 left-1/2 hidden -translate-x-1/2 lg:block">{dots}</div>
          <div className="mt-8 lg:hidden">{dots}</div>
        </div>
        <NftImage image={slide.image} name={slide.alt} className="aspect-square rounded-[2rem]" priority />
      </div>
    </section>
  )
}
