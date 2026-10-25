export type NetworkConnectionType = "wifi" | "cellular" | "none" | "unknown";

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean;
  connectionType: NetworkConnectionType;
  checkedAt: string;
}

export interface ConnectivityService {
  getNetworkState(): Promise<NetworkState>;
  addNetworkStateListener(listener: (state: NetworkState) => void): () => void;
}
