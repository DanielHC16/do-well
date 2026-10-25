import {
  type PropsWithChildren,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { setupTheme } from "@/features/setup/setupTheme";

import { shellModeStore, type ShellModeStore } from "../data/shell-mode-store";
import type { ShellMode } from "../model/shell-mode";
import { ShellModeContext, type ShellModeContextValue } from "./useShellMode";

const loadErrorMessage = "Your workspace preference is unavailable.";
const saveErrorMessage = "Your workspace preference could not be saved.";

type ShellModeProviderProps = PropsWithChildren<{
  userId: string;
  store?: ShellModeStore;
}>;

export function ShellModeProvider({
  children,
  store = shellModeStore,
  userId,
}: ShellModeProviderProps) {
  const [mode, setMode] = useState<ShellMode | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(true);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    busyRef.current = true;
    if (mountedRef.current) {
      setBusy(true);
      setError(null);
    }
    try {
      const storedMode = await store.read(userId);
      if (mountedRef.current) setMode(storedMode);
    } catch {
      if (mountedRef.current) {
        setMode(null);
        setError(loadErrorMessage);
      }
    } finally {
      busyRef.current = false;
      if (mountedRef.current) setBusy(false);
    }
  }, [store, userId]);

  useEffect(() => {
    mountedRef.current = true;
    void Promise.resolve().then(load);
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  const switchMode = useCallback(
    async (nextMode: ShellMode): Promise<boolean> => {
      if (busyRef.current || mode === null || nextMode === mode) return false;

      busyRef.current = true;
      if (mountedRef.current) {
        setBusy(true);
        setError(null);
      }
      try {
        await store.save(userId, nextMode);
        if (mountedRef.current) setMode(nextMode);
        return true;
      } catch {
        if (mountedRef.current) setError(saveErrorMessage);
        return false;
      } finally {
        busyRef.current = false;
        if (mountedRef.current) setBusy(false);
      }
    },
    [mode, store, userId],
  );

  if (mode === null) {
    return <ShellModeBoundary busy={busy} error={error} onRetry={load} />;
  }

  const value: ShellModeContextValue = {
    mode,
    busy,
    error,
    switchMode,
    retry: load,
  };

  return (
    <ShellModeContext.Provider value={value}>
      {children}
    </ShellModeContext.Provider>
  );
}

function ShellModeBoundary({
  busy,
  error,
  onRetry,
}: Readonly<{
  busy: boolean;
  error: string | null;
  onRetry: () => Promise<void>;
}>) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.boundaryCard}>
        <Text style={styles.kicker}>DO / WELL · NEIGHBORHOOD WORK</Text>
        <Text accessibilityRole="header" style={styles.title}>
          {busy ? "Opening your workspace" : "Workspace paused"}
        </Text>
        {busy ? (
          <View accessibilityLiveRegion="polite" style={styles.loadingRow}>
            <ActivityIndicator color={setupTheme.color.foreground} />
            <Text style={styles.message}>Loading your preferred view...</Text>
          </View>
        ) : (
          <>
            <Text accessibilityRole="alert" style={styles.message}>
              {error ?? loadErrorMessage}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void onRetry()}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    alignItems: "center",
    backgroundColor: setupTheme.color.background,
    flex: 1,
    justifyContent: "center",
    padding: setupTheme.spacing.section,
  },
  boundaryCard: {
    ...setupTheme.shadow.card,
    backgroundColor: setupTheme.color.surface,
    borderColor: setupTheme.color.border,
    borderRadius: setupTheme.radius.card,
    borderWidth: 2,
    gap: setupTheme.spacing.section,
    maxWidth: 520,
    padding: setupTheme.spacing.content,
    width: "100%",
  },
  kicker: {
    color: setupTheme.color.accent,
    fontSize: setupTheme.type.label,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  title: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.title,
    fontWeight: "900",
  },
  loadingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: setupTheme.spacing.compact,
  },
  message: {
    color: setupTheme.color.muted,
    fontSize: setupTheme.type.body,
    lineHeight: 24,
  },
  retryButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: setupTheme.color.highlight,
    borderColor: setupTheme.color.foreground,
    borderRadius: setupTheme.radius.control,
    borderWidth: 2,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: setupTheme.spacing.section,
  },
  retryText: {
    color: setupTheme.color.foreground,
    fontSize: setupTheme.type.body,
    fontWeight: "800",
  },
});
