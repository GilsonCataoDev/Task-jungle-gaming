import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { api } from "@/lib/api"
import type { AuthResponse } from "@/types/domain"
import { endSession, sessionQuery, startSession } from "./session"

export function useSession() {
  const { data, isPending } = useQuery(sessionQuery)
  return { user: data?.user ?? null, isPending }
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { email: string; password: string }) => (await api.post<AuthResponse>("/auth/login", input)).data,
    onSuccess: (auth) => startSession(queryClient, auth),
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { username: string; email: string; password: string }) => (await api.post<AuthResponse>("/auth/register", input)).data,
    onSuccess: (auth) => startSession(queryClient, auth),
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      // Logout nunca deve falhar para o usuário: se o servidor não responder, encerramos localmente.
      await api.post("/auth/logout").catch(() => undefined)
    },
    onSettled: () => endSession(queryClient),
  })
}

/** Para ações que exigem login (favoritar, comprar): leva ao login e volta para a página atual. */
export function useRequireLogin() {
  const navigate = useNavigate()
  return () => void navigate({ to: "/login", search: { redirect: window.location.pathname + window.location.search } })
}
