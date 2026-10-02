import { queryOptions, type QueryClient } from "@tanstack/react-query"
import axios from "axios"
import { api, TOKEN_KEY } from "@/lib/api"
import { qk } from "@/lib/query-keys"
import type { AuthResponse, Session } from "@/types/domain"

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

/**
 * Trocar de usuário (login, logout, expiração) descarta TODOS os dados privados (`["user", id, ...]`).
 * Além disso as chaves já incluem o userId, então mesmo um vazamento de cache não cruzaria contas.
 *
 * Não usamos `queryClient.clear()`: ele destrói as queries sem avisar quem está inscrito nelas,
 * e componentes montados (ex.: o header) deixariam de enxergar a sessão gravada em seguida.
 */
function resetPrivateData(queryClient: QueryClient) {
  queryClient.removeQueries({ queryKey: ["user"] })
  // O catálogo é público, mas traz `canEdit` por usuário.
  void queryClient.invalidateQueries({ queryKey: qk.nfts.all })
}

export function startSession(queryClient: QueryClient, auth: AuthResponse) {
  resetPrivateData(queryClient)
  localStorage.setItem(TOKEN_KEY, auth.token)
  const session: Session = { user: auth.user, expiresAt: auth.expiresAt }
  queryClient.setQueryData(sessionQuery.queryKey, session)
}

export function endSession(queryClient: QueryClient) {
  localStorage.removeItem(TOKEN_KEY)
  resetPrivateData(queryClient)
  queryClient.setQueryData(sessionQuery.queryKey, null)
}

/** Recuperação de sessão: sem token => visitante; token inválido/expirado => visitante. */
async function fetchSession(): Promise<Session | null> {
  if (!getToken()) return null
  try {
    const { data } = await api.get<Session>("/auth/session")
    return data
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      return null
    }
    throw error
  }
}

export const sessionQuery = queryOptions({
  queryKey: qk.session,
  queryFn: fetchSession,
  staleTime: 60_000,
  retry: false,
})
