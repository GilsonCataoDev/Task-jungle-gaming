import { Link } from "@tanstack/react-router"
import type { ComponentType, FormEvent, SVGProps } from "react"
import { useState } from "react"
import { FacebookIcon, InstagramIcon, LinkedinIcon, TwitterIcon, YoutubeIcon } from "@/components/icons"
import { Logo } from "@/components/site-header"
import { useSubscribeNewsletter } from "@/features/newsletter/hooks"
import { getApiError } from "@/lib/api"

const FEATURES = [
  { letter: "W", title: "Segurança da carteira", text: "Proteja sua carteira e colecione arte digital verificada com confiança." },
  { letter: "C", title: "Criadores em destaque", text: "Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede." },
  { letter: "D", title: "Alertas de lançamentos", text: "Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado." },
]

const SOCIAL: { label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { label: "Facebook", Icon: FacebookIcon },
  { label: "Instagram", Icon: InstagramIcon },
  { label: "Twitter", Icon: TwitterIcon },
  { label: "LinkedIn", Icon: LinkedinIcon },
  { label: "YouTube", Icon: YoutubeIcon },
]

function Newsletter() {
  const subscribe = useSubscribeNewsletter()
  const [email, setEmail] = useState("")
  const error = subscribe.error ? getApiError(subscribe.error) : null

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    subscribe.mutate(email, { onSuccess: () => setEmail("") })
  }

  return (
    <form onSubmit={onSubmit} noValidate aria-labelledby="newsletter-titulo">
      <h2 id="newsletter-titulo" className="text-lg leading-tight">Antecipe-se ao próximo lançamento</h2>
      <div className="mt-4 flex">
        <label htmlFor="newsletter-email" className="sr-only">Seu e-mail</label>
        <input
          id="newsletter-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="digite seu e-mail..."
          aria-invalid={!!error}
          aria-describedby={error ? "newsletter-erro" : undefined}
          className="h-10 min-w-0 flex-1 bg-band px-3 text-sm text-foreground outline-none placeholder:text-tan/60 focus-visible:ring-2 focus-visible:ring-primary"
        />
        <button type="submit" disabled={subscribe.isPending} className="h-10 bg-primary px-4 text-base font-bold text-primary-foreground hover:bg-primary/85 disabled:opacity-60">
          Enviar
        </button>
      </div>
      {error && <p id="newsletter-erro" role="alert" className="mt-2 text-sm text-destructive">{error.fields?.email ?? error.message}</p>}
      {subscribe.isSuccess && <p role="status" className="mt-2 text-sm text-primary">Pronto! Você receberá os próximos lançamentos.</p>}
      <p className="mt-3 text-sm leading-6 text-tan">Receba lançamentos selecionados, histórias de criadores e novidades do mercado.</p>
    </form>
  )
}

const COLLECTIONS_LINKS = ["Arte digital", "Fotografia", "Música", "Arte 3D", "Utilidade"] as const

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-card text-sm max-md:mb-24">
      <div className="mx-auto w-full max-w-[1200px]">
        <div className="grid gap-8 px-6 py-10 sm:grid-cols-2 md:px-12 lg:grid-cols-[repeat(3,1fr)_1.15fr]">
          {FEATURES.map(({ letter, title, text }) => (
            <div key={title} className="lg:border-r lg:border-primary/45 lg:pr-6">
              <span aria-hidden className="grid size-[74px] place-items-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">{letter}</span>
              <h2 className="mt-4 text-base">{title}</h2>
              <p className="mt-2 leading-6 text-tan">{text}</p>
            </div>
          ))}
          <Newsletter />
        </div>

        <div className="grid items-center gap-3 bg-band px-6 py-6 md:grid-cols-[1fr_1.4fr_1fr_1fr] md:px-8">
          <Logo className="text-base" />
          <p>Feito para colecionadores, criadores e cultura</p>
          <a href="mailto:contato@email.com" className="hover:text-primary">contato@email.com</a>
          <a href="tel:+551140028922" className="hover:text-primary">+55 11 4002 8922</a>
        </div>

        <div className="grid gap-8 px-6 py-8 sm:grid-cols-2 md:px-8 lg:grid-cols-4">
          <nav aria-label="Meu perfil no rodapé">
            <h2 className="text-lg">Meu perfil</h2>
            <ul className="mt-2 space-y-2.5">
              <li><Link to="/perfil" className="hover:text-primary">Meu perfil</Link></li>
              <li><span className="text-foreground/80">Minha coleção</span></li>
              <li><Link to="/atividade" className="hover:text-primary">Atividade</Link></li>
              <li><span className="text-foreground/80">Estúdio do criador</span></li>
              <li><Link to="/lista-de-interesse" className="hover:text-primary">Lista de interesse</Link></li>
            </ul>
          </nav>
          <div>
            <h2 className="text-lg">Central de ajuda</h2>
            <ul className="mt-2 space-y-2.5 text-foreground/80">
              <li>Central de ajuda</li>
              <li>Como comprar NFTs</li>
              <li>Carteira e segurança</li>
              <li>Política do mercado</li>
              <li>Denunciar item</li>
            </ul>
          </div>
          <nav aria-label="Coleções no rodapé">
            <h2 className="text-lg">Coleções</h2>
            <ul className="mt-2 space-y-2.5">
              {COLLECTIONS_LINKS.map((name) => (
                <li key={name}><Link to="/mercado" search={{ category: name }} className="hover:text-primary">{name}</Link></li>
              ))}
            </ul>
          </nav>
          <div>
            <h2 className="text-lg">Redes sociais</h2>
            <ul className="mt-3 flex flex-wrap gap-3">
              {SOCIAL.map(({ label, Icon }) => (
                <li key={label}>
                  <span role="img" aria-label={label} className="grid size-8 place-items-center rounded-sm border border-primary text-primary"><Icon className="size-4" /></span>
                </li>
              ))}
            </ul>
            <h2 className="mt-6 text-lg">Carteiras compatíveis</h2>
            <p className="mt-3 inline-block rounded-sm border border-primary/40 bg-background px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-primary">MetaMask • WalletConnect • Coinbase</p>
          </div>
        </div>
      </div>
      <p className="bg-background py-4 text-center text-xs text-foreground/80">© 2026 Kurio. Propriedade digital para todos.</p>
    </footer>
  )
}
