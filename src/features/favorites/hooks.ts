import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { qk } from "@/lib/query-keys"
import { useSession } from "@/features/auth/hooks"

type FavoritesData = { nftIds: string[] }

export function useFavorites() {
  const { user } = useSession()
  return useQuery({
    queryKey: qk.favorites(user?.id ?? "guest"),
    queryFn: async ({ signal }) => (await api.get<FavoritesData>("/favorites", { signal })).data,
    enabled: !!user,
    select: (data) => new Set(data.nftIds),
  })
}

/** Favoritar é otimista: o coração muda na hora e volta atrás se a API falhar. */
export function useToggleFavorite() {
  const queryClient = useQueryClient()
  const { user } = useSession()
  const key = qk.favorites(user?.id ?? "guest")

  return useMutation({
    mutationFn: async ({ nftId, favorite }: { nftId: string; favorite: boolean }) =>
      (favorite ? await api.put<FavoritesData>(`/favorites/${nftId}`) : await api.delete<FavoritesData>(`/favorites/${nftId}`)).data,
    onMutate: async ({ nftId, favorite }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<FavoritesData>(key)
      queryClient.setQueryData<FavoritesData>(key, (old) => {
        const ids = new Set(old?.nftIds ?? [])
        if (favorite) ids.add(nftId)
        else ids.delete(nftId)
        return { nftIds: [...ids] }
      })
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: key }),
  })
}
