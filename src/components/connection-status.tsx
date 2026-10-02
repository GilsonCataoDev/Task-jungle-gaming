import { useRealtime } from "@/realtime/realtime-provider"
import { cn } from "@/lib/utils"

const LABEL = { online: "Ao vivo", connecting: "Conectando…", offline: "Reconectando…" } as const

/**
 * Estado do tempo real. Conectado, fica só para leitores de tela (o Figma não tem esse indicador);
 * se cair ou estiver conectando, aparece um aviso visível, sempre com texto (nunca só cor).
 */
export function ConnectionStatus() {
  const { status } = useRealtime()
  return (
    <span
      role="status"
      data-testid="connection-status"
      className={cn(
        status === "online"
          ? "sr-only"
          : "fixed left-3 top-3 z-50 rounded-sm border border-line bg-card px-3 py-1 text-xs text-tan shadow-lg",
      )}
    >
      {LABEL[status]}
    </span>
  )
}
