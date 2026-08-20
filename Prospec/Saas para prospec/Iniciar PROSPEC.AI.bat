@echo off
title PROSPEC.AI
cd /d "%~dp0"

if not exist node_modules (
  echo Primeira vez rodando - instalando dependencias, aguarde...
  call npm install
)

if not exist .env (
  echo.
  echo AVISO: arquivo .env nao encontrado.
  echo Copie .env.example para .env e adicione sua GROQ_API_KEY
  echo antes de usar a analise por IA.
  echo.
)

start "" cmd /c "timeout /t 2 >nul && start http://localhost:3000"

echo.
echo Iniciando o PROSPEC.AI...
echo Para PARAR o programa, feche esta janela.
echo.
call npm start
