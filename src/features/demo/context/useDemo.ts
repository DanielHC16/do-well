import { createContext, useContext } from "react";

import type { DemoState } from "../model/demo-schema";

export type CreateDemoGigInput = Readonly<{
  title: string;
  description: string;
  category: string;
  workMode: "onsite" | "remote";
  publicArea: string | null;
  budgetAmount: number;
}>;

export type DemoContextValue = Readonly<{
  state: DemoState;
  busy: boolean;
  error: string | null;
  switchPersona: (role: "employer" | "worker") => Promise<boolean>;
  createGig: (input: CreateDemoGigInput) => Promise<boolean>;
  applyToGig: (gigId: string, message: string) => Promise<boolean>;
  selectApplication: (applicationId: string) => Promise<boolean>;
  submitAssignment: (assignmentId: string, note: string) => Promise<boolean>;
  approveAssignment: (assignmentId: string) => Promise<boolean>;
  reset: () => Promise<boolean>;
}>;

export const DemoContext = createContext<DemoContextValue | null>(null);

export function useDemo(): DemoContextValue {
  const value = useContext(DemoContext);
  if (!value) {
    throw new Error("useDemo must be used within DemoProvider");
  }
  return value;
}
