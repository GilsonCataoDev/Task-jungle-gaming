import { expect, test } from "@playwright/test"
import { addToCartFromDetail, confirmPurchase, goToCheckout, login, NFT, shown, waitForApp } from "./helpers"

const { emerald } = NFT

test.describe("tempo real (Socket.IO)", () => {
  test("preço muda no servidor durante o checkout: total atualiza sem recarregar e a compra usa o valor novo", async ({ page }) => {
    await goToCheckout(page)
    await expect(shown(page.getByText("1.206 ETH", { exact: true })).first()).toBeVisible()

    // O "servidor" altera o preço e emite nft.updated pelo socket (a UI não é tocada).
    await page.evaluate((id) => window.__mocks.updateNft(id, { priceEth: "1.50" }), emerald.id)
    await expect(shown(page.getByText("1.516 ETH", { exact: true })).first()).toBeVisible()

    await confirmPurchase(page)
    const receipt = page.getByRole("dialog", { name: "Recibo do pedido" })
    await expect(receipt.getByText("1.516 ETH").first()).toBeVisible({ timeout: 10_000 })
  })

  test("item esgota durante o checkout: aviso aparece e a compra é bloqueada", async ({ page }) => {
    await goToCheckout(page)
    await page.evaluate((id) => window.__mocks.updateNft(id, { available: 0 }), emerald.id)
    await expect(page.getByRole("alert").filter({ hasText: "indisponível" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Confirmar compra" })).toBeDisabled()
  })

  test("preço ao vivo na página de detalhe e no carrinho", async ({ page }) => {
    await login(page)
    await addToCartFromDetail(page, emerald.id)
    await expect(shown(page.getByText("1.19 ETH", { exact: true })).first()).toBeVisible()
    await page.evaluate((id) => window.__mocks.updateNft(id, { priceEth: "1.80" }), emerald.id)
    await expect(shown(page.getByText("1.80 ETH", { exact: true })).first()).toBeVisible()

    await page.goto(`/nfts/${NFT.golden.id}`)
    await waitForApp(page)
    await expect(shown(page.getByText("0.99 ETH", { exact: true })).first()).toBeVisible()
    await page.evaluate((id) => window.__mocks.updateNft(id, { priceEth: "0.90" }), NFT.golden.id)
    await expect(shown(page.getByText("0.90 ETH", { exact: true })).first()).toBeVisible()
    await expect(page.getByRole("status").filter({ hasText: "Preço atualizado ao vivo" })).toBeVisible()
  })

  test("catálogo reflete mudança de preço e de estoque em tempo real", async ({ page }) => {
    await page.goto("/mercado?search=Golden%20Beat")
    await waitForApp(page)
    const card = page.getByRole("article", { name: NFT.golden.name })
    await expect(card).toContainText("0.99 ETH")
    await page.evaluate((id) => window.__mocks.updateNft(id, { priceEth: "0.77", available: 0 }), NFT.golden.id)
    await expect(card).toContainText("Esgotado")
    await page.evaluate((id) => window.__mocks.updateNft(id, { priceEth: "0.77", available: 3 }), NFT.golden.id)
    await expect(card).toContainText("0.77 ETH")
  })
})
