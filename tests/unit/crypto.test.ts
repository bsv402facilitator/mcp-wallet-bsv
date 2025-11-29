/**
 * Tests unitarios para el módulo de encriptación
 */

import { describe, it, expect } from 'vitest';
import { encryptWif, decryptWif, validateEncryptedData } from '../../src/wallet/crypto.js';

describe('Wallet Crypto', () => {
  const testWif = 'L1aW4aubDFB7yfras2S1mN3bqg9nwySY8nkoLmJebSLD5BWv3ENZ';
  const testPassword = 'test-password-123';

  describe('encryptWif', () => {
    it('debe encriptar un WIF correctamente', async () => {
      const encrypted = await encryptWif(testWif, testPassword);

      expect(encrypted).toBeDefined();
      expect(encrypted.algorithm).toBe('aes-256-gcm');
      expect(encrypted.salt).toBeTruthy();
      expect(encrypted.iv).toBeTruthy();
      expect(encrypted.authTag).toBeTruthy();
      expect(encrypted.data).toBeTruthy();
    });

    it('debe generar diferentes datos encriptados en cada llamada', async () => {
      const encrypted1 = await encryptWif(testWif, testPassword);
      const encrypted2 = await encryptWif(testWif, testPassword);

      // Salt e IV deben ser diferentes
      expect(encrypted1.salt).not.toBe(encrypted2.salt);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      expect(encrypted1.data).not.toBe(encrypted2.data);
    });

    it('debe rechazar WIF vacío', async () => {
      await expect(encryptWif('', testPassword)).rejects.toThrow();
    });
  });

  describe('decryptWif', () => {
    it('debe desencriptar correctamente con el password correcto', async () => {
      const encrypted = await encryptWif(testWif, testPassword);
      const decrypted = await decryptWif(encrypted, testPassword);

      expect(decrypted).toBe(testWif);
    });

    it('debe rechazar password incorrecto', async () => {
      const encrypted = await encryptWif(testWif, testPassword);

      await expect(
        decryptWif(encrypted, 'wrong-password')
      ).rejects.toThrow(/password incorrecto/i);
    });

    it('debe rechazar datos corruptos', async () => {
      const encrypted = await encryptWif(testWif, testPassword);

      // Corromper el authTag
      const corrupted = {
        ...encrypted,
        authTag: 'invalid-auth-tag-xxx'
      };

      await expect(
        decryptWif(corrupted, testPassword)
      ).rejects.toThrow();
    });

    it('debe rechazar algoritmo no soportado', async () => {
      const encrypted = await encryptWif(testWif, testPassword);

      const invalid = {
        ...encrypted,
        algorithm: 'aes-128-cbc' as any
      };

      await expect(
        decryptWif(invalid, testPassword)
      ).rejects.toThrow(/algoritmo no soportado/i);
    });
  });

  describe('validateEncryptedData', () => {
    it('debe validar datos encriptados correctos', async () => {
      const encrypted = await encryptWif(testWif, testPassword);
      expect(validateEncryptedData(encrypted)).toBe(true);
    });

    it('debe rechazar datos incompletos', () => {
      const invalid = {
        algorithm: 'aes-256-gcm',
        salt: 'salt',
        iv: 'iv'
        // Falta authTag y data
      };

      expect(validateEncryptedData(invalid)).toBe(false);
    });

    it('debe rechazar tipos incorrectos', () => {
      expect(validateEncryptedData(null)).toBe(false);
      expect(validateEncryptedData(undefined)).toBe(false);
      expect(validateEncryptedData('string')).toBe(false);
      expect(validateEncryptedData(123)).toBe(false);
      expect(validateEncryptedData([])).toBe(false);
    });
  });

  describe('Integración encrypt/decrypt', () => {
    it('debe manejar ciclos múltiples de encriptación/desencriptación', async () => {
      let current = testWif;

      for (let i = 0; i < 5; i++) {
        const encrypted = await encryptWif(current, testPassword);
        const decrypted = await decryptWif(encrypted, testPassword);
        expect(decrypted).toBe(current);
      }
    });

    it('debe preservar caracteres especiales', async () => {
      const specialWif = testWif; // WIF ya tiene caracteres especiales
      const encrypted = await encryptWif(specialWif, testPassword);
      const decrypted = await decryptWif(encrypted, testPassword);

      expect(decrypted).toBe(specialWif);
    });
  });
});
