import assert from "node:assert/strict";
import test from "node:test";
import { authEmailRedirect } from "../src/lib/auth/redirect.ts";

test("usa o callback local por padrão somente em desenvolvimento", () => {
  assert.equal(
    authEmailRedirect({ NODE_ENV: "development" }),
    "http://localhost:3000/auth/confirmar",
  );
  assert.equal(authEmailRedirect({ NODE_ENV: "production" }), null);
});

test("constrói o callback a partir da origem pública configurada", () => {
  assert.equal(
    authEmailRedirect({
      NODE_ENV: "production",
      POKER_QUEST_SITE_URL: "https://example.netlify.app/",
    }),
    "https://example.netlify.app/auth/confirmar",
  );
});

test("rejeita destinos inseguros ou com componentes extras em produção", () => {
  for (const value of [
    "http://localhost:3000",
    "https://127.0.0.1",
    "http://example.com",
    "https://user@example.com",
    "https://example.com/path",
    "https://example.com/?next=/",
    "https://example.com/#token",
  ]) {
    assert.equal(
      authEmailRedirect({
        NODE_ENV: "production",
        POKER_QUEST_SITE_URL: value,
      }),
      null,
    );
  }
});
