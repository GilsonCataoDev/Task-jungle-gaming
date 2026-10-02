import { expect, test } from "@playwright/test"
import { addToCartFromDetail, DEMO, login, logout, MAYA, NFT, setScenario, waitForMocks } from "./helpers"

test.describe("autenticação (modal Entrar | Criar conta)", () => {
  test("cadastro valida os campos, rejeita e-mail e usuário repetidos e cria a conta", async ({ page }) => {
    await page.goto("/cadastro")
    const dialog = page.getByRole("dialog", { name: "Criar conta" })
    await dialog.getByRole("button", { name: "Criar conta" }).click()
    await expect(dialog.getByText("Informe um nome de usuário com ao menos 3 caracteres.")).toBeVisible()
    await expect(dialog.getByText("Informe um e-mail válido.")).toBeVisible()
    await expect(dialog.getByText("A senha precisa ter ao menos 8 caracteres.")).toBeVisible()

    await dialog.getByLabel("Nome de usuário").fill("ana_nova")
    await dialog.getByLabel("E-mail", { exact: true }).fill("ana@kurio.dev")
    await dialog.getByLabel("Senha", { exact: true }).fill("Senha@1234")
    await dialog.getByLabel("Confirmar senha").fill("outra-coisa")
    await dialog.getByRole("button", { name: "Criar conta" }).click()
    await expect(dialog.getByText("As senhas não conferem.")).toBeVisible()

    // Conflitos vindos do servidor.
    await dialog.getByLabel("Confirmar senha").fill("Senha@1234")
    await dialog.getByLabel("E-mail", { exact: true }).fill(DEMO.email)
    await dialog.getByRole("button", { name: "Criar conta" }).click()
    await expect(dialog.getByText("Este e-mail já está cadastrado.")).toBeVisible()
    await dialog.getByLabel("E-mail", { exact: true }).fill("ana@kurio.dev")
    await dialog.getByLabel("Nome de usuário").fill("novasato")
    await dialog.getByRole("button", { name: "Criar conta" }).click()
    await expect(dialog.getByText("Este nome de usuário já está em uso.")).toBeVisible()

    await dialog.getByLabel("Nome de usuário").fill("ana_nova")
    await dialog.getByRole("button", { name: "Criar conta" }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole("link", { name: "Perfil de ana_nova" })).toBeVisible()
  })

  test("as abas do modal alternam entre Entrar e Criar conta", async ({ page }) => {
    await page.goto("/login")
    await page.getByRole("dialog").getByRole("link", { name: "Criar conta" }).click()
    await expect(page).toHaveURL(/\/cadastro/)
    await expect(page.getByRole("dialog", { name: "Criar conta" })).toBeVisible()
    await page.getByRole("dialog").getByRole("link", { name: "Entrar" }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test("login com credenciais erradas mostra erro; sessão sobrevive ao recarregar", async ({ page }) => {
    await page.goto("/login")
    const dialog = page.getByRole("dialog", { name: "Entrar" })
    await dialog.getByRole("button", { name: "Entrar", exact: true }).click()
    await expect(dialog.getByText("Informe seu e-mail.")).toBeVisible()

    await dialog.getByLabel("E-mail", { exact: true }).fill(DEMO.email)
    await dialog.getByLabel("Senha", { exact: true }).fill("errada")
    await dialog.getByRole("button", { name: "Entrar", exact: true }).click()
    await expect(dialog.getByRole("alert")).toContainText("E-mail ou senha incorretos.")

    // O olho mostra e esconde a senha.
    await dialog.getByRole("button", { name: "Mostrar senha" }).click()
    await expect(dialog.getByLabel("Senha", { exact: true })).toHaveAttribute("type", "text")

    await dialog.getByLabel("Senha", { exact: true }).fill(DEMO.password)
    await dialog.getByRole("button", { name: "Entrar", exact: true }).click()
    await expect(page.getByRole("link", { name: `Perfil de ${DEMO.name}` })).toBeVisible()

    // Recuperação de sessão no boot (GET /auth/session com o token salvo).
    await page.reload()
    await expect(page.getByRole("link", { name: `Perfil de ${DEMO.name}` })).toBeVisible()
    // Logado, /login redireciona para fora.
    await page.goto("/login")
    await expect(page).toHaveURL(/\/$/)
  })

  test("entrar com Google, Facebook ou 'esqueci a senha' avisa que não existe na demonstração", async ({ page }) => {
    await page.goto("/login")
    const dialog = page.getByRole("dialog", { name: "Entrar" })
    await dialog.getByRole("button", { name: "Continuar com Google" }).click()
    await expect(dialog.getByRole("status")).toContainText("não está disponível na demonstração")
  })

  test("sessão expirada leva ao login e, depois de entrar, volta ao destino", async ({ page }) => {
    await login(page)
    await page.goto("/")
    await waitForMocks(page)
    await expect(page.getByRole("link", { name: `Perfil de ${DEMO.name}` })).toBeVisible()
    await setScenario(page, "session-expired")

    // Tenta abrir uma tela privada. A sessão pode ser derrubada por esta navegação ou por uma
    // chamada que ainda estava em andamento na home: o que importa é o resultado.
    await page.getByRole("link", { name: `Perfil de ${DEMO.name}` }).click({ timeout: 2_000 }).catch(() => undefined)
    await expect(page).toHaveURL(/\/login\?.*reason=expired/)
    const destination = new URL(page.url()).searchParams.get("redirect")!
    expect(["/", "/perfil"]).toContain(destination)
    const dialog = page.getByRole("dialog", { name: "Entrar" })
    await expect(dialog.getByRole("alert")).toContainText("Sua sessão expirou")
    await expect(page.getByRole("link", { name: "Entrar" }).first()).toBeVisible() // header já como visitante

    await setScenario(page, "normal")
    await dialog.getByLabel("E-mail", { exact: true }).fill(DEMO.email)
    await dialog.getByLabel("Senha", { exact: true }).fill(DEMO.password)
    await dialog.getByRole("button", { name: "Entrar", exact: true }).click()
    await expect(page).toHaveURL((url) => url.pathname === destination) // volta para onde estava
    await expect(page.getByRole("link", { name: `Perfil de ${DEMO.name}` })).toBeVisible()
  })

  test("expira também numa tela privada aberta: volta ao mesmo lugar depois de entrar", async ({ page }) => {
    await login(page, DEMO, "/perfil")
    await expect(page.getByRole("heading", { name: "Perfil do colecionador" })).toBeVisible()
    await page.waitForLoadState("networkidle")
    await setScenario(page, "session-expired")
    await page.getByRole("button", { name: "Salvar", exact: true }).click() // qualquer chamada autenticada
    await expect(page).toHaveURL(/\/login\?redirect=%2Fperfil&reason=expired/)
    await setScenario(page, "normal")
    const dialog = page.getByRole("dialog", { name: "Entrar" })
    await dialog.getByLabel("E-mail", { exact: true }).fill(DEMO.email)
    await dialog.getByLabel("Senha", { exact: true }).fill(DEMO.password)
    await dialog.getByRole("button", { name: "Entrar", exact: true }).click()
    await expect(page).toHaveURL(/\/perfil$/)
  })

  test("token antigo salvo no navegador não trava nem redireciona login e cadastro", async ({ page }) => {
    // Sobra de uma sessão que o servidor não reconhece (ex.: versão anterior do app).
    await page.addInitScript(() => {
      if (!localStorage.getItem("kurio:token")) localStorage.setItem("kurio:token", "token-antigo")
    })

    await page.goto("/cadastro")
    await expect(page.getByRole("dialog", { name: "Criar conta" })).toBeVisible({ timeout: 3_000 })
    await expect(page).toHaveURL(/\/cadastro$/) // sem pulo para o login
    await expect(page.getByRole("alert")).toHaveCount(0) // e sem aviso falso de "sessão expirou"

    await page.goto("/login")
    const dialog = page.getByRole("dialog", { name: "Entrar" })
    await expect(dialog).toBeVisible({ timeout: 3_000 })
    await expect(page.getByRole("alert")).toHaveCount(0)
    await dialog.getByLabel("E-mail", { exact: true }).fill(DEMO.email)
    await dialog.getByLabel("Senha", { exact: true }).fill(DEMO.password)
    await dialog.getByRole("button", { name: "Entrar", exact: true }).click()
    await expect(page.getByRole("link", { name: `Perfil de ${DEMO.name}` })).toBeVisible()
  })

  test("logout encerra a sessão e protege as rotas privadas", async ({ page }) => {
    await login(page)
    await logout(page)
    await page.goto("/perfil")
    await expect(page).toHaveURL(/\/login\?redirect=%2Fperfil/)
    // O token também sumiu do navegador.
    expect(await page.evaluate(() => localStorage.getItem("kurio:token"))).toBeNull()
  })

  test("troca de usuário não vaza carrinho nem favoritos entre contas", async ({ page }) => {
    await login(page, DEMO)
    await addToCartFromDetail(page, NFT.violet.id)
    await expect(page.getByRole("heading", { name: NFT.violet.name })).toBeVisible()
    await page.goto(`/nfts/${NFT.emerald.id}`) // Nova tem este NFT favoritado
    await expect(page.getByRole("button", { name: `Remover ${NFT.emerald.name} dos favoritos` })).toHaveAttribute("aria-pressed", "true")
    await logout(page)

    await login(page, MAYA)
    await page.goto("/carrinho")
    await expect(page.getByRole("heading", { name: "Seu carrinho está vazio" })).toBeVisible()
    await page.goto(`/nfts/${NFT.emerald.id}`)
    await expect(page.getByRole("button", { name: `Favoritar ${NFT.emerald.name}` })).toHaveAttribute("aria-pressed", "false")
    await logout(page)

    // Os dados da Nova continuam lá quando ela volta.
    await login(page, DEMO)
    await page.goto("/carrinho")
    await expect(page.getByRole("heading", { name: NFT.violet.name })).toBeVisible()
  })
})
