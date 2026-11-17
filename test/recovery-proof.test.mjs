import assert from "node:assert/strict";
import test from "node:test";
import {
  signRecovery,
  verifyRecovery,
} from "../src/lib/auth/recovery-proof.ts";

const key = "0123456789abcdef".repeat(2);

test("a autorização de recuperação é vinculada à sessão e vence em dez minutos", () => {
  const proof = signRecovery("recovery-session", key, 1000);
  assert.equal(verifyRecovery(proof, key, 2000), "recovery-session");
  assert.notEqual(verifyRecovery(proof, key, 2000), "normal-session");
  assert.equal(verifyRecovery(proof, key, 601000), undefined);
});

test("rejeita sessão comum, autorização adulterada e segredo ausente", () => {
  const proof = signRecovery("recovery-session", key, 1000);
  assert.equal(verifyRecovery("normal-session", key, 2000), undefined);
  assert.equal(
    verifyRecovery(
      proof.replace("recovery-session", "normal-session"),
      key,
      2000,
    ),
    undefined,
  );
  assert.equal(verifyRecovery(proof, "", 2000), undefined);
});
