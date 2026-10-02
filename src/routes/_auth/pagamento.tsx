import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import { useState, type ChangeEvent, type FormEvent } from "react"
import { Breadcrumb } from "@/components/breadcrumb"
import { EnsField, SelectField, TextAreaField, TextField } from "@/components/form-field"
import { NftImage } from "@/components/nft-image"
import { Skeleton } from "@/components/ui/skeleton"
import { useSession } from "@/features/auth/hooks"
import { useCart } from "@/features/cart/hooks"
import { setCoupon, useCoupon } from "@/features/checkout/coupon"
import { useCreateOrder, useIdempotencyKey, useQuote } from "@/features/checkout/hooks"
import { Totals } from "@/features/checkout/totals"
import { useWallets } from "@/features/wallets/hooks"
import { getApiError } from "@/lib/api"
import { formatEth, shortAddress } from "@/lib/format"
import { mulEth } from "@/lib/money"
import { validateCollectorFields, type FieldErrors } from "@/lib/validation"
import { cn } from "@/lib/utils"
import { NETWORKS, WALLET_TYPES, type Collector, type CreateOrderInput, type User, type Wallet, type WalletType } from "@/types/domain"

export const Route = createFileRoute("/_auth/pagamento")({ component: CheckoutPage })

/** Pré-preenche o "Perfil do colecionador" com os dados da carteira escolhida e da conta. */
function collectorFrom(wallet: Wallet | undefined, user: User | null): Collector {
  return {
    displayName: wallet?.displayName || user?.name || "",
    username: user?.username ?? "",
    network: wallet?.network ?? "Ethereum",
    profileName: wallet?.profileName ?? "",
    address: wallet?.address ?? "",
    secondaryRef: wallet?.secondaryRef ?? "",
    walletType: wallet?.type ?? "MetaMask",
    referralCode: wallet?.referralCode ?? "",
    email: wallet?.email || user?.email || "",
    ens: wallet?.ens || user?.ens || "",
    note: "",
  }
}

const PROVIDER_LETTER: Record<WalletType, string> = { WalletConnect: "W", MetaMask: "M", "Coinbase Wallet": "C" }
const walletLine = (wallet: Wallet) => (wallet.ens ? `${wallet.ens}.eth` : shortAddress(wallet.address))

