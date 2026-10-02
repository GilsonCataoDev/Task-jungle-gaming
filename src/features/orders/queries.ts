import { queryOptions } from "@tanstack/react-query"
import axios from "axios"
import { api } from "@/lib/api"
import { qk } from "@/lib/query-keys"
import type { Order } from "@/types/domain"

const POLL_MS = 4_000

/**
 * O Socket.IO entrega as transições em tempo real; o polling é a rede de segurança para
 * quando o socket cair ou o usuário recarregar com um pedido ainda pendente.
 */
export const orderQuery = (userId: string, orderId: string) =>
  queryOptions({
    queryKey: qk.orders.detail(userId, orderId),
    queryFn: async ({ signal }) => (await api.get<Order>(`/orders/${orderId}`, { signal })).data,
    refetchInterval: (query) => (query.state.data && (query.state.data.status === "confirmed" || query.state.data.status === "failed") ? false : POLL_MS),
    retry: (count, error) => !(axios.isAxiosError(error) && error.response?.status === 404) && count < 1,
  })

/** Histórico de pedidos (tela "Atividade"). */
export const ordersQuery = (userId: string) =>
  queryOptions({
    queryKey: qk.orders.list(userId),
    // O cache guarda `{ items }` (é o formato que o reconciliador de order.updated conhece).
    queryFn: async ({ signal }) => (await api.get<{ items: Order[] }>("/orders", { signal })).data,
    select: (data) => data.items,
  })
