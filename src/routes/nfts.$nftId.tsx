import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { ArrowLeft, Mail, Pencil, Search, ShoppingCart } from "lucide-react"
import { useState, type CSSProperties, type FormEvent, type HTMLAttributes } from "react"
import { Breadcrumb } from "@/components/breadcrumb"
import { FavoriteButton, FavoriteTextButton } from "@/components/favorite-button"
import { TextField } from "@/components/form-field"
import { LinkedinIcon, TwitterIcon } from "@/components/icons"
import { Modal } from "@/components/modal"
import { StarRating } from "@/components/star-rating"
import { Stepper } from "@/components/stepper"
import { Skeleton } from "@/components/ui/skeleton"
import { useAddToCart } from "@/features/cart/hooks"
import { nftDetailQuery } from "@/features/nfts/queries"
import { api, getApiError } from "@/lib/api"
import { formatDate, formatEth } from "@/lib/format"
import { nftImageUrl } from "@/lib/nft-images"
import { qk } from "@/lib/query-keys"
import { cn } from "@/lib/utils"
import { useRealtime } from "@/realtime/realtime-provider"
import { EDITIONS, type Edition, type NftDetail } from "@/types/domain"

export const Route = createFileRoute("/nfts/$nftId")({ component: NftDetailPage })

/** A "galeria": a mesma arte em quatro enquadramentos (visão geral e três detalhes). */
const VIEWS: { label: string; style: CSSProperties }[] = [
  { label: "Visão geral", style: { transform: "scale(1)" } },
  { label: "Detalhe do rosto", style: { transform: "scale(1.9)", transformOrigin: "50% 28%" } },
  { label: "Detalhe do traje", style: { transform: "scale(1.9)", transformOrigin: "50% 88%" } },
  { label: "Detalhe lateral", style: { transform: "scale(1.9)", transformOrigin: "18% 42%" } },
]

/** Miniaturas são decorativas (o botão já tem nome); a imagem principal leva texto alternativo. */
function Frame({ nft, view, className, informative, ...rest }: { nft: NftDetail; view: number; className?: string; informative?: boolean } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("overflow-hidden", className)} {...rest}>
      <img
        src={nftImageUrl(nft.image)}
        alt={informative ? `Arte do NFT ${nft.name} (${VIEWS[view].label.toLowerCase()})` : ""}
        width={234}
        height={234}
        className="size-full object-cover transition-transform duration-300"
        style={VIEWS[view].style}
      />
    </div>
  )
}

