import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type PropsWithChildren } from "react";

import { createScopedQueryClient } from "./query-client";

export function ScopedQueryProvider({ children }: PropsWithChildren) {
  const [client] = useState(createScopedQueryClient);
  useEffect(() => () => client.clear(), [client]);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
