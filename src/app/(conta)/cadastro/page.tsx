import Link from "next/link";
import { signup } from "../../actions";
import {
  AccountForm,
  EmailField,
  PasswordFields,
  UsernameField,
} from "../form";

export default function SignupPage() {
  return (
    <>
      <h1>Crie sua conta</h1>
      <AccountForm action={signup} label="Criar conta">
        <UsernameField />
        <EmailField />
        <PasswordFields />
      </AccountForm>
      <p>
        Já tem conta? <Link href="/entrar">Entre</Link>.
      </p>
    </>
  );
}
