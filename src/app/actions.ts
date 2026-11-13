"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { copy, type FormState } from "@/lib/auth/pt-br";
import { authEmailRedirect } from "@/lib/auth/redirect";
import { recoverySession, setRecoverySession } from "@/lib/auth/recovery";
import { consumeRecovery } from "@/lib/auth/consume-recovery";
import { validRecoverySecret } from "@/lib/auth/recovery-proof";
import { emailFrom, passwordError, usernameFrom } from "@/lib/auth/validation";
import { supabaseServer } from "@/lib/supabase/server";

export async function signup(_: FormState, form: FormData): Promise<FormState> {
  const username = usernameFrom(form.get("username"));
  const email = emailFrom(form.get("email"));
  const password = form.get("password");
  if (!username) return { error: copy.username };
  if (!email) return { error: copy.email };
  if (typeof password !== "string") return { error: "Informe a senha." };
  const invalid = passwordError(password, form.get("confirmation"));
  if (invalid) return { error: invalid };
  const emailRedirectTo = authEmailRedirect();
  if (!emailRedirectTo) return { error: copy.unavailable };
  const supabase = await supabaseServer();
  if (!supabase) return { error: copy.unavailable };

  const available = await supabase.rpc("is_username_available", {
    candidate: username,
  });
  if (available.error) return { error: copy.unavailable };
  if (available.data !== true) return { error: copy.taken };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username }, emailRedirectTo },
  });
  if (error) {
    if (error.code === "weak_password")
      return { error: "Escolha uma senha mais forte." };
    if (error.code === "over_email_send_rate_limit") {
      return {
        error: "Muitas solicitações de e-mail. Aguarde e tente novamente.",
      };
    }
    // A restrição UNIQUE resolve cadastros concorrentes entre a consulta e o INSERT.
    const retry = await supabase.rpc("is_username_available", {
      candidate: username,
    });
    return { error: retry.data === false ? copy.taken : copy.unavailable };
  }

  if (data.session) {
    await supabase.auth.signOut({ scope: "local" });
    return {
      error:
        "A confirmação por e-mail precisa estar habilitada para concluir o cadastro.",
    };
  }
  return {
    message:
      "Solicitação de cadastro concluída. Confira seu e-mail para confirmar a conta.",
  };
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const email = emailFrom(form.get("email"));
  const password = form.get("password");
  if (
    !email ||
    typeof password !== "string" ||
    !password ||
    password.length > 1024
  ) {
    return { error: "Informe seu e-mail e sua senha." };
  }
  const supabase = await supabaseServer();
  if (!supabase) return { error: copy.unavailable };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error?.code === "email_not_confirmed")
    return { error: "Confirme seu e-mail antes de entrar." };
  if (error?.code === "invalid_credentials")
    return { error: "E-mail ou senha incorretos." };
  if (error?.status === 429)
    return { error: "Muitas tentativas. Aguarde e tente novamente." };
  if (error) return { error: copy.unavailable };
  await setRecoverySession(null);
  redirect("/painel");
}

export async function logout() {
  const supabase = await supabaseServer();
  const result = await supabase?.auth.signOut({ scope: "local" });
  if (result?.error) redirect("/painel?saida=erro");
  await setRecoverySession(null);
  redirect("/entrar");
}

export async function requestRecovery(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const email = emailFrom(form.get("email"));
  if (!email) return { error: copy.email };
  const redirectTo = authEmailRedirect();
  if (
    !redirectTo ||
    !validRecoverySecret(process.env.POKER_QUEST_RECOVERY_SECRET ?? "")
  ) {
    return { error: copy.unavailable };
  }
  const supabase = await supabaseServer();
  if (!supabase) return { error: copy.unavailable };
  await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  return { message: copy.recovery };
}

