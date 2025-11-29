/**
 * Cliente de red para WhatsOnChain API
 * Maneja consultas de UTXOs, transacciones y broadcast con retry logic
 */

import axios, { AxiosError } from 'axios';
import type { Network, UTXO } from '../types/index.js';

/**
 * Configuración de retry
 */
interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
};

/**
 * Resultado de broadcast
 */
export interface BroadcastResult {
  success: boolean;
  txid?: string;
  error?: string;
}

/**
 * Sleep utility para delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calcula delay con exponential backoff
 */
function getBackoffDelay(attempt: number, config: RetryConfig): number {
  const delay = config.initialDelayMs * Math.pow(2, attempt);
  return Math.min(delay, config.maxDelayMs);
}

/**
 * Verifica si un error es retryable
 */
function isRetryableError(error: AxiosError): boolean {
  // Sin respuesta = error de red (retryable)
  if (!error.response) return true;

  const status = error.response.status;

  // Server errors (5xx) son retryables
  if (status >= 500) return true;

  // Rate limit (429) es retryable
  if (status === 429) return true;

  return false;
}

/**
 * Cliente de red para WhatsOnChain API
 */
export class NetworkClient {
  private baseUrl: string;
  private network: Network;
  private retryConfig: RetryConfig;

  constructor(network: Network = 'testnet', retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG) {
    this.network = network;
    this.retryConfig = retryConfig;
    this.baseUrl =
      network === 'testnet'
        ? 'https://api.whatsonchain.com/v1/bsv/test'
        : 'https://api.whatsonchain.com/v1/bsv/main';
  }

