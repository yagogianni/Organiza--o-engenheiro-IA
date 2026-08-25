# Deploy do Prospec.IA no VPS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Colocar o Prospec.IA no ar 24/7 em `https://prospec.srv1916468.hstgr.cloud`, protegido por senha, rodando no mesmo VPS Docker+Traefik que já hospeda o n8n e o Evolution API.

**Architecture:** Novo projeto Docker Compose em `/docker/prospec-ia/` no VPS, seguindo exatamente o padrão de labels do Traefik já usado pelo n8n (roteamento por subdomínio, HTTPS automático via Let's Encrypt). Autenticação via middleware `basicauth` do próprio Traefik — nenhuma mudança no código do app. Arquivos copiados da máquina local pro VPS via `tar` sobre SSH (sem repositório git remoto).

**Tech Stack:** Docker, Docker Compose, Traefik (já rodando), Node 20 (imagem `node:20-alpine`), SSH (chave já configurada em `C:\Users\yagia\AppData\Local\Temp\claude\d--CODE-Organiza--o-engenheiro-IA-Prospec\1ace1aa9-dd2f-41dc-a80c-ff5630466169\scratchpad\prospec_vps_key`, executor `ssh-run-key.js` no mesmo diretório).

**Spec:** `docs/superpowers/specs/2026-08-25-deploy-hospedagem.md`

## Global Constraints

- Subdomínio: `prospec.srv1916468.hstgr.cloud` (`COMPOSE_PROJECT_NAME=prospec`, `TRAEFIK_HOST=srv1916468.hstgr.cloud`).
- Usuário de login: `yago.gianni`. Senha: `Yagobg123#321` (escolhida pelo usuário).
- Porta interna do app: 3000 (já é o `PORT` padrão em `src/config.js`).
- Nenhuma mudança no código do app (`app.listen(PORT, ...)` já escuta em todas as interfaces).
- Nenhum segredo (chaves de API, senha) pode ir pro git — só pro `.env` do servidor, fora do repositório.
- VPS: `187.127.59.182`, usuário `root`, acesso já validado via chave SSH nesta sessão.

---

### Task 1: Arquivos de deploy locais (Dockerfile, docker-compose.yml, hash da senha)

**Files:**
- Create: `Prospec/Saas para prospec/Dockerfile`
- Create: `Prospec/Saas para prospec/.dockerignore`
- Create: `Prospec/Saas para prospec/docker-compose.yml`
- Test: verificação manual (build local da imagem)

**Interfaces:**
- Produces: uma imagem Docker buildável do app, e um `docker-compose.yml` parametrizado que a Task 2 vai copiar pro VPS.

- [ ] **Step 1: Gerar o hash bcrypt da senha (formato htpasswd exigido pelo Traefik)**

```bash
cd "D:/CODE/Organização engenheiro IA/Prospec/Saas para prospec"
npm install --no-save bcryptjs
node -e "console.log(require('bcryptjs').hashSync('Yagobg123#321', 10))"
```

Expected: uma linha começando com `$2a$10$` ou `$2b$10$` (60 caracteres). Guarde esse valor — vai ser usado no Step 3, com cada `$` duplicado pra `$$` (exigência do docker-compose pra não tratar como variável).

- [ ] **Step 2: Criar `Dockerfile`**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY public ./public
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "src/index.js"]
```

- [ ] **Step 3: Criar `.dockerignore`**

```
node_modules
data
.env
.env.local
*.json5
.git
docs
tests
```

- [ ] **Step 4: Criar `docker-compose.yml`**

Substitua `<HASH_COM_DOLAR_DUPLICADO>` pelo valor do Step 1, com cada `$` trocado por `$$` (ex: `$2a$10$abc...` vira `$$2a$$10$$abc...`).

```yaml
services:
  prospec:
    build: .
    restart: unless-stopped
    labels:
      - traefik.enable=true
      - traefik.http.routers.${COMPOSE_PROJECT_NAME}.rule=Host(`${COMPOSE_PROJECT_NAME}.${TRAEFIK_HOST}`)
      - traefik.http.routers.${COMPOSE_PROJECT_NAME}.entrypoints=websecure
      - traefik.http.routers.${COMPOSE_PROJECT_NAME}.tls.certresolver=letsencrypt
      - traefik.http.routers.${COMPOSE_PROJECT_NAME}.middlewares=prospec-auth
      - traefik.http.services.${COMPOSE_PROJECT_NAME}.loadbalancer.server.port=3000
      - traefik.http.middlewares.prospec-auth.basicauth.users=yago.gianni:<HASH_COM_DOLAR_DUPLICADO>
    environment:
      - PORT=3000
      - NODE_ENV=production
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - GEMINI_MODEL=${GEMINI_MODEL}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - N8N_API_URL=${N8N_API_URL}
      - N8N_API_KEY=${N8N_API_KEY}
      - EVOLUTION_API_URL=${EVOLUTION_API_URL}
      - EVOLUTION_API_KEY=${EVOLUTION_API_KEY}
      - EVOLUTION_INSTANCE=${EVOLUTION_INSTANCE}
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - TELEGRAM_CHAT_ID=${TELEGRAM_CHAT_ID}
```

- [ ] **Step 5: Build local da imagem, só pra confirmar que o Dockerfile funciona antes de mandar pro servidor**

```bash
cd "D:/CODE/Organização engenheiro IA/Prospec/Saas para prospec"
docker build -t prospec-ia-test .
```

Expected: build termina com `Successfully tagged prospec-ia-test` (ou equivalente do BuildKit), sem erro. Se o Docker Desktop local não estiver rodando, pule este step — o build de verdade acontece no VPS na Task 3; isso aqui é só uma checagem antecipada opcional.

- [ ] **Step 6: Commit dos arquivos de deploy (sem segredos — o `docker-compose.yml` só referencia `${VAR}`, não tem valor real nenhum)**

```bash
git add Dockerfile .dockerignore docker-compose.yml
git commit -m "$(cat <<'EOF'
feat: add Docker deploy config for the VPS (Traefik + Basic Auth)

