/**
 * Configuración del servidor MCP
 */

import { homedir } from 'os';
import { join } from 'path';
import type { Config, Network } from './types/index.js';

function getEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

function getNetwork(): Network {
  const network = getEnv('BSV_NETWORK', 'testnet').toLowerCase();
  if (network !== 'mainnet' && network !== 'testnet') {
    throw new Error(`Invalid BSV_NETWORK: ${network}. Must be 'mainnet' or 'testnet'`);
  }
  return network as Network;
}

function getWalletsDir(): string {
  const defaultDir = join(homedir(), '.bsv-wallets');
  return getEnv('WALLETS_DIR', defaultDir);
}

function getLogLevel(): 'debug' | 'info' | 'warn' | 'error' {
  const level = getEnv('LOG_LEVEL', 'info').toLowerCase();
  if (!['debug', 'info', 'warn', 'error'].includes(level)) {
    return 'info';
  }
  return level as 'debug' | 'info' | 'warn' | 'error';
}

export const config: Config = {
  network: getNetwork(),
  walletsDir: getWalletsDir(),
  facilitatorUrl: getEnv('FACILITATOR_URL', 'https://facilitador-bsv-x402.workers.dev'),
  logLevel: getLogLevel()
};

export function validateConfig(): void {
  if (!config.walletsDir) {
    throw new Error('WALLETS_DIR is required');
  }
  if (!config.facilitatorUrl) {
    throw new Error('FACILITATOR_URL is required');
  }
}
