import Link from "next/link";
import { requestRecovery } from "../../actions";
import { AccountForm, EmailField } from "../form";

export default function RecoveryPage() {
  return (
    <>
      <h1>Recupere sua senha</h1>
      <p>
        Informe o e-mail da sua conta para solicitar um link de recuperação.
      </p>
      <AccountForm action={requestRecovery} label="Solicitar link">
        <EmailField />
      </AccountForm>
      <p>
        <Link href="/entrar">Voltar para entrar</Link>
      </p>
    </>
  );
}
