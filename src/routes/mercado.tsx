import { createFileRoute } from "@tanstack/react-router"
import { Breadcrumb } from "@/components/breadcrumb"
import { Catalog } from "@/features/catalog/catalog"
import { validateNftSearch } from "@/features/nfts/search"

export const Route = createFileRoute("/mercado")({
  validateSearch: validateNftSearch,
  component: MarketPage,
})

function MarketPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <>
      <div className="page-shell pt-8 max-md:hidden">
        <Breadcrumb items={[{ label: "Início", to: "/" }, { label: "Mercado" }]} />
      </div>
      <h1 className="sr-only">Mercado</h1>
      <Catalog
        search={search}
        onChange={(patch, options) => void navigate({ search: (current) => ({ ...current, ...patch, page: options?.keepPage ? (patch.page ?? current.page) : undefined }) })}
        onReset={() => void navigate({ search: {} })}
      />
    </>
  )
}