async function finishEmailAuth(
  supabase: NonNullable<Awaited<ReturnType<typeof supabaseServer>>>,
  recovery: boolean,
): Promise<FormState> {
  await setRecoverySession(null);
  if (recovery) {
    const { data } = await supabase.auth.getClaims();
    const session = data?.claims.session_id;
    if (typeof session !== "string" || !(await setRecoverySession(session))) {
      await supabase.auth.signOut({ scope: "local" });
      return { error: copy.unavailable };
    }
    redirect("/nova-senha");
  }
  redirect("/painel");
}

export async function confirmEmail(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const code = form.get("code");
  if (code !== null) {
    if (typeof code !== "string" || !/^[\w-]{1,256}$/.test(code)) {
      return { error: copy.invalidLink };
    }
    const supabase = await supabaseServer();
    if (!supabase) return { error: copy.unavailable };
    const flowId = form.get("sb_flow_id");
    if (
      flowId !== null &&
      (typeof flowId !== "string" || !/^[A-Za-z0-9_-]{8,64}$/.test(flowId))
    ) {
      return { error: copy.invalidLink };
    }
    const { data, error } = await supabase.auth.exchangeCodeForSession(
      code,
      flowId ? { flowId } : undefined,
    );
    if (error || !data.session) {
      return {
        error:
          "O link expirou, já foi usado ou foi aberto em outro navegador. Use o mesmo navegador ou solicite um novo link.",
      };
    }
    return finishEmailAuth(
      supabase,
      "redirectType" in data && data.redirectType === "recovery",
    );
  }
  const token = form.get("token_hash");
  const type = form.get("type");
  if (
    typeof token !== "string" ||
    !token ||
    token.length > 256 ||
    (type !== "email" && type !== "recovery")
  )
    return { error: copy.invalidLink };
  const supabase = await supabaseServer();
  if (!supabase) return { error: copy.unavailable };
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: token,
    type,
  });
  if (error || !data.session) return { error: copy.invalidLink };
  return finishEmailAuth(supabase, type === "recovery");
}

export async function updatePassword(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const password = form.get("password");
  if (typeof password !== "string") return { error: "Informe a senha." };
  const invalid = passwordError(password, form.get("confirmation"));
  if (invalid) return { error: invalid };
  const supabase = await supabaseServer();
  if (!supabase) return { error: copy.unavailable };
  const { data } = await supabase.auth.getClaims();
  const session = data?.claims.session_id;
  if (typeof session !== "string" || session !== (await recoverySession())) {
    return { error: copy.invalidLink };
  }

  const consumed = await consumeRecovery(session);
  await setRecoverySession(null);
  if (!consumed) {
    return {
      error: "Não foi possível usar este link. Solicite uma nova recuperação.",
    };
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error?.code === "same_password")
    return {
      error:
        "Escolha uma senha diferente da atual. Solicite um novo link para tentar novamente.",
    };
  if (error?.code === "weak_password")
    return {
      error:
        "Escolha uma senha mais forte. Solicite um novo link para tentar novamente.",
    };
  if (error)
    return {
      error:
        "Não foi possível alterar a senha. Solicite um novo link e tente novamente.",
    };
  const signout = await supabase.auth.signOut({ scope: "global" });
  if (signout.error)
    return {
      message:
        "Senha alterada. Use a opção Sair no painel para encerrar esta sessão.",
    };
  redirect("/entrar?senha=alterada");
}

export async function updateProfile(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const username = usernameFrom(form.get("username"));
  if (!username) return { error: copy.username };
  const supabase = await supabaseServer();
  if (!supabase) return { error: copy.unavailable };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data, error } = await supabase
    .from("player_profiles")
    .update({ username })
    .eq("id", user.id)
    .select("username")
    .single();
  if (error?.code === "23505") return { error: copy.taken };
  if (error?.code === "PQ030") {
    return { error: "Você pode trocar o nome uma vez a cada 30 dias." };
  }
  if (error || !data) return { error: "Não foi possível atualizar o perfil." };
  revalidatePath("/painel");
  return { message: "Nome de usuário atualizado." };
}
