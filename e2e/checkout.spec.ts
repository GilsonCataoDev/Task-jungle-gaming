import { expect, test } from "@playwright/test"
import { addToCartFromDetail, apiOrders, confirmPurchase, FEE, goToCheckout, isNarrow, login, NFT, revealCollectorForm, setScenario, shown } from "./helpers"

test.describe("checkout e falhas de pagamento", () => {
  test("o formulário vem preenchido com a carteira principal e a conta", async ({ page }) => {
    await goToCheckout(page)
    await revealCollectorForm(page)
    const main = page.getByRole("main")
    await expect(main.getByLabel("Nome de exibição")).toHaveValue("Nova Sato")
    await expect(main.getByLabel("Nome de usuário")).toHaveValue("novasato")
    await expect(main.locator("select#network")).toHaveValue("Ethereum")
    await expect(main.getByLabel("Tipo de carteira")).toHaveValue("MetaMask")
    await expect(main.getByLabel("Código de indicação")).toHaveValue("KURIO-NOVA")
    await expect(main.getByRole("radio", { name: "MetaMask" })).toBeChecked()
    // Lista os NFTs e usa a taxa estimada do Figma (a lista de itens só existe no layout desktop).
    if (!isNarrow(page)) {
      await expect(shown(main.getByText(NFT.emerald.name)).first()).toBeVisible()
      await expect(shown(main.getByText(`${FEE} ETH`, { exact: true })).first()).toBeVisible()
    }
  })

  test("'Usar outra carteira?' troca os dados para a carteira secundária e o recibo mostra a carteira escolhida", async ({ page }) => {
    await goToCheckout(page)
    await revealCollectorForm(page)
    const main = page.getByRole("main")
    await main.getByRole("checkbox", { name: /Usar outra carteira/ }).check()
    await expect(main.getByLabel("Endereço da carteira")).toHaveValue(/^0x3C9a/)
    await expect(main.locator("select#network")).toHaveValue("Polygon")
    await main.getByRole("radio", { name: "Coinbase Wallet" }).check()

    await confirmPurchase(page)
    const receipt = page.getByRole("dialog", { name: "Recibo do pedido" })
    await expect(receipt.getByRole("heading", { level: 1, name: "Seus NFTs agora estão na sua carteira" })).toBeVisible({ timeout: 10_000 })
    await expect(receipt.getByText("Coinbase Wallet")).toBeVisible()
    await expect(receipt.getByText(/na Ethereum/)).toBeVisible()
  })

  test("transação recusada pela carteira mantém o usuário no checkout e permite tentar de novo", async ({ page }) => {
    await goToCheckout(page)
    await setScenario(page, "payment-rejected")
    await confirmPurchase(page)
    await expect(page.getByRole("alert")).toContainText("Transação recusada pela carteira")
    await expect(page).toHaveURL(/\/pagamento$/)
    expect(await apiOrders(page)).toHaveLength(0)

    await setScenario(page, "normal")
    await confirmPurchase(page)
    await expect(page).toHaveURL(/\/confirmacao\/GM-\d+/)
    expect(await apiOrders(page)).toHaveLength(1)
  })

  test("cliques duplicados criam um único pedido", async ({ page }) => {
    await goToCheckout(page)
    await setScenario(page, "slow") // dá tempo de clicar de novo antes da resposta
    const confirm = page.getByRole("button", { name: "Confirmar compra" })
    await confirm.dblclick()
    await page.keyboard.press("Enter")
    await expect(page).toHaveURL(/\/confirmacao\/GM-\d+/, { timeout: 15_000 })
    expect(await apiOrders(page)).toHaveLength(1)
  })

  test("timeout: tentar de novo recupera o MESMO pedido (idempotência)", async ({ page }) => {
    test.setTimeout(60_000)
    await goToCheckout(page)
    await setScenario(page, "timeout") // 1x: o servidor cria o pedido, mas a resposta chega depois do timeout
    await confirmPurchase(page)

    const alert = page.getByRole("alert").filter({ hasText: "demorou demais" })
    await expect(alert).toBeVisible({ timeout: 15_000 })
    await expect(alert).toContainText("não será cobrado duas vezes")
    expect(await apiOrders(page)).toHaveLength(1) // o pedido JÁ existe no servidor

    await alert.getByRole("button", { name: "Tentar novamente" }).click()
    await expect(page).toHaveURL(/\/confirmacao\/GM-\d+/)
    expect(await apiOrders(page)).toHaveLength(1) // continua sendo um só
  })

  test("contrato de idempotência: mesma chave repete o pedido; conteúdo diferente gera conflito", async ({ page }) => {
    await login(page)
    const result = await page.evaluate(async () => {
      const token = localStorage.getItem("kurio:token")
      const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      await fetch("/api/cart/items", { method: "POST", headers, body: JSON.stringify({ nftId: "emerald-ape-042" }) })
      const quote = await (await fetch("/api/quote", { method: "POST", headers, body: "{}" })).json()
      const wallets = (await (await fetch("/api/wallets", { headers })).json()).items
      const collector = { displayName: "A B", username: "ab", network: "Ethereum", profileName: "AB", address: wallets[0].address, secondaryRef: "", walletType: "MetaMask", referralCode: "X1", email: "a@b.co", ens: "ab", note: "" }
      const body = { walletId: wallets[0].id, provider: "MetaMask", collector, coupon: null, expectedTotalEth: quote.totalEth }
      const post = (payload: unknown, key: string) => fetch("/api/orders", { method: "POST", headers: { ...headers, "Idempotency-Key": key }, body: JSON.stringify(payload) })

      const first = await post(body, "chave-1")
      const firstOrder = await first.json()
      const replay = await post(body, "chave-1")
      const replayOrder = await replay.json()
      const conflict = await post({ ...body, coupon: "KURIO10" }, "chave-1")
      const missingKey = await fetch("/api/orders", { method: "POST", headers, body: JSON.stringify(body) })
      return {
        firstStatus: first.status,
        replayStatus: replay.status,
        sameOrder: firstOrder.id === replayOrder.id,
        replayed: replay.headers.get("Idempotent-Replayed"),
        conflictStatus: conflict.status,
        conflictCode: (await conflict.json()).code,
        missingKeyStatus: missingKey.status,
      }
    })
    expect(result).toEqual({ firstStatus: 201, replayStatus: 200, sameOrder: true, replayed: "true", conflictStatus: 409, conflictCode: "idempotency_conflict", missingKeyStatus: 400 })
    expect(await apiOrders(page)).toHaveLength(1)
  })

  test("preço muda antes de confirmar: total é atualizado e o usuário precisa confirmar de novo", async ({ page }) => {
    await goToCheckout(page)
    await setScenario(page, "price-change") // 1x: o servidor sobe o preço em 10% no momento do pedido
    await confirmPurchase(page)
    await expect(page.getByRole("alert").filter({ hasText: "O total mudou" })).toBeVisible()
    await expect(page).toHaveURL(/\/pagamento$/)
    // 1.19 + 10% = 1.309; com a taxa de rede, 1.325, em decimal exato.
    await expect(shown(page.getByText("1.325 ETH", { exact: true })).first()).toBeVisible()
    expect(await apiOrders(page)).toHaveLength(0)

    await confirmPurchase(page)
    await expect(page).toHaveURL(/\/confirmacao\//)
    await expect(page.getByRole("dialog", { name: "Recibo do pedido" }).getByText("1.325 ETH").first()).toBeVisible()
  })

  test("conflito de estoque bloqueia a compra e leva de volta ao carrinho", async ({ page }) => {
    await goToCheckout(page)
    await setScenario(page, "inventory-conflict") // 1x: outro comprador leva o último item
    await confirmPurchase(page)
    await expect(page.getByRole("alert").filter({ hasText: "indisponíveis" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Confirmar compra" })).toBeDisabled()
    expect(await apiOrders(page)).toHaveLength(0)
    await page.getByRole("link", { name: "Voltar ao carrinho" }).first().click()
    await expect(page).toHaveURL(/\/carrinho$/)
  })

  test("validação do formulário do colecionador (cliente e servidor)", async ({ page }) => {
    await goToCheckout(page)
    await revealCollectorForm(page)
    const main = page.getByRole("main")
    await main.getByLabel("Nome de exibição").fill("")
    await main.getByLabel("Código de indicação").fill("")
    await main.getByLabel("Endereço da carteira").fill("0x123")
    await confirmPurchase(page)
    await expect(main.getByText("Informe o nome de exibição.")).toBeVisible()
    await expect(main.getByText("Informe o código de indicação.")).toBeVisible()
    await expect(main.getByText(/Endereço inválido/)).toBeVisible()
    await expect(main.getByLabel("Nome de exibição")).toHaveAttribute("aria-invalid", "true")
    await expect(main.getByLabel("Nome de exibição")).toHaveAccessibleDescription("Informe o nome de exibição.")
    expect(await apiOrders(page)).toHaveLength(0)
  })

  test("cupom válido aplica desconto no carrinho e no checkout; cupom inválido bloqueia", async ({ page }) => {
    await login(page)
    await addToCartFromDetail(page, NFT.emerald.id)
    await page.getByRole("textbox", { name: "Código promocional" }).fill("KURIO10")
    await page.getByRole("button", { name: "Aplicar" }).click()
    await expect(page.getByText("Cupom KURIO10 aplicado.")).toBeVisible()
    await expect(page.getByText("(-) 0.119")).toBeVisible()
    await expect(page.getByText("1.087 ETH", { exact: true })).toBeVisible() // 1.19 - 0.119 + 0.016

    await page.getByRole("link", { name: "Conectar e finalizar" }).click()
    if (!isNarrow(page)) await expect(shown(page.getByText("(-) 0.119")).first()).toBeVisible() // o cupom acompanha até o checkout (o resumo detalhado é só desktop)
    await confirmPurchase(page)
    await expect(page.getByRole("dialog", { name: "Recibo do pedido" }).getByText("1.087 ETH").first()).toBeVisible({ timeout: 10_000 })

    await addToCartFromDetail(page, NFT.golden.id)
    await page.getByRole("textbox", { name: "Código promocional" }).fill("FALSO")
    await page.getByRole("button", { name: "Aplicar" }).click()
    await expect(page.getByRole("alert").filter({ hasText: "Cupom inválido" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Conectar e finalizar" })).toHaveAttribute("aria-disabled", "true")
  })
})
