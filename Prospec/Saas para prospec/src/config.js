// src/config.js - Centralized environment configuration
import dotenv from 'dotenv';

dotenv.config();

export const PORT = process.env.PORT || 3000;
export const DATA_DIR = process.env.DATA_DIR || './data';
export const GROQ_API_KEY = process.env.GROQ_API_KEY;
export const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
