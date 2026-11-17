import { createHmac, timingSafeEqual } from "node:crypto";

export function validRecoverySecret(secret: string) {
  return /^[!-~]{32,}$/.test(secret) && new Set(secret).size >= 8;
}

export function sealVerifier(name: string, value: string, secret: string) {
  const mac = createHmac("sha256", secret)
    .update(JSON.stringify([name, value]))
    .digest("hex");
  return `${mac}.${value}`;
}

export function openVerifier(name: string, sealed: string, secret: string) {
  if (!/^[a-f0-9]{64}\./.test(sealed)) return "";
  const value = sealed.slice(65);
  const expected = sealVerifier(name, value, secret);
  return timingSafeEqual(
    Buffer.from(sealed.slice(0, 64), "hex"),
    Buffer.from(expected.slice(0, 64), "hex"),
  )
    ? value
    : "";
}

export function signRecovery(
  session: string,
  secret: string,
  now = Date.now(),
) {
  if (!validRecoverySecret(secret)) return null;
  const payload = `${session}.${now + 600_000}`;
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("hex")}`;
}

export function verifyRecovery(
  value: string,
  secret: string,
  now = Date.now(),
) {
  const [session, expiry, signature, extra] = value.split(".");
  const expiresAt = Number(expiry);
  if (
    !session ||
    extra !== undefined ||
    !Number.isSafeInteger(expiresAt) ||
    expiresAt <= now ||
    expiresAt > now + 600_000 ||
    !/^[a-f0-9]{64}$/.test(signature ?? "")
  )
    return undefined;
  const expected = signRecovery(session, secret, expiresAt - 600_000)?.split(
    ".",
  )[2];
  if (
    !expected ||
    !timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expected, "hex"),
    )
  )
    return undefined;
  return session;
}
