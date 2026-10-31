import { act, fireEvent, render } from "@testing-library/react-native";
import { Pressable, Text } from "react-native";

import type {
  ConnectivityService,
  NetworkState,
} from "../../model/connectivity-types";
import { ConnectivityProvider, useConnectivity } from "../ConnectivityProvider";

const online: NetworkState = {
  isConnected: true,
  isInternetReachable: true,
  connectionType: "wifi",
  checkedAt: "2026-10-31T00:00:00.000Z",
};

function createService() {
  let emit: (state: NetworkState) => void = () => undefined;
  const service: ConnectivityService = {
    getNetworkState: jest.fn(async () => online),
    addNetworkStateListener: jest.fn((listener) => {
      emit = listener;
      return () => undefined;
    }),
  };
  return { service, emit: (state: NetworkState) => emit(state) };
}

function Probe() {
  const { isOffline, reportRequestOutcome } = useConnectivity();
  return (
    <>
      <Text>{isOffline ? "offline" : "online"}</Text>
      <Pressable onPress={() => reportRequestOutcome("offline")}>
        <Text>report offline</Text>
      </Pressable>
      <Pressable onPress={() => reportRequestOutcome("unauthorized")}>
        <Text>report unauthorized</Text>
      </Pressable>
      <Pressable onPress={() => reportRequestOutcome("ok")}>
        <Text>report ok</Text>
      </Pressable>
    </>
  );
}

describe("ConnectivityProvider request signal", () => {
  it("goes offline when a request fails with a network error even if the OS reports reachable", async () => {
    const { service } = createService();
    const view = await render(
      <ConnectivityProvider service={service} initialState={online}>
        <Probe />
      </ConnectivityProvider>,
    );
    expect(view.getByText("online")).toBeVisible();

    await fireEvent.press(view.getByText("report offline"));
    expect(view.getByText("offline")).toBeVisible();

    await fireEvent.press(view.getByText("report ok"));
    expect(view.getByText("online")).toBeVisible();
  });

  it("ignores non-network failures and clears the flag on a new OS network event", async () => {
    const { service, emit } = createService();
    const view = await render(
      <ConnectivityProvider service={service} initialState={online}>
        <Probe />
      </ConnectivityProvider>,
    );

    await fireEvent.press(view.getByText("report unauthorized"));
    expect(view.getByText("online")).toBeVisible();

    await fireEvent.press(view.getByText("report offline"));
    expect(view.getByText("offline")).toBeVisible();

    await act(async () => emit({ ...online, checkedAt: "later" }));
    expect(view.getByText("online")).toBeVisible();
  });
});
