# Sistema de Laudos Técnicos — Karrer Engenharia

Aplicação web 100% client-side para gerar o registro fotográfico de laudos
técnicos de engenharia: sobe fotos, escreve a legenda de cada uma, escolhe o
tamanho (1/4, 1/2 ou página inteira) e exporta um PDF com a identidade visual
da Karrer (faixa azul, fotos com legenda em caixa). O restante do laudo
(capa, dados do cliente, conclusão etc.) é montado separadamente — o PDF
gerado aqui é feito para ser unido a esse restante depois, por exemplo com o
iLovePDF. Histórico salvo em `localStorage`. Sem backend, sem banco de dados.

## Rodar localmente

```bash
npm install
cp .env.example .env
# edite .env com seu usuário e hash de senha (veja "Como gerar o hash da senha")
npm run dev
```

## Como gerar o hash da senha

O login usa usuário + senha definidos em `.env` (`VITE_APP_USERNAME`,
`VITE_APP_PASSWORD_HASH`). Isso é uma trava de acesso simples — serve para
impedir que um visitante casual abra o app, não é uma proteção de segurança
de verdade. `VITE_APP_PASSWORD_HASH` guarda uma codificação reversível
(Base64 de `encodeURIComponent(senha)`), não um hash criptográfico, e esse
valor fica embutido como texto simples no JavaScript publicado — qualquer
pessoa com acesso ao site publicado consegue decodificá-lo e recuperar a
senha original. Por isso: **não reutilize essa senha em nenhum outro lugar**
e não trate o login como proteção dos dados — os laudos de verdade ficam no
`localStorage` de cada navegador, independentemente de estar logado ou não.

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
