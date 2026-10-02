# Arquitetura

## Camadas
```
src/
  app/        providers, router, queryClient
  routes/     rotas por arquivo (TanStack Router). `_auth/` = rotas privadas
  features/   catalog, home, auth, cart, checkout, orders, wallets, profile, favorites, nfts, newsletter
  components/ header, rodapé, barra inferior (mobile), cartão de NFT, modal, formulários, paginação...
  realtime/   cliente Socket.IO + reconciliação com o cache
  lib/        axios, dinheiro (bigint), chaves de cache, validação, portão dos mocks
  mocks/      "backend" simulado (MSW): banco, cenários, handlers REST, servidor Socket.IO
  types/      contratos de domínio compartilhados por app e mocks
  assets/     artes dos NFTs
```

## Domínio
- **NFT:** `id`, `name`, `tokenId`, `category` (a "Coleção" da barra lateral: Arte digital, Fotografia, Música, Arte 3D, Colecionáveis, Generativa, Jogos, Assinaturas, Utilidade), `collection` (ex.: "Kurio Apes"), `network` (Ethereum, Polygon, Solana), `priceEth`, `available`, `edition`, `rating`, `likes`, `listedAt`, `version`.
- **Carteira:** `nickname`, `network`, `address`, `type` (MetaMask, WalletConnect, Coinbase Wallet), `ens`, mais os dados do dono (nome de exibição, nome do perfil, código de indicação, e-mail). Uma **principal** e, no máximo, uma **secundária**.
- **Pedido:** itens (com edição), `provider` (carteira usada para assinar), `collector` (snapshot do "Perfil do colecionador"), totais, `status` e `version`.
- **Catálogo:** 36 NFTs (4 páginas de 9). O catálogo, as contagens da barra lateral e os limites de preço vêm do servidor.

## Contratos REST
Base `/api`. JSON em tudo (exceto o avatar, que é `multipart`). 🔒 = exige `Authorization: Bearer <token>`.
Erros seguem sempre `{ "code": string, "message": string, "fields"?: { [campo]: string } }`; `fields` aparece nos 422.