function NftDetailPage() {
  const { nftId } = Route.useParams()
  const navigate = useNavigate()
  const { lastEffect } = useRealtime()
  const { data: nft, error, isPending, refetch } = useQuery(nftDetailQuery(nftId))
  const add = useAddToCart()
  const [view, setView] = useState(0)
  const [zoom, setZoom] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [edition, setEdition] = useState<Edition | null>(null)
  const [tab, setTab] = useState<"details" | "reviews">("details")
  const [editing, setEditing] = useState(false)
  const [added, setAdded] = useState(false)

  if (isPending) return <div className="page-shell py-10" aria-busy="true" aria-label="Carregando NFT"><Skeleton className="h-[34rem] rounded-md bg-card" /></div>
  if (error || !nft) {
    const { code, message } = getApiError(error)
    return (
      <div className="page-shell py-16 text-center" role="alert">
        <p className="text-lg">{code === "not_found" ? "NFT não encontrado." : message}</p>
        {code !== "not_found" && <button type="button" onClick={() => void refetch()} className="mt-3 font-bold text-primary underline">Tentar novamente</button>}
        <div className="mt-4"><Link to="/mercado" className="font-bold text-primary underline">Voltar ao mercado</Link></div>
      </div>
    )
  }

  const soldOut = nft.available <= 0
  const selectedEdition = edition ?? nft.edition
  const liveChange = lastEffect?.type === "nft" && lastEffect.id === nft.id ? lastEffect : null
  const shareUrl = typeof window === "undefined" ? "" : window.location.href

  function buy() {
    add.mutate({ nft: nft!, quantity, edition: selectedEdition }, { onSuccess: () => void navigate({ to: "/carrinho" }) })
  }
  function addOnly() {
    add.mutate({ nft: nft!, quantity, edition: selectedEdition }, { onSuccess: () => setAdded(true) })
  }

  const meta = (
    <dl className="space-y-3 text-tan">
      <div><dt className="inline">ID do token: </dt><dd className="inline">{nft.tokenId}</dd></div>
      <div><dt className="inline">Coleção: </dt><dd className="inline">{nft.collection}</dd></div>
      <div><dt className="inline">Atributos: </dt><dd className="inline">{nft.attributes.join(", ")}</dd></div>
    </dl>
  )

  const editionChips = (
    <fieldset>
      <legend className="font-bold">Edição:</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {EDITIONS.map((item) => (
          <label key={item} className={cn("cursor-pointer rounded-full border px-3 py-1 text-xs has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring", selectedEdition === item ? "border-primary text-primary" : "border-input text-tan hover:border-primary")}>
            <input type="radio" name="edicao" value={item} checked={selectedEdition === item} onChange={() => setEdition(item)} className="sr-only" />
            {item}
          </label>
        ))}
      </div>
    </fieldset>
  )

  return (
    <div className="pb-28 md:pb-0">
      <div className="page-shell hidden pt-8 md:block"><Breadcrumb items={[{ label: "Início", to: "/" }, { label: "Mercado", to: "/mercado" }]} /></div>

      <div className="page-shell grid gap-8 pt-4 md:grid-cols-2 md:pt-4 lg:grid-cols-[auto_minmax(0,22rem)_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[auto_minmax(0,27.75rem)_minmax(0,1fr)]">
        {/* Galeria: no desktop largo as miniaturas ficam à esquerda; no tablet, abaixo da imagem. */}
        <div className="flex flex-col gap-4 lg:contents">
          <div role="radiogroup" aria-label="Galeria" className="hidden gap-3 md:order-2 md:flex lg:order-1 lg:flex-col lg:gap-4">
            {VIEWS.map((item, index) => (
              <button key={item.label} type="button" role="radio" aria-checked={view === index} aria-label={item.label} onClick={() => setView(index)} className={cn("size-[72px] overflow-hidden rounded-2xl border xl:size-[100px]", view === index ? "border-primary" : "border-transparent hover:border-primary/60")}>
                <Frame nft={nft} view={index} className="size-full" />
              </button>
            ))}
          </div>

          {/* Imagem principal */}
          <div className="relative md:order-1 md:bg-card md:p-5 md:pb-5 lg:order-2">
            <div className="absolute left-3 top-3 z-10 flex md:hidden">
              <Link to="/mercado" aria-label="Voltar ao mercado" className="grid size-10 place-items-center rounded-full bg-card/90 text-primary"><ArrowLeft className="size-5" aria-hidden /></Link>
            </div>
            <FavoriteButton nft={nft} className="absolute right-3 top-3 z-10 size-10 md:hidden" />
            <div className="relative">
              <Frame nft={nft} view={view} informative className="aspect-square rounded-3xl md:rounded-2xl" />
              <button type="button" onClick={() => setZoom(true)} aria-label="Ampliar imagem" className="absolute right-2 top-2 hidden size-10 place-items-center rounded-full bg-card text-primary hover:bg-primary hover:text-primary-foreground md:grid">
                <Search className="size-5" aria-hidden />
              </button>
            </div>
          </div>
        </div>

        {/* Informações */}
        <section aria-labelledby="nft-titulo" className="relative z-10 -mt-8 rounded-t-3xl bg-card p-5 md:mt-0 md:rounded-none md:bg-transparent md:p-0 lg:order-3">
          <div className="flex items-start justify-between gap-3">
            <h1 id="nft-titulo" className="text-xl md:text-2xl">{nft.name}</h1>
            <span className="inline-flex items-center gap-1 rounded-full border border-primary px-2 py-0.5 text-xs text-primary md:hidden">★ {nft.rating.toFixed(1)}<span className="text-tan">({nft.reviewCount})</span></span>
          </div>
          <div className="mt-2 hidden flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line pb-2 md:flex">
            <p className="whitespace-nowrap text-2xl font-bold text-primary">{formatEth(nft.priceEth)}</p>
            <p className="flex items-center gap-2 text-sm"><StarRating rating={nft.rating} /> {nft.reviewCount} avaliações de colecionadores</p>
          </div>
          {liveChange && liveChange.previousPriceEth && liveChange.previousPriceEth !== liveChange.priceEth && (
            <p role="status" className="mt-2 text-sm text-primary">Preço atualizado ao vivo (era {formatEth(liveChange.previousPriceEth)}).</p>
          )}

          <h2 className="mt-4 font-bold">Sobre este NFT:</h2>
          <p className="mt-1 leading-6 text-tan">{nft.description}</p>
          {nft.canEdit && !editing && <button type="button" onClick={() => setEditing(true)} className="mt-2 inline-flex items-center gap-2 text-sm text-primary underline"><Pencil className="size-4" aria-hidden /> Editar informações</button>}
          {nft.canEdit && editing && <EditForm nft={nft} onDone={() => setEditing(false)} />}

          <div className="mt-4">{editionChips}</div>

          {/* Compra (desktop) */}
          <div className="mt-5 hidden flex-wrap items-center justify-between gap-4 md:flex">
            <Stepper value={quantity} onChange={setQuantity} min={1} max={Math.max(1, nft.available)} label="Quantidade de edições" />
            <div className="flex items-center gap-3">
              <button type="button" onClick={buy} disabled={soldOut || add.isPending} className="h-10 rounded-sm bg-primary px-6 text-sm font-bold uppercase text-primary-foreground hover:bg-primary/85 disabled:opacity-50">
                {soldOut ? "Esgotado" : add.isPending ? "Adicionando..." : "Comprar"}
              </button>
              <FavoriteTextButton nft={nft} />
            </div>
          </div>
          {add.isError && <p role="alert" className="mt-3 text-sm text-destructive">{getApiError(add.error).message}</p>}

          <div className="mt-5">{meta}</div>
          <div className="mt-4 hidden items-center gap-3 md:flex">
            <span className="font-bold">Compartilhar este NFT:</span>
            <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" aria-label="Compartilhar no LinkedIn"><LinkedinIcon className="size-5" /></a>
            <a href={`mailto:?subject=${encodeURIComponent(nft.name)}&body=${encodeURIComponent(shareUrl)}`} aria-label="Compartilhar por e-mail"><Mail className="size-5" aria-hidden /></a>
            <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(nft.name)}`} target="_blank" rel="noopener noreferrer" aria-label="Compartilhar no Twitter"><TwitterIcon className="size-5" /></a>
          </div>
        </section>
      </div>

      {/* Abas (desktop) */}
      <section aria-label="Mais sobre o NFT" className="page-shell mt-12 hidden md:block">
        <div role="tablist" aria-label="Seções do NFT" className="flex gap-8 border-b border-primary/70">
          {([["details", "Detalhes do NFT"], ["reviews", `Avaliações de colecionadores (${nft.reviewCount})`]] as const).map(([id, label]) => (
            <button key={id} type="button" role="tab" id={`tab-${id}`} aria-selected={tab === id} aria-controls={`panel-${id}`} onClick={() => setTab(id)} className={cn("-mb-px border-b-2 pb-2 text-base", tab === id ? "border-primary font-bold text-primary" : "border-transparent hover:text-primary")}>
              {label}
            </button>
          ))}
        </div>
        {tab === "details" ? (
          <div role="tabpanel" id="panel-details" aria-labelledby="tab-details" className="mt-4 space-y-3 leading-6 text-tan">
            <p>{nft.name} é uma obra digital {nft.edition} finalizada à mão da coleção {nft.collection}. Cada atributo fica armazenado nos metadados do token e verificado na {nft.network}. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.</p>
            <p>A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. {nft.creator} recebe 5% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.</p>
            <p><strong className="block text-foreground">Rede:</strong>Cunhado na {nft.network} com procedência imutável e metadados armazenados no IPFS.</p>
            <p><strong className="block text-foreground">Contrato:</strong>Padrão ERC-721, verificado, com endereço público no explorador da rede.</p>
            <p><strong className="block text-foreground">Direitos autorais do criador:</strong>5% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.</p>
          </div>
        ) : (
          <ul role="tabpanel" id="panel-reviews" aria-labelledby="tab-reviews" className="mt-4 space-y-4">
            {nft.reviews.map((review) => (
              <li key={review.author} className="bg-card p-4">
                <p className="flex items-center gap-3"><strong>{review.author}</strong> <StarRating rating={review.rating} /> <span className="text-xs text-tan">{formatDate(review.date)}</span></p>
                <p className="mt-2 text-sm leading-6 text-tan">{review.text}</p>
              </li>
            ))}
            <li className="text-xs text-tan">Mostrando as {nft.reviews.length} avaliações mais recentes de {nft.reviewCount}.</li>
          </ul>
        )}
      </section>

      {/* Barra de compra fixa (mobile) */}
      <div className="fixed inset-x-0 bottom-0 z-40 rounded-t-3xl bg-card px-5 pb-5 pt-4 shadow-[0_-8px_24px_rgba(0,0,0,0.45)] md:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3"><span className="text-sm text-tan">Qtd.</span><Stepper value={quantity} onChange={setQuantity} min={1} max={Math.max(1, nft.available)} label="Quantidade de edições" size="sm" /></div>
          <p className="text-xl font-bold text-primary">{formatEth(nft.priceEth)}</p>
        </div>
        <div className="mt-4 flex gap-3">
          <button type="button" onClick={buy} disabled={soldOut || add.isPending} className="h-12 flex-1 rounded-xl bg-gradient-to-r from-[#ce874a] to-[#b77843] text-base font-bold text-primary-foreground disabled:opacity-50">
            {soldOut ? "Esgotado" : add.isPending ? "Adicionando..." : "Comprar NFT"}
          </button>
          <button type="button" onClick={addOnly} disabled={soldOut || add.isPending} aria-label="Adicionar ao carrinho" className="grid size-12 place-items-center rounded-full bg-background text-primary disabled:opacity-50">
            <ShoppingCart className="size-5" aria-hidden />
          </button>
        </div>
        {added && <p role="status" className="mt-2 text-center text-sm text-primary">Adicionado ao carrinho.</p>}
      </div>

      {zoom && (
        <Modal label="Imagem ampliada" onClose={() => setZoom(false)} className="md:w-[40rem]">
          <Frame nft={nft} view={view} informative className="aspect-square" />
        </Modal>
      )}
    </div>
  )
}

function EditForm({ nft, onDone }: { nft: NftDetail; onDone: () => void }) {
  const queryClient = useQueryClient()
  const save = useMutation({
    mutationFn: async (input: { name: string; description: string }) => (await api.patch<NftDetail>(`/nfts/${nft.id}`, input)).data,
    onSuccess: (updated) => {
      queryClient.setQueryData<NftDetail>(qk.nfts.detail(nft.id), (old) => (old ? { ...old, ...updated, reviews: old.reviews } : old))
      void queryClient.invalidateQueries({ queryKey: ["nfts", "list"] })
      onDone()
    },
  })
  const fields = save.error ? getApiError(save.error).fields : undefined

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    save.mutate({ name: String(form.get("name")), description: String(form.get("description")) })
  }

  return (
    <form onSubmit={submit} noValidate className="mt-3 space-y-3 bg-card p-4" aria-label="Editar NFT">
      <TextField id="name" label="Nome" defaultValue={nft.name} error={fields?.name} />
      <TextField id="description" label="Descrição" defaultValue={nft.description} error={fields?.description} />
      {save.isError && !fields && <p role="alert" className="text-sm text-destructive">{getApiError(save.error).message}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={save.isPending} className="h-10 rounded-sm bg-primary px-5 font-bold text-primary-foreground hover:bg-primary/85 disabled:opacity-60">{save.isPending ? "Salvando..." : "Salvar"}</button>
        <button type="button" onClick={onDone} className="h-10 rounded-sm border border-primary px-5 text-primary hover:bg-primary/10">Cancelar</button>
      </div>
    </form>
  )
}
