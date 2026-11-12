# Arquitetura

## Fundação

`src/app` contém as rotas e o layout do Next.js. `src/lib/supabase` concentra a configuração e o cliente SSR. `test` reúne testes locais sem dependência de serviços.

## Identidade e acesso

Supabase Auth gerencia e-mail, senha e confirmação. As ações de servidor usam a chave publicável com sessões em cookies HTTP-only. O proxy renova a sessão nas rotas protegidas e o painel consulta o usuário autenticado no servidor.

A migration cria `player_profiles` com um registro por usuário de Auth. O banco reserva o nome na criação da conta, inclusive enquanto a confirmação estiver pendente. A restrição única cobre cadastros concorrentes. A função pública de disponibilidade retorna apenas um booleano. RLS limita a leitura e a edição ao titular, e o único campo que ele pode alterar é o nome. O plano fica restrito a `free`.

## Assinatura e confirmação (planejado)

1. O servidor identifica a conta autenticada, escolhe o plano e valor a partir do catálogo interno e grava uma tentativa pendente com referência opaca. Avaliar o checkout hospedado de Assinaturas do Mercado Pago em teste, sem capturar dados de cartão ou CVV.
2. O retorno do checkout só apresenta o estado registrado no servidor. Autorização da recorrência e pagamento efetivamente aprovado são estados distintos.
3. Receber notificações em endpoint HTTPS de teste. Verificar assinatura conforme o provedor, rejeitar eventos inválidos e consultar os recursos de assinatura e cobrança pela API, usando credenciais de teste no servidor. Conferir a associação com a tentativa local, assinatura, ambiente, conta recebedora, valor, moeda e aprovação do pagamento antes de conceder acesso.
4. Registrar processamento idempotente e atualizar a vigência de acesso em transação. Usar o estado consultado no provedor para evitar regressões causadas por notificações antigas. Preservar possibilidade de reprocessamento em falhas transitórias; reconciliar eventos ausentes, estornos, expiração e cancelamento conforme a política aprovada.

Separar dados, credenciais e endpoint de teste. Validar com comprador e meios de pagamento de teste, além do simulador de Webhooks. Se o fluxo hospedado de assinaturas não puder ser validado em teste, manter apenas simulação local até decidir a alternativa. Não substituir a verificação com uma cobrança real.

Referências: [Supabase com Next.js](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs), [assinatura com pagamento pendente](https://www.mercadopago.com.br/developers/pt/docs/subscriptions/integration-configuration/subscription-no-associated-plan/pending-payments), [teste de compra](https://www.mercadopago.com.br/developers/pt/docs/subscriptions/integration-test/payment-approval) e [Webhooks de Assinaturas](https://www.mercadopago.com.br/developers/pt/docs/subscriptions/additional-content/your-integrations/notifications/webhooks).
