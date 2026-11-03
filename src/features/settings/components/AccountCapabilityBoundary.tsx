import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { ErrorState, Skeleton } from "@/components/ui";
import { MarketplaceShell } from "@/features/shell/components/MarketplaceShell";
import { ScopedQueryProvider } from "@/shared/api/ScopedQueryProvider";

import { type AccountCapabilities } from "../data/account-gateway";
import { accountCapabilitiesQueryOptions } from "../data/account-queries";

type AccountCapabilityBoundaryProps = Readonly<{
  children: (capabilities: AccountCapabilities) => ReactNode;
  userId: string;
}>;

export function AccountCapabilityBoundary({
  children,
  userId,
}: AccountCapabilityBoundaryProps) {
  return (
    <ScopedQueryProvider key={userId}>
      <CapabilityQuery userId={userId}>{children}</CapabilityQuery>
    </ScopedQueryProvider>
  );
}

function CapabilityQuery({ children, userId }: AccountCapabilityBoundaryProps) {
  const query = useQuery(accountCapabilitiesQueryOptions(userId));

  if (query.isSuccess) return children(query.data);
  return (
    <MarketplaceShell activeSection="profile" title="Account access">
      {query.isError ? (
        <ErrorState
          message="We couldn't verify account access. Check your connection and try again."
          onRetry={() => void query.refetch()}
        />
      ) : (
        <Skeleton shape="row" count={2} label="Verifying account access" />
      )}
    </MarketplaceShell>
  );
}
