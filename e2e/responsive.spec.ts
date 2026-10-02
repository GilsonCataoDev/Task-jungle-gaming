import { existsSync } from "node:fs"
import { expect, test, type Page } from "@playwright/test"
import { login, NFT, waitForMocks } from "./helpers"

/**
 * Roda nos 3 viewports do desafio (projetos desktop 1440, tablet 768 e mobile 390).
 * Baselines visuais versionadas em e2e/__screenshots__/<sistema>/<projeto>/. Para atualizar:
 *   npm run test:e2e:update
 */
const PAGES = [
  { name: "home", path: "/", ready: (page: Page) => expect(page.locator("article").first()).toBeVisible() },
  { name: "mercado", path: "/mercado", ready: (page: Page) => expect(page.locator("article").first()).toBeVisible() },
  { name: "detalhe", path: `/nfts/${NFT.emerald.id}`, ready: (page: Page) => expect(page.getByRole("heading", { level: 1, name: NFT.emerald.name })).toBeVisible() },
  { name: "login", path: "/login", ready: (page: Page) => expect(page.getByRole("dialog", { name: "Entrar" })).toBeVisible() },
  { name: "cadastro", path: "/cadastro", ready: (page: Page) => expect(page.getByRole("dialog", { name: "Criar conta" })).toBeVisible() },
]

async function open(page: Page, path: string, ready: (page: Page) => Promise<void>) {
  await page.goto(path)
  await waitForMocks(page)
  await ready(page)
  await page.evaluate(() => document.fonts.ready)
  // Imagens da primeira tela (as de baixo são preguiçosas e não entram na foto): carregadas E decodificadas,
  // senão a captura pega a imagem pela metade.
  await page.waitForFunction(() => [...document.images].every((image) => image.complete || image.getClientRects().length === 0 || image.getBoundingClientRect().top > innerHeight))
  await page.evaluate(() =>
    Promise.all(
      [...document.images]
        .filter((image) => image.getClientRects().length > 0 && image.getBoundingClientRect().top < innerHeight)
        .map((image) => image.decode().catch(() => undefined)),
    ),
  )
  // Dois quadros: dá tempo de pintar o que acabou de ser decodificado antes da captura.
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
}

const widths = (page: Page) => page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }))

for (const { name, path, ready } of PAGES) {
  test.describe(name, () => {
    test("sem rolagem horizontal nem conteúdo cortado", async ({ page }) => {
      await open(page, path, ready)
      const { scrollWidth, clientWidth } = await widths(page)
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
    })

    test("aparência estável (regressão visual)", async ({ page }, testInfo) => {
      await open(page, path, ready)
      const file = `${name}-${testInfo.project.name}.png`
      const mask = [page.getByTestId("connection-status")] // indicador de conexão (quando visível) muda de texto

      // Sem baseline para este sistema operacional: cria e passa (o Playwright, por padrão, falharia na
      // execução que cria). A partir da próxima execução, qualquer diferença falha.
      if (!existsSync(testInfo.snapshotPath(file))) {
        await page.screenshot({ path: testInfo.snapshotPath(file), mask, scale: "css", caret: "hide", animations: "disabled" })
        testInfo.annotations.push({ type: "baseline criada", description: `${process.platform}/${file}` })
        return
      }
      await expect(page).toHaveScreenshot(file, { mask, maxDiffPixelRatio: 0.02 })
    })
  })
}

// Telas privadas do desafio com regressão visual: carrinho e pagamento (itens fixos, dados determinísticos).
for (const [name, path, title] of [
  ["carrinho", "/carrinho", "Carrinho de NFTs"],
  ["pagamento", "/pagamento", "Pagamento com carteira"],
] as const) {
  test(`${name}: aparência estável (regressão visual)`, async ({ page }, testInfo) => {
    await login(page, undefined, "/carrinho")
    await page.evaluate(async () => {
      const headers = { Authorization: `Bearer ${localStorage.getItem("kurio:token")}`, "Content-Type": "application/json" }
      for (const nftId of ["emerald-ape-042", "violet-nomad-314"]) await fetch("/api/cart/items", { method: "POST", headers, body: JSON.stringify({ nftId }) })
    })
    await open(page, path, () => expect(page.getByRole("heading", { level: 1, name: title, exact: true })).toBeAttached())
    await page.waitForLoadState("networkidle")
    const file = `${name}-${testInfo.project.name}.png`
    const mask = [page.getByTestId("connection-status")]
    if (!existsSync(testInfo.snapshotPath(file))) {
      await page.screenshot({ path: testInfo.snapshotPath(file), mask, scale: "css", caret: "hide", animations: "disabled" })
      testInfo.annotations.push({ type: "baseline criada", description: `${process.platform}/${file}` })
      return
    }
    await expect(page).toHaveScreenshot(file, { mask, maxDiffPixelRatio: 0.02 })
  })
}

test("zoom de 200%: layout continua utilizável (equivale a 720px de largura)", async ({ page }) => {
  await page.setViewportSize({ width: 720, height: 800 })
  await open(page, "/", PAGES[0].ready)
  const { scrollWidth, clientWidth } = await widths(page)
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
  await expect(page.getByRole("region", { name: "Mercado de NFTs" })).toBeVisible()
})

test("telas privadas (carrinho, pagamento, perfil, carteiras, atividade, lista) sem rolagem horizontal", async ({ page }) => {
  await login(page, undefined, "/carrinho")
  await page.evaluate(async () => {
    const headers = { Authorization: `Bearer ${localStorage.getItem("kurio:token")}`, "Content-Type": "application/json" }
    for (const nftId of ["emerald-ape-042", "violet-nomad-314"]) await fetch("/api/cart/items", { method: "POST", headers, body: JSON.stringify({ nftId }) })
  })
  const screens: [string, string][] = [
    ["/carrinho", "Carrinho de NFTs"],
    ["/pagamento", "Pagamento com carteira"],
    ["/perfil", "Perfil do colecionador"],
    ["/carteiras", "Carteiras"],
    ["/atividade", "Atividade"],
    ["/lista-de-interesse", "Lista de interesse"],
  ]
  for (const [path, title] of screens) {
    await page.goto(path)
    await expect(page.getByRole("heading", { level: 1, name: title, exact: true })).toBeAttached()
    await page.waitForLoadState("networkidle")
    const { scrollWidth, clientWidth } = await widths(page)
    expect(scrollWidth, `${path} estourou a largura`).toBeLessThanOrEqual(clientWidth)
  }
})
