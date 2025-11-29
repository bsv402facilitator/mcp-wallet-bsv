/**
 * Módulo para crear payloads X402 desde transacciones BSV
 * Convierte transacciones firmadas al formato X402 base64
 */

import { Transaction } from '@bsv/sdk';
import type { X402PaymentPayload, Network, AccessibilityPreferences } from '../types/index.js';

/**
 * Crea un payload X402 desde una transacción BSV
 * @param tx - Transacción BSV firmada
 * @param network - Red BSV (testnet o mainnet)
 * @param accessibility - Preferencias de accesibilidad opcionales
 * @returns Payload X402 en formato base64 listo para usar en header X-PAYMENT
 */
export function createPaymentPayload(
  tx: Transaction,
  network: Network,
  accessibility?: AccessibilityPreferences
): string {
  try {
    // Obtener transacción en hexadecimal
    const txHex = tx.toHex();

    // Crear estructura X402 con transaction en formato HEX
    // (el facilitador espera HEX, no BASE64)
    const paymentPayload: X402PaymentPayload = {
      x402Version: 1,
      scheme: 'exact',
      network: network === 'testnet' ? 'bsv-testnet' : 'bsv-mainnet',
      payload: {
        transaction: txHex,
      },
      ...(accessibility && { accessibility }),
    };

    // Convertir payload a JSON y luego a base64
    const payloadJson = JSON.stringify(paymentPayload);
    const payloadBase64 = Buffer.from(payloadJson, 'utf8').toString('base64');

    return payloadBase64;
  } catch (error) {
    throw new Error(
      `Error al crear payload X402: ${error instanceof Error ? error.message : 'Error desconocido'}`
    );
  }
}

/**
 * Parsea un payload X402 desde base64
 * @param payloadBase64 - Payload en base64
 * @returns Estructura X402PaymentPayload
 */
export function parsePaymentPayload(payloadBase64: string): X402PaymentPayload {
  try {
    // Decodificar base64 a JSON
    const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');

    // Parsear JSON
    const payload = JSON.parse(payloadJson) as X402PaymentPayload;

    // Validar estructura básica
    if (!payload.x402Version || !payload.scheme || !payload.network || !payload.payload) {
      throw new Error('Estructura de payload X402 inválida');
    }

    return payload;
  } catch (error) {
    throw new Error(
      `Error al parsear payload X402: ${error instanceof Error ? error.message : 'Error desconocido'}`
    );
  }
}

/**
 * Extrae la transacción de un payload X402
 * @param payloadBase64 - Payload en base64
 * @returns Transacción en formato hexadecimal
 */
export function extractTransactionFromPayload(payloadBase64: string): string {
  try {
    const payload = parsePaymentPayload(payloadBase64);

    // La transacción ya está en formato HEX, retornarla directamente
    return payload.payload.transaction;
  } catch (error) {
    throw new Error(
      `Error al extraer transacción: ${error instanceof Error ? error.message : 'Error desconocido'}`
    );
  }
}

/**
 * Valida un payload X402
 * @param payloadBase64 - Payload a validar
 * @returns Información de validación
 */
export function validatePaymentPayload(payloadBase64: string): {
  valid: boolean;
  errors: string[];
  payload?: X402PaymentPayload;
} {
  const errors: string[] = [];

  try {
    // Intentar parsear
    const payload = parsePaymentPayload(payloadBase64);

    // Validar versión
    if (payload.x402Version !== 1) {
      errors.push(`Versión X402 no soportada: ${payload.x402Version}`);
    }

    // Validar scheme
    if (payload.scheme !== 'exact') {
      errors.push(`Scheme no soportado: ${payload.scheme}`);
    }

    // Validar network
    if (payload.network !== 'bsv-mainnet' && payload.network !== 'bsv-testnet') {
      errors.push(`Network inválida: ${payload.network}`);
    }

    // Validar que la transacción esté presente
    if (!payload.payload.transaction) {
      errors.push('Transacción no presente en el payload');
    }

    // Intentar extraer transacción
    try {
      const txHex = extractTransactionFromPayload(payloadBase64);
      if (txHex.length === 0) {
        errors.push('Transacción vacía');
      }
    } catch (error) {
      errors.push(`Error al extraer transacción: ${error instanceof Error ? error.message : 'Error'}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      payload,
    };
  } catch (error) {
    errors.push(`Error al parsear payload: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    return {
      valid: false,
      errors,
    };
  }
}

/**
 * Obtiene información de un payload X402
 * @param payloadBase64 - Payload en base64
 * @returns Información del payload
 */
export function getPayloadInfo(payloadBase64: string): {
  version: number;
  scheme: string;
  network: string;
  transactionSize: number;
  payloadSize: number;
} {
  try {
    const payload = parsePaymentPayload(payloadBase64);
    const txHex = extractTransactionFromPayload(payloadBase64);

    return {
      version: payload.x402Version,
      scheme: payload.scheme,
      network: payload.network,
      transactionSize: txHex.length / 2, // hex es 2 chars por byte
      payloadSize: payloadBase64.length,
    };
  } catch (error) {
    throw new Error(
      `Error al obtener info del payload: ${error instanceof Error ? error.message : 'Error desconocido'}`
    );
  }
}

/**
 * Crea instrucciones de uso para un payload X402
 * @param payloadBase64 - Payload en base64
 * @param resourceUrl - URL del recurso (opcional)
 * @returns Instrucciones formateadas
 */
export function createUsageInstructions(payloadBase64: string, resourceUrl?: string): string {
  const instructions = [
    'Para usar este pago X402, agrega el siguiente header a tu request HTTP:',
    '',
    'X-PAYMENT: ' + payloadBase64,
    '',
  ];

  if (resourceUrl) {
    instructions.push('Ejemplo con curl:');
    instructions.push('');
    instructions.push(`curl -H "X-PAYMENT: ${payloadBase64}" \\`);
    instructions.push(`  ${resourceUrl}`);
    instructions.push('');
  }

  instructions.push('Ejemplo con fetch (JavaScript):');
  instructions.push('');
  instructions.push('fetch(url, {');
  instructions.push('  headers: {');
  instructions.push(`    'X-PAYMENT': '${payloadBase64.substring(0, 50)}...'`);
  instructions.push('  }');
  instructions.push('})');

  return instructions.join('\n');
}

/**
 * Crea un payload X402 completo desde una transacción hex
 * (útil cuando ya tienes la TX en hex)
 * @param txHex - Transacción en hexadecimal
 * @param network - Red BSV
 * @param accessibility - Preferencias de accesibilidad opcionales
 * @returns Payload X402 en base64
 */
export function createPaymentPayloadFromHex(
  txHex: string,
  network: Network,
  accessibility?: AccessibilityPreferences
): string {
  try {
    // Crear estructura X402 directamente con el hex (sin necesidad de parsear la TX)
    const paymentPayload: X402PaymentPayload = {
      x402Version: 1,
      scheme: 'exact',
      network: network === 'testnet' ? 'bsv-testnet' : 'bsv-mainnet',
      payload: {
        transaction: txHex,
      },
      ...(accessibility && { accessibility }),
    };

    const payloadJson = JSON.stringify(paymentPayload);
    return Buffer.from(payloadJson, 'utf8').toString('base64');
  } catch (error) {
    throw new Error(
      `Error al crear payload desde hex: ${error instanceof Error ? error.message : 'Error desconocido'}`
    );
  }
}
