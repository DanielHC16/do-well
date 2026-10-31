import { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "@/shared/ui/Typography";

import {
  AppButton,
  AppInput,
  ErrorState,
  SectionHeader,
  setupTheme,
} from "@/shared/ui";

import type { ProfileEditorGateway } from "../data/profile-editor-gateway";
import {
  profileEditSchema,
  type EditableProfile,
  type ProfileEdit,
} from "../model/profile-edit-schema";

export function ProfileEditor({
  initial,
  gateway,
  onSaved,
  onCancel,
}: Readonly<{
  initial: EditableProfile;
  gateway: ProfileEditorGateway;
  onSaved: (profile: EditableProfile) => void;
  onCancel: () => void;
}>) {
  const [input, setInput] = useState<ProfileEdit>(initial);
  const [errors, setErrors] = useState<
    Partial<Record<keyof ProfileEdit, string>>
  >({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const lock = useRef(false);

  async function save() {
    if (lock.current) return;
    const parsed = profileEditSchema.safeParse(input);
    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors;
      setErrors({
        displayName: fields.displayName?.[0],
        homeArea: fields.homeArea?.[0],
        bio: fields.bio?.[0],
      });
      return;
    }
    lock.current = true;
    setBusy(true);
    setFailed(false);
    setErrors({});
    try {
      const saved = await gateway.save(initial.id, parsed.data);
      onSaved(saved);
    } catch {
      setFailed(true);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <View style={styles.editor}>
      <SectionHeader
        title="Edit profile"
        description="Help people get to know the person behind the work."
      />
      <AppInput
        label="Display name"
        value={input.displayName}
        onChangeText={(displayName) =>
          setInput((current) => ({ ...current, displayName }))
        }
        maxLength={80}
        autoCapitalize="words"
        autoComplete="name"
        editable={!busy}
        error={errors.displayName}
      />
      <AppInput
        label="City or public area"
        value={input.homeArea}
        onChangeText={(homeArea) =>
          setInput((current) => ({ ...current, homeArea }))
        }
        maxLength={120}
        editable={!busy}
        error={errors.homeArea}
      />
      <Text style={styles.hint}>
        Share a city or neighborhood, never your home address.
      </Text>
      <AppInput
        label="Bio"
        value={input.bio}
        onChangeText={(bio) => setInput((current) => ({ ...current, bio }))}
        maxLength={500}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        editable={!busy}
        error={errors.bio}
      />
      <Text style={styles.hint}>{input.bio.length}/500 characters</Text>
      {failed ? (
        <ErrorState message="We couldn't save your profile. Your changes are still here. Reopen the editor to check whether the server saved them before retrying." />
      ) : null}
      <AppButton
        label={busy ? "Saving profile…" : "Save profile"}
        onPress={() => void save()}
        loading={busy}
      />
      <AppButton
        label="Cancel editing"
        onPress={onCancel}
        disabled={busy}
        variant="secondary"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  editor: {
    gap: setupTheme.spacing.compact + setupTheme.spacing.tight,
    padding: setupTheme.spacing.section,
    borderWidth: 1,
    borderColor: setupTheme.color.border,
    backgroundColor: setupTheme.color.surface,
    borderRadius: setupTheme.radius.card,
  },
  hint: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.caption,
    lineHeight: 18,
  },
});
