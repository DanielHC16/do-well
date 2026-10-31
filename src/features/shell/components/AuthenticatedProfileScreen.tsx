import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import {
  Avatar,
  ErrorState,
  PressableScale,
  SecondaryButton,
  Skeleton,
  Txt,
} from "@/components/ui";

import type { AuthProfile } from "@/features/auth/model/auth-state";
import { ProfileEditor } from "@/features/profile/components/ProfileEditor";
import {
  profileEditorGateway,
  type EditableProfile,
  type ProfileEditorGateway,
} from "@/features/profile/data/profile-editor-gateway";
import { AppIcon, type AppIconName } from "@/shared/ui/AppIcon";
import { palette, radius, size, space, status } from "@/theme";

import { useShellMode } from "../context/useShellMode";
import { useWorkCounts, type HomeStatsSources } from "../data/home-stats";
import { MarketplaceShell } from "./MarketplaceShell";

type AuthenticatedProfileScreenProps = Readonly<{
  busy: boolean;
  profile: AuthProfile;
  onSignOut: () => Promise<void>;
  onUpdated?: () => Promise<void>;
  editorGateway?: ProfileEditorGateway;
  stats?: HomeStatsSources;
}>;

export function AuthenticatedProfileScreen({
  busy,
  onSignOut,
  onUpdated,
  profile,
  editorGateway = profileEditorGateway,
  stats: statSources,
}: AuthenticatedProfileScreenProps) {
  const router = useRouter();
  const { mode } = useShellMode();
  const [refreshKey, setRefreshKey] = useState(0);
  const [editable, setEditable] = useState<EditableProfile | null>(null);
  const [saved, setSaved] = useState<EditableProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updated, setUpdated] = useState(false);
  const loadingLock = useRef(false);
  const generation = useRef(0);
  const shown = saved ?? profile;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const request = ++generation.current;
      setLoading(true);
      setError(null);
      void Promise.resolve()
        .then(() => editorGateway.read(profile.id))
        .then((current) => {
          if (active && request === generation.current) setSaved(current);
        })
        .catch(() => {
          if (active && request === generation.current)
            setError(
              "We couldn't load your profile. Check your connection and try again.",
            );
        })
        .finally(() => {
          if (active && request === generation.current) setLoading(false);
        });
      return () => {
        active = false;
        generation.current++;
      };
    }, [editorGateway, profile.id]),
  );

  async function reloadProfile() {
    const request = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const current = await editorGateway.read(profile.id);
      if (request === generation.current) setSaved(current);
    } catch {
      if (request === generation.current)
        setError(
          "We couldn't load your profile. Check your connection and try again.",
        );
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }

  async function openEditor() {
    if (loadingLock.current) return;
    loadingLock.current = true;
    const request = ++generation.current;
    setLoading(true);
    setError(null);
    setUpdated(false);
    try {
      const current = await editorGateway.read(profile.id);
      if (request !== generation.current) return;
      setSaved(current);
      setEditable(current);
    } catch {
      if (request === generation.current)
        setError(
          "We couldn't load your profile. Check your connection and try again.",
        );
    } finally {
      loadingLock.current = false;
      if (request === generation.current) setLoading(false);
    }
  }

  function onSaved(next: EditableProfile) {
    setSaved(next);
    setEditable(null);
    setUpdated(true);
    // Refresh the existing auth profile after the server has confirmed the write.
    void Promise.resolve()
      .then(() => onUpdated?.())
      .catch(() => {
        setError(
          "Your profile was saved. Reopen your account to refresh its name and area.",
        );
      });
  }

  const counts = useWorkCounts(profile.id, mode, refreshKey, statSources);
  const area = shown.homeArea?.trim();

  return (
    <MarketplaceShell
      activeSection="profile"
      title="Profile"
      refreshing={loading && refreshKey > 0}
      onRefresh={() => {
        setRefreshKey((value) => value + 1);
        void reloadProfile();
      }}
    >
      <View style={styles.identity}>
        <Avatar name={shown.displayName} diameter={size.avatarHero} />
        <Txt variant="h1" accessibilityRole="header" style={styles.centered}>
          {shown.displayName}
        </Txt>
        <View style={styles.areaRow}>
          <AppIcon
            name="pin"
            size={size.iconSmall}
            color={palette.textSecondary}
          />
          <Txt tone="secondary">{area || "Add your public work area"}</Txt>
        </View>
        {/* TODO(data): skills, rating and availability have no profile columns yet. */}
      </View>

      <View style={styles.stats} accessibilityRole="summary">
        {counts.map((count, index) => (
          <View
            key={count.key}
            accessible
            accessibilityLabel={`${count.value} ${count.label}`}
            style={[styles.stat, index > 0 && styles.statDivider]}
          >
            <Txt variant="h2" style={styles.statValue}>
              {count.value}
            </Txt>
            <Txt variant="caption" tone="secondary">
              {count.label}
            </Txt>
          </View>
        ))}
      </View>

      {updated ? (
        <Txt
          accessibilityLiveRegion="polite"
          variant="bodyStrong"
          style={{ color: status.success.fg }}
        >
          Profile updated
        </Txt>
      ) : null}
      {error ? (
        <ErrorState
          compact
          message={error}
          onRetry={() => {
            // Retry reloads the page data; it never opens the editor implicitly.
            setRefreshKey((value) => value + 1);
            void reloadProfile();
          }}
        />
      ) : null}
      {editable ? (
        <ProfileEditor
          key={editable.id}
          initial={editable}
          gateway={editorGateway}
          onSaved={onSaved}
          onCancel={() => setEditable(null)}
        />
      ) : (
        <>
          {loading && !saved ? (
            <Skeleton shape="row" count={1} label="Loading your profile" />
          ) : saved?.bio ? (
            <View style={styles.card}>
              <Txt variant="title" accessibilityRole="header">
                About
              </Txt>
              <Txt tone="secondary">{saved.bio}</Txt>
            </View>
          ) : null}
          <SecondaryButton
            label="Edit profile"
            icon="edit"
            onPress={() => void openEditor()}
            loading={loading}
            disabled={busy}
          />
        </>
      )}

      <View style={styles.card}>
        <SettingsRow
          icon="briefcase"
          label="My work"
          onPress={() => router.push("/(protected)/work")}
        />
        <SettingsRow
          icon="shield"
          label="Settings"
          divider
          onPress={() => router.push("/(protected)/settings")}
        />
        <SettingsRow
          icon="lock"
          label={busy ? "Signing out..." : "Sign out"}
          accessibilityLabel={busy ? "Signing out" : "Sign out"}
          tone="danger"
          divider
          busy={busy}
          onPress={() => void onSignOut()}
        />
      </View>
    </MarketplaceShell>
  );
}

