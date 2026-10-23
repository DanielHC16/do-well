import { createClient } from "@supabase/supabase-js";

import { createAppSupabaseClient, getSupabaseClient } from "../supabase";

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({ auth: {} })),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe("Supabase client", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_SUPABASE_URL = "http://127.0.0.1:55321";
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      "sb_publishable_test-value";
  });

  it("uses the required React Native PKCE and persistence options", () => {
    createAppSupabaseClient({
      supabaseUrl: "https://project-ref.supabase.co",
      supabasePublishableKey: "sb_publishable_test-value",
    });

    expect(createClient).toHaveBeenCalledWith(
      "https://project-ref.supabase.co",
      "sb_publishable_test-value",
      expect.objectContaining({
        auth: expect.objectContaining({
          flowType: "pkce",
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          storage: expect.objectContaining({
            getItem: expect.any(Function),
            setItem: expect.any(Function),
            removeItem: expect.any(Function),
          }),
        }),
      }),
    );
  });

  it("returns one client instance", () => {
    expect(getSupabaseClient()).toBe(getSupabaseClient());
    expect(createClient).toHaveBeenCalledTimes(1);
  });
});
