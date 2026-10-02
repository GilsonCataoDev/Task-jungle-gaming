import { expect, test } from "@playwright/test"
import { addToCartFromDetail, apiCartUnits, DEMO, login, logout, NFT, shown } from "./helpers"

/** Carrinho do visitante: vive no servidor simulado (dono = id do navegador), sobrevive a refresh e passa para a conta no login. */
test.describe("carrinho", () => {
  test("visitante: quantidades, remoção e persistência após refresh", async ({ page }) => {
    await addToCartFromDetail(page, NFT.emerald.id) // sem login
    const item = page.getByRole("region", { name: "Itens do carrinho" })
    await expect(shown(item.getByText(NFT.emerald.name)).first()).toBeVisible()

    await shown(item.getByRole("button", { name: "Aumentar quantidade" })).first().click()
    await expect(shown(item.getByLabel("Quantidade")).first()).toHaveText("2")
    await expect.poll(() => apiCartUnits(page)).toBe(2) // o servidor já gravou (a tela é otimista)
    await page.reload()
    await expect(shown(item.getByLabel("Quantidade")).first()).toHaveText("2") // persistiu no refresh

    await shown(page.getByRole("button", { name: `Remover ${NFT.emerald.name}` })).first().click()
    await expect(page.getByRole("heading", { name: "Seu carrinho está vazio" })).toBeVisible()
    await expect.poll(() => apiCartUnits(page)).toBe(0)
    await page.reload()
    await expect(page.getByRole("heading", { name: "Seu carrinho está vazio" })).toBeVisible()
  })

  test("itens do visitante são preservados e somados aos da conta ao entrar", async ({ page }) => {
    // Conta com 1 Emerald no carrinho.
    await login(page, DEMO)
    await addToCartFromDetail(page, NFT.emerald.id)
    await logout(page)

    // Como visitante: 1 Emerald + 1 Violet.
    await addToCartFromDetail(page, NFT.emerald.id)
    await addToCartFromDetail(page, NFT.violet.id)

    await login(page, DEMO, "/carrinho")
    const item = page.getByRole("region", { name: "Itens do carrinho" })
    await expect(shown(item.getByText(NFT.violet.name)).first()).toBeVisible() // veio do visitante
    await expect(shown(item.getByLabel("Quantidade")).first()).toHaveText("2") // Emerald: 1 da conta + 1 do visitante
  })
})
