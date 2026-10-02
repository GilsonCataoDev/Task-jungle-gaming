/**
 * Portão dos mocks. O app renderiza imediatamente (a primeira pintura não espera os ~160 kB do MSW),
 * mas toda requisição à API e a conexão do socket esperam este portão abrir, para nunca escaparem
 * do MSW. Abre quando o worker termina de iniciar (ou falha), ou já nasce aberto sem mocks.
 */
const mocksEnabled = import.meta.env.VITE_ENABLE_MOCKS !== "false"

let release: () => void = () => {}

export const mockGate: Promise<void> = mocksEnabled
  ? new Promise<void>((resolve) => {
      release = resolve
    })
  : Promise.resolve()

export const openMockGate = () => release()
