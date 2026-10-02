import type { QueryClient } from "@tanstack/react-query"
import { createRootRouteWithContext, Link, Outlet } from "@tanstack/react-router"
import { BottomNav } from "@/components/bottom-nav"
import { ConnectionStatus } from "@/components/connection-status"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"

export type RouterContext = { queryClient: QueryClient }

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
})

function RootLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-sm focus:bg-primary focus:px-4 focus:py-2 focus:font-bold focus:text-primary-foreground">
        Pular para o conteúdo
      </a>
      <ConnectionStatus />
      <SiteHeader />
      {/* Único <main> da aplicação: as páginas usam <div>/<section>. A altura mínima de uma tela mantém o
          rodapé fora da primeira tela enquanto o conteúdo carrega (senão ele "pula" e gera CLS). */}
      <main id="conteudo" tabIndex={-1} className="min-h-screen outline-none">
        <Outlet />
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  )
}

function NotFound() {
  return (
    <div className="page-shell py-24 text-center">
      <p className="text-sm text-tan">Erro 404</p>
      <h1 className="mt-3 text-4xl">Esta página não existe.</h1>
      <Link to="/" className="mt-6 inline-block font-bold text-primary underline">Voltar ao início</Link>
    </div>
  )
}
