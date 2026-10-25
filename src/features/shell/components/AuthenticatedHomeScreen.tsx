import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { AuthProfile } from "@/features/auth/model/auth-state";
import {
  discoveryGateway,
  type DiscoveryGateway,
} from "@/features/discovery/data/discovery-gateway";
import {
  DISCOVERY_CATEGORY_OPTIONS,
  type DiscoveryCategoryFilter,
  type DiscoveryGigCard,
  type DiscoveryWorkModeFilter,
} from "@/features/discovery/model/discovery-schemas";
import { gigGateway, type GigGateway } from "@/features/gigs/data/gig-gateway";
import {
  GIG_CATEGORY_LABELS,
  type GigCategory,
  type GigRecord,
} from "@/features/gigs/model/gig-schemas";
import {
  type ActiveLocation,
  type LocalityOption,
  LocationBar,
  type LocationPermissionState,
  LocationSelectorModal,
  locationService,
  type LocationService,
} from "@/features/location";
import { setupTheme } from "@/features/setup/setupTheme";

import type { ShellMode } from "../model/shell-mode";
import { MarketplaceShell, marketplaceStyles } from "./MarketplaceShell";

type AuthenticatedHomeScreenProps = Readonly<{
  mode: ShellMode;
  profile: AuthProfile;
  gateway?: GigGateway;
  discovery?: DiscoveryGateway;
  location?: LocationService;
}>;

const homeContent = {
  worker: {
    title: "Good work starts nearby.",
    subtitle:
      "Browse live neighbourhood notices and verified remote tasks in your community.",
    emptyKicker: "OPEN NEAR YOU",
    emptyTitle: "No matching notices",
    emptyBody:
      "There are no published notices matching your active filters. Try switching category or work mode.",
  },
  employer: {
    title: "Put useful work in motion.",
    subtitle:
      "Your employer space makes it clear what needs doing, who applied, and what happens next.",
    emptyKicker: "YOUR NOTICEBOARD",
    emptyTitle: "Post your first gig",
    emptyBody:
      "Post a task to find reliable neighbors for cleaning, errands, delivery, tutoring, or digital tasks.",
  },
} as const;

