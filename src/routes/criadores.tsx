import { createFileRoute } from "@tanstack/react-router"
import { ExternalLink } from "lucide-react"

export const Route = createFileRoute("/criadores")({ component: CreatorsPage })

const AUTHOR = { name: "Gilson Catão", github: "https://github.com/GilsonCataoDev" }

/** "Criadores" não existe no Figma além do item de menu; aqui ela apresenta quem fez o projeto. */
function CreatorsPage() {
  return (
    <div className="page-shell py-16">
      <h1 className="text-3xl">Criadores</h1>
      <section aria-labelledby="quem-fez" className="mt-8 max-w-xl bg-card p-6">
        <h2 id="quem-fez" className="text-lg font-bold text-primary">Quem fez a Kurio</h2>
        <div className="mt-5 flex items-center gap-4">
          <span aria-hidden className="grid size-16 shrink-0 place-items-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
            {AUTHOR.name.split(" ").map((part) => part[0]).join("")}
          </span>
          <div>
            <p className="text-xl font-bold">{AUTHOR.name}</p>
            <a href={AUTHOR.github} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1.5 text-sm text-primary underline">
              github.com/GilsonCataoDev <ExternalLink className="size-3.5" aria-hidden />
              <span className="sr-only">(abre em nova aba)</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
