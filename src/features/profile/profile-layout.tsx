import { Link, useNavigate } from "@tanstack/react-router"
import { AlertTriangle, Download, Heart, LogOut, MapPin, ShoppingCart, TrendingUp, User } from "lucide-react"
import type { ComponentType, ReactNode } from "react"
import { useLogout } from "@/features/auth/hooks"
import { cn } from "@/lib/utils"

type Item = { label: string; icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>; to?: "/perfil" | "/carteiras" | "/atividade" | "/lista-de-interesse" }

const ITEMS: Item[] = [
  { label: "Dados do perfil", icon: User, to: "/perfil" },
  { label: "Carteiras", icon: MapPin, to: "/carteiras" },
  { label: "Atividade", icon: ShoppingCart, to: "/atividade" },
  { label: "Lista de interesse", icon: Heart, to: "/lista-de-interesse" },
  // Ainda sem tela na demonstração: aparecem como no Figma, mas desabilitados.
  { label: "Ofertas", icon: TrendingUp },
  { label: "Arquivos baixados", icon: Download },
  { label: "Suporte", icon: AlertTriangle },
]

/** Moldura das telas de conta: menu "Meu perfil" à esquerda (desktop) ou em abas roláveis (mobile). */
export function ProfileLayout({ active, title, children }: { active: NonNullable<Item["to"]>; title: string; children: ReactNode }) {
  const logout = useLogout()
  const navigate = useNavigate()

  return (
    <div className="page-shell grid grid-cols-[minmax(0,1fr)] gap-8 pb-8 pt-6 md:pt-8 lg:grid-cols-[19.375rem_minmax(0,1fr)] lg:gap-12">
      <nav aria-label="Meu perfil" className="h-fit min-w-0 bg-card p-2 lg:p-0 lg:pb-0">
        <h2 className="hidden px-3 pb-2 pt-3 text-lg font-bold lg:block">Meu perfil</h2>
        <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
          {ITEMS.map(({ label, icon: Icon, to }) => {
            const isActive = to === active
            const content = (
              <>
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="whitespace-nowrap">{label}</span>
              </>
            )
            const base = "flex h-11 items-center gap-3 px-4 text-sm lg:border-l-4 lg:border-transparent"
            return (
              <li key={label}>
                {to ? (
                  <Link to={to} aria-current={isActive ? "page" : undefined} className={cn(base, isActive ? "bg-background font-bold text-primary lg:border-primary lg:bg-transparent" : "text-primary/90 hover:text-primary")}>{content}</Link>
                ) : (
                  <span aria-disabled className={cn(base, "cursor-not-allowed text-primary/50")} title="Em breve na demonstração">{content}</span>
                )}
              </li>
            )
          })}
          <li className="lg:border-t lg:border-line">
            <button
              type="button"
              disabled={logout.isPending}
              onClick={() => logout.mutate(undefined, { onSettled: () => void navigate({ to: "/" }) })}
              className="flex h-11 w-full items-center gap-3 px-4 text-sm font-bold text-primary hover:bg-primary/10 lg:border-l-4 lg:border-transparent"
            >
              <LogOut className="size-4" aria-hidden /> Sair
            </button>
          </li>
        </ul>
      </nav>

      <section aria-labelledby="titulo-conta" className="min-w-0">
        <h1 id="titulo-conta" className="text-lg font-bold">{title}</h1>
        {children}
      </section>
    </div>
  )
}
