export type SupabasePublicConfig = {
  url: string;
  publishableKey: string;
};

export function readSupabasePublicConfig(
  env: NodeJS.ProcessEnv = process.env,
): SupabasePublicConfig | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url && !publishableKey) return null;

  if (
    !url ||
    !publishableKey ||
    !/^sb_publishable_[\w-]+$/.test(publishableKey)
  ) {
    throw new Error("Informe a URL e uma chave publicável do Supabase.");
  }

  const parsed = URL.parse(url);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(
    parsed?.hostname ?? "",
  );
  if (
    !parsed ||
    (parsed.protocol !== "https:" && !(local && parsed.protocol === "http:")) ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error("Use a origem HTTPS do Supabase ou HTTP em loopback.");
  }

  return { url: parsed.origin, publishableKey };
}
