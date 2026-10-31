import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  useContext,
  useState,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  AppHeader,
  BottomSheet,
  PressableScale,
  SegmentedPills,
  TabBar,
  Txt,
  type TabKey,
} from "@/components/ui";
import { AuthContext } from "@/features/auth/context/useAuth";
import { OfflineBanner } from "@/features/connectivity/components/OfflineBanner";
import { setupTheme } from "@/features/setup/setupTheme";
import { AppIcon, type AppIconName } from "@/shared/ui/AppIcon";
import { palette, radius, size, space, status } from "@/theme";

import { useShellMode } from "../context/useShellMode";
import { useUnreadActivity } from "../context/useUnreadActivity";
import type { ShellMode } from "../model/shell-mode";

type ShellSection = "home" | "work" | "activity" | "profile" | "account";

type MarketplaceShellProps = PropsWithChildren<
  Readonly<{
    activeSection: ShellSection;
    /** Screen name shown in the navy header (Home derives its own). */
    title: string;
    /** @deprecated Retained for callers; the redesign shows no page subtitle. */
    subtitle?: string;
    scrollable?: boolean;
    /** Renders a list body. `hero` is non-null when `heroScrolls` is set. */
    listContent?: (notices: ReactNode, hero: ReactNode | null) => ReactNode;
    /**
     * Let the navy hero scroll away with a list (Home), keeping only a navy
     * strip behind the status bar. Requires `listContent`.
     */
    heroScrolls?: boolean;
    /** @deprecated The header no longer differs between dashboard pages. */
    dashboard?: boolean;
    /** @deprecated The header no longer differs between dashboard pages. */
    compactHeader?: boolean;
    /** Overrides the automatic "Hi, {first name}" line. */
    greeting?: string;
    /** Content rendered on navy inside the header (e.g. Home stat tiles). */
    headerContent?: ReactNode;
    /** Shows the header search button (screens where search is meaningful). */
    onSearch?: () => void;
    /** Pull-to-refresh for scrollable screens. */
    onRefresh?: () => void;
    refreshing?: boolean;
  }>
>;

const modeRoute = {
  worker: "/(protected)/worker",
  employer: "/(protected)/employer",
} as const;

const tabRoute = {
  work: "/(protected)/work",
  activity: "/(protected)/activity",
  profile: "/(protected)/profile",
} as const;

export function MarketplaceShell({
  activeSection,
  children,
  title,
  scrollable = true,
  listContent,
  heroScrolls = false,
  headerContent,
  onSearch,
  onRefresh,
  refreshing = false,
  greeting,
}: MarketplaceShellProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { busy, error, mode, switchMode } = useShellMode();
  // Optional: unit tests may render the shell without an AuthProvider.
  const auth = useContext(AuthContext);
  const profileName = auth?.state.profile?.displayName ?? "";
  const unread = useUnreadActivity(auth?.state.userId ?? null);
  const [findSheet, setFindSheet] = useState(false);

  async function chooseMode(nextMode: ShellMode) {
    if (nextMode === mode) return;
    if (await switchMode(nextMode)) router.replace(modeRoute[nextMode]);
  }

  function navigate(tab: TabKey) {
    if (tab === "home") router.replace(modeRoute[mode]);
    else router.push(tabRoute[tab]);
  }

  function findGigs(intent: "near" | "remote") {
    setFindSheet(false);
    // `at` makes repeated taps distinct so Home applies each one once.
    router.replace({
      pathname: modeRoute.worker,
      params: { intent, at: String(Date.now()) },
    });
  }

  const screenName =
    activeSection === "home"
      ? mode === "worker"
        ? "Discover gigs"
        : "Your workspace"
      : title;

  const notices = (
    <>
      <OfflineBanner />
      {error ? (
        <View accessibilityRole="alert" style={styles.errorPanel}>
          <Txt variant="caption" style={{ color: status.danger.fg }}>
            Workspace not saved. {error}
          </Txt>
        </View>
      ) : null}
      {busy ? (
        <View accessibilityLiveRegion="polite" style={styles.busyRow}>
          <ActivityIndicator color={palette.purple} />
          <Txt variant="caption" tone="secondary">
            Switching workspace…
          </Txt>
        </View>
      ) : null}
    </>
  );

  const scrollingHero = heroScrolls && Boolean(listContent);
  const hero = (
    <AppHeader
      insetTop={!scrollingHero}
      name={profileName}
      greeting={greeting}
      screenName={screenName}
      onAvatarPress={() => router.push(tabRoute.profile)}
      onSearch={onSearch}
      onNotifications={() => router.push(tabRoute.activity)}
      unread={unread && activeSection !== "activity"}
      controls={
        <SegmentedPills
          tone="onDark"
          role="radio"
          accessibilityLabel="Workspace"
          value={mode}
          disabled={busy}
          onChange={(next) => void chooseMode(next)}
          segments={[
            {
              value: "worker",
              label: "Find work",
              accessibilityLabel: "Show worker workspace",
            },
            {
              value: "employer",
              label: "Offer work",
              accessibilityLabel: "Show employer workspace",
            },
          ]}
        />
      }
    >
      {headerContent}
    </AppHeader>
  );

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {scrollingHero ? (
        <View style={{ height: insets.top, backgroundColor: palette.navy }} />
      ) : (
        hero
      )}
      <KeyboardAvoidingView style={styles.body} behavior="height">
        {scrollable ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[palette.purple]}
                  progressBackgroundColor={palette.surface}
                />
              ) : undefined
            }
          >
            {notices}
            {children}
          </ScrollView>
        ) : listContent ? (
          <View style={styles.body}>
            {listContent(notices, scrollingHero ? hero : null)}
            {children}
          </View>
        ) : (
          <View style={styles.body}>
            <View style={styles.fixedNotices}>{notices}</View>
            <View style={styles.body}>{children}</View>
          </View>
        )}
      </KeyboardAvoidingView>
      <TabBar
        active={activeSection === "account" ? "profile" : activeSection}
        onNavigate={navigate}
        fabLabel={mode === "employer" ? "Post a gig" : "Find gigs"}
        onFab={() =>
          mode === "employer"
            ? router.push("/(protected)/employer/gigs/new")
            : setFindSheet(true)
        }
      />
      <BottomSheet
        visible={findSheet}
        title="Find gigs"
        onClose={() => setFindSheet(false)}
      >
        <SheetOption
          icon="pin"
          title="Find gigs near me"
          detail="Use your location or pick an area"
          onPress={() => findGigs("near")}
        />
        <SheetOption
          icon="remote"
          title="Browse remote"
          detail="Work from anywhere, no location needed"
          onPress={() => findGigs("remote")}
        />
      </BottomSheet>
    </View>
  );
}

