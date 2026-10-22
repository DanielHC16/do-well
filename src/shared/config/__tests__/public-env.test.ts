import { parsePublicEnv } from "../public-env";

const validHostedEnv = {
  EXPO_PUBLIC_SUPABASE_URL: "https://project-ref.supabase.co",
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
};

describe("public environment configuration", () => {
  it("requires both Supabase public values", () => {
    expect(() =>
      parsePublicEnv(
        { ...validHostedEnv, EXPO_PUBLIC_SUPABASE_URL: undefined },
        { allowLocalDevelopment: false },
      ),
    ).toThrow("Public application configuration is invalid");
  });

  it("rejects secret-shaped public variable names", () => {
    expect(() =>
      parsePublicEnv(
        {
          ...validHostedEnv,
          EXPO_PUBLIC_SUPABASE_SECRET_KEY: "redacted",
        },
        { allowLocalDevelopment: false },
      ),
    ).toThrow("Public application configuration is invalid");
  });

  it("rejects non-HTTPS hosted Supabase origins", () => {
    expect(() =>
      parsePublicEnv(
        {
          ...validHostedEnv,
          EXPO_PUBLIC_SUPABASE_URL: "http://project-ref.supabase.co",
        },
        { allowLocalDevelopment: false },
      ),
    ).toThrow("Public application configuration is invalid");
  });

  it("rejects unrelated HTTPS hosts", () => {
    expect(() =>
      parsePublicEnv(
        {
          ...validHostedEnv,
          EXPO_PUBLIC_SUPABASE_URL: "https://example.com",
        },
        { allowLocalDevelopment: false },
      ),
    ).toThrow("Public application configuration is invalid");
  });

  it("accepts a hosted Supabase origin", () => {
    expect(
      parsePublicEnv(validHostedEnv, { allowLocalDevelopment: false }),
    ).toEqual({
      supabaseUrl: "https://project-ref.supabase.co",
      supabasePublishableKey: "sb_publishable_example",
    });
  });

  it("allows only the isolated loopback API during local development", () => {
    expect(
      parsePublicEnv(
        {
          ...validHostedEnv,
          EXPO_PUBLIC_SUPABASE_URL: "http://127.0.0.1:55321",
        },
        { allowLocalDevelopment: true },
      ),
    ).toEqual({
      supabaseUrl: "http://127.0.0.1:55321",
      supabasePublishableKey: "sb_publishable_example",
    });

    expect(() =>
      parsePublicEnv(
        {
          ...validHostedEnv,
          EXPO_PUBLIC_SUPABASE_URL: "http://localhost:55321",
        },
        { allowLocalDevelopment: true },
      ),
    ).toThrow("Public application configuration is invalid");
  });
});
