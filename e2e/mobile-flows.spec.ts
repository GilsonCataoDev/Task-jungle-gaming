import { expect, test } from "@playwright/test"
import { apiOrders, buyButton, confirmPurchase, DEMO, goToCheckout, logout, NFT, revealCollectorForm, waitForApp } from "./helpers"

/**
 * Fluxos principais no layout mobile (projeto "mobile", 390px). As specs de catálogo, auth, conta, detalhe e a11y
 * exercitam a interface desktop (filtros laterais, cabeçalho completo); aqui ficam os equivalentes mobile, com a
 * navegação inferior, o formulário do checkout recolhido e a barra fixa "Comprar NFT".
 */
test.describe("fluxos principais no mobile", () => {
  test("rota privada leva ao login e volta ao destino; menu inferior e logout", async ({ page }) => {
    await page.goto("/perfil")
    await expect(page).toHaveURL(/\/login\?redirect=%2Fperfil/)
    const dialog = page.getByRole("dialog", { name: "Entrar" })
    await dialog.getByLabel("E-mail", { exact: true }).fill(DEMO.email)
    await dialog.getByLabel("Senha", { exact: true }).fill("senha-errada")
    await dialog.getByRole("button", { name: "Entrar", exact: true }).click()
    await expect(dialog.getByRole("alert")).toContainText("E-mail ou senha incorretos")
    await dialog.getByLabel("Senha", { exact: true }).fill(DEMO.password)
    await dialog.getByRole("button", { name: "Entrar", exact: true }).click()
    await expect(page).toHaveURL(/\/perfil$/)
    await expect(page.getByRole("heading", { level: 1, name: "Perfil do colecionador", exact: true })).toBeVisible()
    await logout(page)
    await page.goto("/perfil")
    await expect(page).toHaveURL(/\/login\?redirect=%2Fperfil/)
    expect(await page.evaluate(() => localStorage.getItem("kurio:token"))).toBeNull()
  })

  test("cadastro valida os campos e rejeita e-mail já cadastrado", async ({ page }) => {
    await page.goto("/cadastro")
    const dialog = page.getByRole("dialog", { name: "Criar conta" })
    await dialog.getByRole("button", { name: /^Criar (conta|perfil)$/ }).click()
    await expect(dialog.getByText("Informe um nome de usuário com ao menos 3 caracteres.")).toBeVisible()
    await dialog.getByLabel("Nome de usuário", { exact: true }).fill("mobile_user")
    await dialog.getByLabel("E-mail", { exact: true }).fill(DEMO.email)
    await dialog.getByLabel("Senha", { exact: true }).fill("Mobile@1234")
    await dialog.getByLabel("Confirmar senha").fill("Mobile@1234")
    await dialog.getByRole("button", { name: /^Criar (conta|perfil)$/ }).click()
    await expect(dialog.getByText("Este e-mail já está cadastrado.")).toBeVisible()
  })

  test("catálogo: busca pela URL, detalhe, comprar e carrinho", async ({ page }) => {
    await page.goto("/mercado?search=Emerald")
    await waitForApp(page)
    await page.getByRole("link", { name: `Ver ${NFT.emerald.name}` }).first().click()
    await expect(page.getByRole("heading", { level: 1, name: NFT.emerald.name })).toBeVisible()
    await buyButton(page).click() // visitante compra sem login: o carrinho é dele
    await expect(page).toHaveURL(/\/carrinho$/)
    await expect(page.getByText("1.206 ETH", { exact: true }).filter({ visible: true }).first()).toBeVisible()
    await page.getByRole("link", { name: "Conectar e finalizar" }).click()
    await expect(page).toHaveURL(/\/login\?redirect=%2Fpagamento/)
  })

  test("pagamento: dados do colecionador recolhidos, validação e compra", async ({ page }) => {
    await goToCheckout(page)
    const main = page.getByRole("main")
    await expect(main.getByLabel("Nome de exibição")).toBeHidden() // recolhido por padrão no mobile
    await revealCollectorForm(page)
    await main.getByLabel("Nome de exibição").fill("")
    await confirmPurchase(page)
    await expect(main.getByText("Informe o nome de exibição.")).toBeVisible()
    expect(await apiOrders(page)).toHaveLength(0)

    await main.getByLabel("Nome de exibição").fill("Nova Sato")
    await confirmPurchase(page)
    await expect(page).toHaveURL(/\/confirmacao\/GM-\d+/)
    await expect(page.getByRole("dialog", { name: "Recibo do pedido" }).getByRole("heading", { level: 1, name: "Seus NFTs agora estão na sua carteira" })).toBeVisible({ timeout: 10_000 })
  })
})
