import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "@/shared/ui/Typography";

import type { AuthProfile } from "@/features/auth/model/auth-state";
import { ProfileEditor } from "@/features/profile/components/ProfileEditor";
import {
  profileEditorGateway,
  type EditableProfile,
  type ProfileEditorGateway,
} from "@/features/profile/data/profile-editor-gateway";
import {
  AppButton,
  ErrorState,
  LoadingSkeleton,
  ProfileAvatar,
  SectionHeader,
  setupTheme,
} from "@/shared/ui";
import { AppIcon } from "@/shared/ui/AppIcon";

import { MarketplaceShell, marketplaceStyles } from "./MarketplaceShell";

type AuthenticatedProfileScreenProps = Readonly<{
  busy: boolean;
  profile: AuthProfile;
  onSignOut: () => Promise<void>;
  onUpdated?: () => Promise<void>;
  editorGateway?: ProfileEditorGateway;
}>;

export function AuthenticatedProfileScreen({
  busy,
  onSignOut,
  onUpdated,
  profile,
  editorGateway = profileEditorGateway,
}: AuthenticatedProfileScreenProps) {
  const router = useRouter();
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

  return (
    <MarketplaceShell
      activeSection="profile"
      title="Profile"
      subtitle="Your introduction to the people you work with."
    >
      <View style={[marketplaceStyles.card, styles.identity]}>
        <ProfileAvatar name={shown.displayName} size={56} />
        <View style={styles.identityCopy}>
          <Text
            accessibilityRole="header"
            style={[marketplaceStyles.cardTitle, styles.identityName]}
          >
            {shown.displayName}
          </Text>
          <View style={styles.areaRow}>
            <AppIcon name="pin" size={16} color={setupTheme.color.muted} />
            <Text style={[marketplaceStyles.body, styles.identityArea]}>
              {shown.homeArea ?? "Add your public work area"}
            </Text>
          </View>
        </View>
      </View>
      {updated ? (
        <Text accessibilityLiveRegion="polite" style={styles.success}>
          Profile updated
        </Text>
      ) : null}
      {error ? (
        <ErrorState message={error} onRetry={() => void openEditor()} />
      ) : null}
      {loading ? <LoadingSkeleton label="Loading your profile…" /> : null}
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
          {saved?.bio ? (
            <View style={marketplaceStyles.card}>
              <SectionHeader title="About you" />
              <Text style={marketplaceStyles.body}>{saved.bio}</Text>
            </View>
          ) : null}
          <AppButton
            label="Edit profile"
            icon="user"
            onPress={() => void openEditor()}
            loading={loading}
            disabled={busy}
          />
          <View style={marketplaceStyles.card}>
            <SectionHeader
              title="Your work"
              description="Applications, ongoing assignments, and completed work."
            />
            <AppButton
              label="View my work"
              icon="briefcase"
              variant="secondary"
              onPress={() => router.push("/(protected)/work")}
            />
          </View>
        </>
      )}
      <View style={marketplaceStyles.card}>
        <SectionHeader
          title="Your account"
          description="Manage your preferences and account access."
        />
        <AppButton
          label="Settings"
          icon="shield"
          variant="secondary"
          onPress={() => router.push("/(protected)/settings")}
        />
        <AppButton
          label={busy ? "Signing out..." : "Sign out"}
          icon="lock"
          accessibilityLabel={busy ? "Signing out" : "Sign out"}
          onPress={() => void onSignOut()}
          loading={busy}
          variant="danger"
        />
      </View>
    </MarketplaceShell>
  );
}

const styles = StyleSheet.create({
  identity: {
    backgroundColor: setupTheme.color.accentSurface,
    borderColor: setupTheme.color.border,
    flexDirection: "row",
    alignItems: "center",
    gap: setupTheme.spacing.compact + setupTheme.spacing.tight,
  },
  identityCopy: { flex: 1, gap: setupTheme.spacing.compact },
  identityName: {
    color: setupTheme.color.primary,
    fontSize: setupTheme.type.section,
    fontWeight: "600",
  },
  identityArea: { color: setupTheme.color.muted, flexShrink: 1 },
  areaRow: {
    flexWrap: "wrap",
    flexDirection: "row",
    alignItems: "center",
    gap: setupTheme.spacing.tight,
  },
  success: {
    color: setupTheme.color.ready,
    fontSize: setupTheme.type.body,
    fontWeight: "600",
  },
});
