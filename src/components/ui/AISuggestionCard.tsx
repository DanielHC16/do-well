import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppIcon } from "@/shared/ui/AppIcon";
import { TextInput } from "@/shared/ui/Typography";
import { palette, radius, size, space, type } from "@/theme";

import { IconButton } from "./Buttons";
import { Txt } from "./Txt";

/**
 * Where suggestion text came from. Only `ai` may be labelled as AI: the brief
 * builder falls back to deterministic templates when inference is unavailable
 * (tests/security/truth-in-advertising.test.ts).
 */
export type SuggestionSource = "ai" | "template";

export function provenanceLabel(source: SuggestionSource): string {
  return source === "ai"
    ? "Suggested by AI · review before posting"
    : "Template suggestion · review before posting";
}

/** Lime-tinted, fully editable list of suggestions the human must review. */
export function AISuggestionCard({
  title,
  source,
  items,
  onChange,
  addLabel = "Add item",
  maxItems = 10,
}: Readonly<{
  title: string;
  source: SuggestionSource;
  items: readonly string[];
  onChange: (items: string[]) => void;
  addLabel?: string;
  maxItems?: number;
}>) {
  const [draft, setDraft] = useState("");
  const update = (index: number, value: string) =>
    onChange(items.map((item, at) => (at === index ? value : item)));
  const remove = (index: number) =>
    onChange(items.filter((_, at) => at !== index));
  const add = () => {
    const value = draft.trim();
    if (!value || items.length >= maxItems) return;
    onChange([...items, value]);
    setDraft("");
  };

  return (
    <View style={styles.card}>
      <View style={styles.provenance}>
        <AppIcon
          name={source === "ai" ? "sparkles" : "file"}
          size={size.iconSmall}
          color={palette.purple}
        />
        <Txt variant="micro" style={styles.provenanceText}>
          {provenanceLabel(source)}
        </Txt>
      </View>
      <Txt variant="title" accessibilityRole="header">
        {title}
      </Txt>
      <View style={styles.items}>
        {items.map((item, index) => (
          <View key={index} style={styles.item}>
            <TextInput
              value={item}
              onChangeText={(value) => update(index, value)}
              accessibilityLabel={`${title} item ${index + 1}`}
              accessibilityHint="Edit this suggestion"
              multiline
              maxFontSizeMultiplier={1.6}
              style={styles.input}
            />
            <IconButton
              icon="trash"
              variant="muted"
              accessibilityLabel={`Remove ${title} item ${index + 1}`}
              onPress={() => remove(index)}
            />
          </View>
        ))}
        {items.length < maxItems ? (
          <View style={styles.item}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={add}
              submitBehavior="submit"
              returnKeyType="done"
              placeholder={addLabel}
              placeholderTextColor={palette.textSecondary}
              accessibilityLabel={`New ${title} item`}
              maxFontSizeMultiplier={1.6}
              style={styles.input}
            />
            <IconButton
              icon="plus"
              variant="surface"
              accessibilityLabel={`${addLabel} to ${title}`}
              onPress={add}
              disabled={!draft.trim()}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: space.md,
    gap: space.sm,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: palette.mintBorder,
    backgroundColor: palette.mintTint,
  },
  provenance: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: space.xxs,
    paddingHorizontal: space.sm - 2,
    paddingVertical: space.xxs,
    borderRadius: radius.pill,
    backgroundColor: palette.surface,
  },
  provenanceText: { color: palette.purple },
  items: { gap: space.xs },
  item: { flexDirection: "row", alignItems: "center", gap: space.xs },
  input: {
    ...type.body,
    flex: 1,
    minHeight: size.touchTarget,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.input,
    backgroundColor: palette.surface,
    color: palette.text,
  },
});