| Método e rota | Corpo / query | Sucesso | Erros |
|---|---|---|---|
| `POST /auth/register` | `{ username, email, password }` | 201 `{ token, user, expiresAt }` | 422 `validation_error` (fields) · 409 `email_taken` · 409 `username_taken` |
| `POST /auth/login` | `{ email, password }` | 200 `{ token, user, expiresAt }` | 422 `validation_error` · 401 `invalid_credentials` |
| `GET /auth/session` 🔒 | | 200 `{ user, expiresAt }` | 401 |
| `POST /auth/logout` 🔒 | | 204 | |
| `GET /nfts` | `search, category, network, minPrice, maxPrice, tab (all·new·trending), sort (recent·price-asc·price-desc·name), page, pageSize (≤48, padrão 9)` | 200 `{ items, total, page, pageSize }` | |
| `GET /nfts/facets` | | 200 `{ categories, networks, priceRange: { min, max }, featured }` (contagens sobre o catálogo inteiro) | |
| `GET /nfts/:id` | | 200 `NftDetail` = `Nft` + `reviews[]` (`canEdit` se for o criador logado) | 404 `not_found` |
| `PATCH /nfts/:id` 🔒 | `{ name?, description? }` | 200 `Nft` | 403 `forbidden` (não é o criador) · 404 · 422 |
| `GET /favorites` 🔒 | | 200 `{ nftIds }` | |
| `PUT /favorites/:nftId` 🔒 | | 200 `{ nftIds }` | 404 |
| `DELETE /favorites/:nftId` 🔒 | | 200 `{ nftIds }` | |
| `GET /cart` 🔒 | | 200 `Cart` = `{ items: [{ nft, quantity, edition }], updatedAt }` | |
| `POST /cart/items` 🔒 | `{ nftId, quantity? = 1, edition? }` | 201 `Cart` | 404 · 409 `unavailable` |
| `PATCH /cart/items/:nftId` 🔒 | `{ quantity }` (0 remove; limitado ao estoque) | 200 `Cart` | 404 · 422 |
| `DELETE /cart/items/:nftId` 🔒 | | 200 `Cart` | |
| `POST /quote` 🔒 | `{ coupon? }` | 200 `Quote` = `{ items, subtotalEth, discountEth, networkFeeEth, totalEth, coupon, issues[] }` | |
| `POST /orders` 🔒 | header **`Idempotency-Key`** + `{ walletId, provider, collector, coupon, expectedTotalEth }` | 201 `Order` (novo) · 200 `Order` + `Idempotent-Replayed: true` (repetição) | 400 `idempotency_key_required` · 409 `idempotency_conflict` · 409 `empty_cart` · 409 `inventory_conflict` · 409 `price_changed` · 422 `invalid_coupon` / `validation_error` (fields do `collector`) · 402 `payment_rejected` |
| `GET /orders` 🔒 | | 200 `{ items }` (mais recentes primeiro) | |
| `GET /orders/:id` 🔒 | | 200 `Order` | 404 (também para pedido de outro usuário: não revela que existe) |
| `GET /profile` 🔒 | | 200 `User` | |
| `PATCH /profile` 🔒 | `{ name?, username?, email?, ens?, walletNickname? }` | 200 `User` | 422 (inclui e-mail e usuário em uso) |
| `POST /profile/avatar` 🔒 | `multipart`, campo `avatar` (imagem, ≤ 1 MB) | 200 `User` | 422 |
| `DELETE /profile/avatar` 🔒 | | 200 `User` | |
| `POST /profile/password` 🔒 | `{ currentPassword, newPassword }` | 204 | 422 |
| `GET /wallets` 🔒 | | 200 `{ items }` | |
| `POST /wallets` 🔒 | `WalletInput` (apelido, rede, endereço `0x`+40 hex, tipo, ENS, dados do dono...) | 201 `Wallet` (a primeira vira principal) | 422 (fields) · 409 `wallet_limit` (já há principal e secundária) |
| `PATCH /wallets/:id` 🔒 | campos de `WalletInput` e/ou `{ isPrimary }` | 200 `{ items }` | 404 · 422 (não dá para desmarcar a única principal) |
| `POST /newsletter` | `{ email }` | 204 | 422 |

Erros transversais: toda rota 🔒 responde 401 `unauthenticated` (sem token válido) ou `session_expired`;
os cenários de falha acrescentam 503 `server_error` e 500 `mutation_failed`.

**`Quote.issues`:** `{ code: "unavailable", nftId, available }` e `{ code: "invalid_coupon", message }`.
Cupom inválido **não** é erro HTTP: volta dentro do `Quote`, para a tela mostrar o motivo sem perder o resto.

**`Order`:** `{ id, status, version, transactionId, walletId, provider, collector, items, subtotalEth, discountEth, networkFeeEth, totalEth, createdAt }`.
`status`: `pending` (v1) → `processing` (v2, após 1,5 s) → `confirmed` (v3, após 3,5 s, ganha `transactionId`).
O tipo também prevê `failed`, que o mock não produz.

## Eventos Socket.IO
| Evento | Payload | Quando é emitido | Efeito no cliente |
|---|---|---|---|
| `nft.updated` | `{ id, version, priceEth, available }` | O servidor altera preço, estoque, nome ou descrição de um NFT (inclui a compra que baixa o estoque) | Se `version` > a conhecida: atualiza detalhe, listas, NFT em destaque e itens de carrinho; invalida cotações |
| `order.updated` | `{ id, version, status, transactionId }` | Cada transição do pedido | Se `version` > a conhecida: atualiza detalhe e lista de pedidos |

Conexão: `wss://realtime.kurio.mock` (ou `VITE_SOCKET_URL`), path `/socket.io/`, só transporte `websocket`.

