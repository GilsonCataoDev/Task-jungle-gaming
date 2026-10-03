# Kurio — marketplace de NFTs

Marketplace de NFTs em **React + TypeScript** feito para o *Frontend Challenge*, seguindo o design do Figma
(identidade **Kurio**: fundo marrom escuro, laranja `#d28a4c`, fonte monoespaçada). Todo o "backend" (REST e
Socket.IO) é simulado na camada de rede com **MSW**, com estado consistente entre catálogo, favoritos,
carrinho, perfil, carteiras e pedidos.

- **Stack:** React 19, TypeScript, TanStack Router, TanStack Query, Axios, Socket.IO, Tailwind CSS v4,
  shadcn/ui, MSW, Playwright, Lighthouse.
- **Arquitetura, contratos REST, eventos e decisões:** veja [ARCHITECTURE.md](ARCHITECTURE.md).
- **Aplicação publicada:** https://task-jungle-gaming.vercel.app/

## Telas

| Tela | Rota | Observações |
|---|---|---|
| Início (herói + catálogo + editorial) | `/` | Carrossel, filtros, abas, ordenação, paginação |
| Mercado | `/mercado` | O catálogo sozinho (a busca do cabeçalho leva para cá) |
| Detalhe do NFT | `/nfts/:id` | Galeria, edições, quantidade, comprar, favoritar, abas, edição (só o criador) |
| Login / Criar conta | `/login`, `/cadastro` | **Modal** sobre a home (tela cheia no mobile) |
| Carrinho | `/carrinho` | **Pública**: o visitante monta o carrinho e ele passa para a conta ao entrar. Cupom, cotação do servidor |
| Pagamento | `/pagamento` | Privada (exige login). Perfil do colecionador, carteira e rede |
| Recibo | `/confirmacao/:pedido` | Privada. **Modal** com o andamento do pedido ao vivo |
| Perfil, Carteiras, Atividade, Lista de interesse | `/perfil`, `/carteiras`, `/atividade`, `/lista-de-interesse` | Privadas, com o menu "Meu perfil" |
| Criadores | `/criadores` | Apresenta quem fez o projeto (nome e GitHub); no Figma só existe o item de menu |
| Aprenda | `/aprenda` | "Em breve" (só existe no menu do Figma) |

## Começando

Requisitos: **Node 20+** e npm.

```bash
npm install
npm run dev          # http://localhost:5173, com mocks
```

O projeto traz um `.npmrc` com `legacy-peer-deps=true` (o `eslint-plugin-jsx-a11y` ainda não declara
suporte ao ESLint 10, mas funciona), então `npm install` e `npm ci` não precisam de flags.

### Credenciais fictícias

| Usuário | E-mail | Senha | Observação |
|---|---|---|---|
| Nova Sato | `demo@kurio.dev` | `Demo@1234` | 2 carteiras (Principal/Ethereum e Reserva/Polygon), 1 favorito, criadora de 9 NFTs (pode editá-los) |
| Maya Lin | `maya@kurio.dev` | `Maya@1234` | 1 carteira, sem favoritos |

Também dá para criar uma conta em `/cadastro`. Cupons: `KURIO10` (10%) e `WELCOME` (0,05 ETH); `NATAL20` existe, mas está **expirado** (mostra "Cupom expirado"); qualquer outro código dá "Cupom inválido".
Não há cartão: o pagamento é por **carteira** (MetaMask, WalletConnect ou Coinbase Wallet). Para simular uma
carteira que recusa a transação, use o cenário `payment-rejected` (abaixo).

### Variáveis de ambiente

| Variável | Padrão | Efeito |
|---|---|---|
| `VITE_ENABLE_MOCKS` | ligado | `false` desliga o MSW (para usar um backend real em `/api`) |
| `VITE_SOCKET_URL` | `wss://realtime.kurio.mock` | Endereço do Socket.IO. No modo mock é um host fictício interceptado pelo MSW |
| `PW_BASE_URL` | build + `vite preview` | Playwright contra um servidor já aberto (ex.: `http://localhost:5173`) |
| `PW_CHANNEL` | Chromium do Playwright | `chrome` usa o Chrome instalado na máquina |
| `LH_BASE_URL` | build + `vite preview` | Lighthouse contra um deploy (ex.: a URL pública) |

