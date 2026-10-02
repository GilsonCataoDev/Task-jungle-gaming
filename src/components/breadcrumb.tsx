import { Link } from "@tanstack/react-router"
import { Fragment } from "react"

type Crumb = { label: string; to?: string }

/** "Início / Mercado / Carrinho": o último item é a página atual. */
export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Você está em" className="text-sm font-bold">
      <ol className="flex flex-wrap items-center gap-x-2">
        {items.map((item, index) => {
          const last = index === items.length - 1
          return (
            <Fragment key={item.label}>
              <li>{item.to && !last ? <Link to={item.to} className="hover:text-primary">{item.label}</Link> : <span aria-current={last ? "page" : undefined}>{item.label}</span>}</li>
              {!last && <li aria-hidden>/</li>}
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
