import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { sessionQuery } from "@/features/auth/session"

/**
 * Layout sem URL que protege tudo em `routes/_auth/`.
 * Sem sessão => /login?redirect=<destino original>; depois do login o usuário volta para lá.
 */
export const Route = createFileRoute("/_auth")({
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.ensureQueryData(sessionQuery)
    if (!session) throw redirect({ to: "/login", search: { redirect: location.href } })
  },
  component: Outlet,
})
