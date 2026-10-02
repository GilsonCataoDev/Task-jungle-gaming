import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { qk } from "@/lib/query-keys"
import { useSession } from "@/features/auth/hooks"
import type { Session, User } from "@/types/domain"

export function useProfile() {
  const { user } = useSession()
  return useQuery({
    queryKey: qk.profile(user?.id ?? "guest"),
    queryFn: async ({ signal }) => (await api.get<User>("/profile", { signal })).data,
    enabled: !!user,
  })
}

/** Mantém perfil e sessão (nome/avatar no header) sincronizados após qualquer edição. */
function useSyncProfile() {
  const queryClient = useQueryClient()
  return (updated: User) => {
    queryClient.setQueryData(qk.profile(updated.id), updated)
    queryClient.setQueryData<Session | null>(qk.session, (old) => (old ? { ...old, user: updated } : old))
  }
}

export function useUpdateProfile() {
  const sync = useSyncProfile()
  return useMutation({
    mutationFn: async (input: Partial<Pick<User, "name" | "username" | "email" | "ens" | "walletNickname">>) => (await api.patch<User>("/profile", input)).data,
    onSuccess: sync,
  })
}

export function useUploadAvatar() {
  const sync = useSyncProfile()
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append("avatar", file)
      return (await api.post<User>("/profile/avatar", form)).data
    },
    onSuccess: sync,
  })
}

export function useRemoveAvatar() {
  const sync = useSyncProfile()
  return useMutation({
    mutationFn: async () => (await api.delete<User>("/profile/avatar")).data,
    onSuccess: sync,
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (input: { currentPassword: string; newPassword: string }) => {
      await api.post("/profile/password", input)
    },
  })
}
