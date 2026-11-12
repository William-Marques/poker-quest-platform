import Link from "next/link";
import { recoverySession } from "@/lib/auth/recovery";
import { copy } from "@/lib/auth/pt-br";
import { supabaseServer } from "@/lib/supabase/server";
import { updatePassword } from "../../actions";
import { AccountForm, PasswordFields } from "../form";

export const dynamic = "force-dynamic";

export default async function NewPasswordPage() {
  const supabase = await supabaseServer(true);
  const result = await supabase?.auth.getClaims();
  const session = result?.data?.claims.session_id;
  if (typeof session !== "string" || session !== (await recoverySession())) {
    return (
      <>
        <h1>Link indisponível</h1>
        <p>{copy.invalidLink}</p>
        <Link href="/recuperar-senha">Solicitar outro link</Link>
      </>
    );
  }
  return (
    <>
      <h1>Defina sua nova senha</h1>
      <AccountForm action={updatePassword} label="Salvar senha">
        <PasswordFields />
      </AccountForm>
      <p>
        <Link href="/entrar">Ir para o login</Link>
      </p>
    </>
  );
}
