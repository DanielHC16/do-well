import * as Network from "expo-network";

import type {
  ConnectivityService,
  NetworkConnectionType,
  NetworkState,
} from "../model/connectivity-types";

function mapConnectionType(
  type?: Network.NetworkStateType | string,
): NetworkConnectionType {
  if (!type) return "unknown";
  switch (type) {
    case Network.NetworkStateType.WIFI:
    case "WIFI":
      return "wifi";
    case Network.NetworkStateType.CELLULAR:
    case "CELLULAR":
      return "cellular";
    case Network.NetworkStateType.NONE:
    case "NONE":
      return "none";
    default:
      return "unknown";
  }
}

export interface NetworkModuleAdapter {
  getNetworkStateAsync(): Promise<Network.NetworkState>;
  addNetworkStateListener?: (
    listener: (event: Network.NetworkStateEvent) => void,
  ) => { remove: () => void };
}

export function createConnectivityService(
  networkModule: NetworkModuleAdapter = Network,
): ConnectivityService {
  return {
    async getNetworkState(): Promise<NetworkState> {
      try {
        const state = await networkModule.getNetworkStateAsync();
        return {
          isConnected: state.isConnected ?? false,
          isInternetReachable:
            state.isInternetReachable ?? state.isConnected ?? false,
          connectionType: mapConnectionType(state.type),
          checkedAt: new Date().toISOString(),
        };
      } catch {
        return {
          isConnected: false,
          isInternetReachable: false,
          connectionType: "none",
          checkedAt: new Date().toISOString(),
        };
      }
    },

    addNetworkStateListener(
      listener: (state: NetworkState) => void,
    ): () => void {
      try {
        if (typeof networkModule.addNetworkStateListener === "function") {
          const subscription = networkModule.addNetworkStateListener(
            (event) => {
              listener({
                isConnected: event.isConnected ?? false,
                isInternetReachable:
                  event.isInternetReachable ?? event.isConnected ?? false,
                connectionType: mapConnectionType(event.type),
                checkedAt: new Date().toISOString(),
              });
            },
          );
          return () => {
            if (typeof subscription?.remove === "function") {
              subscription.remove();
            }
          };
        }
      } catch {
        // Fall back gracefully when native listener fails
      }
      return () => {};
    },
  };
}

export const connectivityService = createConnectivityService();
