# Pesquisa de APIs de marketplace

Pesquisa em 15/11/2026, baseada nos portais oficiais públicos. A documentação técnica pode mudar; antes da integração de produção, confirmar versão, permissões e contratos no portal autenticado.

## iFood

Portal oficial: [iFood Developer](https://developer.ifood.com.br/pt-BR/)

- O portal organiza os guias por categoria de negócio e disponibiliza referência de API, changelog e FAQ.
- Para restaurantes, a documentação apresenta módulos de `Order`, `Events`, `Shipping`, `Catalog`, `Financial`, `Merchant`, `Review` e `Analytics`.
- O módulo `Order` cobre acompanhar o ciclo do pedido; `Events` entrega mudanças por polling/webhook; `Shipping` cuida de contratação/rastreamento de entrega; `Catalog` administra itens, preços e disponibilidade; `Financial` dá suporte à conciliação.
- O portal de onboarding lista criação de conta/app, pedido de acessos, pedidos de teste e homologação. O acesso de produção depende das permissões e requisitos do programa; não basta possuir credenciais de uma loja.
- A FAQ oficial lista dúvidas separadas para Order, Catalog, Financial, Shipping e Webhook, incluindo acknowledgment, loja de teste, autenticação e conciliação.
- A integração deve ser server-to-server: manter credenciais/tokens no backend, validar webhooks, responder rapidamente e usar idempotência/reconciliação para eventos repetidos ou fora de ordem.

Fontes: [guias de documentação](https://developer.ifood.com.br/pt-BR/docs/getting-started), [referência de API](https://developer.ifood.com.br/pt-BR/docs/references), [FAQ](https://developer.ifood.com.br/pt-BR/support/faq), [programa Super Integradoras](https://developer.ifood.com.br/pt-BR/super).

## 99Food

Portal oficial: [Developers 99Food](https://developer-food.99app.com/)

- A plataforma aberta apresenta integração de catálogo/menu e API de pedidos, ambiente sandbox e assistência ao desenvolvimento.
- O fluxo publicado tem seis etapas: certificação/aplicativo, app de teste, depuração, teste e aceite, autorização e garantia de operação online.
- O guia de autorização usa `app_id`/`app_secret` para o app e `auth_token` por loja. O token precisa de renovação; cada loja autoriza o vínculo do app. Segredos e tokens não podem ficar no frontend.
- O módulo `Orders` documenta consulta de detalhe, confirmação, cancelamento, respostas a solicitações de cancelamento/reembolso, pronto e entregue; callbacks incluem novo pedido, cancelamento, conclusão e mudança do estado da entrega.
- O módulo `Menu` documenta leitura, upload assíncrono do menu completo, atualização de item, disponibilidade, grupos de modificadores e upload de imagem. Há callbacks de progresso/erro do menu e auditoria de imagens.
- A documentação de `Logistics` separa eventos de despacho e entrega de pedidos de autoentrega e também oferece atualização/consulta de dados do courier e tracking. O fluxo de logística da 99Food não deve ser confundido com o fallback externo do canal próprio Prattio.
- Webhooks usam `didi-header-sign`, IDs de aplicação/pedido/loja podem ser inteiros de 64 bits, callbacks têm limite publicado de seis segundos e devem receber resposta JSON com `errno: 0`; processar assinaturas, persistir eventos e responder rápido.
- Especificações completas e credenciais são fornecidas pelo portal/app após cadastro e fluxo de certificação. Não presumir contratos de endpoint não acessíveis ao app Prattio.

Endpoints explicitamente listados no guia público de Orders: `/order/order/detail/`, `/order/order/confirm/`, `/order/order/cancel/`, `/order/apply/cancel/`, `/order/apply/refund/`, `/order/order/ready/` e `/order/order/delivered/`. O guia de Menu lista `/item/item/list/`, `/item/item/upload/`, `/item/item/getMenuTaskInfo/`, `/item/item/updateItem/`, `/item/item/updateItemStatus/`, `/item/item/updateModifierGroup/`, `/image/image/uploadImage/` e `/image/image/getImageUploadInfoPageList/`. Para autoentrega, o guia lista `/v1/order/selfdelivery/dispatch` e `/v1/order/selfdelivery/delivered`; despacho inclui dados obrigatórios do courier e limites de tempo. Usar os schemas do portal autenticado antes de enviar payloads.

Fontes: [plataforma aberta e cadastro](https://developer-food.99app.com/), [documentação técnica](https://developer-food.99app.com/pt-BR/openapi).

## Arquitetura recomendada para Prattio

1. Criar adaptadores backend separados (`IfoodAdapter` e `Food99Adapter`) sobre um contrato interno comum de pedidos, catálogo, eventos e conciliação.
2. Guardar credenciais por loja cifradas no backend; implementar refresh de token, verificação de assinatura, rotação de segredos e log sem dados sensíveis.
3. Traduzir callbacks em uma fila idempotente/outbox. Confirmar ou rejeitar pedidos no backend; reconciliar status quando eventos repetidos, atrasados ou ausentes ocorrerem.
4. Modelar separadamente `salesChannel` (iFood, 99Food, loja própria) e `deliveryProvider` (logística da plataforma, courier próprio, courier externo, retirada).
5. O fallback de courier externo só se aplica ao canal próprio. iFood/99Food continuam obedecendo ao provedor/fluxo de logística atribuído pela plataforma.
6. Catálogo usa preço, disponibilidade, modificadores e estado de sincronização por canal. Upload de imagem precisa guardar o arquivo original, executar validação/resize e enviar à API; cada marketplace pode retornar status de auditoria diferente.
7. O financeiro deve separar bruto, descontos, comissão, tarifa de pagamento, entrega, reembolso, retenções e líquido por pedido, depois comparar previsões com extratos reais. Percentuais exibidos no protótipo são exemplos, não taxas contratuais.

A UI atual continua em modo local até configurar API/backend homologados. Os botões de sandbox, imagens e status não representam uma conexão real com os marketplaces.
