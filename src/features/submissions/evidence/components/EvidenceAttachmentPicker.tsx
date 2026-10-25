import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { setupTheme } from "@/features/setup/setupTheme";

import type { SelectedEvidenceImage } from "../../model/submission-schemas";
import {
  evidenceImageService,
  type EvidenceImageService,
} from "../services/evidence-image-service";

export type EvidenceAttachmentPickerProps = Readonly<{
  selectedImages: SelectedEvidenceImage[];
  onAddImage: (image: SelectedEvidenceImage) => void;
  onRemoveImage: (index: number) => void;
  disabled?: boolean;
  maxImages?: number;
  service?: EvidenceImageService;
}>;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function EvidenceAttachmentPicker({
  disabled = false,
  maxImages = 3,
  onAddImage,
  onRemoveImage,
  selectedImages,
  service = evidenceImageService,
}: EvidenceAttachmentPickerProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePickPhoto = async () => {
    if (disabled || busy || selectedImages.length >= maxImages) return;
    setBusy(true);
    setError(null);
    try {
      const asset = await service.pickImageFromLibrary();
      if (asset) {
        onAddImage(asset);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to select photo evidence.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleCapturePhoto = async () => {
    if (disabled || busy || selectedImages.length >= maxImages) return;
    setBusy(true);
    setError(null);
    try {
      const asset = await service.captureImageFromCamera();
      if (asset) {
        onAddImage(asset);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to capture photo evidence.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>
          PHOTO EVIDENCE ({selectedImages.length}/{maxImages})
        </Text>
        <Text style={styles.subtitle}>Max 5 MB each · JPG, PNG, WEBP</Text>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Action buttons */}
      {selectedImages.length < maxImages && !disabled ? (
        <View style={styles.actionRow}>
          <Pressable
            accessibilityLabel="Pick photo from gallery"
            accessibilityRole="button"
            disabled={busy || disabled}
            onPress={handlePickPhoto}
            style={[styles.actionButton, busy && styles.buttonDisabled]}
          >
            {busy ? (
              <ActivityIndicator
                color={setupTheme.color.foreground}
                size="small"
              />
            ) : (
              <Text style={styles.actionButtonText}>+ Select Photo</Text>
            )}
          </Pressable>

          <Pressable
            accessibilityLabel="Take photo with camera"
            accessibilityRole="button"
            disabled={busy || disabled}
            onPress={handleCapturePhoto}
            style={[styles.actionButton, busy && styles.buttonDisabled]}
          >
            <Text style={styles.actionButtonText}>Take Photo</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Selected previews */}
      {selectedImages.length > 0 ? (
        <View style={styles.previewList}>
          {selectedImages.map((img, index) => (
            <View key={`${img.uri}-${index}`} style={styles.previewCard}>
              <Image source={{ uri: img.uri }} style={styles.previewImage} />
              <View style={styles.previewInfo}>
                <Text numberOfLines={1} style={styles.fileName}>
                  {img.fileName}
                </Text>
                <Text style={styles.fileSize}>
                  {formatBytes(img.fileSize)} ·{" "}
                  {img.mimeType.split("/")[1].toUpperCase()}
                </Text>
              </View>
              {!disabled ? (
                <Pressable
                  accessibilityLabel={`Remove photo ${img.fileName}`}
                  accessibilityRole="button"
                  onPress={() => onRemoveImage(index)}
                  style={styles.removeButton}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: "center",
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    paddingVertical: setupTheme.spacing.compact,
  },
  actionButtonText: {
    color: setupTheme.color.foreground,
    fontFamily: "Inter_600SemiBold",
    fontSize: setupTheme.type.caption,
  },
  actionRow: {
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
    marginTop: setupTheme.spacing.compact,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  container: {
    marginBottom: setupTheme.spacing.section,
    marginTop: setupTheme.spacing.compact,
  },
  errorBox: {
    backgroundColor: setupTheme.color.dangerSurface,
    borderColor: setupTheme.color.danger,
    borderRadius: setupTheme.radius.small,
    borderWidth: 1,
    marginTop: setupTheme.spacing.compact,
    padding: setupTheme.spacing.compact,
  },
  errorText: {
    color: setupTheme.color.danger,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  fileName: {
    color: setupTheme.color.foreground,
    fontFamily: "Inter_600SemiBold",
    fontSize: setupTheme.type.caption,
  },
  fileSize: {
    color: setupTheme.color.muted,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 2,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  previewCard: {
    alignItems: "center",
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.borderSoft,
    borderRadius: setupTheme.radius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
    padding: setupTheme.spacing.compact,
  },
  previewImage: {
    backgroundColor: setupTheme.color.surfaceMuted,
    borderRadius: setupTheme.radius.small,
    height: 48,
    width: 48,
  },
  previewInfo: {
    flex: 1,
  },
  previewList: {
    gap: setupTheme.spacing.compact,
    marginTop: setupTheme.spacing.compact,
  },
  removeButton: {
    backgroundColor: setupTheme.color.surfaceMuted,
    borderRadius: setupTheme.radius.small,
    paddingHorizontal: setupTheme.spacing.compact,
    paddingVertical: 4,
  },
  removeButtonText: {
    color: setupTheme.color.danger,
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  subtitle: {
    color: setupTheme.color.muted,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
  },
  title: {
    color: setupTheme.color.foreground,
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 0.6,
  },
});
