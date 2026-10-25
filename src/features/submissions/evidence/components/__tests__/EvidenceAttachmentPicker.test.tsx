import { fireEvent, render, waitFor } from "@testing-library/react-native";

import type { SelectedEvidenceImage } from "../../../model/submission-schemas";
import type { EvidenceImageService } from "../../services/evidence-image-service";
import { EvidenceAttachmentPicker } from "../EvidenceAttachmentPicker";

function createMockService(
  overrides: Partial<EvidenceImageService> = {},
): EvidenceImageService {
  return {
    pickImageFromLibrary: jest.fn().mockResolvedValue({
      uri: "file:///data/cache/picked.jpg",
      fileName: "picked.jpg",
      fileSize: 1048576,
      mimeType: "image/jpeg",
      width: 1920,
      height: 1080,
    }),
    captureImageFromCamera: jest.fn().mockResolvedValue({
      uri: "file:///data/cache/captured.png",
      fileName: "captured.png",
      fileSize: 2097152,
      mimeType: "image/png",
      width: 1280,
      height: 720,
    }),
    ...overrides,
  };
}

describe("EvidenceAttachmentPicker", () => {
  it("renders empty state with selection buttons", async () => {
    const onAdd = jest.fn();
    const onRemove = jest.fn();
    const view = await render(
      <EvidenceAttachmentPicker
        onAddImage={onAdd}
        onRemoveImage={onRemove}
        selectedImages={[]}
      />,
    );

    expect(view.getByText("PHOTO EVIDENCE (0/3)")).toBeTruthy();
    expect(view.getByText("+ Select Photo")).toBeTruthy();
    expect(view.getByText("Take Photo")).toBeTruthy();
  });

  it("calls onAddImage when selecting from gallery", async () => {
    const onAdd = jest.fn();
    const onRemove = jest.fn();
    const service = createMockService();

    const view = await render(
      <EvidenceAttachmentPicker
        onAddImage={onAdd}
        onRemoveImage={onRemove}
        selectedImages={[]}
        service={service}
      />,
    );

    await fireEvent.press(view.getByText("+ Select Photo"));

    await waitFor(() => {
      expect(service.pickImageFromLibrary).toHaveBeenCalledTimes(1);
      expect(onAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          fileName: "picked.jpg",
        }),
      );
    });
  });

  it("calls onAddImage when capturing from camera", async () => {
    const onAdd = jest.fn();
    const onRemove = jest.fn();
    const service = createMockService();

    const view = await render(
      <EvidenceAttachmentPicker
        onAddImage={onAdd}
        onRemoveImage={onRemove}
        selectedImages={[]}
        service={service}
      />,
    );

    await fireEvent.press(view.getByText("Take Photo"));

    await waitFor(() => {
      expect(service.captureImageFromCamera).toHaveBeenCalledTimes(1);
      expect(onAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          fileName: "captured.png",
        }),
      );
    });
  });

  it("renders previews for attached images and allows removal", async () => {
    const onAdd = jest.fn();
    const onRemove = jest.fn();
    const sampleImages: SelectedEvidenceImage[] = [
      {
        uri: "file:///data/cache/work1.jpg",
        fileName: "work1.jpg",
        fileSize: 1048576,
        mimeType: "image/jpeg",
        width: 1920,
        height: 1080,
      },
    ];

    const view = await render(
      <EvidenceAttachmentPicker
        onAddImage={onAdd}
        onRemoveImage={onRemove}
        selectedImages={sampleImages}
      />,
    );

    expect(view.getByText("PHOTO EVIDENCE (1/3)")).toBeTruthy();
    expect(view.getByText("work1.jpg")).toBeTruthy();
    expect(view.getByText(/1\.0 MB/)).toBeTruthy();

    await fireEvent.press(view.getByText("Remove"));
    expect(onRemove).toHaveBeenCalledWith(0);
  });

  it("displays error message when selection throws", async () => {
    const onAdd = jest.fn();
    const onRemove = jest.fn();
    const service = createMockService({
      pickImageFromLibrary: jest
        .fn()
        .mockRejectedValue(new Error("Permission denied by user")),
    });

    const view = await render(
      <EvidenceAttachmentPicker
        onAddImage={onAdd}
        onRemoveImage={onRemove}
        selectedImages={[]}
        service={service}
      />,
    );

    await fireEvent.press(view.getByText("+ Select Photo"));

    await waitFor(() => {
      expect(view.getByText("Permission denied by user")).toBeTruthy();
    });
  });
});
