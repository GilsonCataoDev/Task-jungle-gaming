import { X } from "lucide-react"
import { useEffect, useRef, type ReactNode } from "react"
import { cn } from "@/lib/utils"

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

type Props = {
  /** Nome acessível do diálogo. */
  label: string
  onClose: () => void
  children: ReactNode
  className?: string
}

/**
 * Modal sobre `<dialog>` nativo: `showModal()` deixa o resto da página inerte e devolve o foco ao
 * elemento que o abriu. Em cima disso: foco preso (o nativo deixa o Tab escapar para o navegador),
 * Esc e clique no fundo fecham, e no mobile ele ocupa a tela toda (como no Figma).
 * O botão de fechar fica por último no DOM para o foco inicial cair no primeiro campo.
 */
export function Modal({ label, onClose, children, className }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    // Quem tinha o foco (o botão/link que abriu o modal): o <dialog> só o devolve se ainda estiver no
    // DOM ao fechar, e aqui ele já saiu, então restauramos nós mesmos.
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (!element.open) element.showModal()
    // O foco inicial do <dialog> é o 1º elemento focável (a aba do topo): leva ao campo marcado.
    element.querySelector<HTMLElement>("[data-autofocus]")?.focus()

    function onCancel(event: Event) {
      event.preventDefault() // quem fecha é o app (navegação); evita fechar sem trocar a rota
      closeRef.current()
    }
    function trapFocus(event: KeyboardEvent) {
      if (event.key !== "Tab" || !element) return
      const items = [...element.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((item) => item.offsetParent !== null)
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    function closeOnBackdrop(event: MouseEvent) {
      if (event.target === element) closeRef.current()
    }

    element.addEventListener("cancel", onCancel)
    element.addEventListener("keydown", trapFocus)
    element.addEventListener("click", closeOnBackdrop)
    return () => {
      element.removeEventListener("cancel", onCancel)
      element.removeEventListener("keydown", trapFocus)
      element.removeEventListener("click", closeOnBackdrop)
      if (element.open) element.close()
      if (opener?.isConnected) opener.focus()
    }
  }, [])

  return (
    <dialog
      ref={dialog}
      aria-label={label}
      className={cn(
        "m-auto max-h-[calc(100dvh-2rem)] w-[31.25rem] max-w-[calc(100%-2rem)] overflow-y-auto border-0 bg-card p-0 text-foreground backdrop:bg-black/65",
        "max-md:fixed max-md:inset-0 max-md:m-0 max-md:h-dvh max-md:max-h-none max-md:w-full max-md:max-w-none max-md:rounded-[1.75rem] max-md:bg-background",
        className,
      )}
    >
      <div className="relative">
        {children}
        <button type="button" onClick={onClose} aria-label="Fechar" className="absolute right-4 top-4 grid size-8 place-items-center text-primary hover:text-foreground">
          <X className="size-5" aria-hidden />
        </button>
      </div>
      <div aria-hidden className="h-2 bg-primary max-md:hidden" />
    </dialog>
  )
}
