import { expect, test } from "@playwright/test"
import { prices, waitForApp } from "./helpers"

test.describe("catálogo", () => {
  test("busca, filtros combinados, ordenação e faixa de preço", async ({ page }) => {
    await page.goto("/mercado")
    await waitForApp(page)
    const catalog = page.getByRole("region", { name: "Mercado de NFTs" })
    const filters = page.getByRole("complementary", { name: "Filtros" })
    const cards = catalog.locator("article")
    const total = (n: number) => expect(page.getByText(`${n} resultados`)).toBeAttached()

    // 36 NFTs, 9 por página (4 páginas); a barra lateral mostra as contagens reais.
    await total(36)
    await expect(cards).toHaveCount(9)
    await expect(filters.getByRole("button", { name: "Arte digital (12)" })).toBeVisible()
    await expect(filters.getByRole("button", { name: "Ethereum (18)" })).toBeVisible()

    // Coleção + rede combinadas.
    await filters.getByRole("button", { name: /^Arte digital/ }).click()
    await expect(page).toHaveURL(/category=Arte(%20|\+)digital/)
    await expect(filters.getByRole("button", { name: /^Arte digital/ })).toHaveAttribute("aria-pressed", "true")
    await total(12)
    await filters.getByRole("button", { name: /^Ethereum/ }).click()
    await expect(page).toHaveURL(/network=Ethereum/)
    await total(7)

    // Clicar de novo em um filtro selecionado o remove.
    await filters.getByRole("button", { name: /^Arte digital/ }).click()
    await filters.getByRole("button", { name: /^Ethereum/ }).click()
    await total(36)

    // Busca pelo cabeçalho.
    await page.getByRole("button", { name: "Buscar NFTs" }).click()
    await page.getByRole("searchbox", { name: "Buscar NFTs" }).fill("nomad")
    await page.keyboard.press("Enter")
    await expect(page).toHaveURL(/search=nomad/)
    await total(5)
    await page.goto("/mercado?search=nao-existe")
    await expect(catalog.getByText("Nenhum NFT encontrado.")).toBeVisible()
    await catalog.getByRole("button", { name: "Limpar filtros" }).click()
    await total(36)

    // Faixa de preço (só vale ao clicar em Aplicar).
    await expect(filters.getByText("Preço: 0,02 - 12,30 ETH")).toBeVisible()
    await filters.getByLabel("Preço mínimo (ETH)").fill("0.5")
    await filters.getByRole("button", { name: "Aplicar" }).click()
    await expect(page).toHaveURL(/minPrice=(%22)?0\.50/)
    await total(28)
    await filters.getByLabel("Preço máximo (ETH)").fill("1.2")
    await filters.getByRole("button", { name: "Aplicar" }).click()
    await expect(page).toHaveURL(/maxPrice=(%22)?1\.20/)
    await total(14)

    // Ordenação por preço (esgotados não mostram preço e ficam de fora da conta).
    const sorted = async () => prices(await cards.allInnerTexts()).filter((price) => !Number.isNaN(price))
    await page.getByLabel("Ordenar por").selectOption("price-asc")
    await expect(page).toHaveURL(/sort=price-asc/)
    await expect(async () => {
      const list = await sorted()
      expect(list.length).toBeGreaterThan(3)
      expect(list).toEqual([...list].sort((a, b) => a - b))
    }).toPass()
    await page.getByLabel("Ordenar por").selectOption("price-desc")
    await expect(async () => {
      const list = await sorted()
      expect(list).toEqual([...list].sort((a, b) => b - a))
    }).toPass()

    // Link digitado à mão (número sem aspas) também é entendido.
    await page.goto("/mercado?minPrice=0.7")
    await total(24)
  })

  test("abas, paginação e restauração pelo histórico do navegador", async ({ page }) => {
    await page.goto("/mercado?sort=name")
    await waitForApp(page)
    const catalog = page.getByRole("region", { name: "Mercado de NFTs" })
    await expect(page.getByRole("button", { name: "Página 4" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Página 1" })).toHaveAttribute("aria-current", "page")

    await page.getByRole("button", { name: "Página 2" }).click()
    await expect(page).toHaveURL(/page=2/)
    await expect(page.getByRole("button", { name: "Página 2" })).toHaveAttribute("aria-current", "page")
    await expect(catalog.locator("article")).toHaveCount(9)

    await page.getByRole("button", { name: "Página 4" }).click()
    await expect(page.getByRole("button", { name: "Próxima página" })).toBeDisabled()
    await expect(catalog.locator("article")).toHaveCount(9) // 36 = 4 × 9

    // Voltar restaura a página anterior; avançar restaura a seguinte; recarregar mantém.
    await page.goBack()
    await expect(page.getByRole("button", { name: "Página 2" })).toHaveAttribute("aria-current", "page")
    await page.goForward()
    await expect(page.getByRole("button", { name: "Página 4" })).toHaveAttribute("aria-current", "page")
    await page.reload()
    await expect(page.getByRole("button", { name: "Página 4" })).toHaveAttribute("aria-current", "page")
    await expect(page.getByLabel("Ordenar por")).toHaveValue("name")

    // Abas: "Novos lançamentos" e "Em alta" têm 12 NFTs cada (2 páginas); mudar de aba volta à página 1.
    await catalog.getByRole("button", { name: "Novos lançamentos" }).click()
    await expect(page).toHaveURL(/tab=new/)
    await expect(page).not.toHaveURL(/page=/)
    await expect(page.getByText("12 resultados")).toBeAttached()
    await expect(catalog.getByRole("button", { name: "Novos lançamentos" })).toHaveAttribute("aria-pressed", "true")
    await catalog.getByRole("button", { name: "Em alta" }).click()
    await expect(page.getByText("12 resultados")).toBeAttached()
    await expect(page.getByRole("button", { name: "Página 3" })).toHaveCount(0)

    // Link compartilhado restaura filtros, aba e ordenação.
    await page.goto("/mercado?category=Fotografia&sort=price-desc&tab=trending")
    await expect(page.getByRole("complementary", { name: "Filtros" }).getByRole("button", { name: /^Fotografia/ })).toHaveAttribute("aria-pressed", "true")
    await expect(page.getByLabel("Ordenar por")).toHaveValue("price-desc")
    await expect(catalog.getByRole("button", { name: "Em alta" })).toHaveAttribute("aria-pressed", "true")
  })

  test("o herói tem carrossel por botões e leva ao mercado", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("heading", { level: 1, name: "Seja dono do futuro da arte digital" })).toBeVisible()
    await page.getByRole("button", { name: "Destaque 2 de 3" }).click()
    await expect(page.getByRole("heading", { level: 1, name: "Colecione edições raras de verdade" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Destaque 2 de 3" })).toHaveAttribute("aria-current", "true")
    await page.getByRole("link", { name: "Explorar", exact: true }).first().click()
    await expect(page).toHaveURL(/#mercado$/)
  })
})
