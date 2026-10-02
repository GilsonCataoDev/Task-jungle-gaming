import { Link, useRouterState } from "@tanstack/react-router"
import { Heart, Home, ShoppingCart, User } from "lucide-react"
import { ScanIcon } from "@/components/icons"
import { useSession } from "@/features/auth/hooks"
import { useCart } from "@/features/cart/hooks"
import { cn } from "@/lib/utils"

/** Só nas telas "de navegação" do mobile; detalhe, carrinho, checkout e login têm barra própria. */
const SHOWN_ON = ["/", "/mercado", "/perfil", "/carteiras", "/atividade", "/lista-de-interesse", "/criadores", "/aprenda"]

export function BottomNav() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const { user } = useSession()
  const { data: cart } = useCart()
  if (!SHOWN_ON.includes(pathname)) return null
  const count = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0
  const item = "grid size-11 place-items-center rounded-full text-tan hover:text-primary"

  return (
    <nav aria-label="Navegação inferior" className="fixed inset-x-3 bottom-3 z-40 md:hidden">
      <div className="relative flex h-16 items-center justify-between rounded-[2rem] bg-card px-6 shadow-[0_-8px_24px_rgba(0,0,0,0.45)]">
        <Link to="/" aria-label="Início" aria-current={pathname === "/" ? "page" : undefined} className={cn(item, pathname === "/" && "text-primary")}>
          <Home className="size-6" aria-hidden />
        </Link>
        <Link to="/lista-de-interesse" aria-label="Lista de interesse" aria-current={pathname === "/lista-de-interesse" ? "page" : undefined} className={cn(item, pathname === "/lista-de-interesse" && "text-primary")}>
          <Heart className="size-6" aria-hidden />
        </Link>
        <Link to="/mercado" aria-label="Explorar o mercado" className="-mt-9 grid size-16 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_6px_20px_rgba(210,138,76,0.35)] ring-8 ring-background">
          <ScanIcon className="size-7" />
        </Link>
        <Link to="/carrinho" aria-label={`Carrinho com ${count} ${count === 1 ? "item" : "itens"}`} className={cn(item, "relative")}>
          <ShoppingCart className="size-6" aria-hidden />
          {count > 0 && <span aria-hidden className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-primary text-[10px] font-bold leading-none text-primary-foreground">{count}</span>}
        </Link>
        <Link to={user ? "/perfil" : "/login"} aria-label={user ? "Meu perfil" : "Entrar"} aria-current={pathname === "/perfil" ? "page" : undefined} className={cn(item, pathname === "/perfil" && "text-primary")}>
          <User className="size-6" aria-hidden />
        </Link>
      </div>
    </nav>
  )
}