  /**
   * Obtiene los UTXOs de una dirección
   * @param address - Dirección BSV
   * @returns Array de UTXOs
   */
  async getUTXOs(address: string): Promise<UTXO[]> {
    const url = `${this.baseUrl}/address/${address}/unspent`;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const response = await axios.get(url);

        if (response.status === 200) {
          const utxos = response.data as Array<{
            tx_hash: string;
            tx_pos: number;
            value: number;
            height: number;
          }>;

          // Convertir al formato de nuestro tipo UTXO
          return utxos.map((utxo) => ({
            txid: utxo.tx_hash,
            vout: utxo.tx_pos,
            value: utxo.value,
            satoshis: utxo.value,
            height: utxo.height,
            tx_pos: utxo.tx_pos,
          }));
        }

        throw new Error(`Unexpected status: ${response.status}`);
      } catch (error) {
        if (error instanceof AxiosError) {
          // Si es 404, la dirección no tiene UTXOs (retornar array vacío)
          if (error.response?.status === 404) {
            return [];
          }

          // Si es retryable y quedan intentos
          if (isRetryableError(error) && attempt < this.retryConfig.maxRetries) {
            const delay = getBackoffDelay(attempt, this.retryConfig);
            await sleep(delay);
            continue;
          }
        }

        // Error no retryable o max retries excedido
        throw new Error(
          `Error al obtener UTXOs: ${error instanceof Error ? error.message : 'Error desconocido'}`
        );
      }
    }

    throw new Error('Max retries excedido al obtener UTXOs');
  }

  /**
   * Obtiene una transacción en formato hexadecimal
   * @param txid - Transaction ID
   * @returns Transacción en hex
   */
  async getTransactionHex(txid: string): Promise<string> {
    const url = `${this.baseUrl}/tx/${txid}/hex`;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const response = await axios.get(url);

        if (response.status === 200) {
          return response.data.trim();
        }

        throw new Error(`Unexpected status: ${response.status}`);
      } catch (error) {
        if (error instanceof AxiosError) {
          // Si es 404, la transacción no existe
          if (error.response?.status === 404) {
            throw new Error(`Transacción no encontrada: ${txid}`);
          }

          // Si es retryable y quedan intentos
          if (isRetryableError(error) && attempt < this.retryConfig.maxRetries) {
            const delay = getBackoffDelay(attempt, this.retryConfig);
            await sleep(delay);
            continue;
          }
        }

        // Error no retryable o max retries excedido
        throw new Error(
          `Error al obtener transacción: ${error instanceof Error ? error.message : 'Error desconocido'}`
        );
      }
    }

    throw new Error('Max retries excedido al obtener transacción');
  }

  /**
   * Broadcast de una transacción a la blockchain
   * @param txHex - Transacción en formato hexadecimal
   * @returns Resultado del broadcast con txid
   */
  async broadcastTransaction(txHex: string): Promise<BroadcastResult> {
    const url = `${this.baseUrl}/tx/raw`;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const response = await axios.post(
          url,
          { txhex: txHex },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.status === 200) {
          const txid = response.data.trim();
          return {
            success: true,
            txid,
          };
        }

        throw new Error(`Unexpected status: ${response.status}`);
      } catch (error) {
        if (error instanceof AxiosError) {
          const errorMessage = error.response?.data || error.message;

          // Verificar si ya fue broadcast (no es un error crítico)
          if (
            typeof errorMessage === 'string' &&
            (errorMessage.includes('Transaction already in the mempool') ||
              errorMessage.includes('txn-already-known') ||
              errorMessage.includes('Transaction already exists') ||
              errorMessage.includes('already in block chain'))
          ) {
            return {
              success: false,
              error: 'Transacción ya fue broadcast',
            };
          }

          // Verificar inputs faltantes o gastados (no retryable)
          if (
            typeof errorMessage === 'string' &&
            (errorMessage.includes('Missing inputs') ||
              errorMessage.includes('bad-txns-inputs-spent') ||
              errorMessage.includes('txn-mempool-conflict'))
          ) {
            return {
              success: false,
              error: errorMessage,
            };
          }

          // Si es retryable y quedan intentos
          if (isRetryableError(error) && attempt < this.retryConfig.maxRetries) {
            const delay = getBackoffDelay(attempt, this.retryConfig);
            await sleep(delay);
            continue;
          }

          // Error no retryable
          return {
            success: false,
            error: typeof errorMessage === 'string' ? errorMessage : 'Error al broadcast',
          };
        }

        // Error desconocido
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Error desconocido',
        };
      }
    }

    return {
      success: false,
      error: 'Max retries excedido',
    };
  }

  /**
   * Obtiene el balance de una dirección
   * @param address - Dirección BSV
   * @returns Balance en satoshis
   */
  async getBalance(address: string): Promise<number> {
    const utxos = await this.getUTXOs(address);
    return utxos.reduce((sum, utxo) => sum + utxo.value, 0);
  }

  /**
   * Verifica si una transacción existe en la blockchain
   * @param txid - Transaction ID
   * @returns true si existe, false si no
   */
  async transactionExists(txid: string): Promise<boolean> {
    try {
      await this.getTransactionHex(txid);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtiene el historial de transacciones de una dirección
   * @param address - Dirección BSV
   * @param limit - Número máximo de transacciones a retornar (opcional)
   * @returns Array de transacciones
   */
  async getTransactionHistory(address: string, limit?: number): Promise<Array<{ tx_hash: string; height: number; tx_pos: number }>> {
    const url = `${this.baseUrl}/address/${address}/history`;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const response = await axios.get(url);

        if (response.status === 200) {
          let txs = response.data as Array<{
            tx_hash: string;
            height: number;
            tx_pos: number;
          }>;

          // Aplicar límite si se especificó
          if (limit && limit > 0) {
            txs = txs.slice(0, limit);
          }

          return txs;
        }

        throw new Error(`Unexpected status: ${response.status}`);
      } catch (error) {
        if (error instanceof AxiosError) {
          // Si es 404, la dirección no tiene historial (retornar array vacío)
          if (error.response?.status === 404) {
            return [];
          }

          // Si es retryable y quedan intentos
          if (isRetryableError(error) && attempt < this.retryConfig.maxRetries) {
            const delay = getBackoffDelay(attempt, this.retryConfig);
            await sleep(delay);
            continue;
          }
        }

        // Error no retryable o max retries excedido
        throw new Error(
          `Error al obtener historial de transacciones: ${error instanceof Error ? error.message : 'Error desconocido'}`
        );
      }
    }

    throw new Error('Max retries excedido al obtener historial de transacciones');
  }

  /**
   * Obtiene detalles completos de una transacción
   * @param txid - Transaction ID
   * @returns Detalles completos de la transacción
   */
  async getTransactionDetails(txid: string): Promise<any> {
    const url = `${this.baseUrl}/tx/hash/${txid}`;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const response = await axios.get(url);

        if (response.status === 200) {
          return response.data;
        }

        throw new Error(`Unexpected status: ${response.status}`);
      } catch (error) {
        if (error instanceof AxiosError) {
          // Si es 404, la transacción no existe
          if (error.response?.status === 404) {
            throw new Error(`Transacción no encontrada: ${txid}`);
          }

          // Si es retryable y quedan intentos
          if (isRetryableError(error) && attempt < this.retryConfig.maxRetries) {
            const delay = getBackoffDelay(attempt, this.retryConfig);
            await sleep(delay);
            continue;
          }
        }

        // Error no retryable o max retries excedido
        throw new Error(
          `Error al obtener detalles de transacción: ${error instanceof Error ? error.message : 'Error desconocido'}`
        );
      }
    }

    throw new Error('Max retries excedido al obtener detalles de transacción');
  }

  /**
   * Obtiene la altura actual del bloque
   * @returns Altura del bloque actual
   */
  async getCurrentBlockHeight(): Promise<number> {
    const url = `${this.baseUrl}/chain/info`;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const response = await axios.get(url);

        if (response.status === 200) {
          const chainInfo = response.data as { blocks: number };
          return chainInfo.blocks;
        }

        throw new Error(`Unexpected status: ${response.status}`);
      } catch (error) {
        if (error instanceof AxiosError) {
          // Si es retryable y quedan intentos
          if (isRetryableError(error) && attempt < this.retryConfig.maxRetries) {
            const delay = getBackoffDelay(attempt, this.retryConfig);
            await sleep(delay);
            continue;
          }
        }

        // Error no retryable o max retries excedido
        throw new Error(
          `Error al obtener altura del bloque: ${error instanceof Error ? error.message : 'Error desconocido'}`
        );
      }
    }

    throw new Error('Max retries excedido al obtener altura del bloque');
  }

  /**
   * Obtiene información de la red actual
   */
  getNetworkInfo(): { network: Network; baseUrl: string } {
    return {
      network: this.network,
      baseUrl: this.baseUrl,
    };
  }
}

/**
 * Crea un cliente de red para la network especificada
 */
export function createNetworkClient(network: Network): NetworkClient {
  return new NetworkClient(network);
}