function SettingsRow({
  icon,
  label,
  accessibilityLabel,
  onPress,
  tone = "default",
  divider = false,
  busy = false,
}: Readonly<{
  icon: AppIconName;
  label: string;
  accessibilityLabel?: string;
  onPress: () => void;
  tone?: "default" | "danger";
  divider?: boolean;
  busy?: boolean;
}>) {
  const color = tone === "danger" ? status.danger.fg : palette.navy;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: busy, busy }}
      disabled={busy}
      onPress={onPress}
      style={[styles.row, divider && styles.rowDivider]}
    >
      <View
        style={[
          styles.rowIcon,
          tone === "danger" && { backgroundColor: status.danger.bg },
        ]}
      >
        <AppIcon name={icon} size={size.iconSmall} color={color} />
      </View>
      <Txt variant="title" style={[styles.rowLabel, { color }]}>
        {label}
      </Txt>
      {busy ? (
        <ActivityIndicator color={color} />
      ) : tone === "danger" ? null : (
        <AppIcon
          name="chevronRight"
          size={size.icon}
          color={palette.textSecondary}
        />
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  identity: { alignItems: "center", gap: space.xs, paddingTop: space.xs },
  centered: { textAlign: "center" },
  areaRow: { flexDirection: "row", alignItems: "center", gap: space.xxs },
  stats: {
    flexDirection: "row",
    paddingVertical: space.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  statDivider: { borderLeftWidth: 1, borderLeftColor: palette.border },
  statValue: { color: palette.navy },
  card: {
    gap: space.xs,
    padding: space.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    minHeight: size.touchTarget + space.xs,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: palette.border,
    paddingTop: space.xs,
  },
  rowIcon: {
    width: size.iconButton - space.xxs,
    height: size.iconButton - space.xxs,
    borderRadius: radius.pill,
    backgroundColor: palette.lavender,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { flex: 1 },
});
