import * as ImagePicker from "expo-image-picker";

import {
  createEvidenceImageService,
  type ImagePickerModule,
} from "../evidence-image-service";

function createMockImagePicker(
  overrides: Partial<ImagePickerModule> = {},
): ImagePickerModule {
  return {
    requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({
      granted: true,
      status: ImagePicker.PermissionStatus.GRANTED,
      canAskAgain: true,
      expires: "never",
    }),
    requestCameraPermissionsAsync: jest.fn().mockResolvedValue({
      granted: true,
      status: ImagePicker.PermissionStatus.GRANTED,
      canAskAgain: true,
      expires: "never",
    }),
    launchImageLibraryAsync: jest.fn().mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///data/cache/proof.jpg",
          fileName: "proof.jpg",
          fileSize: 1048576,
          mimeType: "image/jpeg",
          width: 1920,
          height: 1080,
        },
      ],
    }),
    launchCameraAsync: jest.fn().mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///data/cache/cam.png",
          fileName: "cam.png",
          fileSize: 2097152,
          mimeType: "image/png",
          width: 1280,
          height: 720,
        },
      ],
    }),
    ...overrides,
  };
}

describe("evidence-image-service", () => {
  describe("pickImageFromLibrary", () => {
    it("returns processed image asset when user selects a photo", async () => {
      const mockPicker = createMockImagePicker();
      const service = createEvidenceImageService(mockPicker);

      const result = await service.pickImageFromLibrary();

      expect(mockPicker.requestMediaLibraryPermissionsAsync).toHaveBeenCalled();
      expect(mockPicker.launchImageLibraryAsync).toHaveBeenCalledWith({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
        exif: false,
      });
      expect(result).not.toBeNull();
      expect(result?.fileName).toBe("proof.jpg");
      expect(result?.mimeType).toBe("image/jpeg");
      expect(result?.fileSize).toBe(1048576);
    });

    it("returns null when user cancels selection", async () => {
      const mockPicker = createMockImagePicker({
        launchImageLibraryAsync: jest.fn().mockResolvedValue({
          canceled: true,
          assets: null,
        }),
      });
      const service = createEvidenceImageService(mockPicker);

      const result = await service.pickImageFromLibrary();
      expect(result).toBeNull();
    });

    it("throws error when library permission is denied", async () => {
      const mockPicker = createMockImagePicker({
        requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({
          granted: false,
          status: ImagePicker.PermissionStatus.DENIED,
          canAskAgain: false,
          expires: "never",
        }),
      });
      const service = createEvidenceImageService(mockPicker);

      await expect(service.pickImageFromLibrary()).rejects.toThrow(
        "Photo library permission is required to attach evidence.",
      );
    });

    it("throws error when selected photo exceeds 5 MB limit", async () => {
      const mockPicker = createMockImagePicker({
        launchImageLibraryAsync: jest.fn().mockResolvedValue({
          canceled: false,
          assets: [
            {
              uri: "file:///data/cache/huge.jpg",
              fileName: "huge.jpg",
              fileSize: 6000000,
              mimeType: "image/jpeg",
              width: 4000,
              height: 3000,
            },
          ],
        }),
      });
      const service = createEvidenceImageService(mockPicker);

      await expect(service.pickImageFromLibrary()).rejects.toThrow(
        "Photo exceeds the 5 MB limit",
      );
    });
  });

  describe("captureImageFromCamera", () => {
    it("returns processed image asset when user captures a photo", async () => {
      const mockPicker = createMockImagePicker();
      const service = createEvidenceImageService(mockPicker);

      const result = await service.captureImageFromCamera();

      expect(mockPicker.requestCameraPermissionsAsync).toHaveBeenCalled();
      expect(mockPicker.launchCameraAsync).toHaveBeenCalledWith({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
        exif: false,
      });
      expect(result).not.toBeNull();
      expect(result?.fileName).toBe("cam.png");
      expect(result?.mimeType).toBe("image/png");
    });

    it("throws error when camera permission is denied", async () => {
      const mockPicker = createMockImagePicker({
        requestCameraPermissionsAsync: jest.fn().mockResolvedValue({
          granted: false,
          status: ImagePicker.PermissionStatus.DENIED,
          canAskAgain: false,
          expires: "never",
        }),
      });
      const service = createEvidenceImageService(mockPicker);

      await expect(service.captureImageFromCamera()).rejects.toThrow(
        "Camera permission is required to capture evidence.",
      );
    });
  });
});
