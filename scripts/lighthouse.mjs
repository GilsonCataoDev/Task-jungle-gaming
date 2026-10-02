/**
 * Auditoria Lighthouse: home e detalhe do NFT, perfis mobile e desktop, 3 medições cada,
 * relatório com a MEDIANA. Gera `lighthouse-report/summary.md`, `summary.json` e o HTML da
 * execução mediana de cada combinação.
 *
 *   npm run lighthouse                 # builda, sobe o preview e audita
 *   npm run lighthouse -- --runs=5     # mais medições
 *   npm run lighthouse -- --no-build   # reaproveita o dist/ atual
 *   npm run lighthouse -- --strict     # falha (exit 1) se alguma meta não for atingida
 *   LH_BASE_URL=https://meu-deploy.app npm run lighthouse   # audita um deploy
 */
import { spawn, spawnSync } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import { launch } from "chrome-launcher"
import lighthouse from "lighthouse"
import desktopConfig from "lighthouse/core/config/desktop-config.js"

const args = new Set(process.argv.slice(2))
const flag = (name, fallback) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split("=")[1] ?? fallback
const RUNS = Number(flag("runs", 3))
const PORT = 4173
const EXTERNAL = process.env.LH_BASE_URL
const BASE_URL = EXTERNAL ?? `http://localhost:${PORT}`
const OUT_DIR = "lighthouse-report"

const PAGES = [
  { id: "home", label: "Home", path: "/" },
  { id: "detalhe", label: "Detalhe do NFT", path: "/nfts/emerald-ape-042" },
]
const PROFILES = [
  { id: "mobile", label: "Mobile", config: undefined },
  { id: "desktop", label: "Desktop", config: desktopConfig },
]
const TARGETS = { performance: 90, accessibility: 95, "best-practices": 95, seo: 90 }
const CATEGORIES = Object.keys(TARGETS)

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

async function waitFor(url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return
    } catch {
      /* ainda subindo */
    }
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
  throw new Error(`Servidor não respondeu em ${url}`)
}

let previewServer
async function startServer() {
  if (EXTERNAL) return
  if (!args.has("--no-build")) {
    console.log("› build de produção…")
    const build = spawnSync("npm", ["run", "build"], { stdio: "inherit", shell: true })
    if (build.status !== 0) throw new Error("build falhou")
  }
  previewServer = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: "ignore", shell: true })
  await waitFor(BASE_URL)
}

function stopServer() {
  if (!previewServer?.pid) return
  if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(previewServer.pid), "/T", "/F"], { stdio: "ignore" })
  else previewServer.kill()
}

/** Um Chrome novo por medição: cache frio em todas, sem estado vazando entre execuções. */
async function measure(url, profile) {
  const chrome = await launch({ chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"] })
  try {
    const result = await lighthouse(url, { port: chrome.port, output: "html", logLevel: "error", onlyCategories: CATEGORIES }, profile.config)
    const { lhr, report } = result
    const score = (id) => Math.round((lhr.categories[id].score ?? 0) * 100)
    const metric = (id) => lhr.audits[id].numericValue
    return {
      scores: Object.fromEntries(CATEGORIES.map((id) => [id, score(id)])),
      lcp: metric("largest-contentful-paint"),
      cls: metric("cumulative-layout-shift"),
      tbt: metric("total-blocking-time"),
      fcp: metric("first-contentful-paint"),
      si: metric("speed-index"),
      failed: Object.values(lhr.audits)
        .filter((audit) => audit.score !== null && audit.score < 0.9 && audit.scoreDisplayMode !== "informative" && audit.scoreDisplayMode !== "notApplicable")
        .map((audit) => `${audit.id} (${Math.round(audit.score * 100)})`),
      report,
    }
  } finally {
    await chrome.kill()
  }
}

const fmtMs = (ms) => (ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${Math.round(ms)} ms`)
const mark = (id, value) => (value >= TARGETS[id] ? "✅" : "❌")

async function main() {
  await startServer()
  mkdirSync(OUT_DIR, { recursive: true })
  const rows = []

  for (const page of PAGES) {
    for (const profile of PROFILES) {
      const url = BASE_URL + page.path
      const runs = []
      for (let i = 1; i <= RUNS; i++) {
        process.stdout.write(`› ${page.label} · ${profile.label} · medição ${i}/${RUNS}… `)
        const run = await measure(url, profile)
        console.log(`perf ${run.scores.performance}`)
        runs.push(run)
      }
      // A execução "mediana" é a de performance mediana: dela saem o HTML e a lista de problemas.
      const byPerf = [...runs].sort((a, b) => a.scores.performance - b.scores.performance)
      const representative = byPerf[Math.floor(byPerf.length / 2)]
      writeFileSync(`${OUT_DIR}/${page.id}-${profile.id}.html`, representative.report)

      rows.push({
        page: page.label,
        profile: profile.label,
        runs: RUNS,
        scores: Object.fromEntries(CATEGORIES.map((id) => [id, median(runs.map((run) => run.scores[id]))])),
        lcp: median(runs.map((run) => run.lcp)),
        cls: median(runs.map((run) => run.cls)),
        tbt: median(runs.map((run) => run.tbt)),
        fcp: median(runs.map((run) => run.fcp)),
        si: median(runs.map((run) => run.si)),
        allPerformanceScores: runs.map((run) => run.scores.performance),
        failedAudits: representative.failed,
      })
    }
  }

  const header = "| Página | Perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |\n|---|---|---|---|---|---|---|---|---|"
  const lines = rows.map(
    (row) =>
      `| ${row.page} | ${row.profile} | ${row.scores.performance} ${mark("performance", row.scores.performance)} | ${row.scores.accessibility} ${mark("accessibility", row.scores.accessibility)} | ${row.scores["best-practices"]} ${mark("best-practices", row.scores["best-practices"])} | ${row.scores.seo} ${mark("seo", row.scores.seo)} | ${fmtMs(row.lcp)} | ${row.cls.toFixed(3)} | ${fmtMs(row.tbt)} |`,
  )
  const details = rows
    .map((row) => `- **${row.page} · ${row.profile}**: performance por medição = ${row.allPerformanceScores.join(", ")}; FCP ${fmtMs(row.fcp)}, Speed Index ${fmtMs(row.si)}.${row.failedAudits.length ? ` Auditorias abaixo de 90: ${row.failedAudits.join(", ")}.` : ""}`)
    .join("\n")
  const markdown = `# Lighthouse (mediana de ${RUNS} medições)\n\nAlvo: Performance ≥ ${TARGETS.performance}, Acessibilidade ≥ ${TARGETS.accessibility}, Boas práticas ≥ ${TARGETS["best-practices"]}, SEO ≥ ${TARGETS.seo}.\nURL: ${BASE_URL}\n\n${header}\n${lines.join("\n")}\n\n${details}\n`
  writeFileSync(`${OUT_DIR}/summary.md`, markdown)
  writeFileSync(`${OUT_DIR}/summary.json`, JSON.stringify({ baseUrl: BASE_URL, runs: RUNS, targets: TARGETS, rows }, null, 2))
  console.log(`\n${markdown}`)

  const missed = rows.filter((row) => CATEGORIES.some((id) => row.scores[id] < TARGETS[id]))
  if (missed.length && args.has("--strict")) process.exitCode = 1
}

try {
  await main()
} finally {
  stopServer()
}
