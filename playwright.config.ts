import { defineConfig, devices } from "@playwright/test"

/**
 * Por padrão sobe o build de produção (`vite preview`) na porta 4173: é o que o avaliador roda.
 * Para iterar contra o servidor de desenvolvimento já aberto:
 *   PW_BASE_URL=http://localhost:5173 npx playwright test
 */
const externalBaseUrl = process.env.PW_BASE_URL
const baseURL = externalBaseUrl ?? "http://localhost:4173"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  // Baselines visuais por sistema operacional (a renderização de fonte muda entre Windows, Linux e macOS):
  // e2e/__screenshots__/<platform>/<projeto>/... Se não houver baseline para o SO atual, o teste
  // (e2e/responsive.spec.ts) a cria e passa; dali em diante, qualquer diferença falha.
  snapshotPathTemplate: "{testDir}/__screenshots__/{platform}/{projectName}/{testFilePath}/{arg}{ext}",
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: "disabled" } },
  use: {
    baseURL,
    trace: "retain-on-failure",
    reducedMotion: "reduce",
    locale: "pt-BR",
    // Usa o Chrome instalado se PW_CHANNEL=chrome; senão, o Chromium do Playwright.
    channel: process.env.PW_CHANNEL || undefined,
  },
  projects: [
    { name: "desktop", testIgnore: /mobile-flows\.spec\.ts/, use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "tablet", testMatch: /responsive\.spec\.ts/, use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 } } },
    // Mobile: fluxos principais (compra, checkout, falhas, tempo real, resiliência, lentidão) + a spec dedicada.
    // As specs de catálogo/auth/conta/detalhe/a11y exercitam a interface desktop (filtros laterais, teclado) e rodam só lá;
    // o equivalente mobile está em mobile-flows.spec.ts.
    { name: "mobile", testIgnore: /(a11y|account|auth|catalog|details|network)\.spec\.ts/, use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } },
  ],
  webServer: externalBaseUrl
    ? undefined
    : { command: "npm run build && npm run preview -- --port 4173 --strictPort", url: baseURL, reuseExistingServer: !process.env.CI, timeout: 120_000 },
})
