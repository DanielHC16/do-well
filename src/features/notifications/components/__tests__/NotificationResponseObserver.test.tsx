import { render, waitFor } from "@testing-library/react-native";

import type { NotificationService } from "../../services/notification-service";
import { NotificationResponseObserver } from "../NotificationResponseObserver";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

function createService(
  overrides: Partial<NotificationService> = {},
): NotificationService {
  return {
    requestPermissions: jest.fn(async () => true),
    checkPermissions: jest.fn(async () => true),
    configureChannels: jest.fn(async () => undefined),
    scheduleNotification: jest.fn(async () => "notification-id"),
    cancelAllNotifications: jest.fn(async () => undefined),
    configureForegroundPresentation: jest.fn(),
    subscribeToResponses: jest.fn(() => () => undefined),
    getLastResponseTarget: jest.fn(async () => null),
    clearLastResponse: jest.fn(async () => undefined),
    ...overrides,
  };
}

describe("NotificationResponseObserver", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("opens and clears an allowlisted cold-start response", async () => {
    const route =
      "/(protected)/worker/assignments/90000000-0000-4000-8000-000000000001";
    const service = createService({
      getLastResponseTarget: jest.fn(async () => ({
        id: "notification-id",
        route,
      })),
    });

    await render(<NotificationResponseObserver service={service} />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(route);
      expect(service.clearLastResponse).toHaveBeenCalledTimes(1);
    });
  });

  it("catches cold-start lookup errors and still clears stale native state", async () => {
    const service = createService({
      getLastResponseTarget: jest.fn(async () => {
        throw new Error("native lookup unavailable");
      }),
    });

    await render(<NotificationResponseObserver service={service} />);

    await waitFor(() => {
      expect(service.clearLastResponse).toHaveBeenCalledTimes(1);
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("clears native response state after a foreground notification tap", async () => {
    const route =
      "/(protected)/employer/assignments/90000000-0000-4000-8000-000000000001";
    let responseListener:
      ((target: { id: string; route: string }) => void) | undefined;
    const service = createService({
      subscribeToResponses: jest.fn((listener) => {
        responseListener = listener;
        return () => undefined;
      }),
    });

    await render(<NotificationResponseObserver service={service} />);
    await waitFor(() => {
      expect(service.clearLastResponse).toHaveBeenCalledTimes(1);
    });

    responseListener?.({ id: "foreground-id", route });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(route);
      expect(service.clearLastResponse).toHaveBeenCalledTimes(2);
    });
  });
});
