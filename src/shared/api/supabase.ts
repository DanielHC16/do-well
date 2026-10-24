import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../types/database.generated";
import { readPublicEnv, type PublicEnv } from "../config/public-env";
import { installSupabaseWebCrypto } from "../crypto/supabase-web-crypto";
import { createAuthStorage } from "../persistence/auth-storage";

installSupabaseWebCrypto();

export function createAppSupabaseClient(
  config: PublicEnv,
): SupabaseClient<Database> {
  return createClient<Database>(
    config.supabaseUrl,
    config.supabasePublishableKey,
    {
      auth: {
        storage: createAuthStorage(AsyncStorage),
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    },
  );
}

let client: SupabaseClient<Database> | undefined;

export function getSupabaseClient(): SupabaseClient<Database> {
  client ??= createAppSupabaseClient(readPublicEnv());
  return client;
}
