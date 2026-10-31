import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import type { LoadErrorKind } from "@/shared/api/load-error";

import type {
  ConnectivityService,
  NetworkState,
} from "../model/connectivity-types";
import { connectivityService as defaultService } from "../services/connectivity-service";

export interface ConnectivityContextValue {
  networkState: NetworkState;
  isOffline: boolean;
  refreshNetworkState: () => Promise<void>;
  /**
   * Screens report read outcomes so a failed request can mark the app offline when
   * the OS still claims reachability (seen on Android emulators with broken DNS).
   */
  reportRequestOutcome: (outcome: "ok" | LoadErrorKind) => void;
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

  const [requestFailed, setRequestFailed] = useState(false);

  const reportRequestOutcome = useCallback((outcome: "ok" | LoadErrorKind) => {
    if (outcome === "ok") setRequestFailed(false);
    else if (outcome === "offline") setRequestFailed(true);
  }, []);

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
        // A fresh OS network event supersedes the last request failure.
        setRequestFailed(false);
        setNetworkState(state);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [service]);

  const isOffline =
    requestFailed ||
    !networkState.isConnected ||
    !networkState.isInternetReachable;

  return (
    <ConnectivityContext.Provider
      value={{
        networkState,
        isOffline,
        refreshNetworkState,
        reportRequestOutcome,
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
  reportRequestOutcome: () => undefined,
};

export function useConnectivity(): ConnectivityContextValue {
  const context = useContext(ConnectivityContext);
  return context ?? defaultConnectivityValue;
}
