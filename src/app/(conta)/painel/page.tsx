import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { logout, updateProfile } from "../../actions";
import { AccountForm, UsernameField } from "../form";

export const dynamic = "force-dynamic";

export default async function PlayerPage({
  searchParams,
}: {
  searchParams: Promise<{ saida?: string }>;
}) {
  const supabase = await supabaseServer(true);
  if (!supabase) redirect("/entrar");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const { data: profile } = await supabase
    .from("player_profiles")
    .select("username, plan")
    .eq("id", user.id)
    .maybeSingle();
  const date = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeZone: "America/Sao_Paulo",
  });

  return (
    <>
      <h1>Seu perfil</h1>
      <dl>
        <div>
          <dt>Nome de usuário</dt>
          <dd>
            {profile ? (profile.username ?? "Escolha um nome") : "Indisponível"}
          </dd>
        </div>
        <div>
          <dt>E-mail</dt>
          <dd>{user.email}</dd>
        </div>
        <div>
          <dt>Data de cadastro</dt>
          <dd>{date.format(new Date(user.created_at))}</dd>
        </div>
        <div>
          <dt>Plano atual</dt>
          <dd>{profile?.plan === "free" ? "Free" : "Indisponível"}</dd>
        </div>
      </dl>
      {profile ? (
        <AccountForm
          action={updateProfile}
          label={profile.username ? "Salvar nome" : "Definir nome"}
        >
          <UsernameField
            key={profile.username}
            value={profile.username ?? undefined}
          />
        </AccountForm>
      ) : (
        <p role="alert">Não foi possível carregar o perfil.</p>
      )}
      {(await searchParams).saida === "erro" && (
        <p role="alert">Não foi possível sair. Tente novamente.</p>
      )}
      <form action={logout}>
        <button className="secondary" type="submit">
          Sair
        </button>
      </form>
    </>
  );
}