## Política de sessão
- Token opaco (`tok_<userId>_<n>`) enviado como `Bearer`; fica em `localStorage` (`kurio:token`).
  Para um backend real o ideal seria cookie `httpOnly`; aqui é uma simplificação consciente do mock.
- **TTL fixo de 30 min** desde o login, sem renovação. Passou o prazo: 401 `session_expired` e o servidor descarta o token.
- **Boot:** `GET /auth/session` com o token salvo. Um 401 ali significa só "visitante" (token antigo), sem aviso de expiração.
- **Expiração durante o uso:** qualquer 401 vindo do Axios dispara um evento que descarta os dados privados e leva a
  `/login?redirect=<destino>&reason=expired` (o modal mostra o aviso). Depois do login o usuário volta ao destino.
- **Logout:** `POST /auth/logout`; se a chamada falhar, a sessão local é encerrada mesmo assim.
- `redirect` só aceita caminhos internos (`/...`), nunca URLs externas.

## Estado do carrinho
- Vive no servidor, **por usuário**: linhas `{ nftId, quantity, edition }` + `updatedAt`. O carrinho exige login
  (visitante que tenta comprar vai ao modal de login e volta para o NFT).
- O carrinho **não congela preço**: o preço exibido é sempre o do catálogo naquele momento, e `expectedTotalEth` no
  pedido impede surpresas (409 `price_changed`).
- Quantidade é limitada ao estoque. Depois de um pedido criado, o carrinho esvazia.
- `updatedAt` entra na chave da cotação, então mexer no carrinho refaz a cotação.
- O cupom aplicado fica em `sessionStorage` (`kurio:coupon`) e acompanha o usuário do carrinho ao checkout.
- Adicionar, alterar e remover são otimistas, com rollback.

## Estratégia de cache (TanStack Query)
Padrão: `staleTime` 30 s, `retry` 1, revalidação ao focar a janela.

| Dado | Chave | Como se mantém atualizado |
|---|---|---|
| Sessão | `["session"]` (`staleTime` 60 s) | `startSession`/`endSession` escrevem direto |
| Catálogo, detalhe, facetas | `["nfts", "list", params]`, `["nfts", "detail", id]`, `["nfts", "facets"]` | `nft.updated`; invalidado no login/logout (`canEdit`) e depois de criar pedido |
| Carrinho, favoritos, carteiras, perfil | `["user", userId, ...]` | Mutação otimista + `invalidate` no `onSettled` |
| Cotação | `["user", userId, "quote", cupom, cart.updatedAt]` | Invalidada por mudança de carrinho e por `nft.updated` |
| Pedidos | `["user", userId, "orders", ...]` | `order.updated`; polling de 4 s até o estado final; lista invalidada ao criar |
| Tudo | | Após reconexão do socket: `invalidateQueries()` (o REST vira a fonte da verdade) |

Respostas obsoletas: cada `queryFn` repassa o `signal` ao Axios, então uma busca nova cancela a anterior.

## Dinheiro
ETH é sempre string decimal. Toda conta usa `bigint` em wei (`lib/money.ts`); nunca `number`.
(O controle de faixa de preço é a única exceção: usa `number` só para o slider e converte para string com 2 casas.)

## Isolamento de dados e navegação
- Chaves privadas incluem o `userId` (`lib/query-keys.ts`) e o mock indexa tudo por usuário: trocar de conta nunca reaproveita dados da anterior.
- Login, logout e expiração descartam os dados privados do cache (`startSession`/`endSession`), sem `queryClient.clear()` (que desconectaria componentes inscritos, como o header).
- Rotas privadas: layout `_auth.tsx` (`beforeLoad` + `redirect`). Pedido de outro usuário responde 404, não 403.
- Filtros do catálogo (coleção, rede, faixa de preço, aba, ordenação, página, busca) vivem na URL (search params validados em `features/nfts/search.ts`); `keepPreviousData` evita piscar na paginação.
- Mutações do carrinho, favoritos e carteira principal são otimistas, com rollback no `onError` e revalidação no `onSettled`.

