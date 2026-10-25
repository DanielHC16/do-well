import { fireEvent, render } from "@testing-library/react-native";
import { Text } from "react-native";

import {
  ConnectivityProvider,
  useConnectivity,
} from "../../context/ConnectivityProvider";
import type { ConnectivityService } from "../../model/connectivity-types";
import { OfflineBanner } from "../OfflineBanner";

function TestConsumer() {
  const { isOffline, networkState } = useConnectivity();
  return (
    <Text testID="state-text">
      {isOffline ? "OFFLINE" : "ONLINE"} - {networkState.connectionType}
    </Text>
  );
}

describe("OfflineBanner and ConnectivityProvider", () => {
  it("renders offline banner when offline and triggers retry", async () => {
    const mockService: ConnectivityService = {
      getNetworkState: jest.fn(async () => ({
        isConnected: false,
        isInternetReachable: false,
        connectionType: "none" as const,
        checkedAt: "2026-10-25T10:00:00.000Z",
      })),
      addNetworkStateListener: jest.fn(() => () => {}),
    };

    const onRetry = jest.fn();

    const view = await render(
      <ConnectivityProvider
        initialState={{
          isConnected: false,
          isInternetReachable: false,
          connectionType: "none",
          checkedAt: "2026-10-25T10:00:00.000Z",
        }}
        service={mockService}
      >
        <OfflineBanner onRetry={onRetry} />
        <TestConsumer />
      </ConnectivityProvider>,
    );

    expect(view.getByText("OFFLINE MODE")).toBeVisible();
    expect(
      view.getByText(
        "Showing saved snapshot. Actions are drafted locally until reconnected.",
      ),
    ).toBeVisible();

    const retryBtn = view.getByText("RETRY");
    fireEvent.press(retryBtn);

    expect(mockService.getNetworkState).toHaveBeenCalled();
    expect(onRetry).toHaveBeenCalled();
  });

  it("does not render offline banner when online", async () => {
    const mockService: ConnectivityService = {
      getNetworkState: jest.fn(async () => ({
        isConnected: true,
        isInternetReachable: true,
        connectionType: "wifi" as const,
        checkedAt: "2026-10-25T10:00:00.000Z",
      })),
      addNetworkStateListener: jest.fn(() => () => {}),
    };

    const view = await render(
      <ConnectivityProvider
        initialState={{
          isConnected: true,
          isInternetReachable: true,
          connectionType: "wifi",
          checkedAt: "2026-10-25T10:00:00.000Z",
        }}
        service={mockService}
      >
        <OfflineBanner />
        <TestConsumer />
      </ConnectivityProvider>,
    );

    expect(view.queryByText("OFFLINE MODE")).toBeNull();
    expect(view.getByTestId("state-text")).toHaveTextContent("ONLINE - wifi");
  });
});
