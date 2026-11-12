import Link from "next/link";
import { login } from "../../actions";
import { AccountForm, EmailField, PasswordFields } from "../form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ senha?: string }>;
}) {
  return (
    <>
      <h1>Entre no Poker Quest</h1>
      {(await searchParams).senha === "alterada" && (
        <p role="status" className="success">
          Senha alterada. Entre com a nova senha.
        </p>
      )}
      <AccountForm action={login} label="Entrar">
        <EmailField />
        <PasswordFields current />
      </AccountForm>
      <p>
        <Link href="/recuperar-senha">Esqueceu a senha?</Link>
      </p>
      <p>
        Primeira vez aqui? <Link href="/cadastro">Crie sua conta</Link>.
      </p>
    </>
  );
}