export function AuthenticatedHomeScreen({
  discovery = discoveryGateway,
  gateway = gigGateway,
  location = locationService,
  mode,
  profile,
}: AuthenticatedHomeScreenProps) {
  const router = useRouter();
  const copy = homeContent[mode];

  // Employer state
  const [employerGigs, setEmployerGigs] = useState<GigRecord[]>([]);
  const [loadingEmployerGigs, setLoadingEmployerGigs] = useState(
    mode === "employer",
  );

  // Worker discovery state
  const [discoveryGigs, setDiscoveryGigs] = useState<DiscoveryGigCard[]>([]);
  const [loadingDiscovery, setLoadingDiscovery] = useState(mode === "worker");
  const [selectedCategory, setSelectedCategory] =
    useState<DiscoveryCategoryFilter>("all");
  const [selectedMode, setSelectedMode] =
    useState<DiscoveryWorkModeFilter>("all");

  // Worker location & radius state
  const [activeLocation, setActiveLocation] = useState<ActiveLocation>({
    source: "none",
    label: "Not set",
    latitude: null,
    longitude: null,
    accuracy: null,
    timestamp: null,
  });
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [permissionState, setPermissionState] =
    useState<LocationPermissionState>("undetermined");

  const handleSelectGps = async () => {
    setIsLocating(true);
    setLocationError(null);
    try {
      const perm = await location.requestPermission();
      setPermissionState(perm);
      if (perm !== "granted") {
        if (perm === "services_disabled") {
          setLocationError(
            "Device location services are disabled. Select a locality below.",
          );
        } else if (perm === "blocked") {
          setLocationError(
            "Location permission is blocked. Select a locality below.",
          );
        } else {
          setLocationError(
            "Location permission was denied. Select a locality below.",
          );
        }
        return;
      }
      const coords = await location.getCurrentPosition();
      const accuracyLabel = coords.accuracy
        ? ` (~${Math.round(coords.accuracy)}m)`
        : "";
      setActiveLocation({
        source: "gps",
        label: `Current location${accuracyLabel}`,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        timestamp: coords.timestamp,
      });
      setLocationModalVisible(false);
    } catch (err: unknown) {
      setLocationError(
        err instanceof Error ? err.message : "Failed to acquire location",
      );
    } finally {
      setIsLocating(false);
    }
  };

  const handleSelectLocality = (locality: LocalityOption) => {
    setActiveLocation({
      source: "locality",
      label: locality.name,
      latitude: locality.latitude,
      longitude: locality.longitude,
      accuracy: null,
      timestamp: null,
    });
    setLocationError(null);
    setLocationModalVisible(false);
  };

  const handleSelectRadius = (newRadius: number | null) => {
    setRadiusKm(newRadius);
  };

  const handleClearLocation = () => {
    setActiveLocation({
      source: "none",
      label: "Not set",
      latitude: null,
      longitude: null,
      accuracy: null,
      timestamp: null,
    });
    setRadiusKm(null);
    setLocationError(null);
  };

  useEffect(() => {
    if (mode !== "employer" || !profile.id) return;
    let mounted = true;

    gateway
      .listEmployerGigs(profile.id)
      .then((data) => {
        if (mounted) setEmployerGigs(data);
      })
      .catch(() => {
        if (mounted) setEmployerGigs([]);
      })
      .finally(() => {
        if (mounted) setLoadingEmployerGigs(false);
      });

    return () => {
      mounted = false;
    };
  }, [gateway, mode, profile.id]);

  useEffect(() => {
    if (mode !== "worker") return;
    let mounted = true;

    discovery
      .discoverGigs({
        filters: {
          category: selectedCategory,
          workMode: selectedMode,
          maxDistanceKm: radiusKm,
        },
        workerLatitude: activeLocation.latitude,
        workerLongitude: activeLocation.longitude,
      })
      .then((data) => {
        if (mounted) setDiscoveryGigs(data);
      })
      .catch(() => {
        if (mounted) setDiscoveryGigs([]);
      })
      .finally(() => {
        if (mounted) setLoadingDiscovery(false);
      });

    return () => {
      mounted = false;
    };
  }, [
    activeLocation.latitude,
    activeLocation.longitude,
    discovery,
    mode,
    radiusKm,
    selectedCategory,
    selectedMode,
  ]);

  return (
    <MarketplaceShell
      activeSection="home"
      subtitle={copy.subtitle}
      title={copy.title}
    >
      <View style={styles.welcomeStrip}>
        <Text style={styles.welcomeKicker}>SIGNED IN AS</Text>
        <Text style={styles.welcomeName}>{profile.displayName}</Text>
        <Text style={styles.welcomeArea}>
          {profile.homeArea ?? "Area not set"}
        </Text>
      </View>

      {mode === "employer" ? (
        <>
          <View style={styles.employerHeaderRow}>
            <Text style={styles.sectionHeader}>YOUR POSTED NOTICES</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/(protected)/employer/gigs/new")}
              style={styles.newGigButton}
            >
              <Text style={styles.newGigButtonText}>+ Post a gig</Text>
            </Pressable>
          </View>

          {loadingEmployerGigs ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={setupTheme.color.foreground} />
              <Text style={styles.loadingText}>Checking your notices...</Text>
            </View>
          ) : null}

          {!loadingEmployerGigs && employerGigs.length > 0 ? (
            <View style={styles.gigList}>
              {employerGigs.map((item) => (
                <Pressable
                  accessibilityRole="button"
                  key={item.id}
                  onPress={() =>
                    router.push(`/(protected)/employer/gigs/${item.id}`)
                  }
                  style={styles.gigCard}
                >
                  <View style={styles.gigBadgeRow}>
                    <Text style={styles.categoryBadge}>
                      {GIG_CATEGORY_LABELS[item.category] ?? item.category}
                    </Text>
                    <Text
                      style={[
                        styles.statusBadge,
                        item.status === "published"
                          ? styles.statusPublished
                          : item.status === "closed"
                            ? styles.statusClosed
                            : styles.statusDraft,
                      ]}
                    >
                      {item.status.toUpperCase()}
                    </Text>
                  </View>

                  <Text style={styles.gigTitle}>{item.title}</Text>

                  <View style={styles.gigMetaRow}>
                    <Text style={styles.gigBudget}>
                      PHP {item.budgetAmount.toLocaleString()}
                    </Text>
                    <Text style={styles.gigArea}>
                      {item.publicArea ?? item.workMode.toUpperCase()}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}

          {!loadingEmployerGigs && employerGigs.length === 0 ? (
            <View style={marketplaceStyles.card}>
              <Text style={marketplaceStyles.cardKicker}>
                {copy.emptyKicker}
              </Text>
              <Text style={marketplaceStyles.cardTitle}>{copy.emptyTitle}</Text>
              <Text style={marketplaceStyles.body}>{copy.emptyBody}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/(protected)/employer/gigs/new")}
                style={marketplaceStyles.primaryButton}
              >
                <Text style={marketplaceStyles.primaryButtonText}>
                  Post a new gig
                </Text>
              </Pressable>
            </View>
          ) : null}
        </>
      ) : null}

      {mode === "worker" ? (
        <>
          <LocationBar
            activeLocation={activeLocation}
            onPress={() => setLocationModalVisible(true)}
            radiusKm={radiusKm}
          />

          <LocationSelectorModal
            activeLocation={activeLocation}
            errorMessage={locationError}
            isLocating={isLocating}
            onClearLocation={handleClearLocation}
            onClose={() => setLocationModalVisible(false)}
            onSelectGps={handleSelectGps}
            onSelectLocality={handleSelectLocality}
            onSelectRadius={handleSelectRadius}
            permissionState={permissionState}
            radiusKm={radiusKm}
            visible={locationModalVisible}
          />

          <Text style={styles.sectionHeader}>NEARBY WORK NOTICEBOARD</Text>
          <View style={styles.filterSection}>
            <View style={styles.modeFilterRow}>
              {(["all", "onsite", "remote"] as const).map((m) => (
                <Pressable
                  accessibilityRole="button"
                  key={m}
                  onPress={() => setSelectedMode(m)}
                  style={[
                    styles.modeFilterButton,
                    selectedMode === m && styles.modeFilterButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.modeFilterText,
                      selectedMode === m && styles.modeFilterTextActive,
                    ]}
                  >
                    {m === "all"
                      ? "All Modes"
                      : m === "onsite"
                        ? "Nearby"
                        : "Remote"}
                  </Text>
                </Pressable>
              ))}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
            >
              {DISCOVERY_CATEGORY_OPTIONS.map((cat) => {
                const label =
                  cat === "all"
                    ? "All Categories"
                    : (GIG_CATEGORY_LABELS[cat as GigCategory] ?? cat);
                const isSelected = selectedCategory === cat;
                return (
                  <Pressable
                    accessibilityRole="button"
                    key={cat}
                    onPress={() => setSelectedCategory(cat)}
                    style={[
                      styles.categoryPill,
                      isSelected && styles.categoryPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryPillText,
                        isSelected && styles.categoryPillTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {loadingDiscovery ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={setupTheme.color.foreground} />
              <Text style={styles.loadingText}>Searching notices...</Text>
            </View>
          ) : null}

          {!loadingDiscovery && discoveryGigs.length > 0 ? (
            <View style={styles.gigList}>
              {discoveryGigs.map((item) => (
                <Pressable
                  accessibilityRole="button"
                  key={item.id}
                  onPress={() =>
                    router.push(`/(protected)/worker/gigs/${item.id}`)
                  }
                  style={styles.gigCard}
                >
                  <View style={styles.gigBadgeRow}>
                    <Text style={styles.categoryBadge}>
                      {GIG_CATEGORY_LABELS[item.category] ?? item.category}
                    </Text>
                    <Text style={styles.workModeChip}>
                      {item.workMode.toUpperCase()}
                    </Text>
                  </View>

                  <Text style={styles.gigTitle}>{item.title}</Text>

                  <View style={styles.gigMetaRow}>
                    <Text style={styles.gigBudget}>
                      PHP {item.budgetAmount.toLocaleString()}
                    </Text>
                    <Text style={styles.gigArea}>
                      {item.publicArea ?? "Remote"}
                      {item.distanceKm ? ` · ${item.distanceKm} km` : ""}
                    </Text>
                  </View>

                  {item.reasons.length > 0 ? (
                    <View style={styles.reasonsRow}>
                      {item.reasons.map((reason) => (
                        <View key={reason} style={styles.reasonChip}>
                          <Text style={styles.reasonChipText}>{reason}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </Pressable>
              ))}
            </View>
          ) : null}

          {!loadingDiscovery && discoveryGigs.length === 0 ? (
            <View style={marketplaceStyles.card}>
              <Text style={marketplaceStyles.cardKicker}>
                {copy.emptyKicker}
              </Text>
              <Text style={marketplaceStyles.cardTitle}>{copy.emptyTitle}</Text>
              <Text style={marketplaceStyles.body}>{copy.emptyBody}</Text>
            </View>
          ) : null}
        </>
      ) : null}

      <View style={styles.safetyNote}>
        <Text style={styles.safetyKicker}>ONE ACCOUNT · TWO VIEWS</Text>
        <Text style={styles.safetyText}>
          Switching views changes navigation only. Database ownership and RLS
          still decide what this account may read or change.
        </Text>
      </View>
    </MarketplaceShell>
  );
}

const styles = StyleSheet.create({
  welcomeStrip: {
    backgroundColor: setupTheme.color.highlight,
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.card,
    borderWidth: 2,
    gap: setupTheme.spacing.tight,
    padding: setupTheme.spacing.section,
  },
  welcomeKicker: {
    color: setupTheme.color.accent,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  welcomeName: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.heading,
    fontWeight: "900",
  },
  welcomeArea: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "700",
  },
  employerHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: setupTheme.spacing.compact,
  },
  sectionHeader: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  newGigButton: {
    backgroundColor: setupTheme.color.highlight,
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.status,
    borderWidth: 2,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  newGigButtonText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.caption,
    fontWeight: "900",
  },
  filterSection: {
    gap: setupTheme.spacing.compact,
    marginTop: setupTheme.spacing.compact,
  },
  modeFilterRow: {
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
  },
  modeFilterButton: {
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.status,
    borderWidth: 1.5,
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
  },
  modeFilterButtonActive: {
    backgroundColor: setupTheme.color.highlight,
    borderColor: setupTheme.color.foreground,
    borderWidth: 2,
  },
  modeFilterText: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    fontWeight: "800",
  },
  modeFilterTextActive: {
    color: setupTheme.color.foreground,
    fontWeight: "900",
  },
  categoryScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  categoryPill: {
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.status,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  categoryPillActive: {
    backgroundColor: setupTheme.color.highlightSurface,
    borderColor: setupTheme.color.foreground,
    borderWidth: 2,
  },
  categoryPillText: {
    color: setupTheme.color.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  categoryPillTextActive: {
    color: setupTheme.color.foreground,
    fontWeight: "900",
  },
  loadingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
    justifyContent: "center",
    paddingVertical: setupTheme.spacing.section,
  },
  loadingText: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.body,
    fontWeight: "600",
  },
  gigList: {
    gap: setupTheme.spacing.compact,
  },
  gigCard: {
    ...setupTheme.shadow.card,
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.card,
    borderWidth: 2,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.content,
  },
  gigBadgeRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  categoryBadge: {
    backgroundColor: setupTheme.color.highlightSurface,
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.status,
    borderWidth: 1,
    color: setupTheme.color.foreground,
    fontSize: 11,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusBadge: {
    borderRadius: setupTheme.radius.status,
    borderWidth: 1,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusDraft: {
    backgroundColor: setupTheme.color.surfaceMuted,
    borderColor: setupTheme.color.border,
    color: setupTheme.color.muted,
  },
  statusPublished: {
    backgroundColor: setupTheme.color.highlightSurface,
    borderColor: setupTheme.color.foreground,
    color: setupTheme.color.foreground,
  },
  statusClosed: {
    backgroundColor: setupTheme.color.dangerSurface,
    borderColor: setupTheme.color.danger,
    color: setupTheme.color.danger,
  },
  workModeChip: {
    backgroundColor: setupTheme.color.surfaceMuted,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.status,
    borderWidth: 1,
    color: setupTheme.color.muted,
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  gigTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.heading,
    lineHeight: 26,
    fontWeight: "900",
  },
  gigMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  gigBudget: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "900",
  },
  gigArea: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    fontWeight: "700",
  },
  reasonsRow: {
    borderTopColor: setupTheme.color.borderSoft,
    borderTopWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingTop: 6,
  },
  reasonChip: {
    backgroundColor: setupTheme.color.surfaceMuted,
    borderColor: setupTheme.color.borderSoft,
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  reasonChipText: {
    color: setupTheme.color.foreground,
    fontSize: 10,
    fontWeight: "700",
  },
  safetyNote: {
    backgroundColor: setupTheme.color.surfaceMuted,
    borderColor: setupTheme.color.borderSoft,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    gap: setupTheme.spacing.tight,
    padding: setupTheme.spacing.compact,
  },
  safetyKicker: {
    color: setupTheme.color.accent,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  safetyText: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    lineHeight: 18,
  },
});
