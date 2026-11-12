import { cookies } from "next/headers";
import { authCookieOptions } from "@/lib/supabase/server";

const name = "poker-quest-recovery";

export async function recoverySession() {
  return (await cookies()).get(name)?.value;
}

export async function setRecoverySession(session: string | null) {
  (await cookies()).set(name, session ?? "", {
    ...authCookieOptions,
    maxAge: session ? 600 : 0,
  });
}
