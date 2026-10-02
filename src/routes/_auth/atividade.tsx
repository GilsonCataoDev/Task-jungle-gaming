import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Skeleton } from "@/components/ui/skeleton"
import { useSession } from "@/features/auth/hooks"
import { ordersQuery } from "@/features/orders/queries"
import { ProfileLayout } from "@/features/profile/profile-layout"
import { getApiError } from "@/lib/api"
import { formatDate, formatEth } from "@/lib/format"
import type { OrderStatus } from "@/types/domain"

export const Route = createFileRoute("/_auth/atividade")({ component: ActivityPage })

const STATUS: Record<OrderStatus, string> = { pending: "Aguardando", processing: "Processando", confirmed: "Confirmado", failed: "Não concluído" }

function ActivityPage() {
  const { user } = useSession()
  const orders = useQuery({ ...ordersQuery(user?.id ?? "guest"), enabled: !!user })

  return (
    <ProfileLayout active="/atividade" title="Atividade">
      {orders.isPending && <Skeleton className="mt-6 h-40 bg-card" aria-label="Carregando atividade" />}
      {orders.isError && !orders.data && (
        <div role="alert" className="mt-6 bg-card p-6"><p>{getApiError(orders.error).message}</p><button type="button" onClick={() => void orders.refetch()} className="mt-2 font-bold text-primary underline">Tentar novamente</button></div>
      )}
      {orders.data?.length === 0 && (
        <div className="mt-6 bg-card p-8 text-center">
          <p>Você ainda não fez nenhuma compra.</p>
          <Link to="/mercado" className="mt-4 inline-flex h-10 items-center rounded-sm bg-primary px-6 font-bold text-primary-foreground hover:bg-primary/85">Explorar NFTs</Link>
        </div>
      )}
      <ul className="mt-6 space-y-3">
        {orders.data?.map((order) => (
          <li key={order.id} className="flex flex-wrap items-center justify-between gap-4 bg-card p-4">
            <div>
              <p className="font-bold">Pedido {order.id}</p>
              <p className="text-sm text-tan">{formatDate(order.createdAt)} · {order.items.map((item) => `${item.quantity}× ${item.nft.name}`).join(", ")}</p>
            </div>
            <div className="flex items-center gap-5">
              <span className="text-sm text-tan">{STATUS[order.status]}</span>
              <span className="font-bold text-primary">{formatEth(order.totalEth, 3)}</span>
              <Link to="/confirmacao/$orderId" params={{ orderId: order.id }} className="text-sm font-bold text-primary hover:underline">Ver recibo</Link>
            </div>
          </li>
        ))}
      </ul>
    </ProfileLayout>
  )
}
