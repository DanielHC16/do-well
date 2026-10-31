import { useRouter } from "expo-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";

import {
  BottomSheet,
  EmptyState,
  ErrorState,
  FilterPill,
  GigCard,
  IconButton,
  PressableScale,
  PrimaryButton,
  SecondaryButton,
  Skeleton,
  StatGrid,
  StatTile,
  Txt,
  badgeFor,
} from "@/components/ui";
import type { AuthProfile } from "@/features/auth/model/auth-state";
import { useConnectivity } from "@/features/connectivity/context/ConnectivityProvider";
import {
  discoveryGateway,
  type DiscoveryGateway,
} from "@/features/discovery/data/discovery-gateway";
import {
  DISCOVERY_CATEGORY_OPTIONS,
  DISCOVERY_DISTANCE_OPTIONS,
  DiscoveryFiltersSchema,
  type DiscoveryCategoryFilter,
  type DiscoveryGigCard,
  type DiscoveryWorkModeFilter,
} from "@/features/discovery/model/discovery-schemas";
import { gigGateway, type GigGateway } from "@/features/gigs/data/gig-gateway";
import {
  GIG_CATEGORY_LABELS,
  type GigRecord,
} from "@/features/gigs/model/gig-schemas";
import {
  type ActiveLocation,
  type LocalityOption,
  type LocationPermissionState,
  LocationSelectorModal,
  locationService,
  type LocationService,
} from "@/features/location";
import { classifyLoadError, type LoadErrorKind } from "@/shared/api/load-error";
import {
  formatShortDate,
  formatTime,
  formatUpdatedAt,
} from "@/shared/format/format";
import { AppIcon } from "@/shared/ui/AppIcon";
import { TextInput, type TextInputHandle } from "@/shared/ui/Typography";
import { palette, radius, size, space, status, type } from "@/theme";

import { useHomeStats, type HomeStatsSources } from "../data/home-stats";
import type { ShellMode } from "../model/shell-mode";
import { MarketplaceShell } from "./MarketplaceShell";

/** One-shot request from the shell's center button ("near" / "remote"). */
export type HomeIntent = Readonly<{ kind: "near" | "remote"; at: string }>;

