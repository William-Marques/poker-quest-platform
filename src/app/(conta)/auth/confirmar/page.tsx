"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { copy } from "@/lib/auth/pt-br";
import { confirmEmail } from "../../../actions";
import { AccountForm } from "../../form";

function subscribe(listener: () => void) {
  window.addEventListener("hashchange", listener);
  return () => window.removeEventListener("hashchange", listener);
}

export default function ConfirmPage() {
  const fragment = useSyncExternalStore(
    subscribe,
    () => window.location.hash.slice(1),
    () => null,
  );
  if (fragment === null) return <h1>Abrindo link…</h1>;
  const params = new URLSearchParams(fragment);
  const token = params.get("token_hash");
  const type = params.get("type");
  if (
    typeof token !== "string" ||
    !token ||
    token.length > 256 ||
    (type !== "email" && type !== "recovery")
  ) {
    return (
      <>
        <h1>Link indisponível</h1>
        <p>{copy.invalidLink}</p>
        <Link href="/entrar">Voltar para entrar</Link>
      </>
    );
  }
  const title =
    type === "recovery"
      ? "Continue para redefinir a senha"
      : "Confirme seu e-mail";
  return (
    <>
      <h1>{title}</h1>
      <AccountForm action={confirmEmail} label="Continuar">
        <input name="token_hash" type="hidden" value={token} />
        <input name="type" type="hidden" value={type} />
      </AccountForm>
      <p>
        <Link href="/entrar">Voltar para entrar</Link>
      </p>
    </>
  );
}
