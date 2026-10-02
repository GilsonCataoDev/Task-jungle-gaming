import { HomeContent } from "@/features/home/home-content"

const noop = () => undefined

/**
 * Fundo dos modais (login, cadastro, confirmação): a home, como no Figma. Fica `inert` e escondida
 * de leitores de tela, então só o diálogo é interativo.
 */
export function AuthBackdrop() {
  return (
    <div inert aria-hidden>
      <HomeContent search={{}} onChange={noop} onReset={noop} />
    </div>
  )
}