Os mocks ficam **ligados por padrão, inclusive em produção**: o deploy público precisa deles para funcionar.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Desenvolvimento com mocks |
| `npm run build` | Checagem de tipos + build de produção |
| `npm run preview` | Serve o build em `http://localhost:4173` |
| `npm run typecheck` | `tsc` sem emitir arquivos |
| `npm run lint` | ESLint (inclui regras de a11y e do TanStack Query) |
| `npm run check` | `typecheck` + `lint` |
| `npm run test:e2e` | Playwright: faz o build, sobe o preview e roda tudo |
| `npm run test:e2e:update` | Atualiza as baselines visuais |
| `npm run lighthouse` | Auditoria Lighthouse (3 medições, mediana) |

Na primeira execução dos testes: `npx playwright install chromium` (ou use `PW_CHANNEL=chrome`).

## Cenários de falha e reset

Os mocks têm cenários configuráveis. Escolha de duas formas:

- **Pela URL:** `http://localhost:5173/?scenario=slow` (vale a partir desse carregamento).
- **Pelo console do navegador:** `window.__mocks.setScenario("payment-rejected")`.

| Cenário | Efeito | Como reproduzir |
|---|---|---|
| `normal` | Comportamento padrão (latência de 60 ms) | — |
| `slow` | Todas as respostas levam ~2,5 s | `?scenario=slow` e abra o mercado: aparecem os esqueletos |
| `variable-latency` | Latência de 80 ms a 1,7 s em sequência fixa e decrescente: as respostas chegam **fora de ordem** | `?scenario=variable-latency`, clique em duas categorias seguidas: a tela mantém só o resultado da última |
| `offline` | Falha de conexão: a requisição não chega ao servidor (erro de rede, sem status HTTP) | `?scenario=offline`: o mercado mostra "Sem conexão com o servidor"; volte a `normal` e use "Tentar novamente" |
| `timeout` | **1x:** o pedido é criado, mas a resposta chega depois do timeout do cliente | Defina o cenário, confirme a compra, espere ~8 s: surge "Tentar novamente" e repetir recupera **o mesmo pedido** |
| `server-error` | 503 em tudo (exceto sessão) | `?scenario=server-error`: o mercado mostra o erro com "Tentar novamente" |
| `mutation-error` | 500 nas mutações (favoritos, carrinho, perfil, carteiras) | Favorite um NFT: o coração volta atrás e aparece o aviso |
| `session-expired` | 401 `session_expired` nas rotas privadas | Logado, defina o cenário e navegue: volta ao login e retorna ao destino |
| `price-change` | **1x:** o preço do carrinho sobe 10% no momento do pedido | Confirme a compra: aparece "O total mudou" e o valor é atualizado |
| `payment-rejected` | Todo pedido → 402 "Transação recusada pela carteira" | Confirme a compra |
| `inventory-conflict` | **1x:** outro comprador leva o estoque do 1º item | Confirme a compra: aviso de item indisponível |

Os cenários marcados com **1x** voltam sozinhos para `normal` depois de disparar.

**Reset:** `window.__mocks.reset()` restaura o banco para as fixtures e volta ao cenário `normal`.
Para um recomeço total, limpe o armazenamento do site (as chaves são `kurio:*`).

### Painel `window.__mocks`

Disponível quando os mocks estão prontos (ele só aparece depois de o MSW iniciar).

```js
__mocks.setScenario("slow")                                   // troca o cenário
__mocks.reset()                                               // restaura os dados
__mocks.updateNft("emerald-ape-042", { priceEth: "1.50" })    // o "servidor" muda o NFT e emite nft.updated
__mocks.emit("nft.updated", { id: "emerald-ape-042", version: 9, priceEth: "1.6", available: 3 })  // evento bruto
__mocks.disconnectSockets()                                   // derruba o socket (o cliente reconecta sozinho)
```

Esses comandos agem no **servidor simulado**: a interface só descobre as mudanças por REST ou por eventos
Socket.IO reais, nunca por atalhos na UI.

### Tempo real