type AuthenticatedHomeScreenProps = Readonly<{
  mode: ShellMode;
  profile: AuthProfile;
  gateway?: GigGateway;
  discovery?: DiscoveryGateway;
  location?: LocationService;
  stats?: HomeStatsSources;
  intent?: HomeIntent | null;
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
const MODE_OPTIONS = [
  { value: "all", label: "All", icon: "layers" },
  { value: "onsite", label: "On-site", icon: "pin" },
  { value: "remote", label: "Remote", icon: "remote" },
] as const;

function gigCountTitle(
  count: number,
  more: boolean,
  remoteOnly: boolean,
  near: boolean,
): string {
  const amount = `${count}${more ? "+" : ""}`;
  const noun = remoteOnly ? "remote gig" : "gig";
  const plural = count === 1 && !more ? noun : `${noun}s`;
  return `${amount} ${plural}${near && !remoteOnly ? " near you" : ""}`;
}

export function AuthenticatedHomeScreen({
  discovery = discoveryGateway,
  gateway = gigGateway,
  location = locationService,
  stats: statSources,
  intent = null,
  mode,
  profile,
}: AuthenticatedHomeScreenProps) {
  const router = useRouter();
  const { reportRequestOutcome } = useConnectivity();
  const searchRef = useRef<TextInputHandle>(null);
  const [gigs, setGigs] = useState<(GigRecord | DiscoveryGigCard)[]>([]);
  const [employerGigs, setEmployerGigs] = useState<GigRecord[] | null>(null);
  const [settledRequest, setSettledRequest] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<LoadErrorKind>("server");
  const [retry, setRetry] = useState(0);
  const [pulling, setPulling] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
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
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [permissionState, setPermissionState] =
    useState<LocationPermissionState>("undetermined");
  const [handledIntent, setHandledIntent] = useState<string | null>(null);
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
  const tiles = useHomeStats(
    profile.id,
    mode,
    employerGigs,
    retry,
    statSources,
  );

  // Apply a center-button intent once per tap (adjusting state during render).
  const intentKey = intent ? `${intent.kind}:${intent.at}` : null;
  if (mode === "worker" && intentKey && intentKey !== handledIntent) {
    setHandledIntent(intentKey);
    if (intent?.kind === "remote") setSelectedMode("remote");
    else setLocationModalVisible(true);
  }

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

  function resetFilters() {
    setSearchInput("");
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedMode("all");
    setRadiusKm(null);
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
        if (mode === "employer") setEmployerGigs(result.gigs as GigRecord[]);
        setHasMore(mode === "worker" && result.gigs.length === PAGE_SIZE);
        setSnapshot(result.isFromCache ? { cachedAt: result.cachedAt } : null);
        if (!result.isFromCache) {
          setUpdatedAt(new Date().toISOString());
          reportRequestOutcome("ok");
        } else {
          reportRequestOutcome("offline");
        }
      })
      .catch((cause: unknown) => {
        if (!current) return;
        const kind = classifyLoadError(cause);
        reportRequestOutcome(kind);
        setGigs([]);
        setSnapshot(null);
        setHasMore(false);
        setErrorKind(kind);
        setError(
          mode === "employer"
            ? "We couldn't load your listings. Check your connection and try again."
            : "We couldn't load gigs. Check your connection and try again.",
        );
      })
      .finally(() => {
        if (current) {
          setSettledRequest(requestKey);
          setLoadingMore(false);
          setMoreError(null);
          setNextOffset(PAGE_SIZE);
          setPulling(false);
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
    reportRequestOutcome,
  ]);

  const visibleGigs =
    mode === "employer" && searchQuery
      ? gigs.filter((gig) =>
          `${gig.title} ${GIG_CATEGORY_LABELS[gig.category]} ${gig.publicArea ?? ""}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase()),
        )
      : gigs;

  const locationSet = activeLocation.source !== "none";
  const filtersActive =
    selectedCategory !== "all" || (radiusKm !== null && locationSet);

  const headerTiles = (
    <StatGrid>
      {tiles.map((tile) => (
        <StatTile
          key={tile.key}
          value={tile.value}
          label={tile.label}
          onPress={
            tile.section
              ? () =>
                  router.push({
                    pathname: "/(protected)/work",
                    params: { section: tile.section ?? "" },
                  })
              : undefined
          }
        />
      ))}
    </StatGrid>
  );

  const freshness = snapshot ? (
    <View
      accessible
      accessibilityLabel={`Showing saved results from ${formatTime(snapshot.cachedAt) ?? "earlier"}. You may be offline.`}
      style={[styles.caption, styles.captionStale]}
    >
      <View style={styles.staleDot} />
      <Txt variant="micro" style={{ color: status.warning.fg }}>
        Saved {formatTime(snapshot.cachedAt) ?? "earlier"} · offline
      </Txt>
    </View>
  ) : updatedAt && !busy ? (
    <Txt variant="micro" tone="secondary">
      {formatUpdatedAt(updatedAt)}
    </Txt>
  ) : null;

  const listHeader = (notices: ReactNode) => (
    <View style={styles.stack}>
      {notices}
      <View style={styles.search}>
        <AppIcon name="search" size={size.icon} color={palette.textSecondary} />
        <TextInput
          ref={searchRef}
          accessibilityLabel="Search gigs"
          autoCapitalize="none"
          maxLength={100}
          onChangeText={setSearchInput}
          onSubmitEditing={submitSearch}
          placeholder={
            mode === "worker" ? "Search jobs or skills" : "Search your gigs"
          }
          placeholderTextColor={palette.textSecondary}
          returnKeyType="search"
          submitBehavior="blurAndSubmit"
          style={styles.searchInput}
          value={searchInput}
        />
        {mode === "worker" ? (
          <View>
            <IconButton
              icon="filter"
              variant="muted"
              accessibilityLabel="Filters"
              onPress={() => setFiltersVisible(true)}
            />
            {filtersActive ? (
              <View style={styles.filterDot} pointerEvents="none" />
            ) : null}
          </View>
        ) : null}
      </View>
      {mode === "worker" ? (
        <>
          <View style={styles.pills}>
            {MODE_OPTIONS.map((option) => (
              <FilterPill
                key={option.value}
                grow
                icon={option.icon}
                label={option.label}
                selected={selectedMode === option.value}
                onPress={() => setSelectedMode(option.value)}
              />
            ))}
          </View>
          <View style={styles.chipsRow}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Location and radius filter"
              accessibilityHint={
                locationSet
                  ? `Area: ${activeLocation.label}. Opens area options.`
                  : "Choose your area or use your location"
              }
              onPress={() => setLocationModalVisible(true)}
              style={styles.locationChip}
            >
              <AppIcon
                name="pin"
                size={size.iconSmall}
                color={palette.purple}
              />
              <Txt variant="caption" numberOfLines={1} style={styles.chipText}>
                {locationSet ? activeLocation.label : "Any area"}
                {locationSet && radiusKm ? ` · ${radiusKm} km` : ""}
              </Txt>
              <Txt variant="caption" style={styles.chipAction}>
                · {locationSet ? "Change" : "Set area"}
              </Txt>
            </PressableScale>
            {selectedCategory !== "all" ? (
              <FilterPill
                selected
                label={GIG_CATEGORY_LABELS[selectedCategory]}
                trailingIcon="close"
                accessibilityLabel={`Clear ${GIG_CATEGORY_LABELS[selectedCategory]} filter`}
                onPress={() => setSelectedCategory("all")}
              />
            ) : null}
          </View>
        </>
      ) : null}
      <View style={styles.sectionRow}>
        <Txt variant="h2" accessibilityRole="header" style={styles.flex}>
          {mode === "employer"
            ? "Your gigs"
            : busy
              ? "Finding gigs…"
              : gigCountTitle(
                  visibleGigs.length,
                  hasMore,
                  selectedMode === "remote",
                  locationSet,
                )}
        </Txt>
        {freshness}
      </View>
    </View>
  );

  return (
    <MarketplaceShell
      greeting={`Hi, ${profile.displayName.split(" ")[0]}`}
      activeSection="home"
      scrollable={false}
      title="Home"
      headerContent={headerTiles}
      heroScrolls
      onSearch={
        mode === "worker" ? () => searchRef.current?.focus() : undefined
      }
      listContent={(notices, hero) => (
        <FlatList<GigRecord | DiscoveryGigCard>
          contentContainerStyle={styles.listContent}
          data={busy || error ? [] : visibleGigs}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={pulling}
              onRefresh={() => {
                setPulling(true);
                setRetry((value) => value + 1);
              }}
              colors={[palette.purple]}
              progressBackgroundColor={palette.surface}
            />
          }
          ListHeaderComponent={
            <View style={styles.headerStack}>
              {hero}
              <View style={styles.gutter}>{listHeader(notices)}</View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.gutter}>
              {busy ? (
                <Skeleton
                  label={
                    mode === "worker" ? "Finding gigs" : "Loading your gigs"
                  }
                  count={3}
                />
              ) : error ? (
                <ErrorState
                  kind={errorKind}
                  message={error}
                  onRetry={() => setRetry((value) => value + 1)}
                />
              ) : mode === "employer" && !searchQuery ? (
                <EmptyState
                  compact
                  icon="plus"
                  title="Post your first gig"
                  message="Describe the task and we'll help you shape the brief."
                  actionLabel="Post a gig"
                  onAction={() => router.push("/(protected)/employer/gigs/new")}
                />
              ) : (
                <EmptyState
                  compact
                  icon="search"
                  title={
                    mode === "employer"
                      ? "No matching gigs"
                      : "No gigs here yet"
                  }
                  message={
                    mode === "employer"
                      ? "Try another search."
                      : "Try other filters, or look at remote work."
                  }
                  actionLabel="Reset filters"
                  onAction={resetFilters}
                  secondaryLabel={
                    mode === "worker" && selectedMode !== "remote"
                      ? "Browse remote"
                      : undefined
                  }
                  onSecondary={() => {
                    resetFilters();
                    setSelectedMode("remote");
                  }}
                />
              )}
            </View>
          }
          ListFooterComponent={
            <View style={[styles.stack, styles.gutter]}>
              {!busy && moreError ? (
                <ErrorState
                  message={moreError}
                  onRetry={() => void loadMore()}
                />
              ) : null}
              {hasMore && !busy && !error ? (
                <SecondaryButton
                  label="Load more gigs"
                  loading={loadingMore}
                  onPress={() => void loadMore()}
                />
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.gutter}>
              <GigCard
                title={item.title}
                amount={item.budgetAmount}
                workMode={item.workMode}
                area={item.publicArea}
                distanceKm={"distanceKm" in item ? item.distanceKm : null}
                schedule={
                  item.dueAt ? `Due ${formatShortDate(item.dueAt)}` : null
                }
                reasons={"reasons" in item ? item.reasons : []}
                status={
                  mode === "employer" ? badgeFor("gig", item.status) : undefined
                }
                onPress={() =>
                  router.push(
                    mode === "employer"
                      ? `/(protected)/employer/gigs/${item.id}`
                      : `/(protected)/worker/gigs/${item.id}`,
                  )
                }
              />
            </View>
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
      <BottomSheet
        visible={filtersVisible}
        title="Filters"
        onClose={() => setFiltersVisible(false)}
        footer={
          <View style={styles.sheetActions}>
            <View style={styles.flex}>
              <SecondaryButton
                label="Reset"
                onPress={() => {
                  setSelectedCategory("all");
                  setRadiusKm(null);
                }}
              />
            </View>
            <View style={styles.flex}>
              <PrimaryButton
                label="Show gigs"
                onPress={() => setFiltersVisible(false)}
              />
            </View>
          </View>
        }
      >
        <Txt variant="title">Category</Txt>
        <View style={styles.wrap}>
          {DISCOVERY_CATEGORY_OPTIONS.map((category) => (
            <FilterPill
              key={category}
              label={
                category === "all"
                  ? "Any category"
                  : GIG_CATEGORY_LABELS[category]
              }
              selected={selectedCategory === category}
              onPress={() => setSelectedCategory(category)}
            />
          ))}
        </View>
        <Txt variant="title">Distance</Txt>
        {locationSet ? (
          <View style={styles.wrap}>
            {DISCOVERY_DISTANCE_OPTIONS.map((option) => (
              <FilterPill
                key={option.label}
                label={option.label}
                selected={radiusKm === option.value}
                onPress={() => setRadiusKm(option.value)}
              />
            ))}
          </View>
        ) : (
          <Txt variant="caption" tone="secondary">
            Set your area first to filter by distance. Remote gigs never need a
            location.
          </Txt>
        )}
        {/* TODO(data): ₱ range, schedule and skills filters need gateway support. */}
      </BottomSheet>
    </MarketplaceShell>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingBottom: space.xxl, gap: space.sm },
  headerStack: { gap: space.lg },
  gutter: {
    paddingHorizontal: size.screenPadding,
    width: "100%",
    maxWidth: size.contentMax,
    alignSelf: "center",
  },
  stack: { gap: space.sm },
  flex: { flex: 1 },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    minHeight: size.primaryButton,
    paddingLeft: space.md,
    paddingRight: space.xxs + 2,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  searchInput: {
    ...type.body,
    flex: 1,
    minWidth: 0,
    color: palette.text,
    paddingVertical: space.sm,
  },
  filterDot: {
    position: "absolute",
    top: space.xs,
    right: space.xs,
    width: size.dot + 2,
    height: size.dot + 2,
    borderRadius: radius.pill,
    backgroundColor: palette.purple,
  },
  pills: { flexDirection: "row", gap: space.xs },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: space.xs,
  },
  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xxs,
    minHeight: size.touchTarget - space.xs,
    maxWidth: "100%",
    paddingHorizontal: space.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  chipText: { color: palette.text, fontWeight: "500", flexShrink: 1 },
  chipAction: { color: palette.purple, fontWeight: "600" },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: space.xs,
    marginTop: space.xs,
  },
  caption: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xxs,
    paddingHorizontal: space.xs,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  captionStale: {
    backgroundColor: status.warning.bg,
    borderWidth: 1,
    borderColor: status.warning.border,
  },
  staleDot: {
    width: size.dot,
    height: size.dot,
    borderRadius: radius.pill,
    backgroundColor: status.warning.base,
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space.xs },
  sheetActions: { flexDirection: "row", gap: space.xs },
});
