import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";
import { copy } from "../src/lib/auth/pt-br.ts";
import {
  signRecovery,
  verifyRecovery,
} from "../src/lib/auth/recovery-proof.ts";

const cookieName = "poker-quest-recovery";
const sessionId = "test-session";
const secret = "synthetic-test-secret-0123456789abcdef";
const now = 1_700_000_000_000;
let auth;
let jar;

const cookies = async () => jar;
const supabaseServer = async () => ({ auth });
const authCookieOptions = { httpOnly: true };
const redirect = (destination) => {
  throw new Redirect(destination);
};
const revalidatePath = () => assert.fail("Unexpected revalidation");
const consumeRecovery = () =>
  assert.fail("Recovery consumption must not be reached");

class Redirect extends Error {
  constructor(destination) {
    super(destination);
    this.destination = destination;
  }
}

const stubs = new Map([
  ["next/cache", "revalidatePath"],
  ["next/navigation", "redirect"],
  ["next/headers", "cookies"],
  ["@/lib/supabase/server", "supabaseServer, authCookieOptions"],
  ["@/lib/auth/consume-recovery", "consumeRecovery"],
  ["server-only", ""],
]);

const bridge = Symbol.for("poker-quest.callback-test");
globalThis[bridge] = {
  cookies,
  supabaseServer,
  authCookieOptions,
  redirect,
  revalidatePath,
  consumeRecovery,
};

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (stubs.has(specifier)) {
      const exports = stubs.get(specifier);
      const source = exports
        ? `export const { ${exports} } = globalThis[Symbol.for("poker-quest.callback-test")];`
        : "export {};";
      return nextResolve(
        `data:text/javascript,${encodeURIComponent(source)}`,
        context,
      );
    }

    if (specifier.startsWith("@/")) {
      const url = new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url);
      return nextResolve(url.href, context);
    }

    if (specifier.startsWith("./") && context.parentURL?.endsWith(".ts")) {
      const url = new URL(`${specifier}.ts`, context.parentURL);
      if (existsSync(url)) return nextResolve(url.href, context);
    }

    return nextResolve(specifier, context);
  },
});

const { confirmEmail, requestRecovery, updatePassword } =
  await import("../src/app/actions.ts").finally(() => {
    hooks.deregister();
    delete globalThis[bridge];
  });

function form(fields) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

test("solicitação de recuperação mantém a resposta genérica diante de erros do provedor", async (t) => {
  for (const [name, value] of Object.entries({
    POKER_QUEST_RECOVERY_SECRET: secret,
    POKER_QUEST_SITE_URL: "https://qa.example.test",
  })) {
    const previous = process.env[name];
    process.env[name] = value;
    t.after(() => {
      if (previous === undefined) delete process.env[name];
      else process.env[name] = previous;
    });
  }

  const warn = t.mock.method(console, "warn", () => {});
  const email = "qa@example.test";
  for (const error of [
    null,
    { code: "user_not_found", message: email },
    { code: "unexpected_failure", message: "SMTP error" },
  ]) {
    const warningsBefore = warn.mock.callCount();
    auth = {
      resetPasswordForEmail: t.mock.fn(async () => ({ error })),
    };
    assert.deepEqual(await requestRecovery({}, form({ email })), {
      message: copy.recovery,
    });
    assert.deepEqual(auth.resetPasswordForEmail.mock.calls[0].arguments, [
      email,
      { redirectTo: "https://qa.example.test/auth/confirmar" },
    ]);
    assert.equal(warn.mock.callCount() - warningsBefore, error ? 1 : 0);
  }
  assert.deepEqual(
    warn.mock.calls.map(({ arguments: args }) => args),
    Array.from({ length: 2 }, () => [
      "Falha do Supabase ao solicitar recuperação de senha.",
    ]),
  );
});

function setup(t, { fields, result, claims = { session_id: sessionId } }) {
  t.mock.method(Date, "now", () => now);
  const previous = process.env.POKER_QUEST_RECOVERY_SECRET;
  process.env.POKER_QUEST_RECOVERY_SECRET = secret;
  t.after(() => {
    if (previous === undefined) delete process.env.POKER_QUEST_RECOVERY_SECRET;
    else process.env.POKER_QUEST_RECOVERY_SECRET = previous;
  });

  const events = [];
  let proof = signRecovery("previous-session", secret, now);
  jar = {
    get(name) {
      assert.equal(name, cookieName);
      return { value: proof };
    },
    set(name, value, options) {
      assert.equal(name, cookieName);
      assert.equal(options.maxAge, value ? 600 : 0);
      events.push(value ? "issue" : "clear");
      proof = value;
    },
  };

  auth = {
    exchangeCodeForSession: t.mock.fn(async () => result),
    verifyOtp: t.mock.fn(async () => result),
    getClaims: t.mock.fn(async () => {
      events.push("claims");
      return { data: { claims } };
    }),
    signOut: t.mock.fn(async () => ({ error: null })),
    updateUser: t.mock.fn(async () =>
      assert.fail("Unexpected password update"),
    ),
  };

  async function confirm() {
    try {
      return await confirmEmail({}, form(fields));
    } finally {
      const calls = (method) =>
        auth[method].mock.calls.map(({ arguments: args }) => args);
      if ("code" in fields) {
        assert.deepEqual(calls("exchangeCodeForSession"), [
          [fields.code, undefined],
        ]);
        assert.deepEqual(calls("verifyOtp"), []);
      } else {
        assert.deepEqual(calls("verifyOtp"), [[fields]]);
        assert.deepEqual(calls("exchangeCodeForSession"), []);
      }
    }
  }

  return {
    confirm,
    events,
    proofSession: () => verifyRecovery(proof, secret, now),
  };
}

