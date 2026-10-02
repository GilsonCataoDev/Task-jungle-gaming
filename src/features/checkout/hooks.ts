import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRef } from "react"
import { api } from "@/lib/api"
import { qk } from "@/lib/query-keys"
import { useSession } from "@/features/auth/hooks"
import { useCart } from "@/features/cart/hooks"
import type { Cart, CreateOrderInput, Order, Quote } from "@/types/domain"

/** Cotação do servidor: disponibilidade, cupom, desconto, taxa de rede e total. */
export function useQuote(coupon: string | null) {
  const { user } = useSession()
  const cart = useCart()
  return useQuery({
    queryKey: qk.quote(user?.id ?? "guest", coupon, cart.data?.updatedAt ?? ""),
    queryFn: async ({ signal }) => (await api.post<Quote>("/quote", { coupon }, { signal })).data,
    enabled: !!cart.data,
    placeholderData: keepPreviousData,
  })
}

/**
 * Idempotency-Key estável enquanto o conteúdo do pedido não muda. Assim, repetir o envio
 * (clique duplo, timeout, rede instável) recupera o MESMO pedido em vez de criar outro.
 * Se o usuário alterar algo (cupom, carteira, total), nasce uma chave nova.
 */
export function useIdempotencyKey() {
  const ref = useRef<{ fingerprint: string; key: string } | null>(null)
  return {
    keyFor(fingerprint: string) {
      if (ref.current?.fingerprint !== fingerprint) ref.current = { fingerprint, key: crypto.randomUUID() }
      return ref.current.key
    },
    reset() {
      ref.current = null
    },
  }
}

export function useCreateOrder() {
  const queryClient = useQueryClient()
  const { user } = useSession()
  const userId = user?.id ?? "guest"

  return useMutation({
    mutationFn: async ({ input, idempotencyKey }: { input: CreateOrderInput; idempotencyKey: string }) =>
      (await api.post<Order>("/orders", input, { headers: { "Idempotency-Key": idempotencyKey } })).data,
    onSuccess: (order) => {
      queryClient.setQueryData(qk.orders.detail(userId, order.id), order)
      queryClient.setQueryData<Cart>(qk.cart(userId), { items: [], updatedAt: new Date().toISOString() })
      void queryClient.invalidateQueries({ queryKey: qk.orders.list(userId) })
      void queryClient.invalidateQueries({ queryKey: qk.nfts.all })
    },
    // Em qualquer erro o carrinho/preços podem ter mudado no servidor: revalida.
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: qk.cart(userId) })
      void queryClient.invalidateQueries({ queryKey: ["user", userId, "quote"] })
    },
  })
}
