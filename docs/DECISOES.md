# Decisões

| Tema         | Decisão nesta etapa                                                                                                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base         | Next.js 16 com App Router, React 19 e TypeScript 5.9 estrito. Node.js 24 LTS como referência e Node.js 26 aceito.                                                                           |
| Qualidade    | ESLint 9 com regras do Next.js, Prettier 3 e executor de testes nativo do Node.js.                                                                                                          |
| Supabase     | Recomendado para Auth e Postgres. Começar localmente para manter custo zero. O plano Free hospedado é candidato posterior, sujeito a quotas e pausa por inatividade. Nenhum projeto criado. |
| Mercado Pago | Avaliar Assinaturas com checkout hospedado e somente em teste. Nenhum SDK, webhook, conta ou credencial configurados.                                                                       |
| Orçamento    | R$ 0 inicial e mensal. Sem hospedagem contratada, add-ons, deploy ou serviços pagos.                                                                                                        |

Na etapa de identidade, foi escolhido um projeto Supabase Free hospedado e login por e-mail e senha. A ativação depende da revisão do SQL e da configuração de autenticação no painel.

Decisões para a etapa de assinatura: preço e periodicidade do Premium, regras de vigência em cancelamento, falha de renovação e estorno, e viabilidade do checkout hospedado em teste.

Referências: [suporte do Next.js](https://nextjs.org/support-policy), [Supabase local](https://supabase.com/docs/guides/local-development) e [plano Free](https://supabase.com/pricing).