Dockerfile packages the existing Express app unchanged. docker-compose.yml
follows the same Traefik label pattern already used by n8n/Evolution API
on the VPS, with a basicauth middleware protecting the whole app. No
secrets committed -- all env vars are ${VAR} references filled from the
server's own .env at deploy time.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Copiar o código e os arquivos de deploy pro VPS

**Files:**
- Nenhum arquivo novo no repositório local — este task só move arquivos existentes pro servidor.

**Interfaces:**
- Consumes: `Dockerfile`, `docker-compose.yml`, `.dockerignore` da Task 1; o código-fonte já existente (`src/`, `public/`, `package.json`, `package-lock.json`).
- Produces: `/docker/prospec-ia/` populado no VPS, pronto pra build.

- [ ] **Step 1: Criar o diretório no VPS**

```bash
SCRATCH="C:/Users/yagia/AppData/Local/Temp/claude/d--CODE-Organiza--o-engenheiro-IA-Prospec/1ace1aa9-dd2f-41dc-a80c-ff5630466169/scratchpad"
cd "$SCRATCH" && node ssh-run-key.js "mkdir -p /docker/prospec-ia"
```

Expected: `---exit code: 0 ---`

- [ ] **Step 2: Empacotar o projeto local (excluindo `node_modules`, `data`, `.git`, `.env`) e enviar via tar sobre SSH**

```bash
cd "D:/CODE/Organização engenheiro IA/Prospec/Saas para prospec"
tar czf - --exclude=node_modules --exclude=data --exclude=.git --exclude=.env --exclude=.env.local \
  src public package.json package-lock.json Dockerfile docker-compose.yml .dockerignore \
  > "C:/Users/yagia/AppData/Local/Temp/claude/d--CODE-Organiza--o-engenheiro-IA-Prospec/1ace1aa9-dd2f-41dc-a80c-ff5630466169/scratchpad/prospec-deploy.tar.gz"
```

- [ ] **Step 3: Enviar o tar pro VPS via scp (usa a mesma chave SSH)**

