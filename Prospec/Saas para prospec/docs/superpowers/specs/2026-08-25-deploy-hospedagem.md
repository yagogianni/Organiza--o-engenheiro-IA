# Deploy do Prospec.IA no VPS — Design

**Status**: Aprovado em chat 2026-08-25.

## 1. Visão geral

Até agora o Prospec.IA (o app Express) só roda localmente, iniciado por um
`.bat`, acessível só no computador onde está rodando. Este documento cobre
colocá-lo no ar 24/7 no mesmo VPS da Hostinger que já hospeda o n8n e o
Evolution API, acessível de qualquer aparelho (celular, tablet, outro PC)
via `https://prospec.srv1916468.hstgr.cloud`, protegido por senha.

Combinado anteriormente: fazer isso só depois de terminar toda a sequência
de automação do n8n (Fases 1-10 do CLAUDE.md), que já está pronta.

## 2. Infraestrutura existente (levantada por reconhecimento via SSH)

O VPS roda Ubuntu com Docker. Cada serviço (n8n, Evolution API) é um
projeto Docker Compose separado em `/docker/<nome>/`, e um container
**Traefik** único (`/docker/traefik-pddd/`) cuida de HTTPS automático
(Let's Encrypt) e roteamento por subdomínio pra todos eles — descobre
containers novos sozinho via labels do Docker, sem precisar editar a
configuração do Traefik em si. Não há Node/npm instalado fora de
containers — tudo roda containerizado.

Padrão de label já em uso (visto no `docker-compose.yml` do n8n):
```yaml
labels:
  - traefik.enable=true
  - traefik.http.routers.${COMPOSE_PROJECT_NAME}.rule=Host(`${COMPOSE_PROJECT_NAME}.${TRAEFIK_HOST}`)
  - traefik.http.routers.${COMPOSE_PROJECT_NAME}.entrypoints=websecure
  - traefik.http.routers.${COMPOSE_PROJECT_NAME}.tls.certresolver=letsencrypt
  - traefik.http.services.${COMPOSE_PROJECT_NAME}.loadbalancer.server.port=<porta interna>
```

## 3. Abordagem

Replicar exatamente esse padrão pro Prospec.IA — não inventar um mecanismo
novo de deploy. Novo projeto `/docker/prospec-ia/`:

- **Dockerfile**: empacota o app Node existente (`node:20-alpine`, `npm ci`,
  copia `src/`/`public/`, `CMD npm start`). Nenhuma mudança no código do
  app — `app.listen(PORT, ...)` já escuta em todas as interfaces por
  padrão (necessário dentro de um container).
- **docker-compose.yml**: mesmo padrão de labels do Traefik acima, porta
  interna 3000, mais um middleware de autenticação (ver seção 4).
- **.env** (só no servidor, nunca no git): `COMPOSE_PROJECT_NAME=prospec`,
  `TRAEFIK_HOST=srv1916468.hstgr.cloud`, `TZ` (igual aos outros), e todas
  as chaves que já existem no `.env` local (Gemini, Supabase, n8n,
  Evolution, Telegram) como variáveis de ambiente do container.

## 4. Autenticação

Decisão do usuário: **HTTP Basic Auth no nível do Traefik** (não uma tela
de login própria no app) — o navegador pede usuário/senha nativamente
antes de deixar entrar em qualquer página, sem precisar de código novo no
app (sem sessão, sem hash de senha pra gerenciar). Implementado via
middleware do Traefik:

```yaml
- traefik.http.middlewares.prospec-auth.basicauth.users=yago.gianni:<hash>
- traefik.http.routers.prospec.middlewares=prospec-auth
```

Usuário: `yago.gianni`. Senha gerada e comunicada ao usuário fora deste
documento (não versionada). O hash (formato htpasswd/bcrypt, exigido pelo
Traefik) é gerado no momento da implementação.

## 5. Transferência de código e execução

Sem repositório remoto configurado (o git deste projeto é só local) — os
arquivos são copiados diretamente da máquina do usuário pro VPS via SSH
(acesso já configurado nesta sessão, por chave SSH). Depois: `docker
compose up -d --build` no diretório do projeto no VPS.

## 6. Teste

1. Confirmar que `https://prospec.srv1916468.hstgr.cloud` resolve e serve
   certificado HTTPS válido (Let's Encrypt automático, mesmo mecanismo já
   usado pelo n8n/Evolution API).
2. Confirmar que pede usuário/senha antes de mostrar qualquer página.
3. Testar o fluxo completo (ver leads, gerar mensagem, pipeline) contra o
   app rodando no VPS, não mais local.

## 7. Fora de escopo

- Repositório git remoto / CI-CD automatizado — deploys futuros continuam
  manuais (copiar arquivos + rebuild) até que isso vire necessário.
- Backup automatizado do `.env` do servidor.
- Domínio próprio (fora do `*.hstgr.cloud`) — pode vir depois, se
  desejado.
