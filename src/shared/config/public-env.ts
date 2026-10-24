import { z } from "zod";

const invalidConfigurationMessage =
  "Public application configuration is invalid";

const publicEnvSchema = z
  .object({
    EXPO_PUBLIC_SUPABASE_URL: z.string().trim().min(1),
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
      .string()
      .trim()
      .regex(
        /^(?:sb_publishable_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/,
      ),
  })
  .strict();

export type PublicEnv = Readonly<{
  supabaseUrl: string;
  supabasePublishableKey: string;
}>;

type ParseOptions = Readonly<{
  allowLocalDevelopment: boolean;
}>;

function isAllowedSupabaseOrigin(
  value: string,
  allowLocalDevelopment: boolean,
): boolean {
  try {
    const url = new URL(value);
    const hasOnlyOrigin =
      url.username === "" &&
      url.password === "" &&
      url.pathname === "/" &&
      url.search === "" &&
      url.hash === "";

    if (!hasOnlyOrigin) {
      return false;
    }

    if (allowLocalDevelopment && url.origin === "http://127.0.0.1:55321") {
      return true;
    }

    return (
      url.protocol === "https:" &&
      url.port === "" &&
      /^[a-z0-9-]+\.supabase\.co$/i.test(url.hostname)
    );
  } catch {
    return false;
  }
}

export function parsePublicEnv(
  input: Readonly<Record<string, unknown>>,
  options: ParseOptions,
): PublicEnv {
  const parsed = publicEnvSchema.safeParse(input);

  if (
    !parsed.success ||
    !isAllowedSupabaseOrigin(
      parsed.data.EXPO_PUBLIC_SUPABASE_URL,
      options.allowLocalDevelopment,
    )
  ) {
    throw new Error(invalidConfigurationMessage);
  }

  return Object.freeze({
    supabaseUrl: parsed.data.EXPO_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: parsed.data.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}

export function readPublicEnv(): PublicEnv {
  return parsePublicEnv(
    {
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    },
    { allowLocalDevelopment: __DEV__ },
  );
}