## Modais
Login, cadastro, recibo, filtros (mobile) e ampliação de imagem usam o mesmo `components/modal.tsx`, sobre
`<dialog>` nativo: `showModal()` deixa o resto inerte; em cima disso há foco preso (o nativo deixa o Tab escapar para o
navegador), Esc e clique no fundo fecham, o foco inicial vai ao campo marcado com `data-autofocus` e, ao fechar, volta ao
elemento que abriu. No mobile o modal ocupa a tela toda, como no Figma.
Login, cadastro e recibo são **rotas** que renderizam a home como fundo (`inert`): dá para abrir por link direto,
recarregar e usar o histórico.

## Pedidos idempotentes
- Cliente envia `Idempotency-Key` estável por conteúdo (`useIdempotencyKey`).
- Servidor: mesma chave + mesmo corpo → mesmo pedido (200, `Idempotent-Replayed`); mesma chave + corpo diferente → 409 `idempotency_conflict`.
- Total esperado é conferido no servidor (409 `price_changed`); estoque também (409 `inventory_conflict`).
- Depois de uma resposta perdida (timeout), "Tentar novamente" reenvia o **mesmo** pedido com a mesma chave.

## Carregamento e portão dos mocks
O app renderiza antes de o MSW existir. `lib/mock-gate.ts` é uma promessa que o Axios (interceptor de request) e o
provider do socket aguardam; ela abre quando o worker termina de iniciar, e `window.__mocks` só aparece nesse momento.
O MSW só começa a executar depois do First Contentful Paint (`main.tsx`), e o chunk dele é baixado antes, em paralelo e com
prioridade baixa, por um `modulepreload` injetado no HTML no build (`vite.config.ts`). Quem já tem sessão salva inicia o
MSW na hora (a rota precisa de `GET /auth/session` antes de pintar). Rotas ficam no bundle inicial
(`autoCodeSplitting: false`) para evitar a cascata de chunks no mobile.

## Tempo real
- Eventos: `nft.updated` e `order.updated`, ambos com `version` monotônica.
- `realtime/reconcile.ts` só aplica evento com versão maior que a conhecida: duplicados e atrasados são ignorados e não repetem efeitos.
- Após reconexão, `resync` invalida tudo e o REST vira a fonte da verdade.
- Pedido pendente: `GET /orders/:id` avança o status pelo relógio e a tela faz polling como rede de segurança.
- **Transporte simulado:** o MSW intercepta o WebSocket (`mocks/realtime.ts`), falando Engine.IO v4 / Socket.IO v5 só por `websocket`. Limitações: sem polling/upgrade, sem rooms, sem acks, um namespace. `socket.io-client` é carregado por import dinâmico porque captura `globalThis.WebSocket` na avaliação do módulo.
- O estado da conexão aparece num `role="status"` (só para leitores de tela quando "Ao vivo"; visível quando conectando ou reconectando).

## Mocks e cenários
Banco em `localStorage` (`kurio:mock-db:v2`), semeado por fixtures determinísticas.
Controle: `?scenario=<nome>` na URL ou `window.__mocks` no console.

| Cenário | Efeito |
|---|---|
| `slow` | respostas em ~2,5 s |
| `timeout` | 1x: pedido criado, resposta só após o timeout do cliente |
| `server-error` | 503 em tudo |
| `mutation-error` | 500 nas mutações (testa rollback) |
| `session-expired` | 401 `session_expired` nas rotas privadas |
| `price-change` | 1x: preço do carrinho sobe 10% antes do pedido |
| `payment-rejected` | pedido → 402 "Transação recusada pela carteira" |
| `inventory-conflict` | 1x: estoque do 1º item zera antes do pedido |

`window.__mocks`: `reset()`, `setScenario()`, `updateNft()`, `emit()`, `disconnectSockets()`.
Esses controles agem no *servidor* simulado; a UI só descobre as mudanças por REST ou Socket.IO.

