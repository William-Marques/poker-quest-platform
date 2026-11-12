import assert from "node:assert/strict";
import test from "node:test";
import {
  emailFrom,
  passwordError,
  usernameFrom,
} from "../src/lib/auth/validation.ts";

test("normaliza nomes para a chave única e rejeita nomes fora do formato SQL", () => {
  assert.equal(usernameFrom(" Jogador_1 "), "jogador_1");
  for (const value of ["aa", "João", "a b", "a".repeat(25), null]) {
    assert.equal(usernameFrom(value), null);
  }
});

test("valida endereço de e-mail antes de chamar o provedor", () => {
  assert.equal(emailFrom(" PESSOA@example.com "), "pessoa@example.com");
  assert.equal(emailFrom("pessoa@@example.com"), null);
});

test("valida confirmação, comprimento mínimo e máximo em bytes", () => {
  assert.equal(passwordError("senha válida", "senha válida"), null);
  assert.ok(passwordError("senha válida", "outra senha"));
  assert.ok(passwordError("curta", "curta"));
  assert.equal(passwordError("é".repeat(36), "é".repeat(36)), null);
  assert.ok(passwordError("é".repeat(37), "é".repeat(37)));
});
