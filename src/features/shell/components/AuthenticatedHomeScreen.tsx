import { useRouter } from "expo-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

import type { AuthProfile } from "@/features/auth/model/auth-state";
import { StaleDataBadge } from "@/features/connectivity/components/StaleDataBadge";
import {
  discoveryGateway,
  type DiscoveryGateway,
} from "@/features/discovery/data/discovery-gateway";
import {
  DISCOVERY_CATEGORY_OPTIONS,
  DiscoveryFiltersSchema,
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
import { Text, TextInput } from "@/shared/ui/Typography";
import {
  AppButton,
  EmptyState,
  ErrorState,
  FilterChip,
  StatusBadge,
} from "@/shared/ui";
import { AppIcon, type AppIconName } from "@/shared/ui/AppIcon";

import type { ShellMode } from "../model/shell-mode";
import { MarketplaceShell } from "./MarketplaceShell";

type AuthenticatedHomeScreenProps = Readonly<{
  mode: ShellMode;
  profile: AuthProfile;
  gateway?: GigGateway;
  discovery?: DiscoveryGateway;
  location?: LocationService;
}>;

const noLocation: ActiveLocation = {
  source: "none",
  label: "Not set",
  latitude: null,
  longitude: null,
  accuracy: null,
  timestamp: null,
};
const PAGE_SIZE = 20;
const categoryIcon: Readonly<Record<GigCategory, AppIconName>> = {
  errands: "briefcase",
  delivery: "truck",
  cleaning: "cleaning",
  events: "event",
  admin: "file",
  tutoring: "book",
  digital: "digital",
  other: "layers",
};

export function AuthenticatedHomeScreen({
  discovery = discoveryGateway,
  gateway = gigGateway,
  location = locationService,
  mode,
  profile,
}: AuthenticatedHomeScreenProps) {
  const router = useRouter();
  const { width, fontScale } = useWindowDimensions();
  const stackEmployerAction =
    mode === "employer" && (width < 380 || fontScale > 1.2);
  const [gigs, setGigs] = useState<(GigRecord | DiscoveryGigCard)[]>([]);
  const [settledRequest, setSettledRequest] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const generation = useRef(0);
  const morePending = useRef(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(PAGE_SIZE);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<DiscoveryCategoryFilter>("all");
  const [selectedMode, setSelectedMode] =
    useState<DiscoveryWorkModeFilter>("all");
  const [snapshot, setSnapshot] = useState<{ cachedAt?: string | null } | null>(
    null,
  );
  const [activeLocation, setActiveLocation] =
    useState<ActiveLocation>(noLocation);
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [permissionState, setPermissionState] =
    useState<LocationPermissionState>("undetermined");
  const requestKey = JSON.stringify({
    mode,
    userId: profile.id,
    category: selectedCategory,
    workMode: selectedMode,
    radiusKm,
    searchQuery,
    latitude: activeLocation.latitude,
    longitude: activeLocation.longitude,
    retry,
  });
  const busy = settledRequest !== requestKey;

  async function handleSelectGps() {
    setIsLocating(true);
    setLocationError(null);
    try {
      const permission = await location.requestPermission();
      setPermissionState(permission);
      if (permission !== "granted") {
        setLocationError(
          permission === "services_disabled"
            ? "Device location services are disabled. Select a locality below."
            : permission === "blocked"
              ? "Location permission is blocked. Select a locality below."
              : "Location permission was denied. Select a locality below.",
        );
        return;
      }
      const coords = await location.getCurrentPosition();
      setActiveLocation({
        source: "gps",
        label: "Current location",
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        timestamp: coords.timestamp,
      });
      setLocationModalVisible(false);
    } catch {
      setLocationError(
        "We couldn't find your location. Select a locality below or browse remote gigs.",
      );
    } finally {
      setIsLocating(false);
    }
  }

  function handleSelectLocality(locality: LocalityOption) {
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
  }

  function submitSearch() {
    const parsed = DiscoveryFiltersSchema.safeParse({
      searchQuery: searchInput,
    });
    if (parsed.success) {
      setSearchQuery(parsed.data.searchQuery);
      setRetry((value) => value + 1);
    }
  }

  async function loadMore() {
    if (morePending.current || busy || !hasMore || mode !== "worker") return;
    const requestGeneration = generation.current;
    morePending.current = true;
    setLoadingMore(true);
    setMoreError(null);
    try {
      const result = await discovery.discoverGigsWithMetadata(
        {
          filters: {
            category: selectedCategory,
            workMode: selectedMode,
            maxDistanceKm: radiusKm,
            searchQuery,
          },
          workerLatitude: activeLocation.latitude,
          workerLongitude: activeLocation.longitude,
          limit: PAGE_SIZE,
          offset: nextOffset,
        },
        profile.id,
      );
      if (requestGeneration !== generation.current) return;
      setGigs((previous) => {
        const known = new Set(previous.map((item) => item.id));
        return [
          ...previous,
          ...result.gigs.filter((item) => !known.has(item.id)),
        ];
      });
      setNextOffset((value) => value + PAGE_SIZE);
      setHasMore(result.gigs.length === PAGE_SIZE);
      if (result.isFromCache) setSnapshot({ cachedAt: result.cachedAt });
    } catch {
      if (requestGeneration === generation.current)
        setMoreError(
          "We couldn't load more gigs. Your current results are still available.",
        );
    } finally {
      if (requestGeneration === generation.current) {
        morePending.current = false;
        setLoadingMore(false);
      }
    }
  }

  useEffect(() => {
    let current = true;
    generation.current += 1;
    morePending.current = false;
    const request =
      mode === "employer"
        ? gateway.listEmployerGigs(profile.id).then((items) => ({
            gigs: items,
            isFromCache: false,
            cachedAt: null,
          }))
        : discovery.discoverGigsWithMetadata(
            {
              filters: {
                category: selectedCategory,
                workMode: selectedMode,
                maxDistanceKm: radiusKm,
                searchQuery,
              },
              workerLatitude: activeLocation.latitude,
              workerLongitude: activeLocation.longitude,
              limit: PAGE_SIZE,
            },
            profile.id,
          );
    request
      .then((result) => {
        if (!current) return;
        setError(null);
        setGigs(result.gigs);
        setHasMore(mode === "worker" && result.gigs.length === PAGE_SIZE);
        setSnapshot(result.isFromCache ? { cachedAt: result.cachedAt } : null);
      })
      .catch(() => {
        if (current) {
          setGigs([]);
          setSnapshot(null);
          setHasMore(false);
          setError(
            mode === "employer"
              ? "We couldn't load your listings. Check your connection and try again."
              : "We couldn't load gigs. Check your connection and try again.",
          );
        }
      })
      .finally(() => {
        if (current) {
          setSettledRequest(requestKey);
          setLoadingMore(false);
          setMoreError(null);
          setNextOffset(PAGE_SIZE);
        }
      });
    return () => {
      current = false;
      generation.current += 1;
    };
  }, [
    activeLocation.latitude,
    activeLocation.longitude,
    discovery,
    gateway,
    mode,
    profile.id,
    radiusKm,
    retry,
    requestKey,
    searchQuery,
    selectedCategory,
    selectedMode,
  ]);

  const visibleGigs =
    mode === "employer" && searchQuery
      ? gigs.filter((gig) =>
          `${gig.title} ${GIG_CATEGORY_LABELS[gig.category]} ${gig.publicArea ?? ""}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase()),
        )
      : gigs;

  const header = (workspace: ReactNode) => (
    <View style={styles.header}>
      <View
        style={[
          styles.welcomeStrip,
          stackEmployerAction && styles.welcomeStack,
        ]}
      >
        <View
          style={[
            styles.welcomeText,
            stackEmployerAction && styles.stackedWelcomeText,
          ]}
        >
          <Text accessibilityRole="header" style={styles.welcomeName}>
            {mode === "worker" ? "Discover gigs" : "Manage gigs"}
          </Text>
        </View>
        {mode === "employer" ? (
          <AppButton
            label="Post a gig"
            icon="plus"
            onPress={() => router.push("/(protected)/employer/gigs/new")}
          />
        ) : null}
      </View>
      {workspace}
      {mode === "employer" ? (
        <>
          {!busy && !error ? (
            <View style={styles.listingOverview}>
              {(["published", "draft", "closed"] as const).map((status) => {
                const count = gigs.filter(
                  (gig) => gig.status === status,
                ).length;
                return (
                  <View
                    key={status}
                    accessible
                    accessibilityLabel={`${count} ${status} ${count === 1 ? "listing" : "listings"}`}
                    style={styles.overviewItem}
                  >
                    <View style={styles.overviewValue}>
                      <AppIcon
                        name={
                          status === "published"
                            ? "briefcase"
                            : status === "draft"
                              ? "file"
                              : "check"
                        }
                        size={18}
                        color={setupTheme.color.secondary}
                      />
                      <Text style={styles.overviewCount}>{count}</Text>
                    </View>
                    <Text style={styles.overviewLabel}>
                      {status === "published"
                        ? "Published"
                        : status === "draft"
                          ? "Drafts"
                          : "Closed"}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : null}
        </>
      ) : null}
      <View style={styles.filterZone}>
        <View style={styles.searchRow}>
          <AppIcon name="search" size={18} color={setupTheme.color.muted} />
          <TextInput
            accessibilityLabel="Search gigs"
            autoCapitalize="none"
            maxLength={100}
            onChangeText={setSearchInput}
            onSubmitEditing={submitSearch}
            placeholder={
              mode === "worker"
                ? "Search jobs or descriptions"
                : "Search your listings"
            }
            placeholderTextColor={setupTheme.color.muted}
            returnKeyType="search"
            style={styles.searchInput}
            value={searchInput}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search"
            onPress={submitSearch}
            style={styles.searchSubmit}
          >
            <AppIcon
              name="arrowRight"
              size={20}
              color={setupTheme.color.onPrimary}
            />
          </Pressable>
        </View>
        {mode === "worker" ? (
          <>
            <ScrollView
              horizontal
              accessibilityLabel="Work mode and category filters"
              accessibilityHint="Swipe horizontally to browse all supported gig categories."
              keyboardShouldPersistTaps="handled"
              showsHorizontalScrollIndicator
              persistentScrollbar
              contentContainerStyle={styles.filterScroll}
            >
              {(["all", "onsite", "remote"] as const).map((option) => (
                <FilterChip
                  key={option}
                  icon={
                    option === "onsite"
                      ? "pin"
                      : option === "remote"
                        ? "remote"
                        : "layers"
                  }
                  label={
                    option === "all"
                      ? "All Modes"
                      : option === "onsite"
                        ? "On-site"
                        : "Remote"
                  }
                  onPress={() => setSelectedMode(option)}
                  selected={selectedMode === option}
                />
              ))}
              <View style={styles.filterDivider} />
              {DISCOVERY_CATEGORY_OPTIONS.map((category) => (
                <FilterChip
                  key={category}
                  icon={category === "all" ? "layers" : categoryIcon[category]}
                  label={
                    category === "all"
                      ? "All Categories"
                      : GIG_CATEGORY_LABELS[category]
                  }
                  onPress={() => setSelectedCategory(category)}
                  selected={selectedCategory === category}
                />
              ))}
            </ScrollView>
          </>
        ) : null}
      </View>
      <View style={styles.sectionRow}>
        <Text accessibilityRole="header" style={styles.sectionHeader}>
          {mode === "worker" ? "Available gigs" : "Your listings"}
        </Text>
        {mode === "worker" ? (
          <LocationBar
            compact
            activeLocation={activeLocation}
            onPress={() => setLocationModalVisible(true)}
            radiusKm={radiusKm}
          />
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh gigs"
          onPress={() => setRetry((value) => value + 1)}
          style={styles.refreshButton}
        >
          <AppIcon name="refresh" size={16} color={setupTheme.color.primary} />
          {mode === "employer" ? (
            <Text style={styles.refreshText}>Refresh</Text>
          ) : null}
        </Pressable>
      </View>
      {!busy && snapshot ? (
        <StaleDataBadge cachedAt={snapshot.cachedAt} />
      ) : null}
    </View>
  );

  return (
    <MarketplaceShell
      greeting={`Hi, ${profile.displayName.split(" ")[0]}`}
      activeSection="home"
      dashboard
      scrollable={false}
      title={
        mode === "worker" ? "Good work starts here." : "Your employer workspace"
      }
      subtitle={
        mode === "worker"
          ? "Flexible paid gigs, around you and online."
          : "Post a gig, review applicants, and keep work moving."
      }
      listContent={(heading) => (
        <FlatList<GigRecord | DiscoveryGigCard>
          contentContainerStyle={styles.listContent}
          data={busy || error ? [] : visibleGigs}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={header(heading)}
          ListEmptyComponent={
            busy ? (
              <View accessibilityLiveRegion="polite" style={styles.loadingRow}>
                <ActivityIndicator color={setupTheme.color.accent} />
                <Text style={styles.helper}>
                  {mode === "worker"
                    ? "Searching notices..."
                    : "Checking your notices..."}
                </Text>
              </View>
            ) : error ? (
              <ErrorState
                message={error}
                onRetry={() => setRetry((value) => value + 1)}
              />
            ) : (
              <EmptyState
                kind={mode === "employer" ? "employer" : "discovery"}
                title={
                  mode === "employer" && !searchQuery
                    ? "No listings yet"
                    : "No gigs found"
                }
                message={
                  mode === "employer" && !searchQuery
                    ? "Post a gig to find the right help."
                    : "Try another search or filter."
                }
                actionLabel={
                  mode === "employer" && !searchQuery
                    ? "Create gig"
                    : "Reset filters"
                }
                onAction={() => {
                  if (mode === "employer" && !searchQuery)
                    router.push("/(protected)/employer/gigs/new");
                  else {
                    setSearchInput("");
                    setSearchQuery("");
                    setSelectedCategory("all");
                    setSelectedMode("all");
                    setRadiusKm(null);
                  }
                }}
              />
            )
          }
          ListFooterComponent={
            <View style={styles.header}>
              {!busy && moreError ? (
                <ErrorState
                  message={moreError}
                  onRetry={() => void loadMore()}
                />
              ) : null}
              {hasMore && !busy && !error ? (
                <AppButton
                  label="Load more gigs"
                  loading={loadingMore}
                  onPress={() => void loadMore()}
                  variant="secondary"
                />
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push(
                  mode === "employer"
                    ? `/(protected)/employer/gigs/${item.id}`
                    : `/(protected)/worker/gigs/${item.id}`,
                )
              }
              style={styles.gigCard}
            >
              <View style={styles.gigBadgeRow}>
                <View style={styles.categoryHeading}>
                  <View style={styles.categoryTile}>
                    <AppIcon
                      name={categoryIcon[item.category]}
                      size={22}
                      color={setupTheme.color.secondary}
                    />
                  </View>
                  <Text style={styles.categoryBadge}>
                    {GIG_CATEGORY_LABELS[item.category]}
                  </Text>
                </View>
                <StatusBadge
                  label={
                    mode === "employer"
                      ? item.status
                          .replace(/_/g, " ")
                          .replace(/^./, (letter) => letter.toUpperCase())
                      : item.workMode === "remote"
                        ? "Remote"
                        : item.workMode === "hybrid"
                          ? "Hybrid"
                          : "On-site"
                  }
                  tone={
                    mode === "employer" && item.status === "published"
                      ? "success"
                      : "neutral"
                  }
                />
              </View>
              <Text style={styles.gigTitle}>{item.title}</Text>
              <Text numberOfLines={2} style={styles.description}>
                {item.description}
              </Text>
              <View style={styles.gigMetaRow}>
                <View style={styles.payMeta}>
                  <AppIcon name="coins" size={18} />
                  <Text style={styles.gigBudget}>
                    ₱{item.budgetAmount.toLocaleString("en-PH")}
                  </Text>
                </View>
                <View style={styles.locationMeta}>
                  <AppIcon
                    name={item.workMode === "remote" ? "remote" : "pin"}
                    size={16}
                    color={setupTheme.color.muted}
                  />
                  <Text style={styles.gigArea}>
                    {item.workMode === "remote"
                      ? "Remote"
                      : (item.publicArea ?? "Area not specified")}
                    {"distanceKm" in item && item.distanceKm !== null
                      ? ` · ${item.distanceKm.toFixed(1)} km`
                      : ""}
                  </Text>
                </View>
              </View>
              {item.dueAt ? (
                <View style={styles.scheduleMeta}>
                  <AppIcon
                    name="clock"
                    size={16}
                    color={setupTheme.color.muted}
                  />
                  <Text style={styles.gigArea}>
                    Due {new Date(item.dueAt).toLocaleDateString("en-PH")}
                  </Text>
                </View>
              ) : null}
              {"reasons" in item && item.reasons.length > 0 ? (
                <View style={styles.reasonsRow}>
                  {item.reasons.map((reason) => (
                    <Text key={reason} style={styles.reasonChip}>
                      {reason}
                    </Text>
                  ))}
                </View>
              ) : null}
              {mode === "employer" ? (
                <View style={styles.manageListing}>
                  <Text style={styles.manageLabel}>Manage listing</Text>
                  <AppIcon name="chevronRight" size={18} />
                </View>
              ) : null}
            </Pressable>
          )}
        />
      )}
    >
      <LocationSelectorModal
        activeLocation={activeLocation}
        errorMessage={locationError}
        isLocating={isLocating}
        onClearLocation={() => {
          setActiveLocation(noLocation);
          setRadiusKm(null);
          setLocationError(null);
        }}
        onClose={() => setLocationModalVisible(false)}
        onSelectGps={handleSelectGps}
        onSelectLocality={handleSelectLocality}
        onSelectRadius={setRadiusKm}
        permissionState={permissionState}
        radiusKm={radiusKm}
        visible={locationModalVisible}
      />
    </MarketplaceShell>
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: setupTheme.spacing.section,
    gap: setupTheme.spacing.compact,
    paddingBottom: setupTheme.spacing.generous,
  },
  header: { gap: setupTheme.spacing.compact },
  welcomeStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: setupTheme.spacing.compact,
  },
  welcomeText: { flex: 1, gap: setupTheme.spacing.tight },
  welcomeStack: { flexDirection: "column", alignItems: "stretch" },
  stackedWelcomeText: { flex: 0 },
  welcomeName: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.heading,
    lineHeight: setupTheme.type.heading * 1.3,
    fontWeight: "600",
  },
  filterZone: {
    backgroundColor: setupTheme.color.surface,
    borderRadius: setupTheme.radius.control,
    borderColor: setupTheme.color.border,
    borderWidth: 1,
    padding: setupTheme.spacing.tight,
    gap: setupTheme.spacing.tight,
  },
  filterScroll: {
    flexDirection: "row",
    alignItems: "center",
    gap: setupTheme.spacing.compact,
  },
  filterDivider: {
    width: 1,
    height: setupTheme.spacing.content,
    backgroundColor: setupTheme.color.border,
    marginHorizontal: setupTheme.spacing.tight,
  },
  listingOverview: {
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
    marginVertical: setupTheme.spacing.tight,
  },
  overviewItem: {
    flex: 1,
    alignItems: "center",
    gap: setupTheme.spacing.tight,
    padding: setupTheme.spacing.compact,
    backgroundColor: setupTheme.color.surface,
    borderRadius: setupTheme.radius.control,
    borderColor: setupTheme.color.border,
    borderWidth: 1,
  },
  overviewValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: setupTheme.spacing.compact,
  },
  overviewCount: {
    color: setupTheme.color.primary,
    fontSize: setupTheme.type.heading,
    fontWeight: "600",
  },
  overviewLabel: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
  },
  searchRow: {
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
    alignItems: "center",
    borderRadius: setupTheme.radius.control,
    backgroundColor: setupTheme.color.surface,
    paddingLeft: setupTheme.spacing.section,
    paddingRight: setupTheme.spacing.tight,
  },
  searchSubmit: {
    width: setupTheme.size.touchTarget,
    height: setupTheme.size.touchTarget,
    borderRadius: setupTheme.radius.small,
    backgroundColor: setupTheme.color.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    minHeight: setupTheme.size.touchTarget,
    paddingVertical: setupTheme.spacing.compact,
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: setupTheme.spacing.tight,
  },
  sectionHeader: {
    flex: 1,
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.cardTitle,
    fontWeight: "600",
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: setupTheme.spacing.tight,
    minHeight: 48,
    minWidth: setupTheme.size.touchTarget,
    justifyContent: "center",
    paddingHorizontal: setupTheme.spacing.compact,
  },
  refreshText: {
    color: setupTheme.color.accent,
    fontSize: setupTheme.type.caption,
    fontWeight: "500",
  },
  helper: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    lineHeight: 20,
  },
  loadingRow: {
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
    justifyContent: "center",
    padding: setupTheme.spacing.section,
  },
  gigCard: {
    ...setupTheme.shadow.card,
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.card,
    borderWidth: 1,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.section,
  },
  gigBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: setupTheme.spacing.compact,
  },
  categoryBadge: {
    color: setupTheme.color.accent,
    fontSize: setupTheme.type.caption,
    fontWeight: "500",
    flexShrink: 1,
  },
  gigTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.cardTitle,
    fontWeight: "600",
    lineHeight: setupTheme.type.cardTitle * 1.4,
  },
  description: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.body,
    lineHeight: setupTheme.type.body * 1.5,
  },
  gigMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: setupTheme.spacing.compact,
  },
  gigBudget: {
    color: setupTheme.color.secondary,
    fontSize: setupTheme.type.body,
    fontWeight: "600",
  },
  gigArea: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    flexShrink: 1,
  },
  categoryHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: setupTheme.spacing.compact,
    flex: 1,
    minWidth: 0,
  },
  categoryTile: {
    minWidth: 36,
    minHeight: 36,
    padding: setupTheme.spacing.compact,
    borderRadius: setupTheme.radius.control,
    backgroundColor: setupTheme.color.accentSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  payMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: setupTheme.spacing.compact,
  },
  locationMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: setupTheme.spacing.tight,
    flexShrink: 1,
  },
  scheduleMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: setupTheme.spacing.tight,
  },
  reasonsRow: {
    paddingTop: setupTheme.spacing.compact,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: setupTheme.spacing.compact,
  },
  manageListing: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: setupTheme.spacing.compact,
    borderTopColor: setupTheme.color.border,
    borderTopWidth: 1,
    gap: setupTheme.spacing.compact,
  },
  manageLabel: {
    color: setupTheme.color.primary,
    fontSize: setupTheme.type.caption,
    fontWeight: "500",
    flexShrink: 1,
  },
  reasonChip: {
    backgroundColor: setupTheme.color.readySurface,
    color: setupTheme.color.ready,
    borderRadius: setupTheme.radius.small,
    paddingHorizontal: setupTheme.spacing.compact,
    paddingVertical: setupTheme.spacing.tight,
    fontSize: setupTheme.type.caption,
  },
  footer: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    lineHeight: 20,
    textAlign: "center",
    paddingVertical: setupTheme.spacing.section,
  },
});
