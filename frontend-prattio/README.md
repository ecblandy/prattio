# FrontendPrattio

## Monorepositório

O frontend e a API ficam nas pastas `frontend-prattio` e `prattio-api` da
mesma raiz Git. Execute os comandos npm na pasta do respectivo projeto.

## Visão geral do restaurante

A visão geral usa exclusivamente dados demonstrativos locais, não pedidos ou vendas reais.
O alerta de preparo utiliza o limite configurado na central de pedidos: mede a espera
desde o recebimento para pedidos novos ou com entregador a caminho, e desde o evento
de início para pedidos em preparo, seguindo o mesmo cálculo do painel TV. O limite é
considerado atingido no minuto configurado. Pedidos agendados e pedidos sem horário
válido não são avaliados na visão geral; o indicador não representa atraso de entrega.
O relógio dos indicadores é atualizado a cada 30 segundos. Vendas e outras métricas
financeiras confiáveis dependem de integração com dados reais.

## Configurações e comunicação

Pedidos, cardápio e entregadores usam dados demonstrativos em memória; seus resumos
e alterações não representam uma operação conectada. Em Configurações, o tema é
salvo no navegador e o guia pode ser reaberto. Restaurantes autenticados podem
registrar sugestões e problemas na API; os relatos são persistidos, mas ainda não
há painel administrativo para consultá-los ou responder. Não envie dados sensíveis.
A consulta de avisos na área de Configurações é autenticada e persiste leituras;
a publicação pelo futuro painel administrativo ainda não foi implementada.
Quando os avisos são consultados, a leitura é sincronizada em tempo real entre
sessões da mesma conta. Em caso de desconexão, use o botão para atualizá-los;
uma reconexão atualiza a lista automaticamente.
Os exemplos são identificados como demonstrativos. A troca de e-mail exige a
senha atual e a confirmação de um código enviado ao novo endereço; o envio
depende do serviço de e-mail configurado na API. O código expira em 15 minutos
e permite até cinco tentativas. O e-mail não muda antes da confirmação.
Suporte por WhatsApp, e-mail, chat e ligação, e notificações por e-mail ou push
ainda não estão conectados.

A API usa o caminho relativo `/api`, centralizado na configuração do frontend.
O proxy de desenvolvimento e o Nginx encaminham as requisições e o WebSocket
para o backend; o interceptor não adiciona credenciais a serviços externos.
Na imagem Docker, `API_UPSTREAM` define o nome interno da API; o Compose local
usa `api` e, por padrão, a imagem usa o nome do serviço no Dokploy.
Os cadastros de cliente e motoboy exigem CPF válido, aceitação dos termos e
confirmação de e-mail. O mesmo CPF pode ser usado nos dois perfis com e-mails
diferentes; o envio depende da configuração de e-mail e das migrações da API.

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.0.4.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
