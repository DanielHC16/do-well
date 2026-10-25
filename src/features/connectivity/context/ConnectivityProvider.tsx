import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import type {
  ConnectivityService,
  NetworkState,
} from "../model/connectivity-types";
import { connectivityService as defaultService } from "../services/connectivity-service";

export interface ConnectivityContextValue {
  networkState: NetworkState;
  isOffline: boolean;
  refreshNetworkState: () => Promise<void>;
}

const ConnectivityContext = createContext<ConnectivityContextValue | null>(
  null,
);

export interface ConnectivityProviderProps {
  children: ReactNode;
  service?: ConnectivityService;
  initialState?: NetworkState;
}

export function ConnectivityProvider({
  children,
  service = defaultService,
  initialState,
}: ConnectivityProviderProps) {
  const [networkState, setNetworkState] = useState<NetworkState>(
    initialState ?? {
      isConnected: true,
      isInternetReachable: true,
      connectionType: "unknown",
      checkedAt: new Date().toISOString(),
    },
  );

  const refreshNetworkState = async () => {
    const next = await service.getNetworkState();
    setNetworkState(next);
  };

  useEffect(() => {
    let mounted = true;
    void service.getNetworkState().then((state) => {
      if (mounted) {
        setNetworkState(state);
      }
    });

    const unsubscribe = service.addNetworkStateListener((state) => {
      if (mounted) {
        setNetworkState(state);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [service]);

  const isOffline =
    !networkState.isConnected || !networkState.isInternetReachable;

  return (
    <ConnectivityContext.Provider
      value={{
        networkState,
        isOffline,
        refreshNetworkState,
      }}
    >
      {children}
    </ConnectivityContext.Provider>
  );
}

const defaultConnectivityValue: ConnectivityContextValue = {
  networkState: {
    isConnected: true,
    isInternetReachable: true,
    connectionType: "unknown",
    checkedAt: "",
  },
  isOffline: false,
  refreshNetworkState: async () => {},
};

export function useConnectivity(): ConnectivityContextValue {
  const context = useContext(ConnectivityContext);
  return context ?? defaultConnectivityValue;
}
