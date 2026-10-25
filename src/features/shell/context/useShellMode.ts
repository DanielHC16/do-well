import { createContext, useContext } from "react";

import type { ShellMode } from "../model/shell-mode";

export type ShellModeContextValue = Readonly<{
  mode: ShellMode;
  busy: boolean;
  error: string | null;
  switchMode: (mode: ShellMode) => Promise<boolean>;
  retry: () => Promise<void>;
}>;

export const ShellModeContext = createContext<ShellModeContextValue | null>(
  null,
);

export function useShellMode(): ShellModeContextValue {
  const value = useContext(ShellModeContext);
  if (!value) {
    throw new Error("useShellMode must be used within ShellModeProvider.");
  }
  return value;
}
