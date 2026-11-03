import { QueryClient } from "@tanstack/react-query";

export function createScopedQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        refetchOnReconnect: false,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false, gcTime: 0 },
    },
  });
}