const authenticated = { data: { session: {} }, error: null };

const scenarios = [
  ["cadastro PKCE", { code: "signup-code" }, authenticated, false],
  [
    "recuperação PKCE",
    { code: "recovery-code" },
    { data: { session: {}, redirectType: "recovery" }, error: null },
    true,
  ],
  [
    "cadastro por token",
    { token_hash: "signup-token", type: "email" },
    authenticated,
    false,
  ],
  [
    "recuperação por token",
    { token_hash: "recovery-token", type: "recovery" },
    authenticated,
    true,
  ],
  [
    "token de recuperação aceito como email",
    { token_hash: "recovery-token", type: "email" },
    authenticated,
    false,
  ],
];

async function assertPasswordDenied() {
  const password = "synthetic-password-123";
  assert.deepEqual(
    await updatePassword({}, form({ password, confirmation: password })),
    { error: copy.invalidLink },
  );
  assert.equal(auth.updateUser.mock.callCount(), 0);
}

for (const [name, fields, result, recovery] of scenarios) {
  test(name, async (t) => {
    const { confirm, events, proofSession } = setup(t, { fields, result });
    await assert.rejects(
      confirm,
      (error) =>
        error instanceof Redirect &&
        error.destination === (recovery ? "/nova-senha" : "/painel"),
    );
    assert.deepEqual(
      events,
      recovery ? ["clear", "claims", "issue"] : ["clear"],
    );
    assert.equal(proofSession(), recovery ? sessionId : undefined);
    if (!recovery) await assertPasswordDenied();
  });
}

test("token de cadastro rejeitado quando apresentado como recovery", async (t) => {
  const { confirm, events, proofSession } = setup(t, {
    fields: { token_hash: "signup-token", type: "recovery" },
    result: { data: { session: null }, error: { code: "otp_expired" } },
  });
  assert.deepEqual(await confirm(), { error: copy.invalidLink });
  assert.deepEqual(events, []);
  assert.equal(proofSession(), "previous-session");
  await assertPasswordDenied();
});

for (const [name, fields, result] of scenarios.filter(
  ([, , , recovery]) => recovery,
)) {
  test(`${name} exige um ID de sessão validado`, async (t) => {
    const { confirm, events, proofSession } = setup(t, {
      fields,
      result,
      claims: {},
    });
    assert.deepEqual(await confirm(), { error: copy.unavailable });
    assert.deepEqual(events, ["clear", "claims"]);
    assert.equal(proofSession(), undefined);
    assert.deepEqual(auth.signOut.mock.calls[0].arguments, [
      { scope: "local" },
    ]);
  });
}

for (const code of [
  "flow_state_not_found",
  "flow_state_expired",
  "bad_code_verifier",
]) {
  test(`callback PKCE registra somente metadados para ${code}`, async (t) => {
    const warn = t.mock.method(console, "warn", () => {});
    const { confirm } = setup(t, {
      fields: { code: "synthetic-code" },
      result: {
        data: { session: null },
        error: {
          code,
          status: 400,
          message: "synthetic sensitive detail",
        },
      },
    });
    assert.deepEqual(await confirm(), { error: copy.callback });
    assert.deepEqual(warn.mock.calls[0].arguments, [
      "Falha ao trocar código de autenticação.",
      { code, status: 400, flowIdProvided: false },
    ]);
    assert.equal(
      JSON.stringify(warn.mock.calls).includes("synthetic-code"),
      false,
    );
    assert.equal(
      JSON.stringify(warn.mock.calls).includes("synthetic sensitive detail"),
      false,
    );
  });
}

test("callback PKCE informa sessão ausente sem expor dados do código", async (t) => {
  const warn = t.mock.method(console, "warn", () => {});
  const { confirm } = setup(t, {
    fields: { code: "synthetic-code" },
    result: { data: { session: null }, error: null },
  });
  assert.deepEqual(await confirm(), { error: copy.callback });
  assert.deepEqual(warn.mock.calls[0].arguments, [
    "Falha ao trocar código de autenticação.",
    { code: "missing_session", status: null, flowIdProvided: false },
  ]);
});
