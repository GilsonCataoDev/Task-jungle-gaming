import { createFileRoute, redirect } from "@tanstack/react-router"
import { AuthModal } from "@/features/auth/auth-modal"
import { sessionQuery } from "@/features/auth/session"
import { AuthBackdrop } from "@/features/auth/auth-backdrop"
import { safePath } from "@/features/auth/redirect"

type LoginSearch = { redirect?: string; reason?: "expired" }

export const Route = createFileRoute("/login")({
  validateSearch: (raw: Record<string, unknown>): LoginSearch => ({ redirect: safePath(raw.redirect), reason: raw.reason === "expired" ? "expired" : undefined }),
  beforeLoad: async ({ context, search }) => {
    if (await context.queryClient.ensureQueryData(sessionQuery)) throw redirect({ href: search.redirect ?? "/" })
  },
  component: LoginPage,
})

function LoginPage() {
  const { redirect: target, reason } = Route.useSearch()
  return (
    <>
      <AuthBackdrop />
      <AuthModal mode="login" redirect={target} reason={reason} />
    </>
  )
}
