# Sistema de Laudos Técnicos — Karrer Engenharia

Aplicação web 100% client-side para geração de laudos técnicos de engenharia
(vistoria cautelar, laudo técnico, orçamento), com PDF gerado no navegador e
histórico salvo em `localStorage`. Sem backend, sem banco de dados.

## Rodar localmente

```bash
npm install
cp .env.example .env
# edite .env com seu usuário e hash de senha (veja "Como gerar o hash da senha")
npm run dev
```

## Como gerar o hash da senha

O login usa usuário + senha definidos em `.env` (`VITE_APP_USERNAME`,
`VITE_APP_PASSWORD_HASH`). A senha nunca fica em texto puro no projeto — só o
hash.

No console do navegador (ou no Node):
```js
btoa(encodeURIComponent("sua-senha-aqui"))
```
Copie o resultado para `VITE_APP_PASSWORD_HASH` no `.env`.

## Trocar a senha

1. Gere um novo hash com o comando acima.
2. Atualize `VITE_APP_PASSWORD_HASH` no `.env` (local) e nas variáveis de
   ambiente do projeto no Vercel (produção).
3. Faça um novo deploy (ou reinicie o servidor local) para o novo hash valer.

## Deploy no Vercel

1. Suba o projeto para um repositório Git.
2. Importe o repositório no Vercel.
3. Em Settings → Environment Variables, configure `VITE_APP_USERNAME` e
   `VITE_APP_PASSWORD_HASH`.
4. O `vercel.json` já contém o rewrite de SPA necessário — nenhuma
   configuração adicional é exigida.

## Testes

```bash
npm run test
```

## Sobre os dados

Todos os laudos — incluindo as fotos, já comprimidas no navegador antes de
salvar — ficam no `localStorage` do navegador usado. Não há sincronização
entre dispositivos ou navegadores diferentes: é a mesma máquina/navegador
que gera e mantém o histórico.
