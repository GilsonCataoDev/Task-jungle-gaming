import { expect, test } from "@playwright/test"
import { DEMO, NFT } from "./helpers"

test.describe("acessibilidade", () => {
  test("link de pular conteúdo aparece no primeiro Tab e há um único <main>", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("main")).toHaveCount(1)
    await page.keyboard.press("Tab")
    const skip = page.getByRole("link", { name: "Pular para o conteúdo" })
    await expect(skip).toBeFocused()
    await expect(skip).toBeVisible()
  })

  test("todo elemento focado por teclado tem indicador de foco visível", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("link", { name: "Kurio, página inicial" })).toBeVisible()
    for (let step = 0; step < 14; step++) {
      await page.keyboard.press("Tab")
      const outline = await page.evaluate(() => {
        const element = document.activeElement as HTMLElement
        const style = getComputedStyle(element)
        return { tag: element.tagName, label: element.getAttribute("aria-label") ?? element.textContent?.trim().slice(0, 30), style: style.outlineStyle, width: parseFloat(style.outlineWidth), boxShadow: style.boxShadow }
      })
      const visible = (outline.style !== "none" && outline.width > 0) || outline.boxShadow !== "none"
      expect(visible, `foco sem indicador em <${outline.tag}> "${outline.label}"`).toBe(true)
    }
  })

  test("login operável só com teclado (o foco inicial já está no e-mail)", async ({ page }) => {
    await page.goto("/login")
    const dialog = page.getByRole("dialog", { name: "Entrar" })
    await expect(dialog.getByLabel("E-mail", { exact: true })).toBeFocused()
    await page.keyboard.type(DEMO.email)
    await page.keyboard.press("Tab")
    await page.keyboard.type(DEMO.password)
    await page.keyboard.press("Enter")
    await expect(page.getByRole("link", { name: `Perfil de ${DEMO.name}` })).toBeVisible()
  })

  test("modal: foco preso no diálogo, Esc fecha e o foco volta ao botão que o abriu", async ({ page }) => {
    await page.goto("/")
    const opener = page.getByRole("link", { name: "Entrar" }).first()
    await opener.focus()
    await page.keyboard.press("Enter")

    const dialog = page.getByRole("dialog", { name: "Entrar" })
    await expect(dialog).toBeVisible()
    const insideDialog = () => page.evaluate(() => !!document.activeElement?.closest("dialog"))
    expect(await insideDialog()).toBe(true) // foco foi para dentro

    for (let step = 0; step < 14; step++) {
      await page.keyboard.press("Tab")
      expect(await insideDialog(), `Tab ${step + 1} escapou do diálogo`).toBe(true)
    }
    await page.keyboard.press("Shift+Tab")
    expect(await insideDialog()).toBe(true)

    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()
    await expect(page).toHaveURL(/\/$/)
    await expect(opener).toBeFocused()
  })

  test("o botão Fechar do modal volta para a home", async ({ page }) => {
    await page.goto("/login")
    const dialog = page.getByRole("dialog", { name: "Entrar" })
    await dialog.getByRole("button", { name: "Fechar" }).click()
    await expect(dialog).toBeHidden()
    await expect(page).toHaveURL(/\/$/)
  })

  test("erros de formulário ficam ligados ao campo (aria-invalid + descrição acessível)", async ({ page }) => {
    await page.goto("/login")
    const login = page.getByRole("dialog", { name: "Entrar" })
    await login.getByRole("button", { name: "Entrar", exact: true }).click()
    const email = login.getByLabel("E-mail", { exact: true })
    const password = login.getByLabel("Senha", { exact: true })
    await expect(email).toHaveAttribute("aria-invalid", "true")
    await expect(email).toHaveAccessibleDescription("Informe seu e-mail.")
    await expect(password).toHaveAttribute("aria-invalid", "true")
    await expect(password).toHaveAccessibleDescription("Informe sua senha.")

    await page.goto("/cadastro")
    const signup = page.getByRole("dialog", { name: "Criar conta" })
    await signup.getByRole("button", { name: "Criar conta" }).click()
    await expect(signup.getByLabel("Nome de usuário")).toHaveAccessibleDescription(/ao menos 3 caracteres/)
    await expect(signup.getByLabel("Senha", { exact: true })).toHaveAccessibleDescription(/ao menos 8 caracteres/)
  })

  test("imagens e controles têm nome acessível", async ({ page }) => {
    await page.goto(`/nfts/${NFT.emerald.id}`)
    await expect(page.getByRole("img", { name: /Arte do NFT Emerald Ape #042/ })).toBeVisible()
    await expect(page.getByRole("link", { name: "Carrinho com 0 itens" })).toBeVisible()
    await expect(page.getByRole("button", { name: `Favoritar ${NFT.emerald.name}` })).toBeVisible()
    // Nenhum botão ou link visível sem nome acessível.
    const unnamed = await page.evaluate(() =>
      [...document.querySelectorAll("button, a[href]")].filter((el) => (el as HTMLElement).offsetParent !== null && !(el.getAttribute("aria-label") || el.textContent?.trim())).length,
    )
    expect(unnamed).toBe(0)
  })

  test("o carrossel e as abas expõem estado para leitores de tela", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("region", { name: "Destaques", exact: true })).toHaveAttribute("aria-roledescription", "carrossel")
    await page.goto(`/nfts/${NFT.emerald.id}`)
    await expect(page.getByRole("tablist", { name: "Seções do NFT" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Detalhes do NFT" })).toHaveAttribute("aria-selected", "true")
  })

  test("mobile: barra inferior de navegação e busca no topo", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/")
    const nav = page.getByRole("navigation", { name: "Navegação inferior" })
    await expect(nav).toBeVisible()
    await expect(nav.getByRole("link", { name: "Início" })).toHaveAttribute("aria-current", "page")
    await expect(nav.getByRole("link", { name: "Explorar o mercado" })).toBeVisible()
    await expect(page.getByRole("searchbox", { name: "Explorar coleções" })).toBeVisible()
    await nav.getByRole("link", { name: "Entrar" }).click()
    await expect(page.getByRole("dialog", { name: "Entrar" })).toBeVisible()
  })

  test("mobile: filtros abrem em uma gaveta com foco preso", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/mercado")
    const trigger = page.getByRole("button", { name: "Abrir filtros" }).first()
    await trigger.click()
    const drawer = page.getByRole("dialog", { name: "Filtros" })
    await expect(drawer).toBeVisible()
    await drawer.getByRole("button", { name: /^Fotografia/ }).click()
    await expect(page).toHaveURL(/category=Fotografia/)
    await drawer.getByLabel("Ordenar por").selectOption("price-asc") // no mobile a ordenação mora na gaveta
    await expect(page).toHaveURL(/sort=price-asc/)
    await page.keyboard.press("Escape")
    await expect(drawer).toBeHidden()
  })
})
