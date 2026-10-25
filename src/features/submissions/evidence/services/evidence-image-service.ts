import * as ImagePicker from "expo-image-picker";

import {
  EVIDENCE_MAX_FILE_SIZE,
  EVIDENCE_MIME_TYPES,
  type EvidenceMimeType,
  type SelectedEvidenceImage,
  SelectedEvidenceImageSchema,
} from "../../model/submission-schemas";

export type ImagePickerModule = {
  requestMediaLibraryPermissionsAsync: () => Promise<ImagePicker.PermissionResponse>;
  requestCameraPermissionsAsync: () => Promise<ImagePicker.PermissionResponse>;
  launchImageLibraryAsync: (
    options?: ImagePicker.ImagePickerOptions,
  ) => Promise<ImagePicker.ImagePickerResult>;
  launchCameraAsync: (
    options?: ImagePicker.ImagePickerOptions,
  ) => Promise<ImagePicker.ImagePickerResult>;
};

export type EvidenceImageService = Readonly<{
  pickImageFromLibrary: () => Promise<SelectedEvidenceImage | null>;
  captureImageFromCamera: () => Promise<SelectedEvidenceImage | null>;
}>;

function normalizeMimeType(
  mimeType?: string | null,
  fileName?: string | null,
): EvidenceMimeType {
  const mime = mimeType?.toLowerCase();
  if (mime && EVIDENCE_MIME_TYPES.includes(mime as EvidenceMimeType)) {
    return mime as EvidenceMimeType;
  }
  const ext = fileName?.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

function processAsset(
  asset: ImagePicker.ImagePickerAsset,
): SelectedEvidenceImage {
  const fileName = asset.fileName ?? `evidence_${Date.now()}.jpg`;
  const mimeType = normalizeMimeType(asset.mimeType, fileName);
  const fileSize = asset.fileSize ?? 1024;

  if (fileSize > EVIDENCE_MAX_FILE_SIZE) {
    throw new Error(
      `Photo exceeds the 5 MB limit (file size: ${(fileSize / 1024 / 1024).toFixed(1)} MB).`,
    );
  }

  return SelectedEvidenceImageSchema.parse({
    uri: asset.uri,
    fileName,
    fileSize,
    mimeType,
    width: asset.width ?? null,
    height: asset.height ?? null,
  });
}

export async function readImageBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  return await response.blob();
}

export function createEvidenceImageService(
  picker: ImagePickerModule = ImagePicker,
): EvidenceImageService {
  return {
    async pickImageFromLibrary(): Promise<SelectedEvidenceImage | null> {
      const permission = await picker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        throw new Error(
          "Photo library permission is required to attach evidence.",
        );
      }

      const result = await picker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
        exif: false,
      });

      if (result.canceled || !result.assets?.[0]) {
        return null;
      }

      return processAsset(result.assets[0]);
    },

    async captureImageFromCamera(): Promise<SelectedEvidenceImage | null> {
      const permission = await picker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        throw new Error("Camera permission is required to capture evidence.");
      }

      const result = await picker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
        exif: false,
      });

      if (result.canceled || !result.assets?.[0]) {
        return null;
      }

      return processAsset(result.assets[0]);
    },
  };
}

export const evidenceImageService = createEvidenceImageService();
