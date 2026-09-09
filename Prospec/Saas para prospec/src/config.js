// src/config.js - Centralized environment configuration
import dotenv from 'dotenv';

dotenv.config();

export const PORT = process.env.PORT || 3000;
export const DATA_DIR = process.env.DATA_DIR || './data';
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
export const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pryvtmpjkckjrobyazdw.supabase.co';
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Evolution API (WhatsApp) - mesma instância usada pelo n8n
export const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
export const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
export const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE;

// n8n (usado pra disparar o webhook de "buscar agora" do sourcing automático)
export const N8N_API_URL = process.env.N8N_API_URL;
