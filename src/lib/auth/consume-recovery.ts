import "server-only";

import { createClient } from "@supabase/supabase-js";
import { readSupabasePublicConfig } from "../supabase/config";

export async function consumeRecovery(session: string): Promise<boolean> {
  const config = readSupabasePublicConfig();
  const key = process.env.POKER_QUEST_SUPABASE_SERVER_KEY?.trim();
  if (!config || !key) return false;

  try {
    const client = createClient(config.url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.rpc("consume_recovery_authorization", {
      recovery_session_id: session,
    });
    return !error && data === true;
  } catch {
    return false;
  }
}
