<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Observability

In production applications, observability is essential for understanding how your system behaves, detecting issues early, and maintaining reliable performance.

[NestJS Observe](https://observe.nestjs.com) automatically instruments your NestJS application, giving you deep visibility into your system with minimal setup:

- **Distributed tracing:** Follow requests across services and understand how they flow through your system.
- **Waterfall analysis:** Visualize request execution and identify slow operations, bottlenecks, and unexpected delays.
- **Performance analysis:** Analyze application performance in real time and quickly pinpoint areas that need optimization.
- **Metrics:** Track key application and infrastructure metrics to understand system health and performance trends.
- **Logging:** Centralize and correlate logs with traces and other telemetry to make debugging easier.
- **Error tracking:** Detect errors quickly and investigate their root causes with the surrounding context.
- **SLA monitoring:** Track service-level objectives and identify when your application is approaching or exceeding defined thresholds.
- **Alarms and alerts:** Set up alerts for critical errors, performance degradation, SLA violations, and other anomalies so your team can react quickly.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Auto-instrument your application with [NestJS Observer](https://observer.nestjs.com). Distributed tracing, metrics, and logging made easy. Error tracking and performance monitoring for your NestJS applications.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

## Login

### Cadastro de cliente e motoboy

`POST /auth/register` recebe `name`, `email`, `cpf`, `phone`, `password`,
`role` (`client` ou `motoboy`) e `acceptedTerms: true`. O CPF deve ser válido,
o celular deve ter 11 dígitos com DDD e a senha deve ter de 8 a 128 caracteres.
O mesmo CPF pode ser usado nos dois perfis, mas cada conta precisa de um e-mail
distinto. O cadastro exige confirmação de e-mail antes do login e usa a mesma
configuração de envio do cadastro de restaurantes.

Os e-mails de confirmação de cadastro e de alteração de endereço incluem HTML
com a identidade do perfil (incluindo a marca de motoboy) e uma versão em texto.
As imagens usam URLs de `PUBLIC_APP_URL`: em implantação, esse endereço deve ser
HTTPS e estar acessível publicamente para que os clientes de e-mail exibam os logos.

Antes de habilitar o cadastro, aplique as migrações, incluindo
`0007_personal_profiles`. Em um banco novo, inicialize também o esquema base
`0000_users.sql` antes de executar `node scripts/migrate.mjs`. Não execute o
script de inicialização novamente em um banco existente.

### Comunicação com o frontend

O frontend usa `/api` na mesma origem, com proxy para a API. Para acessar a
API diretamente a partir de outras origens autorizadas, configure
`FRONTEND_ORIGINS` no `.env` com origens completas separadas por vírgula, sem
caminhos ou barras finais. As origens locais existentes continuam permitidas.
A autenticação usa JWT Bearer em memória; não depende de cookies.

O WebSocket em `/socket.io` exige origem autorizada e JWT válido. Quando um
aviso é marcado como lido, as sessões conectadas da mesma conta recebem o ID
do aviso; conexões de outras contas não recebem o evento e são desconectadas
ao expirar o JWT. O cliente consulta novamente os avisos após reconectar.
O proxy local expõe esse canal em `/api/socket.io`. A sincronização está
limitada a uma instância da API; várias réplicas exigem um adaptador compartilhado.
A publicação administrativa, os pedidos reais e o push continuam pendentes.

### Preparação do Cloudinary

No arquivo `.env` local, defina `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`
e `CLOUDINARY_API_SECRET`. O Docker disponibiliza essas variáveis apenas para a
API. Nunca coloque o segredo no frontend nem versione o `.env`; substitua
qualquer chave que tenha sido exposta. Após editar o arquivo, recrie a API para
carregar os valores novos.

Esta configuração apenas prepara a leitura das credenciais no backend. Ainda
não há upload, armazenamento de imagens ou integração com o cardápio.

### Sugestões e problemas

`POST /auth/restaurant-feedback` exige JWT de restaurante e recebe
`{"kind":"suggestion" | "problem","message":"..."}`. A mensagem deve ter de
10 a 2000 caracteres após remover espaços nas extremidades. Os relatos são
persistidos associados à conta, com limite de cinco envios por minuto; a leitura
e resposta pela equipe dependem do futuro painel administrativo. Aplique as
migrações antes de usar o endpoint. Não há envio automático para atendimento.

### Avisos e notícias

`GET /auth/announcements` lista até os 50 avisos publicados e não expirados para
o perfil do JWT (cliente, motoboy ou restaurante, além do público geral).
`POST /auth/announcements/:id/read` marca a leitura somente para a própria conta;
avisos fora do público ou indisponíveis retornam 404. Os registros de publicação
ainda não possuem interface ou endpoint administrativo: isso depende de autenticação
e autorização de administrador. E-mail e push não são enviados.

### Alteração de e-mail

`POST /auth/email-change` exige sessão e recebe `email` e `password` atual. Se o
serviço de e-mail estiver configurado, envia um código de oito dígitos ao novo
endereço. `POST /auth/email-change/confirm` exige a mesma conta autenticada e
recebe `code`. A confirmação altera o e-mail somente após validar o código,
que expira em 15 minutos, é armazenado como HMAC e aceita até cinco tentativas.
Uma nova solicitação invalida o código anterior. O endereço é exclusivo entre
contas; uma sessão existente continua válida até o JWT expirar.

The login endpoint is `POST /auth/login` and accepts JSON:

```json
{
  "email": "user@example.com",
  "password": "your-password"
}
```

Successful requests return an access token (JWT Bearer, valid for 15 minutes) and
the public user fields. Invalid credentials return `401` with a generic message.

Configure `DATABASE_URL` and `JWT_SECRET` using the variables in `.env.example`.
Use a random `JWT_SECRET` with at least 32 characters. Create the PostgreSQL
database, then apply `drizzle/0000_users.sql` before starting the API:

```powershell
psql "$env:DATABASE_URL" -f .\drizzle\0000_users.sql
node .\scripts\migrate.mjs
```

The migration creates the `users` table. Store only Argon2id password hashes in
`password_hash`; login does not create user accounts. Run the API with
`npm run start:dev`.

## Testar frontend e backend com Docker

Com o Docker Desktop em execução, abra um terminal PowerShell nesta pasta e rode:

```powershell
.\docker-setup.ps1
```

O comando cria o arquivo `.env` apenas se ele ainda não existir, com segredos
aleatórios, preserva a conta de cliente e adiciona uma conta de loja caso suas
credenciais ainda não existam. Em seguida, inicia PostgreSQL, API e frontend.
Consulte `TEST_STORE_USER_EMAIL` e `TEST_STORE_USER_PASSWORD` nesse arquivo para entrar em
http://127.0.0.1:18080/auth/signin. Não compartilhe nem versione o `.env`.
Se já houver um `.env`, configure nele `POSTGRES_PASSWORD`, `JWT_SECRET`,
`TEST_USER_EMAIL` e `TEST_USER_PASSWORD`; o script gera as credenciais de loja
ausentes. Use somente caracteres hexadecimais
para `POSTGRES_PASSWORD`, pois ela é usada na URL do banco.

O banco persiste no volume Docker `postgres_data`. A migração inicial de
usuários é aplicada somente na primeira criação desse volume. As
migrações seguintes são aplicadas automaticamente pelo serviço `migrate`,
inclusive em volumes existentes. As contas de teste não
são alteradas caso já existam; continue usando suas senhas originais. Para parar os
serviços sem apagar os dados:

```powershell
docker compose down
```

Essa configuração é destinada a testes locais, não à produção. O acesso pelo
navegador é publicado apenas em `127.0.0.1`, na porta 18080.
O dashboard de restaurante atual utiliza dados demonstrativos no frontend; o
login consulta uma conta persistida no PostgreSQL.

## Guia inicial do restaurante

Após o login de uma conta de restaurante, o guia inicial aparece até ser
concluído. O usuário pode fechá-lo e abri-lo em Configurações. Ao abrir uma área
pelo guia, ele é recolhido e pode ser retomado pelo lembrete, mantendo a etapa
durante a visita; cada área também oferece ajuda contextual. Os dados
operacionais do painel continuam demonstrativos.

`POST /auth/onboarding/complete` exige um JWT Bearer válido de restaurante
e registra a conclusão na conta. A operação é idempotente; o login informa o
estado em `user.onboardingCompleted`. A sessão do frontend ainda fica somente
em memória, portanto é necessário entrar novamente após recarregar a página.

## Cadastro de restaurante

`POST /restaurants` recebe nome do estabelecimento, CNPJ, nome do responsável,
e-mail, telefone, senha e endereço (`postalCode`, `street`, `number`, `complement`,
`neighborhood`, `city`, `state`). A senha é armazenada como hash Argon2id.
O usuário e o restaurante são gravados juntos; e-mail ou CNPJ duplicados retornam
`409`. O CNPJ é validado em formato numérico ou alfanumérico. Após o cadastro,
a conta precisa confirmar o e-mail antes de usar o endpoint de login existente.

### Confirmação de e-mail

Configure no `.env` uma chave nova em `RESEND_API_KEY`, o remetente verificado
em `EMAIL_FROM` e a URL do frontend em `PUBLIC_APP_URL`. Após alterar o arquivo,
execute `docker compose up -d` para recriar a API. Nunca versione ou compartilhe
a chave. O remetente informado é `nao-responda@codelab.services`.

No Docker local, `PUBLIC_APP_URL` usa `http://127.0.0.1:18080` por padrão: links
enviados por e-mail só funcionam no computador que executa o ambiente. Para uso
externo, configure uma URL HTTPS acessível ao destinatário.

O link é de uso único e expira após uma hora. Para solicitar outro, utilize a
tela de reenvio no login. Caso a entrega falhe após o cadastro ser gravado,
solicite o reenvio em vez de cadastrar novamente. Usuários existentes que ainda
não confirmaram o e-mail precisam solicitar um novo link; as contas de teste
criadas pelo Docker são marcadas como verificadas apenas para uso local.
O limite de tentativas usa memória do processo e precisa de armazenamento
compartilhado antes de executar múltiplas instâncias em produção.

O aceite de termos foi deixado para uma etapa posterior, pois o projeto ainda não
possui um documento de termos. Não utilize esse fluxo em produção sem definir
termos e política de privacidade adequados.