function SheetOption({
  icon,
  title,
  detail,
  onPress,
}: Readonly<{
  icon: AppIconName;
  title: string;
  detail: string;
  onPress: () => void;
}>) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={detail}
      onPress={onPress}
      style={styles.option}
    >
      <View style={styles.optionIcon}>
        <AppIcon name={icon} size={size.icon} color={palette.navy} />
      </View>
      <View style={styles.optionCopy}>
        <Txt variant="title">{title}</Txt>
        <Txt variant="caption" tone="secondary">
          {detail}
        </Txt>
      </View>
      <AppIcon
        name="chevronRight"
        size={size.icon}
        color={palette.textSecondary}
      />
    </PressableScale>
  );
}

export const marketplaceStyles = StyleSheet.create({
  card: {
    ...setupTheme.shadow.card,
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.card,
    borderWidth: 1,
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.section,
  },
  cardKicker: {
    color: setupTheme.color.accent,
    fontSize: setupTheme.type.label,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  cardTitle: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.heading,
    fontWeight: "700",
  },
  body: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.body,
    lineHeight: 24,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: setupTheme.color.primary,
    borderColor: setupTheme.color.primary,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: setupTheme.spacing.section,
  },
  primaryButtonText: {
    color: setupTheme.color.onPrimary,
    fontSize: setupTheme.type.body,
    fontWeight: "600",
  },
  mutedButton: {
    alignItems: "center",
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: setupTheme.spacing.section,
  },
  mutedButtonText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "500",
  },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  body: {
    flex: 1,
    width: "100%",
    maxWidth: size.contentMax,
    alignSelf: "center",
  },
  content: {
    gap: space.md,
    paddingHorizontal: size.screenPadding,
    paddingTop: space.lg,
    paddingBottom: space.xxl,
  },
  fixedNotices: {
    gap: space.sm,
    paddingHorizontal: size.screenPadding,
    paddingTop: space.sm,
  },
  errorPanel: {
    backgroundColor: status.danger.bg,
    borderColor: status.danger.border,
    borderRadius: radius.input,
    borderWidth: 1,
    padding: space.sm,
  },
  busyRow: { alignItems: "center", flexDirection: "row", gap: space.xs },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  optionIcon: {
    width: size.iconButton,
    height: size.iconButton,
    borderRadius: radius.pill,
    backgroundColor: palette.lavender,
    alignItems: "center",
    justifyContent: "center",
  },
  optionCopy: { flex: 1, gap: 2 },
});
