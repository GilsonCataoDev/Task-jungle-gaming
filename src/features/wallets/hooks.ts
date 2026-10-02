import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { qk } from "@/lib/query-keys"
import { useSession } from "@/features/auth/hooks"
import type { Wallet, WalletInput } from "@/types/domain"

type WalletsData = { items: Wallet[] }

export function useWallets() {
  const { user } = useSession()
  return useQuery({
    queryKey: qk.wallets(user?.id ?? "guest"),
    queryFn: async ({ signal }) => (await api.get<WalletsData>("/wallets", { signal })).data.items,
    enabled: !!user,
  })
}

function useWalletsKey() {
  const { user } = useSession()
  return qk.wallets(user?.id ?? "guest")
}

export function useCreateWallet() {
  const queryClient = useQueryClient()
  const key = useWalletsKey()
  return useMutation({
    mutationFn: async (input: WalletInput) => (await api.post<Wallet>("/wallets", input)).data,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: key }),
  })
}

/** Edita os dados de uma carteira e/ou troca qual é a principal (só uma por vez). */
export function useUpdateWallet() {
  const queryClient = useQueryClient()
  const key = useWalletsKey()
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<WalletInput> & { isPrimary?: boolean }) => (await api.patch<WalletsData>(`/wallets/${id}`, patch)).data.items,
    onMutate: async ({ id, ...patch }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Wallet[]>(key)
      queryClient.setQueryData<Wallet[]>(key, (old) =>
        old?.map((wallet) => {
          const { isPrimary, ...fields } = patch
          return { ...wallet, ...(wallet.id === id ? fields : {}), isPrimary: isPrimary ? wallet.id === id : wallet.isPrimary }
        }),
      )
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: key }),
  })
}