```bash
SCRATCH="C:/Users/yagia/AppData/Local/Temp/claude/d--CODE-Organiza--o-engenheiro-IA-Prospec/1ace1aa9-dd2f-41dc-a80c-ff5630466169/scratchpad"
scp -i "$SCRATCH/prospec_vps_key" -o StrictHostKeyChecking=accept-new \
  "$SCRATCH/prospec-deploy.tar.gz" root@187.127.59.182:/docker/prospec-ia/prospec-deploy.tar.gz
```

Expected: barra de progresso terminando em 100%, sem erro de conexão. Se `scp` pedir confirmação de host key, isso é esperado na primeira vez (`-o StrictHostKeyChecking=accept-new` já resolve isso automaticamente).

- [ ] **Step 4: Extrair o tar no VPS e confirmar os arquivos**

```bash
SCRATCH="C:/Users/yagia/AppData/Local/Temp/claude/d--CODE-Organiza--o-engenheiro-IA-Prospec/1ace1aa9-dd2f-41dc-a80c-ff5630466169/scratchpad"
cd "$SCRATCH" && node ssh-run-key.js "cd /docker/prospec-ia && tar xzf prospec-deploy.tar.gz && rm prospec-deploy.tar.gz && ls -la"
```

Expected: lista mostrando `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `src/`, `public/`, `package.json`, `package-lock.json`.

---

### Task 3: Criar o `.env` real no VPS e subir o container

**Files:**
- Nenhum arquivo novo no repositório local. Cria `/docker/prospec-ia/.env` **só no servidor**.

**Interfaces:**
- Consumes: os valores reais do `.env` local (`Prospec/Saas para prospec/.env`) — lidos localmente, nunca colados em texto no chat nem em nenhum arquivo versionado.
- Produces: container `prospec` rodando e respondendo na porta 3000 internamente.

- [ ] **Step 1: Ler os valores atuais do `.env` local (pra usar nos steps seguintes, sem hardcodar no plano)**

```bash
cd "D:/CODE/Organização engenheiro IA/Prospec/Saas para prospec"
cat .env
```

- [ ] **Step 2: Montar o `.env` do VPS localmente (arquivo temporário, nunca commitado) com os valores lidos no Step 1 + as variáveis do Traefik**

Crie um arquivo temporário (ex: `$SCRATCH/prospec-server.env`) com este conteúdo, substituindo cada `<...>` pelo valor real lido no Step 1:

```
COMPOSE_PROJECT_NAME=prospec
TRAEFIK_HOST=srv1916468.hstgr.cloud
GEMINI_API_KEY=<valor real>
GEMINI_MODEL=<valor real>
SUPABASE_URL=<valor real>
SUPABASE_SERVICE_ROLE_KEY=<valor real>
N8N_API_URL=<valor real>
N8N_API_KEY=<valor real>
EVOLUTION_API_URL=<valor real>
EVOLUTION_API_KEY=<valor real>
EVOLUTION_INSTANCE=<valor real>
TELEGRAM_BOT_TOKEN=<valor real>
TELEGRAM_CHAT_ID=<valor real>
```

- [ ] **Step 3: Enviar esse `.env` pro VPS via scp**

```bash
SCRATCH="C:/Users/yagia/AppData/Local/Temp/claude/d--CODE-Organiza--o-engenheiro-IA-Prospec/1ace1aa9-dd2f-41dc-a80c-ff5630466169/scratchpad"
scp -i "$SCRATCH/prospec_vps_key" "$SCRATCH/prospec-server.env" root@187.127.59.182:/docker/prospec-ia/.env
```

- [ ] **Step 4: Apagar o arquivo temporário local com os segredos (já não precisa mais dele)**

```bash
SCRATCH="C:/Users/yagia/AppData/Local/Temp/claude/d--CODE-Organiza--o-engenheiro-IA-Prospec/1ace1aa9-dd2f-41dc-a80c-ff5630466169/scratchpad"
rm "$SCRATCH/prospec-server.env"
```

- [ ] **Step 5: Build e subir o container no VPS**

```bash
SCRATCH="C:/Users/yagia/AppData/Local/Temp/claude/d--CODE-Organiza--o-engenheiro-IA-Prospec/1ace1aa9-dd2f-41dc-a80c-ff5630466169/scratchpad"
cd "$SCRATCH" && node ssh-run-key.js "cd /docker/prospec-ia && docker compose up -d --build"
```

Expected: log de build do Docker terminando com o container `prospec-ia-prospec-1` (ou nome similar) no estado `Started`/`Running`, sem erro.

- [ ] **Step 6: Conferir que o container está de pé e sem erro nos logs**

```bash
SCRATCH="C:/Users/yagia/AppData/Local/Temp/claude/d--CODE-Organiza--o-engenheiro-IA-Prospec/1ace1aa9-dd2f-41dc-a80c-ff5630466169/scratchpad"
cd "$SCRATCH" && node ssh-run-key.js "docker ps --filter name=prospec-ia --format 'table {{.Names}}\t{{.Status}}' && docker logs --tail 30 \$(docker ps --filter name=prospec-ia -q)"
```

Expected: status `Up`, logs mostrando `Servidor rodando em http://localhost:3000` (ou mensagem equivalente do `src/index.js`), sem stack trace de erro.

