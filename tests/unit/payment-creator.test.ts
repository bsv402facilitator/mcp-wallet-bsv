/**
 * Tests unitarios para el módulo payment-creator
 * Verifica que los payloads X402 se generen con el formato correcto (HEX)
 */

import { describe, it, expect } from 'vitest';
import {
  parsePaymentPayload,
  extractTransactionFromPayload,
  validatePaymentPayload,
  getPayloadInfo,
  createPaymentPayloadFromHex,
} from '../../src/x402/payment-creator.js';

describe('Payment Creator - Formato X402', () => {
  // Usar un TX hex válido real de testnet para pruebas
  // Esta TX fue generada y verificada en la red real
  const validTxHex =
    '01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff0704ffff001d0104ffffffff0100f2052a0100000043410496b538e853519c726a2c91e61ec11600ae1390813a627c66fb8be7947be63c52da7589379515d4e0a604f8141781e62294721166bf621e73a82cbf2342c858eeac00000000';

  const createTestTxHex = () => validTxHex;

  describe('createPaymentPayloadFromHex', () => {
    it('debe crear payload con transaction en formato HEX', () => {
      const txHex = createTestTxHex();
      const payloadBase64 = createPaymentPayloadFromHex(txHex, 'testnet');

      expect(payloadBase64).toBeDefined();
      expect(typeof payloadBase64).toBe('string');

      // Decodificar el payload
      const payload = parsePaymentPayload(payloadBase64);

      // Verificar que transaction sea HEX (no BASE64)
      // HEX solo contiene caracteres 0-9, a-f
      expect(payload.payload.transaction).toMatch(/^[0-9a-f]+$/i);

      // Verificar que NO sea BASE64 (BASE64 contiene +, /, =)
      expect(payload.payload.transaction).not.toMatch(/[+\/=]/);
    });

    it('debe incluir todos los campos requeridos X402', () => {
      const txHex = createTestTxHex();
      const payloadBase64 = createPaymentPayloadFromHex(txHex, 'testnet');
      const payload = parsePaymentPayload(payloadBase64);

      expect(payload.x402Version).toBe(1);
      expect(payload.scheme).toBe('exact');
      expect(payload.network).toBe('bsv-testnet');
      expect(payload.payload.transaction).toBeTruthy();
    });

    it('debe mapear correctamente mainnet', () => {
      const txHex = createTestTxHex();
      const payloadBase64 = createPaymentPayloadFromHex(txHex, 'mainnet');
      const payload = parsePaymentPayload(payloadBase64);

      expect(payload.network).toBe('bsv-mainnet');
    });

    it('debe mapear correctamente testnet', () => {
      const txHex = createTestTxHex();
      const payloadBase64 = createPaymentPayloadFromHex(txHex, 'testnet');
      const payload = parsePaymentPayload(payloadBase64);

      expect(payload.network).toBe('bsv-testnet');
    });
  });

  describe('extractTransactionFromPayload', () => {
    it('debe retornar transaction en formato HEX', () => {
      const txHex = createTestTxHex();
      const payloadBase64 = createPaymentPayloadFromHex(txHex, 'testnet');
      const extractedHex = extractTransactionFromPayload(payloadBase64);

      // Verificar que sea HEX válido
      expect(extractedHex).toMatch(/^[0-9a-f]+$/i);
      expect(extractedHex).not.toMatch(/[+\/=]/);
    });

    it('debe retornar la misma transacción original', () => {
      const txHex = createTestTxHex();

      const payloadBase64 = createPaymentPayloadFromHex(txHex, 'testnet');
      const extractedHex = extractTransactionFromPayload(payloadBase64);

      expect(extractedHex).toBe(txHex);
    });

    it('debe preservar el formato HEX exacto', () => {
      const txHex = createTestTxHex();

      const payloadBase64 = createPaymentPayloadFromHex(txHex, 'testnet');
      const extractedHex = extractTransactionFromPayload(payloadBase64);

      // Debe ser idéntico (incluyendo mayúsculas/minúsculas)
      expect(extractedHex).toBe(txHex);
    });
  });

  describe('validatePaymentPayload', () => {
    it('debe validar payload con HEX correcto', () => {
      const txHex = createTestTxHex();
      const payloadBase64 = createPaymentPayloadFromHex(txHex, 'testnet');

      const validation = validatePaymentPayload(payloadBase64);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('debe detectar transaction vacía', () => {
      const payload = {
        x402Version: 1,
        scheme: 'exact' as const,
        network: 'bsv-testnet' as const,
        payload: {
          transaction: '',
        },
      };

      const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
      const validation = validatePaymentPayload(payloadBase64);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('vacía'))).toBe(true);
    });
  });

  describe('getPayloadInfo', () => {
    it('debe retornar información correcta del payload', () => {
      const txHex = createTestTxHex();
      const payloadBase64 = createPaymentPayloadFromHex(txHex, 'testnet');

      const info = getPayloadInfo(payloadBase64);

      expect(info.version).toBe(1);
      expect(info.scheme).toBe('exact');
      expect(info.network).toBe('bsv-testnet');
      expect(info.transactionSize).toBeGreaterThan(0);
      expect(info.payloadSize).toBeGreaterThan(0);
    });
  });

  describe('Compatibilidad con Facilitador', () => {
    it('debe generar el mismo formato que el script diagnose-settle.ts', () => {
      const txHex = createTestTxHex();

      // Formato del MCP Wallet
      const mcpPayloadBase64 = createPaymentPayloadFromHex(txHex, 'testnet');
      const mcpPayload = parsePaymentPayload(mcpPayloadBase64);

      // Formato del script diagnose-settle.ts
      const diagnosePayload = {
        x402Version: 1,
        scheme: 'exact' as const,
        network: 'bsv-testnet' as const,
        payload: {
          transaction: txHex, // HEX directo
        },
      };

      // Deben tener la misma estructura
      expect(mcpPayload.x402Version).toBe(diagnosePayload.x402Version);
      expect(mcpPayload.scheme).toBe(diagnosePayload.scheme);
      expect(mcpPayload.network).toBe(diagnosePayload.network);
      expect(mcpPayload.payload.transaction).toBe(diagnosePayload.payload.transaction);
    });

    it('el payload debe contener transaction en formato HEX directo', () => {
      const txHex = createTestTxHex();
      const payloadBase64 = createPaymentPayloadFromHex(txHex, 'testnet');
      const payload = parsePaymentPayload(payloadBase64);

      // La transacción debe estar en HEX (sin encoding adicional)
      expect(payload.payload.transaction).toBe(txHex);
      expect(payload.payload.transaction).toMatch(/^[0-9a-f]+$/i);
    });
  });
});
