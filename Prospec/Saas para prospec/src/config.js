// src/config.js - Centralized environment configuration
import dotenv from 'dotenv';

dotenv.config();

export const PORT = process.env.PORT || 3000;
export const DATA_DIR = process.env.DATA_DIR || './data';
export const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
export const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-5';
