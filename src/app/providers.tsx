import { QueryClientProvider } from "@tanstack/react-query"
import { useEffect, type ReactNode } from "react"
import { SESSION_EXPIRED_EVENT } from "@/lib/api"
import { RealtimeProvider } from "@/realtime/realtime-provider"
import { endSession } from "@/features/auth/session"
import { queryClient } from "./query-client"
import { router } from "./router"

/** Qualquer 401 vindo do Axios derruba a sessão local e leva ao login, guardando o destino. */
function SessionExpiryWatcher() {
  useEffect(() => {
    const onExpired = () => {
      endSession(queryClient)
      const { pathname, searchStr } = router.state.location
      if (pathname === "/login") return
      void router.navigate({ to: "/login", search: { redirect: pathname + searchStr, reason: "expired" } })
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired)
  }, [])
  return null
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeProvider>
        <SessionExpiryWatcher />
        {children}
      </RealtimeProvider>
    </QueryClientProvider>
  )
}
