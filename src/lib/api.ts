import axios, { AxiosError } from "axios"
import { mockGate } from "@/lib/mock-gate"
import type { ApiErrorBody } from "@/types/domain"

export const TOKEN_KEY = "kurio:token"
export const SESSION_EXPIRED_EVENT = "kurio:session-expired"

export const api = axios.create({ baseURL: "/api", timeout: 8_000 })

api.interceptors.request.use(async (config) => {
  await mockGate // com mocks ligados, nenhuma requisição sai antes de o MSW estar ativo
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    // `/auth/session` é a recuperação de sessão no boot: um 401 ali só significa "token antigo/inválido"
    // (visitante), não "a sessão expirou durante o uso". Quem trata esse caso é `fetchSession`.
    const isSessionRecovery = error.config?.url === "/auth/session"
    if (error.response?.status === 401 && localStorage.getItem(TOKEN_KEY) && !isSessionRecovery) {
      // Sessão expirou/invalidou: o watcher em app/providers limpa os dados e redireciona ao login.
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
    }
    return Promise.reject(error)
  },
)

export function getApiError(error: unknown): ApiErrorBody {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    if (error.response?.data?.code) return error.response.data
    if (error.code === "ECONNABORTED") return { code: "timeout", message: "A requisição demorou demais. Tente novamente." }
    if (!error.response) return { code: "network", message: "Sem conexão com o servidor." }
  }
  return { code: "unknown", message: "Algo deu errado. Tente novamente." }
}

export function isApiError(error: unknown, code: string) {
  return getApiError(error).code === code
}
