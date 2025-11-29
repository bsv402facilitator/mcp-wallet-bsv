/**
 * Tests unitarios básicos para los MCP tools
 */

import { describe, it, expect } from 'vitest';
import { handleManageWallets } from '../../src/tools/manage-wallets.js';
import { handleGetBalance } from '../../src/tools/get-balance.js';
import { handleSignMessage } from '../../src/tools/sign-message.js';
import { handleCreateX402Payment } from '../../src/tools/create-x402-payment.js';

describe('MCP Tools - Exports', () => {
  it('handleManageWallets debe estar definido', () => {
    expect(handleManageWallets).toBeDefined();
    expect(typeof handleManageWallets).toBe('function');
  });

  it('handleGetBalance debe estar definido', () => {
    expect(handleGetBalance).toBeDefined();
    expect(typeof handleGetBalance).toBe('function');
  });

  it('handleSignMessage debe estar definido', () => {
    expect(handleSignMessage).toBeDefined();
    expect(typeof handleSignMessage).toBe('function');
  });

  it('handleCreateX402Payment debe estar definido', () => {
    expect(handleCreateX402Payment).toBeDefined();
    expect(typeof handleCreateX402Payment).toBe('function');
  });
});

describe('MCP Tools - Error Handling', () => {
  it('handleManageWallets debe retornar error con parámetros inválidos', async () => {
    const result = await handleManageWallets({});

    expect(result).toHaveProperty('content');
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content[0]).toHaveProperty('type', 'text');

    const response = JSON.parse(result.content[0].text);
    expect(response.success).toBe(false);
    expect(response).toHaveProperty('error');
  });

  it('handleGetBalance debe retornar error sin walletId', async () => {
    const result = await handleGetBalance({});

    expect(result).toHaveProperty('content');
    const response = JSON.parse(result.content[0].text);
    expect(response.success).toBe(false);
    expect(response.error).toContain('walletId');
  });

  it('handleSignMessage debe retornar error sin parámetros requeridos', async () => {
    const result = await handleSignMessage({});

    expect(result).toHaveProperty('content');
    const response = JSON.parse(result.content[0].text);
    expect(response.success).toBe(false);
    expect(response).toHaveProperty('error');
  });

  it('handleCreateX402Payment debe retornar error sin parámetros requeridos', async () => {
    const result = await handleCreateX402Payment({});

    expect(result).toHaveProperty('content');
    const response = JSON.parse(result.content[0].text);
    expect(response.success).toBe(false);
    expect(response).toHaveProperty('error');
  });
});

describe('MCP Tools - Response Format', () => {
  it('handleManageWallets list debe retornar formato correcto', async () => {
    const result = await handleManageWallets({ operation: 'list' });

    expect(result).toHaveProperty('content');
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content[0]).toHaveProperty('type', 'text');

    const response = JSON.parse(result.content[0].text);
    expect(response).toHaveProperty('success');

    if (response.success) {
      expect(response).toHaveProperty('operation', 'list');
      expect(response).toHaveProperty('wallets');
      expect(Array.isArray(response.wallets)).toBe(true);
    }
  });
});