## Credenciais fictícias
`demo@kurio.dev` / `Demo@1234` (Nova Sato) · `maya@kurio.dev` / `Maya@1234` (Maya Lin)
Cupons: `KURIO10` (10%), `WELCOME` (0.05 ETH). Taxa de rede fixa: 0.016 ETH ("taxa estimada").

## Design
Tokens extraídos dos prints do Figma, definidos em `src/index.css` (`:root`) e mapeados no tema do Tailwind/shadcn:

| Token | Valor | Uso |
|---|---|---|
| `--background` | `#140d0b` | fundo da página |
| `--card` | `#241612` | cartões, barra lateral, modais, rodapé |
| `--band` | `#38220f` | faixa do rodapé e campo da newsletter |
| `--primary` | `#d28a4c` | botões, preços, item ativo, detalhes |
| `--foreground` / `--tan` | `#f5f1eb` / `#cfb28c` | texto principal / secundário |
| `--border` | `#3f2319` | bordas de campos |

Fonte: Roboto Mono (variável, `@fontsource-variable/roboto-mono`). Contêiner de 1200 px (`.page-shell`).
Breakpoints: mobile < 768 (layout do Figma mobile, com barra inferior), tablet 768 a 1023, desktop ≥ 1024 (filtros fixos na lateral) e ≥ 1280 (galeria completa).

## Testes E2E (Playwright)
`npm run test:e2e` faz o build, sobe `vite preview` (porta 4173) e roda nos projetos `desktop` (1440), `tablet` (768) e `mobile` (390).
Cada teste abre um contexto limpo: o banco simulado nasce das fixtures, então não há dependência entre testes.
Primeira vez: `npx playwright install chromium` (ou `PW_CHANNEL=chrome` para usar o Chrome instalado).
Contra o servidor de dev: `PW_BASE_URL=http://localhost:5173 npx playwright test`.

| Arquivo | Cenário do desafio |
|---|---|
| `catalog.spec.ts` | busca, filtros combinados (coleção, rede, preço), ordenação, abas, paginação e restauração pelo histórico; carrossel do herói |
| `details.spec.ts` | acesso direto, galeria, edições e abas, recurso inexistente, 404, rota privada, esgotado, falha e nova tentativa |
| `auth.spec.ts` | cadastro, login (modal), sessão expirada, token antigo, logout e troca de usuário sem vazamento |
| `favorites.spec.ts` | favoritos otimistas, falha de mutação com rollback, lista de interesse |
| `purchase.spec.ts` | compra completa até o recibo (modal) |
| `checkout.spec.ts` | carteira e provedor, transação recusada, clique duplicado, timeout com idempotência, preço/estoque, cupom, validação |
| `account.spec.ts` | perfil, avatar, senha, carteiras (principal/secundária), menu lateral |
| `realtime.spec.ts` | preço e estoque via Socket.IO durante o checkout |
| `resilience.spec.ts` | eventos duplicados/antigos, desconexão, pedido pendente, isolamento de pedidos |
| `a11y.spec.ts` | teclado, foco visível, modal (foco preso, Esc, retorno), validação de formulário, barra inferior e gaveta de filtros no mobile |
| `slow.spec.ts` | feedback de carregamento lento e recuperação |
| `responsive.spec.ts` | sem overflow nos 3 viewports (inclui telas privadas) + regressão visual |

Baselines visuais ficam em `e2e/__screenshots__/<sistema>/<projeto>/`. Como a fonte renderiza diferente em cada sistema operacional, há uma pasta por sistema; se faltar a do sistema atual, o teste a cria e passa. Refazer de propósito: `npm run test:e2e:update`.

## Decisões de UX
- Filtros do catálogo na URL: voltar, recarregar e compartilhar o link restauram a listagem.
- A lista anterior permanece na tela enquanto a nova carrega (sem piscar para esqueleto na paginação).
- Mutações otimistas avisam e desfazem a alteração quando falham (nunca falham em silêncio).
- Checkout: depois de uma resposta perdida (timeout), "Tentar novamente" reenvia o mesmo pedido com a mesma
  `Idempotency-Key`, e o texto explica que não haverá cobrança dobrada.
