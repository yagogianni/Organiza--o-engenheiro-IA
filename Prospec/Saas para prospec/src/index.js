// src/index.js - Entry Point
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PORT, GROQ_API_KEY } from './config.js';
import { initializeDataDir } from './services/storage.js';
import apiRoutes from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(join(__dirname, '../public')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '0.1.0',
    phase: 'MVP - Fase 1'
  });
});

// API Routes
app.use('/api', apiRoutes);

await initializeDataDir();

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║     🎯 PROSPEC.AI - Sistema Ativo       ║
╠════════════════════════════════════════╣
║  Server rodando em:                     ║
║  http://localhost:${PORT}                   ║
║                                        ║
║  Documentação:                          ║
║  • Claude.md - Especificação            ║
║  • PLANO_FASE_1.md - Tech Stack         ║
║  • README.md - Quick Start              ║
╚════════════════════════════════════════╝
  `);

  if (!GROQ_API_KEY) {
    console.warn('⚠️  AVISO: GROQ_API_KEY não configurada em .env');
    console.warn('   Abrir .env e adicionar sua chave da API (grátis em https://console.groq.com)');
  }
});
