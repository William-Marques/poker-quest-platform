# Roadmap

1. **Fundação:** app local, estrutura, configuração pública opcional do Supabase, ferramentas de qualidade e plano de integração. Sem provisionamento.
2. **Identidade:** cadastro por e-mail e senha, confirmação, recuperação, logout e perfil Free. Revisar a migration e configurar e-mails antes da ativação no Supabase hospedado.
3. **Planos:** oferecer gratuito e Premium; escolha de Premium fica pendente. Validar o bloqueio de conteúdo no servidor e no banco.
4. **Assinatura de teste:** validar checkout hospedado, confirmação pelo servidor e renovação. Exercitar eventos inválidos, repetidos e fora de ordem, cobrança pendente ou recusada, cancelamento e estorno. Confirmar que o retorno do checkout sozinho mantém o acesso gratuito.
5. **Revisão:** demonstrar o fluxo completo em teste, sem cobrança real. Produção exige nova autorização e análise de custos.
