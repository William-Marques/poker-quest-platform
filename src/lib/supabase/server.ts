import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  openVerifier,
  sealVerifier,
  validRecoverySecret,
} from "@/lib/auth/recovery-proof";
import { readSupabasePublicConfig } from "./config";

export const authCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function supabaseServer(readOnly = false) {
  const config = readSupabasePublicConfig();
  if (!config) return null;
  const jar = await cookies();
  const secret = process.env.POKER_QUEST_RECOVERY_SECRET ?? "";
  const isVerifier = (name: string) => /-code-verifier(?:\.\d+)?$/.test(name);

  return createServerClient(config.url, config.publishableKey, {
    cookieOptions: authCookieOptions,
    cookies: {
      getAll: () =>
        jar.getAll().map(({ name, value }) => ({
          name,
          value:
            validRecoverySecret(secret) && isVerifier(name)
              ? openVerifier(name, value, secret)
              : value,
        })),
      setAll: (updates) => {
        if (readOnly) return;
        for (const { name, value, options } of updates)
          jar.set(
            name,
            value && validRecoverySecret(secret) && isVerifier(name)
              ? sealVerifier(name, value, secret)
              : value,
            options,
          );
      },
    },
  });
}
