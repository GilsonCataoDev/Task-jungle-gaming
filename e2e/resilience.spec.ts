import { expect, test } from "@playwright/test"
import { confirmPurchase, goToCheckout, MAYA, login, logout, NFT, shown, waitForApp } from "./helpers"

const { emerald } = NFT
const RECEIPT_TITLE = "Seus NFTs agora estão na sua carteira"

test.describe("resiliência do tempo real", () => {
  test("eventos duplicados ou antigos não regridem o estado nem repetem efeitos", async ({ page }) => {
    await page.goto(`/nfts/${emerald.id}`)
    await waitForApp(page)
    const price = (value: string) => shown(page.getByText(`${value} ETH`, { exact: true })).first()
    await expect(price("1.19")).toBeVisible()
    const emit = (version: number, priceEth: string) =>
      page.evaluate(([v, p, id]) => window.__mocks.emit("nft.updated", { id, version: v, priceEth: p, available: 3 }), [version, priceEth, emerald.id] as const)
    const liveNote = page.getByRole("status").filter({ hasText: "Preço atualizado ao vivo" })

    await emit(5, "0.60") // evento novo: aplica
    await expect(price("0.60")).toBeVisible()
    await expect(liveNote).toContainText("era 1.19 ETH")

    await emit(3, "0.10") // atrasado (versão menor): ignorado
    await page.waitForTimeout(300)
    await expect(price("0.60")).toBeVisible()

    await emit(5, "0.99") // duplicado (mesma versão): ignorado, efeito não se repete
    await page.waitForTimeout(300)
    await expect(price("0.60")).toBeVisible()
    await expect(liveNote).toContainText("era 1.19 ETH")

    await emit(6, "0.70") // versão seguinte: aplica de novo
    await expect(price("0.70")).toBeVisible()
    await expect(liveNote).toContainText("era 0.60 ETH")
  })

  test("desconexão: ao reconectar, o REST recupera o que o socket perdeu", async ({ page }) => {
    await page.goto(`/nfts/${emerald.id}`)
    await waitForApp(page)
    await expect(shown(page.getByText("1.19 ETH", { exact: true })).first()).toBeVisible()

    // Derruba o socket e muda o preço no servidor enquanto o cliente está offline (o evento se perde).
    await page.evaluate((id) => {
      window.__mocks.disconnectSockets()
      window.__mocks.updateNft(id, { priceEth: "1.55" })
    }, emerald.id)
    await expect(page.getByRole("status").filter({ hasText: "Reconectando…" })).toBeVisible()
    await expect(page.getByRole("status").filter({ hasText: "Ao vivo" })).toBeAttached({ timeout: 10_000 })
    await expect(shown(page.getByText("1.55 ETH", { exact: true })).first()).toBeVisible() // veio do REST, não do evento perdido
    expect(await page.evaluate(() => window.__mocks.connectedSockets())).toBe(1)
  })

  test("pedido pendente é recuperado depois de recarregar a página", async ({ page }) => {
    await goToCheckout(page)
    await confirmPurchase(page)
    const receipt = page.getByRole("dialog", { name: "Recibo do pedido" })
    await expect(page).toHaveURL(/\/confirmacao\/GM-\d+/)
    await expect(receipt.getByRole("heading", { level: 1 })).not.toHaveText(RECEIPT_TITLE) // ainda em andamento

    await page.reload() // os timers do "servidor" morrem junto com a página
    await expect(receipt.getByText(/^Pedido GM-\d+/)).toBeVisible()
    await expect(receipt.getByRole("heading", { level: 1, name: RECEIPT_TITLE })).toBeVisible({ timeout: 10_000 })
    await expect(receipt.getByText(/^0x[0-9a-f]{4}…[0-9a-f]{4}$/)).toBeVisible()
  })

  test("order.updated: transições chegam ao vivo e eventos antigos não regridem o pedido", async ({ page }) => {
    await goToCheckout(page)
    await confirmPurchase(page)
    await expect(page).toHaveURL(/\/confirmacao\/GM-\d+/)
    const orderId = /GM-\d+/.exec(page.url())![0]
    const receipt = page.getByRole("dialog", { name: "Recibo do pedido" })

    await expect(receipt.getByRole("heading", { level: 1, name: RECEIPT_TITLE })).toBeVisible({ timeout: 10_000 })
    // Evento atrasado (versão 2 < 3) chega depois da confirmação: não pode voltar para "processando".
    await page.evaluate((id) => window.__mocks.emit("order.updated", { id, version: 2, status: "processing", transactionId: null }), orderId)
    await page.waitForTimeout(300)
    await expect(receipt.getByRole("heading", { level: 1, name: RECEIPT_TITLE })).toBeVisible()
    await expect(receipt.getByText(/^0x[0-9a-f]{4}…[0-9a-f]{4}$/)).toBeVisible()
  })

  test("pedido de outro usuário não é acessível (sem vazar existência)", async ({ page }) => {
    await goToCheckout(page)
    await confirmPurchase(page)
    await expect(page).toHaveURL(/\/confirmacao\/GM-\d+/)
    const path = new URL(page.url()).pathname
    await page.getByRole("dialog", { name: "Recibo do pedido" }).getByRole("button", { name: "Fechar" }).click()

    await logout(page)
    await login(page, MAYA, path)
    await expect(page.getByRole("dialog", { name: "Recibo do pedido" }).getByRole("alert")).toContainText("Pedido não encontrado.")
  })
})
