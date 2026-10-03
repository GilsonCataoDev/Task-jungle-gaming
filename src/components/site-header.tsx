import { Link, useNavigate, useRouterState } from "@tanstack/react-router"
import { LogIn, LogOut, Search, ShoppingCart, UserRound, X } from "lucide-react"
import { useEffect, useRef, useState, type FormEvent } from "react"
import { useLogout, useSession } from "@/features/auth/hooks"
import { useCart } from "@/features/cart/hooks"
import { SEARCH_DEBOUNCE_MS, useDebouncedCallback } from "@/lib/use-debounced-callback"
import { cn } from "@/lib/utils"

export function Logo({ className }: { className?: string }) {
  return <span className={cn("text-sm font-bold uppercase tracking-[0.2em]", className)}>Kurio</span>
}

/** Em quais caminhos cada item do menu fica "ativo" (no Figma, carrinho e checkout pertencem ao Mercado). */
const NAV = [
  { to: "/", label: "Início", match: (path: string) => path === "/" || ["/login", "/cadastro", "/perfil", "/carteiras", "/atividade", "/lista-de-interesse", "/confirmacao"].some((prefix) => path === prefix || path.startsWith(`${prefix}/`)) },
  { to: "/mercado", label: "Mercado", match: (path: string) => ["/mercado", "/nfts", "/carrinho", "/pagamento"].some((prefix) => path === prefix || path.startsWith(`${prefix}/`)) },
  { to: "/criadores", label: "Criadores", match: (path: string) => path.startsWith("/criadores") },
  { to: "/aprenda", label: "Aprenda", match: (path: string) => path.startsWith("/aprenda") },
] as const

/** Cabeçalho do desktop/tablet. No mobile cada página tem a própria barra superior e há a barra inferior. */
export function SiteHeader() {
  const { user } = useSession()
  const { data: cart } = useCart()
  const logout = useLogout()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const [searching, setSearching] = useState(false)
  const searchInput = useRef<HTMLInputElement>(null)
  const count = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0

  useEffect(() => {
    if (!searching) return
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setSearching(false)
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [searching])

  // Filtrar ao digitar: só nas telas que já mostram o catálogo (mercado e início), para a página não mudar sob os pés
  // de quem está lendo outra coisa (detalhe, carrinho...). Troca a entrada do histórico em vez de empilhar uma por pausa.
  const liveSearch = useDebouncedCallback((raw: string) => {
    const term = raw.trim() || undefined
    if (pathname === "/mercado") void navigate({ to: "/mercado", search: (current) => ({ ...current, search: term, page: undefined }), replace: true })
    else if (pathname === "/") void navigate({ to: "/", search: (current) => ({ ...current, search: term, page: undefined }), replace: true })
  }, SEARCH_DEBOUNCE_MS)

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    liveSearch.cancel() // Enter / "Buscar" busca na hora, sem esperar a pausa
    const term = String(new FormData(event.currentTarget).get("q") ?? "").trim()
    setSearching(false)
    void navigate({ to: "/mercado", search: { search: term || undefined } })
  }

  return (
    <header className="hidden border-b border-line md:block">
      <div className="page-shell flex h-[70px] items-center justify-between gap-4 lg:gap-6">
        <Link to="/" aria-label="Kurio, página inicial"><Logo /></Link>

        <nav aria-label="Navegação principal" className="flex h-full items-stretch gap-6 lg:gap-10">
          {NAV.map((item) => {
            const active = item.match(pathname)
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={cn("relative flex items-center text-base transition-colors hover:text-primary", active ? "font-bold text-primary after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-primary" : "text-foreground")}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-2 lg:gap-4">
          <button
            type="button"
            aria-label={searching ? "Fechar busca" : "Buscar NFTs"}
            aria-expanded={searching}
            onClick={() => {
              setSearching((open) => !open)
              setTimeout(() => searchInput.current?.focus(), 0)
            }}
            className="grid size-9 place-items-center rounded-sm text-foreground hover:text-primary"
          >
            {searching ? <X className="size-6" aria-hidden /> : <Search className="size-6" aria-hidden />}
          </button>
          <Link to="/carrinho" aria-label={`Carrinho com ${count} ${count === 1 ? "item" : "itens"}`} className="relative grid size-9 place-items-center rounded-sm text-foreground hover:text-primary">
            <ShoppingCart className="size-6" aria-hidden />
            {count > 0 && <span aria-hidden className="absolute -right-1 -top-0.5 grid size-4 place-items-center rounded-full bg-primary text-[10px] font-bold leading-none text-primary-foreground">{count}</span>}
          </Link>
          {user ? (
            <div className="flex items-center gap-2">
              <Link to="/perfil" aria-label={`Perfil de ${user.name}`} className="flex h-10 items-center gap-2 rounded-sm border border-primary px-3 text-primary hover:bg-primary/10">
                {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="size-5 rounded-full object-cover" /> : <UserRound className="size-5" aria-hidden />}
                <span className="hidden max-w-28 truncate font-bold lg:inline">{user.name}</span>
              </Link>
              <button
                type="button"
                aria-label="Sair"
                disabled={logout.isPending}
                onClick={() => logout.mutate(undefined, { onSettled: () => void navigate({ to: "/" }) })}
                className="grid size-10 place-items-center rounded-sm border border-line text-tan hover:border-primary hover:text-primary"
              >
                <LogOut className="size-5" aria-hidden />
              </button>
            </div>
          ) : (
            <Link to="/login" search={{ redirect: pathname === "/login" || pathname === "/cadastro" ? undefined : pathname }} className="flex h-10 items-center gap-2 rounded-sm bg-primary px-3 font-bold text-primary-foreground hover:bg-primary/85">
              <LogIn className="size-5" aria-hidden />
              Entrar
            </Link>
          )}
        </div>
      </div>

      {searching && (
        <div className="border-t border-line bg-card py-3">
          <form role="search" onSubmit={submitSearch} className="page-shell flex gap-3">
            <label htmlFor="busca-cabecalho" className="sr-only">Buscar NFTs</label>
            <input ref={searchInput} id="busca-cabecalho" name="q" type="search" placeholder="Buscar por nome, coleção ou criador" onChange={(event) => liveSearch(event.currentTarget.value)} className="field-control" />
            <button type="submit" className="rounded-sm bg-primary px-5 font-bold text-primary-foreground hover:bg-primary/85">Buscar</button>
          </form>
        </div>
      )}
    </header>
  )
}
