import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { api, GUEST_CART_FLAG, TOKEN_KEY } from "@/lib/api"
import type { AuthResponse } from "@/types/domain"
import { endSession, sessionQuery, startSession } from "./session"

export function useSession() {
  const { data, isPending } = useQuery(sessionQuery)
  return { user: data?.user ?? null, isPending }
}

/**
 * Depois de autenticar, os itens que o visitante já tinha no carrinho passam para a conta (somando quantidades,
 * limitadas ao estoque). Se a mesclagem falhar, o login continua valendo: o carrinho do visitante fica no servidor.
 */
async function startSessionAndMergeCart(queryClient: QueryClient, auth: AuthResponse) {
  localStorage.setItem(TOKEN_KEY, auth.token) // a mesclagem já é uma chamada autenticada
  if (localStorage.getItem(GUEST_CART_FLAG)) {
    await api.post("/cart/merge").catch(() => undefined)
    localStorage.removeItem(GUEST_CART_FLAG)
  }
  startSession(queryClient, auth) // só agora a UI vira "logada": o carrinho já nasce completo
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { email: string; password: string }) => (await api.post<AuthResponse>("/auth/login", input)).data,
    onSuccess: (auth) => startSessionAndMergeCart(queryClient, auth),
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { username: string; email: string; password: string }) => (await api.post<AuthResponse>("/auth/register", input)).data,
    onSuccess: (auth) => startSessionAndMergeCart(queryClient, auth),
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
