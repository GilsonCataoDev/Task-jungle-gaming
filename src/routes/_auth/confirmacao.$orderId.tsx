import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { ThankYouIcon } from "@/components/icons"
import { Modal } from "@/components/modal"
import { NftImage } from "@/components/nft-image"
import { Skeleton } from "@/components/ui/skeleton"
import { AuthBackdrop } from "@/features/auth/auth-backdrop"
import { useSession } from "@/features/auth/hooks"
import { Totals } from "@/features/checkout/totals"
import { orderQuery } from "@/features/orders/queries"
import { getApiError } from "@/lib/api"
import { formatEth, formatReceiptDate, shortHash } from "@/lib/format"
import { mulEth } from "@/lib/money"
import type { OrderStatus } from "@/types/domain"

export const Route = createFileRoute("/_auth/confirmacao/$orderId")({ component: ConfirmationPage })

const TITLE: Record<OrderStatus, string> = {
  pending: "Aguardando confirmação…",
  processing: "Confirmando na rede…",
  confirmed: "Seus NFTs agora estão na sua carteira",
  failed: "Transação não concluída",
}
const FOOTNOTE: Record<OrderStatus, (network: string) => string> = {
  pending: () => "Estamos registrando seu pedido. Esta tela se atualiza sozinha.",
  processing: (network) => `Sua transação está sendo processada na ${network}. Esta tela se atualiza sozinha.`,
  confirmed: (network) => `Transação confirmada na ${network}. A propriedade foi transferida para sua carteira conectada e registrada na rede.`,
  failed: () => "Não foi possível concluir esta compra. Nenhum valor foi cobrado.",
}

/** Recibo em modal sobre a home (como no Figma). Também é a tela de recuperação de pedido pendente. */
function ConfirmationPage() {
  const { orderId } = Route.useParams()
  const navigate = useNavigate()
  const { user } = useSession()
  const { data: order, error, isPending, refetch } = useQuery({ ...orderQuery(user?.id ?? "guest", orderId), enabled: !!user })
  const close = () => void navigate({ to: "/" })

  return (
    <>
      <AuthBackdrop />
      <Modal label="Recibo do pedido" onClose={close} className="md:w-[36rem]">
        {isPending && <div className="p-10" aria-busy="true" aria-label="Carregando recibo"><Skeleton className="h-96 bg-background" /></div>}

        {!isPending && (error || !order) && (
          <div role="alert" className="p-10 text-center">
            <p className="text-lg">{getApiError(error).code === "not_found" ? "Pedido não encontrado." : getApiError(error).message}</p>
            {getApiError(error).code !== "not_found" && <button type="button" onClick={() => void refetch()} className="mt-3 font-bold text-primary underline">Tentar novamente</button>}
            <div className="mt-4"><Link to="/" className="font-bold text-primary underline">Voltar ao início</Link></div>
          </div>
        )}

        {order && (
          <div className="pb-8 pt-8 max-md:pt-14">
            <ThankYouIcon className="mx-auto size-20 text-primary" />
            <h1 className="mt-4 px-8 text-center text-base text-tan">{TITLE[order.status]}</h1>

            <dl className="mt-6 grid grid-cols-2 border-y border-tan/60 text-sm md:grid-cols-[1.3fr_1fr_1fr_1fr]">
              {[
                ["ID da transação", order.transactionId ? shortHash(order.transactionId) : "Aguardando…"],
                ["Data", formatReceiptDate(order.createdAt)],
                ["Total", formatEth(order.totalEth, 3)],
                ["Carteira", order.provider],
              ].map(([label, value], index) => (
                <div key={label} className={`px-4 py-3 ${index > 0 ? "md:border-l md:border-tan/60" : ""}`}>
                  <dt className="font-bold text-tan">{label}</dt>
                  <dd className="text-tan" title={label === "ID da transação" ? (order.transactionId ?? undefined) : undefined}>{value}</dd>
                </div>
              ))}
            </dl>

            <section aria-labelledby="detalhes" className="px-8 pt-5">
              <h2 id="detalhes" className="text-sm">Detalhes da transação</h2>
              <div className="mt-2 grid grid-cols-[1fr_auto_auto] gap-x-6 border-b border-line pb-1 text-sm font-bold" aria-hidden><span>NFTs</span><span>Edições</span><span>Subtotal</span></div>
              <ul className="mt-3 space-y-3">
                {order.items.map(({ nft, quantity }) => (
                  <li key={nft.id} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-x-4">
                    <NftImage image={nft.image} name={nft.name} className="size-[70px] rounded-lg" />
                    <div><p className="font-bold">{nft.name}</p><p className="text-xs text-tan">ID do token: {nft.tokenId}</p></div>
                    <span className="text-sm text-tan">(x {quantity})</span>
                    <span className="min-w-20 text-right font-bold text-primary">{formatEth(mulEth(nft.priceEth, quantity), 2)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 border-t border-line pt-4">
                <Totals receipt subtotalEth={order.subtotalEth} discountEth={order.discountEth} networkFeeEth={order.networkFeeEth} totalEth={order.totalEth} />
              </div>
              <p role="status" className="mt-4 text-center text-sm leading-6 text-tan">{FOOTNOTE[order.status](order.items[0]?.nft.network ?? "rede")}</p>
              {order.status === "confirmed" && order.transactionId && (
                <div className="mt-5 text-center">
                  <a href={`https://etherscan.io/tx/${order.transactionId}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center rounded-sm bg-primary px-6 font-bold text-primary-foreground hover:bg-primary/85">
                    Ver no Etherscan<span className="sr-only"> (abre em nova aba)</span>
                  </a>
                </div>
              )}
              <p className="mt-4 text-center text-sm"><span className="text-tan">Pedido {order.id}</span> · <Link to="/mercado" className="text-primary underline">Continuar explorando</Link></p>
            </section>
          </div>
        )}
      </Modal>
    </>
  )
}
