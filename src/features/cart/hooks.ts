import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { qk } from "@/lib/query-keys"
import { useSession } from "@/features/auth/hooks"
import type { Cart, Edition, Nft } from "@/types/domain"

const GUEST = "guest"

export function useCart() {
  const { user } = useSession()
  return useQuery({
    queryKey: qk.cart(user?.id ?? GUEST),
    queryFn: async ({ signal }) => (await api.get<Cart>("/cart", { signal })).data,
    enabled: !!user,
  })
}

/**
 * Update otimista com rollback: a UI muda na hora; se o servidor falhar, restauramos o
 * snapshot anterior. Ao final sempre revalidamos (servidor é a fonte da verdade).
 */
function useOptimisticCart<V>(request: (variables: V) => Promise<Cart>, apply: (cart: Cart, variables: V) => Cart) {
  const queryClient = useQueryClient()
  const { user } = useSession()
  const userId = user?.id ?? GUEST
  const key = qk.cart(userId)

  return useMutation({
    mutationFn: request,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Cart>(key)
      if (previous) queryClient.setQueryData<Cart>(key, apply(previous, variables))
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key })
      void queryClient.invalidateQueries({ queryKey: ["user", userId, "quote"] })
    },
  })
}

const touch = (cart: Cart, items: Cart["items"]): Cart => ({ ...cart, items, updatedAt: new Date().toISOString() })

export function useAddToCart() {
  return useOptimisticCart<{ nft: Nft; quantity?: number; edition?: Edition }>(
    async ({ nft, quantity = 1, edition }) => (await api.post<Cart>("/cart/items", { nftId: nft.id, quantity, edition })).data,
    (cart, { nft, quantity = 1, edition = nft.edition }) => {
      const existing = cart.items.find((item) => item.nft.id === nft.id)
      return touch(
        cart,
        existing
          ? cart.items.map((item) => (item.nft.id === nft.id ? { ...item, edition, quantity: Math.min(nft.available, item.quantity + quantity) } : item))
          : [...cart.items, { nft, edition, quantity: Math.min(nft.available, quantity) }],
      )
    },
  )
}

export function useUpdateCartItem() {
  return useOptimisticCart<{ nftId: string; quantity: number }>(
    async ({ nftId, quantity }) => (await api.patch<Cart>(`/cart/items/${nftId}`, { quantity })).data,
    (cart, { nftId, quantity }) =>
      touch(
        cart,
        cart.items.flatMap((item) => (item.nft.id !== nftId ? [item] : quantity <= 0 ? [] : [{ ...item, quantity: Math.min(item.nft.available, quantity) }])),
      ),
  )
}

export function useRemoveCartItem() {
  return useOptimisticCart<string>(
    async (nftId) => (await api.delete<Cart>(`/cart/items/${nftId}`)).data,
    (cart, nftId) => touch(cart, cart.items.filter((item) => item.nft.id !== nftId)),
  )
}
