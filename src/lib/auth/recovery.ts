import "server-only";

import { cookies } from "next/headers";
import { authCookieOptions } from "@/lib/supabase/server";
import { signRecovery, verifyRecovery } from "./recovery-proof";

const name = "poker-quest-recovery";

export async function recoverySession() {
  return verifyRecovery(
    (await cookies()).get(name)?.value ?? "",
    process.env.POKER_QUEST_RECOVERY_SECRET ?? "",
  );
}

export async function setRecoverySession(session: string | null) {
  const proof = session
    ? signRecovery(session, process.env.POKER_QUEST_RECOVERY_SECRET ?? "")
    : null;
  (await cookies()).set(name, proof ?? "", {
    ...authCookieOptions,
    maxAge: proof ? 600 : 0,
  });
  return proof !== null;
}
