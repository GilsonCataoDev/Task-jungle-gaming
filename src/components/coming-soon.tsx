import { Link } from "@tanstack/react-router"

/** Seções do menu que ainda não existem na demonstração (Criadores, Aprenda...). */
export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="page-shell py-24 text-center">
      <h1 className="text-3xl">{title}</h1>
      <p className="mt-3 text-tan">Esta seção chega em breve ao Kurio.</p>
      <Link to="/mercado" className="mt-8 inline-flex h-10 items-center rounded-sm bg-primary px-6 font-bold text-primary-foreground hover:bg-primary/85">Explorar o mercado</Link>
    </div>
  )
}
