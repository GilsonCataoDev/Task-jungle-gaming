import path from "path"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import type { Plugin } from "vite"

/**
 * O MSW (~160 kB gzip) é um chunk carregado por `import()` depois do primeiro conteúdo pintado. Para que
 * ele já esteja baixado quando chegar a hora de iniciar, o HTML ganha um `modulepreload` de baixa
 * prioridade: baixa em paralelo, sem competir com o que a primeira pintura precisa.
 */
function preloadMocksChunk(): Plugin {
  return {
    name: "preload-mocks-chunk",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(_html, context) {
        const chunk = Object.values(context.bundle ?? {}).find((item) => item.type === "chunk" && item.isDynamicEntry && item.facadeModuleId?.endsWith("src/mocks/browser.ts"))
        if (!chunk) return []
        return [{ tag: "link", attrs: { rel: "modulepreload", href: `${context.server ? "" : "/"}${chunk.fileName}`, fetchpriority: "low" }, injectTo: "head" }]
      },
    },
  }
}
// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Sem code splitting automático de propósito: com tudo no bundle inicial a rota aparece na primeira
    // pintura sem cascata de chunks (no mobile simulado do Lighthouse isso vale ~10 pontos de performance).
    tanstackRouter({ target: "react", autoCodeSplitting: false }),
    react(),
    tailwindcss(),
    preloadMocksChunk(),
  ],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src")},
  },
})
