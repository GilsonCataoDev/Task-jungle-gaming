import { useMutation } from "@tanstack/react-query"
import { api } from "@/lib/api"

export function useSubscribeNewsletter() {
  return useMutation({
    mutationFn: async (email: string) => {
      await api.post("/newsletter", { email })
    },
  })
}