Eventos: `nft.updated` (preço e estoque) e `order.updated` (transições do pedido). Ambos levam `version`;
o cliente só aplica versões maiores que a conhecida, então duplicados e atrasados são ignorados. Depois de
reconectar, o REST volta a ser a fonte da verdade. O transporte simulado e suas limitações estão em
[ARCHITECTURE.md](ARCHITECTURE.md#eventos-socketio).

## Testes

`npm run test:e2e` roda **160 testes** em 3 projetos: desktop (1440, todos os cenários), tablet (768, só a spec responsiva) e mobile
(390, os fluxos principais: compra, checkout e falhas de pagamento, tempo real, resiliência, lentidão e a spec
`mobile-flows.spec.ts`; as specs de catálogo, auth, conta, detalhe e a11y usam a interface desktop e rodam só lá).
Falhas guardam trace (`retain-on-failure`) e o relatório HTML sai em `playwright-report/`. Cada teste abre um contexto limpo, então o banco simulado nasce das
fixtures e não há dependência entre testes. O mapa dos 12 cenários do desafio está em
[ARCHITECTURE.md](ARCHITECTURE.md#testes-e2e-playwright).

Regressão visual: as baselines ficam versionadas em `e2e/__screenshots__/<sistema>/<projeto>/` (hoje há as de
`win32`, `linux` e `darwin`: início, mercado, detalhe, carrinho, pagamento, login e cadastro, nos 3 viewports; as de Linux e
macOS são geradas em runners reais pelo workflow `.github/workflows/visual-baselines.yml`, que se dispara manualmente). A renderização de fonte muda entre Windows, Linux e macOS, então cada sistema tem a sua pasta: na primeira
execução em um sistema novo o teste **cria** a baseline e passa; a partir da seguinte, qualquer diferença falha.
Para refazer de propósito: `npm run test:e2e:update`.

## Lighthouse

`npm run lighthouse` constrói o projeto, sobe o `vite preview` e audita **início** e **detalhe do NFT** nos
perfis **mobile** e **desktop**, 3 medições cada. O relatório (mediana) vai para `lighthouse-report/`
(`summary.md`, `summary.json` e o HTML da execução mediana de cada combinação).

Resultado (mediana de 3 medições, build de produção local):

| Página | Perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|---|
| Início | Mobile | **88** | 100 | 100 | 100 | 3,69 s | 0,000 | 74 ms |
| Início | Desktop | 100 | 100 | 100 | 100 | 630 ms | 0,000 | 0 ms |
| Detalhe do NFT | Mobile | 91 | 100 | 100 | 100 | 3,32 s | 0,024 | 27 ms |
| Detalhe do NFT | Desktop | 100 | 100 | 100 | 100 | 658 ms | 0,047 | 0 ms |

Metas: Performance ≥ 90, Acessibilidade ≥ 95, Boas práticas ≥ 95, SEO ≥ 90. No build local, tudo atingido,
exceto Performance do Início no mobile (88; as três medições ficaram entre 88 e 89).

**No deploy publicado (Vercel, mediana de 3 medições) todas as metas foram atingidas:**

| Página | Perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|---|
| Início | Mobile | **95** | 100 | 100 | 100 | 2,70 s | 0,000 | 79 ms |
| Início | Desktop | 100 | 100 | 100 | 100 | 583 ms | 0,000 | 0 ms |
| Detalhe do NFT | Mobile | 96 | 100 | 100 | 100 | 2,52 s | 0,024 | 10 ms |
| Detalhe do NFT | Desktop | 100 | 100 | 100 | 100 | 600 ms | 0,047 | 0 ms |

O relatório em `lighthouse-report/` é o do deploy e traz versões (Lighthouse 13.5.0, Chrome 154, Node 24), ambiente e as condições de throttling de cada perfil (mobile: CPU 4x, 150 ms RTT, 1,6 Mbps). A diferença para o local vem da compressão e do CDN da Vercel.

**Por que o Início no mobile ficava em 88 no build local:**

- O elemento de LCP é a imagem do primeiro cartão do catálogo (no mobile o herói é compacto e o catálogo
  fica na primeira tela). Essa imagem só existe depois que a **API responde**, e a API só responde depois que o
  **MSW sobe** (um chunk de ~160 kB gzip).
- No navegador sem throttling o LCP real é de ~440 ms. O Lighthouse mobile simula rede lenta (1,6 Mbps) e CPU 4×
  mais lenta, e essa cadeia (baixar e iniciar o MSW, chamar a API, baixar a imagem) é o que infla o valor
  simulado para 3,7 s.
- É o custo de rodar o backend simulado dentro do navegador. Com um backend real a cadeia some e o LCP depende só
  do HTML/JS iniciais (como acontece no desktop, que fecha em 100).
- Medidas já aplicadas que ajudaram: o MSW só inicia depois do primeiro conteúdo pintado e o chunk dele é baixado
  em paralelo com prioridade baixa (`modulepreload`); imagens da primeira tela com prioridade alta; altura mínima
  de uma tela no `<main>` (tirou o CLS de 0,32 do detalhe); preload da fonte e da arte do herói; rotas no bundle
  inicial (sem cascata de chunks).

Para auditar o deploy publicado: `LH_BASE_URL=https://sua-url npm run lighthouse`.

## CI

`.github/workflows/ci.yml` roda a cada push na `main` e em pull requests (e pode ser disparado à mão):

1. **Tipos, lint e build** (`npm run check` e `npm run build`) em Linux.
2. **E2E (Playwright)**, depois do job anterior, em **Linux, macOS e Windows**: roda desktop, tablet e mobile, com a regressão
   visual contra as baselines do próprio sistema. Em caso de falha, o relatório HTML e os traces ficam como artefato.

`.github/workflows/visual-baselines.yml` (disparo manual) gera de novo as baselines de Linux e macOS em runners reais, roda a
verificação uma segunda vez para provar que são estáveis e as grava no repositório.

## Estrutura

```
src/
  app/        providers, router, queryClient
  routes/     rotas por arquivo (TanStack Router); `_auth/` = rotas privadas
  features/   catalog, home, auth, cart, checkout, orders, wallets, profile, favorites, nfts, newsletter
  components/ componentes compartilhados (header, rodapé, cartão de NFT, modal, formulários, paginação...)
  realtime/   cliente Socket.IO e reconciliação com o cache
  lib/        axios, dinheiro (bigint), chaves de cache, validação, portão dos mocks
  mocks/      backend simulado: banco, cenários, handlers REST, servidor Socket.IO
  types/      contratos de domínio compartilhados
  assets/     artes dos NFTs
e2e/          testes Playwright e baselines visuais (win32, linux, darwin)
scripts/      auditoria Lighthouse
.github/      workflows de CI e de geração das baselines visuais
```

## Uso de IA

Este projeto foi desenvolvido com apoio de um assistente de IA, o **Claude Code** (Anthropic). Registro aqui como foi
usado, para a avaliação ser transparente:

- **O que a IA fez:** escreveu a maior parte do código (telas, hooks, mocks do MSW, servidor Socket.IO simulado), os
  testes Playwright, os scripts de Lighthouse e de CI e os documentos (`README.md`, `ARCHITECTURE.md`).
- **O que ficou com o autor:** a direção do trabalho (requisitos, prioridades e o que corrigir), as escolhas de
  produto, a conferência com o Figma e a decisão do que publicar.
- **Revisão:** o autor revisou o código entregue e responde por ele.
- **Como foi verificado:** tipos, lint e a suíte E2E (`npm run check` e `npm run test:e2e`) rodam no CI em Linux, macOS e
  Windows, e a auditoria Lighthouse foi feita no deploy publicado. Os números deste README vêm dessas execuções.
- **Rastro no histórico:** os commits feitos com o assistente terminam com `Co-Authored-By: Claude`. Os commits das
  baselines visuais de Linux e macOS foram feitos pelo GitHub Actions.

## Deploy

O build (`dist/`) é um site estático. Como é uma SPA, **toda rota precisa cair em `index.html`** para que o
acesso direto e o refresh funcionem. Já estão incluídos os arquivos para as plataformas recomendadas:

- **Vercel:** `vercel.json` (rewrite para `/index.html`).
- **Netlify e Cloudflare Pages:** `public/_redirects` (`/* /index.html 200`).

Configuração: comando de build `npm run build`, diretório de saída `dist`. Nenhuma variável de ambiente é
necessária (os mocks já vêm ligados). O `mockServiceWorker.js` precisa ser servido na raiz do site, e já é
copiado de `public/` para o `dist/`.

## Fidelidade ao Figma

O visual foi feito a partir dos prints das telas do Figma (desktop 1440 e mobile 390) e depois conferido, tela por tela, contra o
export do Figma (PNG com todos os frames). Desvios e limites estão listados em
[ARCHITECTURE.md](ARCHITECTURE.md#desvios-do-figma).
