import { expect, type Locator, type Page } from "@playwright/test"

export const DEMO = { email: "demo@kurio.dev", password: "Demo@1234", name: "Nova Sato" }
export const MAYA = { email: "maya@kurio.dev", password: "Maya@1234", name: "Maya Lin" }

/** NFTs das fixtures (ver src/mocks/fixtures.ts). */
export const NFT = {
  emerald: { id: "emerald-ape-042", name: "Emerald Ape #042", price: "1.19" },
  violet: { id: "violet-nomad-314", name: "Violet Nomad #314", price: "1.39" },
  golden: { id: "golden-beat-207", name: "Golden Beat #207", price: "0.99" },
  /** Esgotado de propósito. */
  soldOut: { id: "crimson-nomad-727", name: "Crimson Nomad #727" },
}
/** Taxa de rede fixa do mock. */
export const FEE = "0.016"

/** Painel do servidor simulado (window.__mocks). Atua no "servidor", nunca na UI. */
export type MockScenario = "normal" | "slow" | "timeout" | "server-error" | "mutation-error" | "session-expired" | "price-change" | "payment-rejected" | "inventory-conflict"

export async function setScenario(page: Page, scenario: MockScenario) {
  await page.evaluate((name) => window.__mocks.setScenario(name), scenario)
}

/** `window.__mocks` só existe depois de o MSW estar ativo: é o sinal de "mocks prontos". */
export async function waitForMocks(page: Page) {
  await page.waitForFunction(() => typeof window.__mocks !== "undefined")
}

/** Espera o app subir: MSW ativo e socket conectado. */
export async function waitForApp(page: Page) {
  await waitForMocks(page)
  await expect(page.getByRole("status").filter({ hasText: "Ao vivo" })).toBeAttached()
}

/** Só o que está visível (versões mobile/desktop do mesmo conteúdo coexistem no DOM). */
export const shown = (locator: Locator) => locator.filter({ visible: true })

/** Faz login pelo modal de /login (e confere que voltou para `redirect`). */
export async function login(page: Page, user: { email: string; password: string } = DEMO, redirect = "/") {
  await page.goto(`/login?redirect=${encodeURIComponent(redirect)}`)
  const dialog = page.getByRole("dialog", { name: "Entrar" })
  await dialog.getByLabel("E-mail", { exact: true }).fill(user.email)
  await dialog.getByLabel("Senha", { exact: true }).fill(user.password)
  await dialog.getByRole("button", { name: "Entrar", exact: true }).click()
  await expect(page).toHaveURL((url) => url.pathname + url.search === redirect)
}

export async function logout(page: Page) {
  await page.getByRole("button", { name: "Sair", exact: true }).first().click()
  await expect(page.getByRole("link", { name: "Entrar" }).first()).toBeVisible()
}

/** Abre o NFT, escolhe "Comprar" e cai no carrinho. */
export async function addToCartFromDetail(page: Page, nftId: string) {
  await page.goto(`/nfts/${nftId}`)
  await page.getByRole("button", { name: "Comprar", exact: true }).click()
  await expect(page).toHaveURL(/\/carrinho$/)
}

/** Login + item no carrinho + tela de pagamento (o formulário já vem preenchido com a carteira principal). */
export async function goToCheckout(page: Page, nftId = NFT.emerald.id, user = DEMO) {
  await login(page, user)
  await addToCartFromDetail(page, nftId)
  await page.getByRole("link", { name: "Conectar e finalizar" }).click()
  await expect(page).toHaveURL(/\/pagamento$/)
  await expect(page.getByRole("button", { name: "Confirmar compra" })).toBeEnabled()
}

export const confirmPurchase = (page: Page) => page.getByRole("button", { name: "Confirmar compra" }).click()

/** Chamadas diretas ao "backend" simulado, autenticadas com o token da sessão atual. */
export async function apiOrders(page: Page): Promise<{ id: string; status: string }[]> {
  return page.evaluate(async () => {
    const token = localStorage.getItem("kurio:token")
    const response = await fetch("/api/orders", { headers: { Authorization: `Bearer ${token}` } })
    return (await response.json()).items
  })
}

export function prices(texts: string[]): number[] {
  return texts.map((text) => Number(/(\d+\.\d+) ETH/.exec(text)?.[1]))
}

declare global {
  interface Window {
    __mocks: {
      setScenario(name: MockScenario): void
      getScenario(): MockScenario
      reset(): void
      updateNft(id: string, patch: { priceEth?: string; available?: number }): void
      emit(event: "nft.updated" | "order.updated", payload: Record<string, unknown>): void
      disconnectSockets(): void
      connectedSockets(): number
    }
  }
}
