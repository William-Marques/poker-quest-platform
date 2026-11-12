"use client";

import { useActionState, type ReactNode } from "react";
import type { FormState } from "@/lib/auth/pt-br";

export function AccountForm({
  action,
  label,
  children,
}: {
  action: (state: FormState, data: FormData) => Promise<FormState>;
  label: string;
  children: ReactNode;
}) {
  const [state, submit, pending] = useActionState(action, {});
  return (
    <form action={submit} className="account-form">
      {children}
      <button type="submit" disabled={pending}>
        {pending ? "Aguarde…" : label}
      </button>
      {state.error && (
        <p role="alert" className="error">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="success">
          {state.message}
        </p>
      )}
    </form>
  );
}

export function UsernameField({ value }: { value?: string }) {
  return (
    <label>
      Nome de usuário
      <input
        name="username"
        defaultValue={value}
        autoComplete="username"
        required
        minLength={3}
        maxLength={24}
        pattern="[a-zA-Z0-9_]{3,24}"
        aria-describedby="username-help"
      />
      <small id="username-help">
        De 3 a 24 letras sem acento, números ou sublinhados.
      </small>
    </label>
  );
}

export function EmailField() {
  return (
    <label>
      E-mail
      <input
        name="email"
        type="email"
        autoComplete="email"
        required
        maxLength={254}
      />
    </label>
  );
}

export function PasswordFields({ current = false }: { current?: boolean }) {
  return (
    <>
      <label>
        {current ? "Senha" : "Nova senha"}
        <input
          name="password"
          type="password"
          required
          minLength={current ? undefined : 8}
          maxLength={current ? 1024 : 72}
          autoComplete={current ? "current-password" : "new-password"}
        />
      </label>
      {!current && (
        <label>
          Confirme a senha
          <input
            name="confirmation"
            type="password"
            required
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
          />
        </label>
      )}
    </>
  );
}
