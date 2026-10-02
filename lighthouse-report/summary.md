# Lighthouse (mediana de 3 medições)

Alvo: Performance ≥ 90, Acessibilidade ≥ 95, Boas práticas ≥ 95, SEO ≥ 90.
URL: https://task-jungle-gaming.vercel.app

| Página | Perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|---|
| Home | Mobile | 96 ✅ | 100 ✅ | 100 ✅ | 100 ✅ | 2.62 s | 0.000 | 56 ms |
| Home | Desktop | 100 ✅ | 100 ✅ | 100 ✅ | 100 ✅ | 576 ms | 0.000 | 0 ms |
| Detalhe do NFT | Mobile | 97 ✅ | 100 ✅ | 100 ✅ | 100 ✅ | 2.46 s | 0.024 | 10 ms |
| Detalhe do NFT | Desktop | 100 ✅ | 100 ✅ | 100 ✅ | 100 ✅ | 582 ms | 0.047 | 0 ms |

- **Home · Mobile**: performance por medição = 93, 96, 96; FCP 1.71 s, Speed Index 1.71 s. Auditorias abaixo de 90: largest-contentful-paint (87), valid-source-maps (0), unused-javascript (0), lcp-discovery-insight (0), network-dependency-tree-insight (0), render-blocking-insight (50).
- **Home · Desktop**: performance por medição = 100, 100, 100; FCP 416 ms, Speed Index 468 ms. Auditorias abaixo de 90: valid-source-maps (0), unused-javascript (0), image-delivery-insight (50), network-dependency-tree-insight (0), render-blocking-insight (50).
- **Detalhe do NFT · Mobile**: performance por medição = 96, 97, 97; FCP 1.70 s, Speed Index 1.70 s. Auditorias abaixo de 90: valid-source-maps (0), unused-javascript (0), lcp-discovery-insight (0), network-dependency-tree-insight (0), render-blocking-insight (50).
- **Detalhe do NFT · Desktop**: performance por medição = 100, 100, 100; FCP 418 ms, Speed Index 494 ms. Auditorias abaixo de 90: valid-source-maps (0), unused-javascript (0), network-dependency-tree-insight (0), render-blocking-insight (50).

## Ambiente

- Lighthouse 13.5.0; chrome-launcher 1.2.2
- Chrome: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/154.0.0.0 Safari/537.36
- Node v24.18.0; Windows_NT 10.0.26300 (x64), 12 CPUs
- Chrome novo (cache frio) a cada medição, headless; deploy público; cenário padrão dos mocks

## Condições por perfil

- Home · Mobile: mobile; throttling simulate; CPU 4x; rede 150 ms RTT / 1638 kbps
- Home · Desktop: desktop; throttling simulate; CPU 1x; rede 40 ms RTT / 10240 kbps
- Detalhe do NFT · Mobile: mobile; throttling simulate; CPU 4x; rede 150 ms RTT / 1638 kbps
- Detalhe do NFT · Desktop: desktop; throttling simulate; CPU 1x; rede 40 ms RTT / 10240 kbps
