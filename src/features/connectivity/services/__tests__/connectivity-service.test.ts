import { createConnectivityService } from "../connectivity-service";

describe("connectivityService", () => {
  it("resolves online wifi network state", async () => {
    const mockModule = {
      getNetworkStateAsync: jest.fn(async () => ({
        isConnected: true,
        isInternetReachable: true,
        type: "WIFI" as const,
      })),
    };

    const service = createConnectivityService(mockModule as any);
    const state = await service.getNetworkState();

    expect(state.isConnected).toBe(true);
    expect(state.isInternetReachable).toBe(true);
    expect(state.connectionType).toBe("wifi");
    expect(state.checkedAt).toBeDefined();
  });

  it("resolves offline none network state", async () => {
    const mockModule = {
      getNetworkStateAsync: jest.fn(async () => ({
        isConnected: false,
        isInternetReachable: false,
        type: "NONE" as const,
      })),
    };

    const service = createConnectivityService(mockModule as any);
    const state = await service.getNetworkState();

    expect(state.isConnected).toBe(false);
    expect(state.isInternetReachable).toBe(false);
    expect(state.connectionType).toBe("none");
  });

  it("handles unexpected errors gracefully as offline", async () => {
    const mockModule = {
      getNetworkStateAsync: jest.fn(async () => {
        throw new Error("Native network module failed");
      }),
    };

    const service = createConnectivityService(mockModule as any);
    const state = await service.getNetworkState();

    expect(state.isConnected).toBe(false);
    expect(state.isInternetReachable).toBe(false);
    expect(state.connectionType).toBe("none");
  });

  it("registers listener and removes subscription on cleanup", () => {
    const removeSpy = jest.fn();
    let capturedListener: ((event: any) => void) | null = null;
    const mockModule = {
      getNetworkStateAsync: jest.fn(),
      addNetworkStateListener: jest.fn((listener: any) => {
        capturedListener = listener;
        return { remove: removeSpy };
      }),
    };

    const service = createConnectivityService(mockModule as any);
    const callback = jest.fn();
    const unsubscribe = service.addNetworkStateListener(callback);

    expect(mockModule.addNetworkStateListener).toHaveBeenCalled();

    // Trigger event
    capturedListener!({
      isConnected: true,
      isInternetReachable: false,
      type: "CELLULAR",
    });

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        isConnected: true,
        isInternetReachable: false,
        connectionType: "cellular",
      }),
    );

    unsubscribe();
    expect(removeSpy).toHaveBeenCalled();
  });
});