---

### Task 4: Verificar HTTPS, autenticação, e o fluxo completo do app

**Files:**
- Nenhum arquivo novo.

**Interfaces:**
- Consumes: o container rodando da Task 3.
- Produces: confirmação de que `https://prospec.srv1916468.hstgr.cloud` funciona de ponta a ponta.

- [ ] **Step 1: Confirmar que o domínio resolve e tem certificado HTTPS válido**

```bash
curl -sI https://prospec.srv1916468.hstgr.cloud
```

Expected: `HTTP/2 401` (não autenticado ainda — é o esperado, confirma que o basicauth está ativo) e nenhum erro de certificado SSL do curl. Se o certificado ainda não foi emitido (Let's Encrypt pode levar até 1-2 min na primeira vez), aguarde 60s e tente de novo.

- [ ] **Step 2: Confirmar que sem autenticação é bloqueado, e com autenticação correta funciona**

```bash
echo "--- sem auth (deve ser 401) ---"
curl -s -o /dev/null -w "%{http_code}\n" https://prospec.srv1916468.hstgr.cloud
echo "--- com auth certa (deve ser 200) ---"
curl -s -o /dev/null -w "%{http_code}\n" -u "yago.gianni:Yagobg123#321" https://prospec.srv1916468.hstgr.cloud
```

Expected: primeira linha `401`, segunda linha `200`.

- [ ] **Step 3: Confirmar que a API do app responde corretamente através do domínio público**

```bash
curl -s -u "yago.gianni:Yagobg123#321" https://prospec.srv1916468.hstgr.cloud/api/prospects
```

Expected: JSON válido (array de prospects, mesmo que vazio `[]`) — confirma que o backend está lendo do Supabase normalmente através do deploy novo, não só servindo a página estática.

- [ ] **Step 4: Avisar o usuário pra testar manualmente no navegador**

Passar pro usuário: abrir `https://prospec.srv1916468.hstgr.cloud` no navegador (celular, tablet, ou PC), confirmar que pede usuário/senha, entrar com `yago.gianni` / `Yagobg123#321`, e confirmar visualmente que o dashboard carrega igual ao localhost (lista de leads, pipeline, etc). Reportar de volta se algo parecer diferente do esperado.

- [ ] **Step 5: Atualizar a spec com o resultado do teste**

Editar `docs/superpowers/specs/2026-08-25-deploy-hospedagem.md`, adicionando ao final da seção 6 uma confirmação com a data e o resultado real observado (status HTTP confirmados, container rodando, teste manual do usuário).

- [ ] **Step 6: Commit da atualização da spec**

```bash
cd "D:/CODE/Organização engenheiro IA/Prospec/Saas para prospec"
git add docs/superpowers/specs/2026-08-25-deploy-hospedagem.md
git commit -m "$(cat <<'EOF'
docs: confirm Prospec.IA VPS deploy tested and working

https://prospec.srv1916468.hstgr.cloud live, HTTPS valid, Basic Auth
enforced (401 without credentials, 200 with), API responding through
the public domain.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
