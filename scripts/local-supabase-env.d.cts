export type LocalSupabaseEnvironment = Readonly<{
  apiUrl: string;
  publishableKey: string;
  serviceRoleKey: string;
}>;

export function loadLocalSupabaseEnvironment(): Promise<LocalSupabaseEnvironment>;
