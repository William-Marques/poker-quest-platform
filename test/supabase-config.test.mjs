import assert from "node:assert/strict";
import test from "node:test";
import { readSupabasePublicConfig } from "../src/lib/supabase/config.ts";

const key = "sb_publishable_exemplo";
const config = (url, publishableKey = key) =>
  readSupabasePublicConfig({
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
  });

test("permite iniciar sem Supabase", () => {
  assert.equal(readSupabasePublicConfig({}), null);
});

test("aceita projeto HTTPS e instância local", () => {
  for (const url of ["https://example.supabase.co", "http://127.0.0.1:54321"]) {
    assert.deepEqual(config(url), { url, publishableKey: key });
  }
});

test("rejeita configuração parcial e chave secreta sem incluí-la no erro", () => {
  assert.throws(() => config("https://example.supabase.co", ""), /publicável/);
  assert.throws(
    () => config("https://example.supabase.co", "sb_secret_exemplo"),
    { message: "Informe a URL e uma chave publicável do Supabase." },
  );
});

test("rejeita HTTP remoto e URL que não seja uma origem", () => {
  for (const url of [
    "http://example.supabase.co",
    "https://example.supabase.co/rest/v1",
    "https://user:pass@example.supabase.co",
  ]) {
    assert.throws(() => config(url), /origem HTTPS/);
  }
});
