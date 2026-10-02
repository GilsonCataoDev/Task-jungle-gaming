import { createRouter } from "@tanstack/react-router"
import { routeTree } from "@/routeTree.gen"
import { queryClient } from "./query-client"

/** O queryClient vai no contexto para `beforeLoad`/`loader` usarem o mesmo cache do React. */
export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
  scrollRestoration: true,
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
