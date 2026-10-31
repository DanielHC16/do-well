import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";

import { palette, size, space } from "@/theme";

import { Txt } from "./Txt";

export function initialsOf(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0] ?? "")
      .join("")
      .toUpperCase() || "DW"
  );
}

/** Photo when available, otherwise initials on lavender. */
export const Avatar = memo(function Avatar({
  name,
  uri,
  diameter = size.avatar,
  ring = false,
}: Readonly<{
  name: string;
  /** TODO(data): no avatar upload flow yet; initials render until one exists. */
  uri?: string | null;
  diameter?: number;
  /** White ring when placed on teal or overlapping in a stack. */
  ring?: boolean;
}>) {
  const shape = {
    width: diameter,
    height: diameter,
    borderRadius: diameter / 2,
  };
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${name}'s profile picture`}
      style={[styles.base, shape, ring && styles.ring]}
    >
      {uri ? (
        <Image source={{ uri }} style={shape} contentFit="cover" />
      ) : (
        <Txt
          allowFontScaling={false}
          style={[styles.initials, initialsSize(diameter)]}
        >
          {initialsOf(name)}
        </Txt>
      )}
    </View>
  );
});

/** Overlapping avatars with a "+N" overflow chip. */
export function AvatarStack({
  names,
  max = 3,
  diameter = size.avatar - space.xs,
}: Readonly<{ names: readonly string[]; max?: number; diameter?: number }>) {
  const visible = names.slice(0, max);
  const extra = names.length - visible.length;
  return (
    <View
      accessible
      accessibilityLabel={`${names.length} people: ${names.join(", ")}`}
      style={styles.stack}
    >
      {visible.map((name, index) => (
        <View
          key={`${name}-${index}`}
          style={index ? { marginLeft: -diameter / 3 } : undefined}
        >
          <Avatar name={name} diameter={diameter} ring />
        </View>
      ))}
      {extra > 0 ? (
        <Txt variant="caption" tone="secondary" style={styles.extra}>
          +{extra}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.lavender,
    overflow: "hidden",
  },
  ring: { borderWidth: 2, borderColor: palette.surface },
  initials: { color: palette.navy, fontWeight: "600" },
  stack: { flexDirection: "row", alignItems: "center" },
  extra: { marginLeft: space.xs, fontWeight: "500" },
});

function initialsSize(diameter: number) {
  const fontSize = Math.round(diameter * 0.4);
  return { fontSize, lineHeight: Math.round(fontSize * 1.25) };
}
