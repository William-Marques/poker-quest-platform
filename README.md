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
3. Nos modelos **Confirm signup** e **Reset password**, configure o destino dos links conforme abaixo. Use o fragmento após `#` para manter o token fora das requisições GET. O usuário confirma a ação no aplicativo antes de consumir o link.

| Modelo         | Destino do link                                                           |
| -------------- | ------------------------------------------------------------------------- |
| Confirm signup | `{{ .SiteURL }}/auth/confirmar#token_hash={{ .TokenHash }}&type=email`    |
| Reset password | `{{ .SiteURL }}/auth/confirmar#token_hash={{ .TokenHash }}&type=recovery` |

O SMTP padrão do Supabase hospedado só envia para endereços autorizados da equipe. Para testar com outros destinatários, configure um SMTP próprio que respeite o orçamento. [Documentação de SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

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
