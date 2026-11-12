import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { readSupabasePublicConfig } from "@/lib/supabase/config";
import { authCookieOptions } from "@/lib/supabase/server";

export async function proxy(request: NextRequest) {
  const settings = readSupabasePublicConfig();
  let response = NextResponse.next({ request });
  if (!settings) return response;

  const supabase = createServerClient(settings.url, settings.publishableKey, {
    cookieOptions: authCookieOptions,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(updates) {
        for (const { name, value } of updates) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of updates)
          response.cookies.set(name, value, options);
      },
    },
  });

  await supabase.auth.getClaims();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = { matcher: ["/painel", "/nova-senha"] };
