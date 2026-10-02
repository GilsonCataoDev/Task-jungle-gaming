import { createFileRoute } from "@tanstack/react-router"
import { HomeContent } from "@/features/home/home-content"
import { validateNftSearch } from "@/features/nfts/search"

export const Route = createFileRoute("/")({
  validateSearch: validateNftSearch,
  component: HomePage,
})

function HomePage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <HomeContent
      search={search}
      // Mudar um filtro volta para a página 1; só a paginação preserva/define `page`.
      onChange={(patch, options) => void navigate({ search: (current) => ({ ...current, ...patch, page: options?.keepPage ? (patch.page ?? current.page) : undefined }) })}
      onReset={() => void navigate({ search: {} })}
    />
  )
}
