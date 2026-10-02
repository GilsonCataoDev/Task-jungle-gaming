import { createFileRoute, redirect } from "@tanstack/react-router"
import { AuthModal } from "@/features/auth/auth-modal"
import { AuthBackdrop } from "@/features/auth/auth-backdrop"
import { sessionQuery } from "@/features/auth/session"
import { safePath } from "@/features/auth/redirect"

export const Route = createFileRoute("/cadastro")({
  validateSearch: (raw: Record<string, unknown>): { redirect?: string } => ({ redirect: safePath(raw.redirect) }),
  beforeLoad: async ({ context, search }) => {
    if (await context.queryClient.ensureQueryData(sessionQuery)) throw redirect({ href: search.redirect ?? "/" })
  },
  component: SignupPage,
})

function SignupPage() {
  const { redirect: target } = Route.useSearch()
  return (
    <>
      <AuthBackdrop />
      <AuthModal mode="signup" redirect={target} />
    </>
  )
}
