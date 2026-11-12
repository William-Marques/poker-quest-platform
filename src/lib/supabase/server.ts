import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
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

  return createServerClient(config.url, config.publishableKey, {
    cookieOptions: authCookieOptions,
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (updates) => {
        if (readOnly) return;
        for (const { name, value, options } of updates)
          jar.set(name, value, options);
      },
    },
  });
}
