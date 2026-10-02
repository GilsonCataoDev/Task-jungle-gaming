import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, Trash2 } from "lucide-react"
import type { FormEvent } from "react"
import { Breadcrumb } from "@/components/breadcrumb"
import { NftImage } from "@/components/nft-image"
import { Stepper } from "@/components/stepper"
import { Skeleton } from "@/components/ui/skeleton"
import { useCart, useRemoveCartItem, useUpdateCartItem } from "@/features/cart/hooks"
import { useCoupon } from "@/features/checkout/coupon"
import { useQuote } from "@/features/checkout/hooks"
import { Totals } from "@/features/checkout/totals"
import { nftListQuery } from "@/features/nfts/queries"
import { getApiError } from "@/lib/api"
import { maxQuantity } from "@/types/domain"
import { formatEth } from "@/lib/format"
import { mulEth } from "@/lib/money"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/carrinho")({ component: CartPage })

function CartPage() {
  const cart = useCart()
  const update = useUpdateCartItem()
  const remove = useRemoveCartItem()
  const [coupon, setCoupon] = useCoupon()
  const quote = useQuote(coupon)
  const items = cart.data?.items ?? []
  const mutationError = update.error ?? remove.error
  const unavailable = new Set(quote.data?.issues.flatMap((issue) => (issue.code === "unavailable" ? [issue.nftId] : [])))
  const invalidCoupon = quote.data?.issues.find((issue) => issue.code === "invalid_coupon")
  const blocked = unavailable.size > 0 || !!invalidCoupon || !quote.data
  const suggestions = useQuery(nftListQuery({ tab: "trending", sort: "recent", page: 1, pageSize: 5 }))

  function applyCoupon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCoupon(String(new FormData(event.currentTarget).get("coupon") ?? "").trim().toUpperCase() || null)
  }

  const promo = (
    <form onSubmit={applyCoupon} aria-label="Código promocional" className="flex">
      <label htmlFor="coupon" className="sr-only">Código promocional</label>
      <input id="coupon" name="coupon" key={coupon ?? ""} defaultValue={coupon ?? ""} placeholder="Digite o código promocional..." aria-invalid={!!invalidCoupon} aria-describedby={invalidCoupon ? "cupom-erro" : undefined} className="h-10 min-w-0 flex-1 rounded-l-sm border border-primary bg-background px-3 text-xs uppercase text-foreground outline-none placeholder:normal-case placeholder:text-tan/70 focus-visible:ring-2 focus-visible:ring-primary max-md:rounded-full max-md:border-0 max-md:bg-background" />
      <button type="submit" className="h-10 rounded-r-sm bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary/85 max-md:-ml-10 max-md:rounded-full max-md:px-5">Aplicar</button>
    </form>
  )

  return (
    <div className="page-shell pb-8 pt-6 md:pt-8">
      <div className="max-md:hidden"><Breadcrumb items={[{ label: "Início", to: "/" }, { label: "Mercado", to: "/mercado" }, { label: "Carrinho" }]} /></div>
      {/* Barra superior do mobile */}
      <div className="relative mb-5 flex items-center justify-center md:hidden">
        <Link to="/mercado" aria-label="Voltar ao mercado" className="absolute left-0 grid size-10 place-items-center rounded-full bg-card text-primary"><ArrowLeft className="size-5" aria-hidden /></Link>
        <h1 className="text-lg">Carrinho de NFTs</h1>
      </div>
      <h1 className="sr-only max-md:hidden">Carrinho de NFTs</h1>

      {cart.isPending && <div className="mt-6 space-y-3" aria-busy="true" aria-label="Carregando carrinho">{[0, 1].map((i) => <Skeleton key={i} className="h-24 rounded-md bg-card" />)}</div>}
      {cart.isError && !cart.data && (
        <div role="alert" className="mt-6 bg-card p-8 text-center"><p>{getApiError(cart.error).message}</p><button type="button" onClick={() => void cart.refetch()} className="mt-3 font-bold text-primary underline">Tentar novamente</button></div>
      )}
      {cart.data && items.length === 0 && (
        <div className="mt-6 bg-card p-10 text-center">
          <h2 className="text-2xl">Seu carrinho está vazio</h2>
          <p className="mt-2 text-tan">Escolha NFTs no mercado para começar a sua coleção.</p>
          <Link to="/mercado" className="mt-6 inline-flex h-10 items-center rounded-sm bg-primary px-6 font-bold text-primary-foreground hover:bg-primary/85">Explorar NFTs</Link>
        </div>
      )}
      {mutationError && <p role="alert" className="mt-4 rounded-sm border border-destructive/60 p-3 text-sm text-destructive">{getApiError(mutationError).message} A alteração foi desfeita.</p>}

      {items.length > 0 && (
        <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_21.5rem] lg:gap-14">
          <section aria-label="Itens do carrinho">
            <div aria-hidden className="mb-2 hidden grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_2rem] gap-4 px-2 text-base font-bold md:grid">
              <span>NFTs</span><span>Preço</span><span>Edições</span><span>Total</span><span />
            </div>
            <ul className="space-y-3">
              {items.map(({ nft, quantity, edition }) => (
                <li key={nft.id} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 bg-card p-2 md:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_2rem] md:p-1.5 md:pr-3">
                  <div className="flex items-center gap-3 max-md:contents">
                    <NftImage image={nft.image} name={nft.name} className="size-[70px] shrink-0 rounded-lg max-md:size-24 max-md:row-span-3" />
                    <div className="min-w-0">
                      <h2 className="truncate text-base"><Link to="/nfts/$nftId" params={{ nftId: nft.id }} className="hover:text-primary">{nft.name}</Link></h2>
                      <p className="text-xs text-tan max-md:hidden">ID do token: {nft.tokenId}</p>
                      <p className="text-xs text-tan md:hidden">Edição: {edition}</p>
                      {unavailable.has(nft.id) && <p role="alert" className="mt-1 text-xs text-destructive">Só há {maxQuantity(nft, edition)} disponível(is) na edição {edition}. Ajuste a quantidade.</p>}
                    </div>
                  </div>
                  <p className="font-bold text-primary md:hidden">{formatEth(nft.priceEth, 2)}</p>
                  <p className="max-md:hidden">{formatEth(nft.priceEth, 2)}</p>
                  <div className="flex items-center justify-between gap-3 md:contents">
                    <Stepper value={quantity} onChange={(next) => update.mutate({ nftId: nft.id, quantity: next })} min={0} max={maxQuantity(nft, edition)} size="sm" label={`Quantidade de ${nft.name}`} />
                    <p className="font-bold text-primary max-md:hidden">{formatEth(mulEth(nft.priceEth, quantity), 2)}</p>
                    <button type="button" onClick={() => remove.mutate(nft.id)} aria-label={`Remover ${nft.name}`} className="grid size-8 place-items-center text-tan hover:text-destructive"><Trash2 className="size-5" aria-hidden /></button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <aside aria-labelledby="resumo" className="h-fit max-md:-mx-5 max-md:rounded-t-3xl max-md:bg-card max-md:p-5">
            <h2 id="resumo" className="border-b border-line pb-3 text-lg max-md:hidden">Resumo da carteira</h2>
            <div className="mt-4">
              <p className="mb-2 text-sm font-bold max-md:hidden">Código promocional</p>
              {promo}
              {invalidCoupon && <p id="cupom-erro" role="alert" className="mt-2 text-sm text-destructive">{invalidCoupon.message}</p>}
              {quote.data?.coupon && <p role="status" className="mt-2 text-sm text-primary">Cupom {quote.data.coupon} aplicado.</p>}
            </div>
            <div className="mt-5">
              {quote.data ? <Totals {...quote.data} busy={quote.isFetching} /> : <Skeleton className="h-36 bg-card" />}
            </div>
            <Link
              to="/pagamento"
              aria-disabled={blocked}
              tabIndex={blocked ? -1 : undefined}
              onClick={(event) => blocked && event.preventDefault()}
              className={cn("mt-6 flex h-10 w-full items-center justify-center rounded-sm bg-primary text-base font-bold text-primary-foreground hover:bg-primary/85 max-md:h-12 max-md:rounded-xl max-md:bg-gradient-to-r max-md:from-[#ce874a] max-md:to-[#b77843]", blocked && "pointer-events-none opacity-50")}
            >
              Conectar e finalizar
            </Link>
            <p className="mt-4 text-center max-md:hidden"><Link to="/mercado" className="text-primary hover:underline">Continuar explorando</Link></p>
          </aside>
        </div>
      )}

      {items.length > 0 && (
        <section aria-labelledby="tambem-viram" className="mt-16 max-md:hidden">
          <h2 id="tambem-viram" className="border-b border-line pb-3 text-lg font-bold text-primary">Colecionadores também viram</h2>
          <ul className="mt-6 grid grid-cols-5 gap-6">
            {suggestions.data?.items.filter((nft) => !items.some((item) => item.nft.id === nft.id)).slice(0, 5).map((nft) => (
              <li key={nft.id} className="bg-card">
                <Link to="/nfts/$nftId" params={{ nftId: nft.id }} className="block px-2 pt-2" aria-label={`Ver ${nft.name}`}><NftImage image={nft.image} name={nft.name} className="aspect-[4/5] rounded-xl" /></Link>
                <p className="px-0 pt-2 text-sm">{nft.name}</p>
                <p className="font-bold text-primary">{formatEth(nft.priceEth, 2)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
