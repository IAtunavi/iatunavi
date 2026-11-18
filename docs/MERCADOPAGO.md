# Configuração do Mercado Pago — TUNAVI

## Segredos obrigatórios no ambiente de servidor

Cadastre estes valores no painel de Secrets da hospedagem (Lovable Cloud), nunca em variáveis `VITE_*`:

- `MP_ACCESS_TOKEN`: Access Token de produção da aplicação Mercado Pago.
- `MP_WEBHOOK_SECRET`: chave secreta de assinatura de Webhooks exibida na configuração de notificações do Mercado Pago.
- `APP_URL`: origem HTTPS pública da TUNAVI, sem barra no final (por exemplo, `https://tunavi.com.br`).

Não coloque tokens reais neste repositório, no navegador, em commits ou em mensagens.

## Configurar notificações no Mercado Pago

Cadastre a URL:

`https://SEU-DOMINIO/api/billing/webhook`

Habilite notificações de assinatura (preapproval / subscription_preapproval) e copie a chave secreta de assinatura para `MP_WEBHOOK_SECRET`.

O webhook verifica o HMAC SHA-256 do cabeçalho `x-signature`, exige `x-request-id` e consulta novamente a assinatura na API do Mercado Pago antes de gravar qualquer alteração no Supabase. Eventos não autenticados são rejeitados.

## Fluxo implementado

1. A tela `/planos` envia plano e ciclo para `POST /api/billing/checkout`.
2. O backend valida o token Supabase, bloqueia administradores, consulta o preço em `app_settings` e cria uma assinatura recorrente em BRL.
3. A pessoa é redirecionada para o checkout hospedado pelo Mercado Pago.
4. A notificação assinada é verificada; o backend consulta a assinatura diretamente no Mercado Pago e atualiza `subscriptions`.
5. Acesso pago só é concedido quando o Mercado Pago informa `authorized`. Assinaturas pendentes, pausadas e canceladas não concedem o plano pago.

## Antes de liberar produção

- Configure os três secrets acima no ambiente de produção.
- Use credenciais de teste para validar cartão aprovado, recusado, assinatura pendente, autorização, pausa e cancelamento.
- Configure o webhook de produção no painel Mercado Pago e valide uma notificação real.
- Confirme RLS e unicidade de `subscriptions.user_id` no Supabase.
- Execute `bunx vitest run`, `bunx tsc --noEmit` e `bun run build` no CI.
- Só então habilite credenciais de produção e divulgue a contratação.

O retorno do navegador para `/planos?checkout=retorno` não ativa assinatura. A ativação é exclusivamente pelo webhook autenticado.
