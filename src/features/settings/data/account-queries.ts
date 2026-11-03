import { queryOptions } from "@tanstack/react-query";

import { withTimeout } from "@/shared/api/network-timeout";
import { createScopedQueryClient } from "@/shared/api/query-client";

import { accountGateway } from "./account-gateway";

export function accountCapabilitiesQueryOptions(userId: string) {
  return queryOptions({
    queryKey: ["account", "capabilities", userId],
    queryFn: () => withTimeout(accountGateway.getCapabilities(userId)),
    staleTime: 0,
  });
}

export async function fetchAccountCapabilities(userId: string) {
  const client = createScopedQueryClient();
  try {
    return await client.fetchQuery(accountCapabilitiesQueryOptions(userId));
  } finally {
    client.clear();
  }
}
