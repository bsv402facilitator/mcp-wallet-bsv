#!/usr/bin/env node

/**
 * Entry point del servidor MCP BSV Wallet
 */

import { createServer } from './server.js';
import { validateConfig } from './config.js';

async function main() {
  try {
    // Validar configuración
    validateConfig();

    // Crear e iniciar el servidor MCP
    createServer();

    // El servidor se conecta automáticamente via stdio
    console.error('BSV Wallet MCP Server iniciado correctamente');

  } catch (error) {
    console.error('Error al iniciar el servidor MCP:', error);
    process.exit(1);
  }
}

main();
