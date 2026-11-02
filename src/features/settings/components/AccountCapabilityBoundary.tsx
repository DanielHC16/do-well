import { useEffect, useState, type ReactNode } from "react";

import { ErrorState, Skeleton } from "@/components/ui";
import { MarketplaceShell } from "@/features/shell/components/MarketplaceShell";

import {
  accountGateway,
  type AccountCapabilities,
} from "../data/account-gateway";

export function AccountCapabilityBoundary({
  children,
  userId,
}: Readonly<{
  children: (capabilities: AccountCapabilities) => ReactNode;
  userId: string;
}>) {
  const [capabilities, setCapabilities] = useState<AccountCapabilities | null>(
    null,
  );
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void accountGateway.getCapabilities(userId).then(
      (result) => {
        if (active) setCapabilities(result);
      },
      () => {
        if (active) setFailed(true);
      },
    );
    return () => {
      active = false;
    };
  }, [attempt, userId]);

  if (capabilities) return children(capabilities);
  return (
    <MarketplaceShell activeSection="profile" title="Account access">
      {failed ? (
        <ErrorState
          message="We couldn't verify account access. Check your connection and try again."
          onRetry={() => {
            setFailed(false);
            setAttempt((value) => value + 1);
          }}
        />
      ) : (
        <Skeleton shape="row" count={2} label="Verifying account access" />
      )}
    </MarketplaceShell>
  );
}