function CheckoutPage() {
  const navigate = useNavigate()
  const { user } = useSession()
  const cart = useCart()
  const wallets = useWallets()
  const [coupon] = useCoupon()
  const quote = useQuote(coupon)
  const create = useCreateOrder()
  const idempotency = useIdempotencyKey()

  const [chosenWalletId, setChosenWalletId] = useState<string | null>(null)
  const [edited, setEdited] = useState<Collector | null>(null)
  const [chosenProvider, setChosenProvider] = useState<WalletType | null>(null)
  const [clientErrors, setClientErrors] = useState<FieldErrors>({})
  const [formOpenOnMobile, setFormOpenOnMobile] = useState(false)

  const primary = wallets.data?.find((wallet) => wallet.isPrimary) ?? wallets.data?.[0]
  const wallet = wallets.data?.find((item) => item.id === chosenWalletId) ?? primary
  const other = wallets.data?.find((item) => item.id !== wallet?.id)
  const collector = edited ?? collectorFrom(wallet, user)
  const provider = chosenProvider ?? wallet?.type ?? "MetaMask"

  const error = create.error ? getApiError(create.error) : null
  const errors: FieldErrors = { ...error?.fields, ...clientErrors }
  const issues = quote.data?.issues ?? []
  const blocked = !quote.data || issues.length > 0 || !wallet || quote.isFetching
  const uncertain = error && (error.code === "timeout" || error.code === "network")
  // Depois de uma resposta perdida o carrinho já pode estar vazio no servidor (pedido criado):
  // mantém a tela com o erro e o "Tentar novamente".
  const cartIsEmpty = cart.data?.items.length === 0 && !create.isPending && !create.isError

  function pickWallet(id: string) {
    setChosenWalletId(id)
    setEdited(null)
    setChosenProvider(null)
    setClientErrors({})
  }

  const setField = (key: keyof Collector) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setEdited({ ...collector, [key]: event.target.value })

  function send(input: CreateOrderInput) {
    if (create.isPending) return // clique duplo: ignorado (e, se escapasse, a mesma chave devolveria o mesmo pedido)
    const idempotencyKey = idempotency.keyFor(JSON.stringify(input))
    create.mutate({ input, idempotencyKey }, {
      onSuccess: (order) => {
        idempotency.reset()
        setCoupon(null)
        void navigate({ to: "/confirmacao/$orderId", params: { orderId: order.id } })
      },
    })
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!quote.data || !wallet) return
    const found = validateCollectorFields(collector as unknown as Record<string, string>, { network: "network", address: "address", walletType: "walletType" }, {
      displayName: "o nome de exibição",
      username: "o nome de usuário",
      network: "a rede",
      profileName: "o nome do perfil",
      address: "o endereço da carteira",
      walletType: "o tipo de carteira",
      referralCode: "o código de indicação",
      email: "o e-mail",
      ens: "o nome ENS",
    })
    setClientErrors(found)
    if (Object.keys(found).length) {
      setFormOpenOnMobile(true) // no mobile o formulário fica recolhido: abre para mostrar os erros
      return
    }
    send({ walletId: wallet.id, provider, collector, coupon: quote.data.coupon, expectedTotalEth: quote.data.totalEth })
  }

  const radio = "size-4 shrink-0 appearance-none rounded-full border border-primary checked:bg-primary checked:shadow-[inset_0_0_0_3px_var(--card)]"

  return (
    <div className="page-shell pb-8 pt-6 md:pt-8">
      <div className="max-md:hidden"><Breadcrumb items={[{ label: "Início", to: "/" }, { label: "Mercado", to: "/mercado" }, { label: "Pagamento" }]} /></div>
      <div className="relative mb-5 flex items-center justify-center md:hidden">
        <Link to="/carrinho" aria-label="Voltar ao carrinho" className="absolute left-0 grid size-10 place-items-center rounded-full bg-card text-primary"><ArrowLeft className="size-5" aria-hidden /></Link>
      </div>
      <h1 className="text-center text-lg md:sr-only">Pagamento com carteira</h1>

      {cartIsEmpty && (
        <div className="mt-6 bg-card p-10 text-center">
          <p className="text-lg">Seu carrinho está vazio.</p>
          <Link to="/mercado" className="mt-6 inline-flex h-10 items-center rounded-sm bg-primary px-6 font-bold text-primary-foreground hover:bg-primary/85">Explorar NFTs</Link>
        </div>
      )}

      {!cartIsEmpty && (
        <form onSubmit={submit} noValidate className="mt-4 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] lg:gap-12">
          <div>
            {/* Mobile: carteiras como cartões. */}
            <section aria-labelledby="carteira-conectada" className="md:hidden">
              <div className="flex items-center justify-between">
                <h2 id="carteira-conectada" className="text-base">Carteira conectada</h2>
                <Link to="/carteiras" className="text-sm font-bold text-primary">Trocar carteira</Link>
              </div>
              {wallets.isPending && <Skeleton className="mt-3 h-24 bg-card" />}
              <div role="radiogroup" aria-label="Carteira conectada" className="mt-3 space-y-3">
                {wallets.data?.map((item) => (
                  // eslint-disable-next-line jsx-a11y/label-has-associated-control -- o texto da label é dinâmico (apelido, ENS e rede da carteira)
                  <label key={item.id} className="flex cursor-pointer items-start gap-3 rounded-xl bg-card p-4 has-[:checked]:ring-1 has-[:checked]:ring-primary">
                    <input type="radio" name="wallet-card" checked={wallet?.id === item.id} onChange={() => pickWallet(item.id)} className={cn(radio, "mt-1")} />
                    <span className="min-w-0">
                      <span className="block font-bold">{item.nickname}</span>
                      <span className="block text-sm text-tan">{walletLine(item)}</span>
                      <span className="block text-sm text-tan">{item.isPrimary ? `Rede principal ${item.network}` : `Rede ${item.network}`}</span>
                    </span>
                  </label>
                ))}
              </div>
              <button type="button" onClick={() => setFormOpenOnMobile((open) => !open)} aria-expanded={formOpenOnMobile} className="mt-4 text-sm font-bold text-primary underline">
                {formOpenOnMobile ? "Ocultar dados do colecionador" : "Revisar dados do colecionador"}
              </button>
            </section>

            {wallets.data?.length === 0 && (
              <p role="alert" className="mt-4 rounded-sm border border-primary/50 p-4">Você ainda não tem carteira cadastrada. <Link to="/carteiras" className="font-bold text-primary underline">Cadastre uma carteira</Link> para continuar.</p>
            )}

            {/* Formulário "Perfil do colecionador". No mobile fica recolhido (os dados vêm da carteira). */}
            <section aria-labelledby="perfil-colecionador" className={cn("md:block", formOpenOnMobile ? "mt-4 block" : "hidden")}>
              <h2 id="perfil-colecionador" className="text-lg font-bold">Perfil do colecionador</h2>
              <div className="mt-4 grid gap-x-8 gap-y-4 md:grid-cols-2">
                <TextField id="displayName" label="Nome de exibição" required value={collector.displayName} onChange={setField("displayName")} error={errors.displayName} autoComplete="name" />
                <TextField id="username" label="Nome de usuário" required value={collector.username} onChange={setField("username")} error={errors.username} autoComplete="username" />
                <SelectField id="network" label="Rede" required options={NETWORKS} placeholder="Selecione uma rede" value={collector.network} onChange={setField("network")} error={errors.network} />
                <TextField id="profileName" label="Nome do perfil" required value={collector.profileName} onChange={setField("profileName")} error={errors.profileName} />
                <TextField id="address" label="Endereço da carteira" required placeholder="Endereço 0x da carteira" value={collector.address} onChange={setField("address")} error={errors.address} autoComplete="off" />
                <TextField id="secondaryRef" label="ENS ou carteira secundária (opcional)" hideLabel placeholder="ENS ou carteira secundária (opcional)" value={collector.secondaryRef} onChange={setField("secondaryRef")} wrapperClassName="md:mt-[1.625rem]" />
                <SelectField id="walletType" label="Tipo de carteira" required options={WALLET_TYPES} placeholder="Selecione uma carteira" value={collector.walletType} onChange={setField("walletType")} error={errors.walletType} />
                <TextField id="referralCode" label="Código de indicação" required value={collector.referralCode} onChange={setField("referralCode")} error={errors.referralCode} />
                <TextField id="email" label="E-mail" required type="email" value={collector.email} onChange={setField("email")} error={errors.email} autoComplete="email" />
                <EnsField id="ens" label="Nome ENS" required value={collector.ens} onChange={setField("ens")} error={errors.ens} />
              </div>
              <label className={cn("mt-5 flex items-center gap-2", !other && "opacity-60")}>
                <input type="checkbox" disabled={!other} checked={!!other && wallet?.id !== primary?.id} onChange={() => other && pickWallet(wallet?.id === primary?.id ? other.id : (primary?.id ?? other.id))} className={cn(radio, "rounded-full")} />
                Usar outra carteira?
                {!other && <span className="text-xs text-tan">(cadastre uma carteira secundária)</span>}
              </label>
              <TextAreaField id="note" label="Observação do colecionador (opcional)" value={collector.note} onChange={setField("note")} wrapperClassName="mt-5 md:max-w-sm" />
            </section>
          </div>

          <aside aria-label="Resumo do pedido" className="space-y-5">
            <section aria-labelledby="seus-nfts" className="max-md:hidden">
              <h2 id="seus-nfts" className="text-lg font-bold">Seus NFTs</h2>
              <div className="mt-2 flex justify-between border-b border-line pb-2 text-sm font-bold"><span>NFTs</span><span>Subtotal</span></div>
              <ul className="mt-2 space-y-2">
                {(quote.data?.items ?? cart.data?.items ?? []).map(({ nft, quantity }) => (
                  <li key={nft.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 bg-card p-1.5 pr-3">
                    <NftImage image={nft.image} name={nft.name} className="size-[70px] rounded-lg" />
                    <div className="min-w-0"><p className="truncate text-sm font-bold">{nft.name}</p><p className="text-xs text-tan">ID do token: {nft.tokenId}</p></div>
                    <span className="text-sm text-tan">(x {quantity})</span>
                    <span className="font-bold text-primary">{formatEth(mulEth(nft.priceEth, quantity), 2)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-center text-sm">Tem um código promocional? <Link to="/carrinho" className="text-primary underline">Aplique aqui</Link></p>
            </section>

            <div className="max-md:hidden">
              {quote.data ? <Totals {...quote.data} busy={quote.isFetching} /> : <Skeleton className="h-36 bg-card" />}
            </div>
            {issues.map((issue) => (
              <p key={issue.code + ("nftId" in issue ? issue.nftId : "")} role="alert" className="text-sm text-destructive">
                {issue.code === "invalid_coupon" ? issue.message : <>Um item ficou indisponível. <Link to="/carrinho" className="underline">Revise o carrinho</Link>.</>}
              </p>
            ))}

            <fieldset>
              <legend className="mb-3 text-lg font-bold">Carteira e rede</legend>
              <div className="space-y-3">
                {WALLET_TYPES.map((item) => (
                  <label key={item} className={cn("flex h-12 cursor-pointer items-center gap-3 rounded-sm border border-input px-4 max-md:rounded-xl max-md:border-0 max-md:bg-card md:has-[:checked]:border-primary max-md:has-[:checked]:ring-1 max-md:has-[:checked]:ring-primary")}>
                    <span aria-hidden className="hidden size-9 place-items-center rounded-full bg-background font-bold text-primary max-md:grid">{PROVIDER_LETTER[item]}</span>
                    <span className="flex-1">{item}</span>
                    <input type="radio" name="provider" value={item} checked={provider === item} onChange={() => setChosenProvider(item)} className={cn(radio, "max-md:order-last md:order-first")} />
                  </label>
                ))}
              </div>
            </fieldset>
            {errors.provider && <p className="text-sm text-destructive">{errors.provider}</p>}
            {errors.walletId && <p className="text-sm text-destructive">{errors.walletId}</p>}

            <p className="flex justify-between text-base font-bold md:hidden"><span>Total:</span><span className="text-primary">{quote.data ? formatEth(quote.data.totalEth, 3) : "…"}</span></p>

            {error && (
              <div role="alert" className="rounded-sm border border-destructive/60 p-3 text-sm">
                <p className="text-destructive">{error.message}</p>
                {error.code === "inventory_conflict" && <Link to="/carrinho" className="mt-2 inline-block underline">Voltar ao carrinho</Link>}
                {error.code === "price_changed" && <p className="mt-1 text-tan">Atualizamos os valores acima. Confira e confirme de novo.</p>}
                {uncertain && create.variables && (
                  <>
                    <p className="mt-1 text-tan">Não recebemos a resposta, mas o pedido pode ter sido criado. Tentar de novo é seguro: você não será cobrado duas vezes.</p>
                    <button type="button" className="mt-2 font-bold underline" onClick={() => send(create.variables!.input)}>Tentar novamente</button>
                  </>
                )}
              </div>
            )}

            <button type="submit" disabled={blocked || create.isPending} className="h-10 w-full rounded-sm bg-primary text-base font-bold text-primary-foreground hover:bg-primary/85 disabled:opacity-50 max-md:h-12 max-md:rounded-xl max-md:bg-gradient-to-r max-md:from-[#ce874a] max-md:to-[#b77843]">
              {create.isPending ? "Confirmando..." : "Confirmar compra"}
            </button>
          </aside>
        </form>
      )}
    </div>
  )
}