- O total é recalculado pelo servidor a cada mudança de preço (inclusive ao vivo). Se mudar entre a revisão e a
  confirmação, a compra é recusada com 409 e o usuário confirma de novo com o valor novo.
- O formulário do colecionador vem preenchido com a carteira escolhida; "Usar outra carteira?" troca para a secundária.
- Erros de formulário ficam ligados ao campo (`aria-invalid` + `aria-describedby`), no cliente e no servidor.

## Limitações conhecidas
- Mocks rodam no navegador: o estado vive no `localStorage` de cada visitante (não é compartilhado entre pessoas).
- Socket.IO simulado só fala `websocket` (sem polling), sem rooms nem acks, e um namespace.
- O status do pedido avança por relógio (1,5 s → processando, 3,5 s → confirmado), não por um processo real.
- Só existem baselines visuais de Windows (`win32`); em Linux/macOS elas são criadas na primeira execução, então a regressão visual só protege a partir da segunda.
- Performance do Início no mobile fica em 88 no build local e 95 no deploy da Vercel (ver o README: o LCP depende do MSW subir no navegador).

## Segurança
- Cabeçalhos no `vercel.json`: CSP restritiva (só a própria origem; `style-src-attr 'unsafe-inline'` apenas para os atributos `style` do React), `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy` e `Permissions-Policy`.
- Sem `dangerouslySetInnerHTML`/`eval`; links externos com `rel="noopener noreferrer"`; `npm audit` sem vulnerabilidades.
- **O que mudaria com um backend real:** o token de sessão está no `localStorage` (qualquer XSS o leria); o correto é cookie `HttpOnly; Secure; SameSite`. As senhas do banco simulado ficam em texto puro porque são dados de demonstração no navegador; num servidor real seriam guardadas com hash (argon2/bcrypt), com limite de tentativas de login.

## Desvios do Figma
O design foi implementado a partir de **prints** das telas (desktop 1440 e mobile 390); o arquivo do Figma em si não
pôde ser inspecionado (sem medidas exatas), então espaçamentos, raios e tamanhos foram medidos nos prints.
Pontos conhecidos:

- **Artes dos NFTs:** são recortes dos próprios prints (4 imagens, reaproveitadas entre os 36 NFTs, como no Figma),
  em resolução baixa (234 a 434 px). O ideal é trocar pelos arquivos originais exportados do Figma.
- **Tablet (768):** não existe no Figma; é uma adaptação (cabeçalho compacto, miniaturas abaixo da imagem, filtros
  em gaveta).
- **Itens sem tela no Figma:** *Criadores* e *Aprenda* (menu), *Ofertas*, *Arquivos baixados* e *Suporte* (menu do
  perfil) e "Ler mais" do Diário da Cunhagem aparecem como no design, mas desabilitados ou "em breve". Login com
  Google/Facebook e "Esqueceu a senha?" mostram um aviso de que não existem na demonstração.
- **Conteúdo inventado:** textos dos slides 2 e 3 do herói, avaliações dos colecionadores, descrições e nomes dos NFTs
  gerados (além dos que aparecem nos prints).
- **Carrinho exige login:** no Figma o carrinho aparece antes de "Conectar e finalizar"; aqui ele é por usuário no servidor.
- **Coleção selecionada:** o Figma mostra "Arte digital" já em laranja; aqui nenhuma coleção vem selecionada
  (senão a home já abriria filtrada). O laranja só aparece no filtro ativo.
- **Acréscimos:** indicador de conexão (só aparece se cair), busca no cabeçalho (ícone do Figma, que aqui expande um
  campo), gaveta de filtros e ordenação no mobile, páginas Atividade e Lista de interesse.
- **Ordenação no mobile:** o "Ordenar por" do desktop não existe na tela mobile do Figma; aqui ele fica dentro da gaveta de filtros.
