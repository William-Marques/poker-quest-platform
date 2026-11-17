export function authEmailRedirect(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const development = env.NODE_ENV === "development";
  const value =
    env.POKER_QUEST_SITE_URL?.trim() ||
    (development ? "http://localhost:3000" : "");
  const url = URL.parse(value);
  if (
    !url ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    return null;
  }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    loopback
      ? !development || !["http:", "https:"].includes(url.protocol)
      : url.protocol !== "https:"
  ) {
    return null;
  }
  return new URL("/auth/confirmar", url.origin).href;
}
