import { useState, type ReactNode } from "react";
import { StyleSheet, View, type TextInputProps } from "react-native";

import { AppIcon, type AppIconName } from "@/shared/ui/AppIcon";
import { TextInput } from "@/shared/ui/Typography";
import { palette, radius, size, space, status, type } from "@/theme";

import { BottomSheet } from "./BottomSheet";
import { IconButton } from "./Buttons";
import { FilterPill } from "./Pills";
import { PressableScale } from "./PressableScale";
import { Txt } from "./Txt";

type FieldChrome = Readonly<{
  label: string;
  /** Visually hide the label (e.g. search bars) but keep it for screen readers. */
  hideLabel?: boolean;
  helper?: string;
  error?: string;
}>;

function FieldFrame({
  label,
  hideLabel,
  helper,
  error,
  children,
}: FieldChrome & { children: ReactNode }) {
  return (
    <View style={styles.field}>
      {hideLabel ? null : (
        <Txt variant="caption" style={styles.label}>
          {label}
        </Txt>
      )}
      {children}
      {error ? (
        <Txt
          variant="caption"
          accessibilityRole="alert"
          style={{ color: status.danger.fg }}
        >
          {error}
        </Txt>
      ) : helper ? (
        <Txt variant="caption" tone="secondary">
          {helper}
        </Txt>
      ) : null}
    </View>
  );
}

export type TextFieldProps = TextInputProps &
  FieldChrome & {
    leadingIcon?: AppIconName;
    /** Inline trailing action, e.g. a filter button inside the search bar. */
    trailing?: ReactNode;
  };

/** Rounded-16 input. Focus ring in purple, error ring in danger. */
export function TextField({
  label,
  hideLabel,
  helper,
  error,
  leadingIcon,
  trailing,
  style,
  multiline,
  ...props
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <FieldFrame
      label={label}
      hideLabel={hideLabel}
      helper={helper}
      error={error}
    >
      <View
        style={[
          styles.box,
          multiline && styles.boxMultiline,
          focused && styles.focused,
          error ? styles.errored : null,
        ]}
      >
        {leadingIcon ? (
          <AppIcon
            name={leadingIcon}
            size={size.icon}
            color={palette.textSecondary}
          />
        ) : null}
        <TextInput
          maxFontSizeMultiplier={1.6}
          {...props}
          multiline={multiline}
          accessibilityLabel={props.accessibilityLabel ?? label}
          accessibilityHint={error ?? props.accessibilityHint}
          placeholderTextColor={palette.textSecondary}
          cursorColor={palette.purple}
          selectionColor={palette.lavender}
          onFocus={(event) => {
            setFocused(true);
            props.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            props.onBlur?.(event);
          }}
          style={[styles.input, multiline && styles.inputMultiline, style]}
        />
        {trailing}
      </View>
    </FieldFrame>
  );
}

export function TextArea(props: Omit<TextFieldProps, "multiline">) {
  return <TextField {...props} multiline textAlignVertical="top" />;
}

export type SelectOption<T extends string> = Readonly<{
  value: T;
  label: string;
}>;

/** Tappable field that opens a bottom sheet of options. */
export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder = "Choose…",
  helper,
  error,
}: FieldChrome &
  Readonly<{
    value: T | null;
    options: readonly SelectOption<T>[];
    onChange: (value: T) => void;
    placeholder?: string;
  }>) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  return (
    <FieldFrame label={label} helper={helper} error={error}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? "not set"}`}
        accessibilityHint="Opens a list of options"
        onPress={() => setOpen(true)}
        style={[styles.box, error ? styles.errored : null]}
      >
        <Txt
          tone={selected ? "default" : "secondary"}
          style={styles.selectValue}
          numberOfLines={1}
        >
          {selected?.label ?? placeholder}
        </Txt>
        <AppIcon
          name="chevronDown"
          size={size.icon}
          color={palette.textSecondary}
        />
      </PressableScale>
      <BottomSheet visible={open} title={label} onClose={() => setOpen(false)}>
        <View style={styles.options} accessibilityRole="radiogroup">
          {options.map((option) => (
            <PressableScale
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: option.value === value }}
              onPress={() => {
                onChange(option.value);
                setOpen(false);
              }}
              style={[
                styles.option,
                option.value === value && styles.optionSelected,
              ]}
            >
              <Txt variant="title" style={styles.selectValue}>
                {option.label}
              </Txt>
              {option.value === value ? (
                <AppIcon name="tick" size={size.icon} color={palette.purple} />
              ) : null}
            </PressableScale>
          ))}
        </View>
      </BottomSheet>
    </FieldFrame>
  );
}

/**
 * Free-form tags as removable pills.
 * TODO(data): gigs have no tags column yet; built for the Phase 4 form, unwired.
 */
export function TagInput({
  label,
  tags,
  onChange,
  maxTags = 8,
  helper,
}: FieldChrome &
  Readonly<{
    tags: readonly string[];
    onChange: (tags: string[]) => void;
    maxTags?: number;
  }>) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const next = draft.trim();
    if (!next || tags.includes(next) || tags.length >= maxTags) return;
    onChange([...tags, next]);
    setDraft("");
  };
  return (
    <View style={styles.field}>
      <TextField
        label={label}
        helper={helper ?? `Up to ${maxTags}`}
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={add}
        returnKeyType="done"
        submitBehavior="submit"
        trailing={
          <IconButton
            icon="plus"
            variant="muted"
            accessibilityLabel={`Add ${label}`}
            onPress={add}
            disabled={!draft.trim() || tags.length >= maxTags}
          />
        }
      />
      {tags.length ? (
        <View style={styles.tags}>
          {tags.map((tag) => (
            <FilterPill
              key={tag}
              label={tag}
              selected
              trailingIcon="close"
              accessibilityLabel={`Remove ${tag}`}
              onPress={() => onChange(tags.filter((item) => item !== tag))}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: space.xs },
  label: { color: palette.text, fontWeight: "500" },
  box: {
    minHeight: size.primaryButton,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  boxMultiline: { alignItems: "flex-start", paddingVertical: space.sm },
  focused: { borderColor: palette.purple, borderWidth: 1.5 },
  errored: { borderColor: status.danger.base, borderWidth: 1.5 },
  input: {
    ...type.body,
    flex: 1,
    minWidth: 0,
    color: palette.text,
    paddingVertical: space.sm,
  },
  inputMultiline: { minHeight: size.textAreaMin },
  selectValue: { flex: 1 },
  options: { gap: space.xs },
  option: {
    minHeight: size.primaryButton,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.input,
    backgroundColor: palette.surfaceMuted,
  },
  optionSelected: { backgroundColor: palette.lavender },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: space.xs },
});
