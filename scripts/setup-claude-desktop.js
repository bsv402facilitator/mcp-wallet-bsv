#!/usr/bin/env node

/**
 * Script de configuración automática para Claude Desktop
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

function getClaudeConfigPath() {
  const platform = process.platform;

  if (platform === 'win32') {
    return join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json');
  } else if (platform === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  } else {
    return join(homedir(), '.config', 'Claude', 'claude_desktop_config.json');
  }
}

function main() {
  try {
    const configPath = getClaudeConfigPath();
    const configDir = dirname(configPath);

    console.log('🔧 Configurando BSV Wallet MCP para Claude Desktop...\n');
    console.log(`📁 Directorio de configuración: ${configDir}`);
    console.log(`📄 Archivo de configuración: ${configPath}\n`);

    // Crear directorio si no existe
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
      console.log('✅ Directorio de configuración creado\n');
    }

    // Leer configuración existente o crear nueva
    let config = { mcpServers: {} };

    if (existsSync(configPath)) {
      try {
        const content = readFileSync(configPath, 'utf8');
        config = JSON.parse(content);
        console.log('📖 Configuración existente encontrada\n');
      } catch (error) {
        console.warn('⚠️  Error al leer configuración existente, creando nueva\n');
      }
    }

    // Asegurar que mcpServers existe
    if (!config.mcpServers) {
      config.mcpServers = {};
    }

    // Determinar la ruta del ejecutable compilado
    const distPath = join(projectRoot, 'dist', 'index.js');
    const walletsDir = join(homedir(), '.bsv-wallets');

    // Configurar el servidor MCP
    config.mcpServers['bsv-wallet'] = {
      command: 'node',
      args: [distPath],
      env: {
        BSV_NETWORK: 'testnet',
        WALLETS_DIR: walletsDir,
        FACILITATOR_URL: 'https://facilitador-bsv-x402.workers.dev',
        LOG_LEVEL: 'info'
      }
    };

    // Guardar configuración
    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');

    console.log('✅ Configuración actualizada exitosamente!\n');
    console.log('📋 Configuración del servidor MCP:\n');
    console.log(JSON.stringify(config.mcpServers['bsv-wallet'], null, 2));
    console.log('\n🎯 Próximos pasos:\n');
    console.log('  1. Asegúrate de haber compilado el proyecto: npm run build');
    console.log('  2. Reinicia Claude Desktop');
    console.log('  3. El servidor estará disponible para usar\n');
    console.log(`💼 Las wallets se guardarán en: ${walletsDir}\n`);

  } catch (error) {
    console.error('❌ Error durante la configuración:', error.message);
    process.exit(1);
  }
}

main();
