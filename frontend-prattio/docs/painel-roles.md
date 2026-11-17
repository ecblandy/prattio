# Mapa dos painéis Prattio

## Restaurante — primeira entrega

- Visão geral: vendas, volume de pedidos, operação ativa e receita semanal.
- Pedidos: registro manual, busca, status, atribuição de entregador e remoção.
- Cardápio: cadastro, edição, preço, categoria e disponibilidade.
- Entregadores: cadastro vinculado à loja, edição, ativação e remoção.
- Financeiro: vendas, saldo, valores a receber, movimentações e solicitação demonstrativa de repasse.
- Integrações: iFood, 99Food, WhatsApp e Asaas, com estado local de demonstração.
- Loja: perfil público e estado aberto/pausado.

A interface atual usa dados locais em Signals. Persistência, autenticação OAuth, pedidos reais e transferências exigem serviços de backend e credenciais; os botões de integração/repasse indicam explicitamente esse limite.

## Admin — próximo painel

- Visão da plataforma: lojas ativas, pedidos, GMV, repasses pendentes e saúde das integrações.
- Lojas e usuários: aprovação de estabelecimentos, status de conta, convites e permissões por função.
- Financeiro global: comissões, planos, conciliação e trilha de repasses.
- Operação: fila de pedidos com falha, incidentes, disputas e suporte.
- Integrações: credenciais por loja, webhooks, tentativas e histórico de erros.
- Auditoria e relatórios: alterações críticas, exportações e métricas por período.

## Cliente — próximo painel

- Descoberta: busca, categorias, localização e restaurantes favoritos.
- Restaurante: cardápio, disponibilidade, personalização de itens e carrinho.
- Checkout: endereço, entrega/retirada, pagamento e resumo do pedido.
- Acompanhamento: status do pedido e atualizações de entrega.
- Conta: pedidos anteriores, endereços, pagamentos, favoritos e suporte.

## Entregador — depois

O painel de entregador fica fora desta etapa. O próximo desenho deve cobrir disponibilidade, ofertas/atribuições, coleta, entrega, localização, ganhos e histórico.

## Base comum sugerida

Compartilhar componentes visuais de navegação, notificações, estados de carregamento e tokens de tema. A autorização deve vir da identidade/permissões do backend; a URL e o menu da interface não substituem controle de acesso.
