/**
 * Cliente HTTP para el facilitador X402
 * Permite verificar y hacer settle de transacciones
 */

import axios, { AxiosError } from 'axios';
import type { VerifyResponse, SettleResponse } from '../types/index.js';

/**
 * Requisitos de pago según X402
 */
export interface PaymentRequirements {
  scheme: 'exact';
  network: 'bsv-testnet' | 'bsv-mainnet';
  maxAmountRequired: string;
  resource: string;
  description?: string;
  payTo: string;
  maxTimeoutSeconds: number;
}

/**
 * Payload de pago X402
 */
export interface PaymentPayload {
  x402Version: number;
  scheme: 'exact';
  network: 'bsv-testnet' | 'bsv-mainnet';
  payload: {
    transaction: string;
  };
}

/**
 * Cliente del facilitador X402
 */
export class FacilitatorClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remover trailing slash
  }

  /**
   * Verifica una transacción sin hacer broadcast
   * @param payloadBase64 - Payload X402 en base64
   * @param requirements - Requisitos de pago
   * @returns Respuesta de verificación
   */
  async verify(payloadBase64: string, requirements: PaymentRequirements): Promise<VerifyResponse> {
    try {
      // Parsear payload
      const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
      const payload = JSON.parse(payloadJson) as PaymentPayload;

      // Hacer request
      const response = await axios.post(
        `${this.baseUrl}/verify`,
        {
          payload,
          paymentRequirements: requirements,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 200) {
        return {
          success: true,
          valid: response.data.isValid,
          invalidReason: response.data.invalidReason,
          payer: response.data.payer,
        };
      }

      return {
        success: false,
        error: `Unexpected status: ${response.status}`,
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        const errorMessage = error.response?.data?.error || error.message;
        return {
          success: false,
          error: typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage),
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Hace settle de una transacción (broadcast a blockchain)
   * @param payloadBase64 - Payload X402 en base64
   * @param requirements - Requisitos de pago
   * @returns Respuesta de settle
   */
  async settle(payloadBase64: string, requirements: PaymentRequirements): Promise<SettleResponse> {
    try {
      // Parsear payload
      const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
      const payload = JSON.parse(payloadJson) as PaymentPayload;

      // Hacer request
      const response = await axios.post(
        `${this.baseUrl}/settle`,
        {
          payload,
          paymentRequirements: requirements,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 200) {
        return {
          success: response.data.success,
          txid: response.data.transaction,
          payer: response.data.payer,
          network: response.data.network,
          error: response.data.errorReason,
        };
      }

      return {
        success: false,
        error: `Unexpected status: ${response.status}`,
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        const errorData = error.response?.data;
        return {
          success: false,
          error: errorData?.errorReason || errorData?.error || error.message,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Obtiene las redes soportadas por el facilitador
   * @returns Array de redes soportadas
   */
  async getSupportedNetworks(): Promise<{ success: boolean; networks?: string[]; error?: string }> {
    try {
      const response = await axios.get(`${this.baseUrl}/networks`);

      if (response.status === 200) {
        return {
          success: true,
          networks: response.data.networks,
        };
      }

      return {
        success: false,
        error: `Unexpected status: ${response.status}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Verifica si el facilitador está disponible
   * @returns true si está disponible, false si no
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/networks`, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * Obtiene la URL base del facilitador
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }
}

/**
 * Crea un cliente del facilitador
 * @param baseUrl - URL base del facilitador
 * @returns Cliente del facilitador
 */
export function createFacilitatorClient(baseUrl: string): FacilitatorClient {
  return new FacilitatorClient(baseUrl);
}

/**
 * Crea requisitos de pago de ejemplo para testing
 * @param payTo - Dirección BSV del merchant
 * @param amount - Monto en satoshis
 * @param network - Red BSV
 * @returns Requisitos de pago
 */
export function createPaymentRequirements(
  payTo: string,
  amount: number,
  network: 'bsv-testnet' | 'bsv-mainnet' = 'bsv-testnet'
): PaymentRequirements {
  return {
    scheme: 'exact',
    network,
    maxAmountRequired: amount.toString(),
    resource: 'https://example.com/resource',
    description: 'Payment for resource',
    payTo,
    maxTimeoutSeconds: 300,
  };
}
