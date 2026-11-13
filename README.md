# Poker Quest Platform

Poker Quest oferece cadastro, login, recuperação de senha e perfil de jogador com Supabase Auth.

## Executar localmente

Use Node.js 24 LTS (Node.js 26 também é aceito) e npm. Na raiz:

```sh
npm ci
npm run dev
```

Abra [localhost:3000](http://localhost:3000). Para usar a autenticação, defina `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` em `.env.local`, que é ignorado pelo Git. Use somente a chave publicável do projeto.

### Configurar o Supabase

1. Revise a [migration de perfis](supabase/migrations/20261112181905_player_profiles.sql) antes de aplicá-la ao projeto hospedado. Ela cria os perfis, as políticas de acesso, a consulta de disponibilidade e o gatilho de cadastro. Contas preexistentes recebem um nome provisório.
2. Em **Authentication**, habilite o provedor **Email**, cadastro e confirmação de e-mail. Configure senha mínima de 8 caracteres. Em **URL Configuration**, defina **Site URL** como a origem do aplicativo que receberá os e-mails, por exemplo `http://localhost:3000` durante desenvolvimento.
3. Os modelos padrão **Confirm signup** e **Reset password** podem usar `{{ .ConfirmationURL }}`. Abra o link no mesmo navegador e perfil que iniciou a solicitação. Na página de confirmação, clique em **Continuar** para concluir a autenticação. Se o projeto já usa modelos personalizados, os destinos abaixo continuam compatíveis.

| Modelo         | Destino do link                                               |
| -------------- | ------------------------------------------------------------- |
| Confirm signup | `{{ .RedirectTo }}#token_hash={{ .TokenHash }}&type=email`    |
| Reset password | `{{ .RedirectTo }}#token_hash={{ .TokenHash }}&type=recovery` |

Na Netlify, configure `POKER_QUEST_SITE_URL` para as funções com a origem HTTPS pública, sem caminho, e defina essa mesma origem como **Site URL** no Supabase de produção. Em **Redirect URLs**, inclua a URL pública exata terminada em `/auth/confirmar`. No Supabase de desenvolvimento, use a origem local e permita `http://localhost:3000/auth/confirmar`. Se usar outra porta, ajuste a variável local e a URL permitida. `RedirectTo` já inclui o caminho do callback.

O SMTP padrão do Supabase hospedado só envia para endereços autorizados da equipe. Para testar com outros destinatários, configure um SMTP próprio que respeite o orçamento. [Documentação de SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

A recuperação também exige `POKER_QUEST_SUPABASE_SERVER_KEY`, com uma chave secreta do Supabase ou a chave legada `service_role`, disponível exclusivamente no servidor. A migration de consumo registra o ID da sessão antes da tentativa de troca de senha. Se a tentativa falhar, solicite outro link. A tabela guarda somente o ID da sessão e a data de consumo, sem limpeza automática.

Para recuperação de senha, configure `POKER_QUEST_RECOVERY_SECRET` no servidor da Netlify e em `.env.local` no desenvolvimento. Use um valor aleatório de pelo menos 32 caracteres, por exemplo gerado com `openssl rand -hex 32`. O valor assina a autorização de recuperação e deve ficar fora do Git.

### Verificar o fluxo

1. Em `/cadastro`, use um endereço de teste autorizado e um nome disponível. Abra o e-mail e clique em **Continuar**. Confira o perfil Free em `/painel`.
2. Altere o nome do perfil, recarregue a página e confira se o valor persistiu. Clique em **Sair** e tente abrir `/painel` diretamente. Entre novamente com e-mail e senha.
3. Em `/recuperar-senha`, solicite um link. Abra-o, clique em **Continuar**, informe a nova senha duas vezes e entre com a nova senha. Confira que a resposta à solicitação é a mesma para um endereço inexistente.
4. Em uma instância local de teste com a migration aplicada, execute [os casos SQL de permissões](supabase/tests/player_profiles.sql) com `psql -v ON_ERROR_STOP=1 -f supabase/tests/player_profiles.sql`, apontando o cliente para o banco local. O arquivo reverte os dados de teste ao terminar.

```sh
npm run check
npm run build
```

O primeiro comando roda lint, formatação, checagem de tipos e testes. Use `npm run format` para aplicar a formatação. Os testes usam o executor nativo do Node.js e não acessam a rede.

Consulte o [roadmap](docs/ROADMAP.md), a [arquitetura](docs/ARQUITETURA.md) e as [decisões](docs/DECISOES.md).
