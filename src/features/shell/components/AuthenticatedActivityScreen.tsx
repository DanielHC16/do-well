import { Text, View } from "react-native";

import { MarketplaceShell, marketplaceStyles } from "./MarketplaceShell";

export function AuthenticatedActivityScreen() {
  return (
    <MarketplaceShell
      activeSection="activity"
      subtitle="Applications, assignments, submissions, and approvals will share one readable trail."
      title="Nothing gets lost in the handoff."
    >
      <View style={marketplaceStyles.card}>
        <Text style={marketplaceStyles.cardKicker}>RECENT ACTIVITY</Text>
        <Text style={marketplaceStyles.cardTitle}>No activity yet</Text>
        <Text style={marketplaceStyles.body}>
          Real account activity will appear here as hosted marketplace workflows
          are delivered. Demo events never leak into this workspace.
        </Text>
      </View>
    </MarketplaceShell>
  );
}
