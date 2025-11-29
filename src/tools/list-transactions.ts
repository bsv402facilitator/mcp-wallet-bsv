/**
 * Tool MCP: list_transactions
 * Lista el historial de transacciones de una wallet combinando blockchain y registro local
 */

import { walletManager } from '../wallet/manager.js';
import { createNetworkClient } from '../bsv/network-client.js';
import { loadLocalHistory, findLocalRecord } from '../bsv/transaction-history.js';
import type {
  ListTransactionsParams,
  ListTransactionsResponse,
  EnrichedTransaction,
  WOCTransactionDetails,
} from '../types/index.js';

/**
 * Tiempo de genesis de BSV (bloque 0)
 * 2009-01-03 18:15:05 UTC
 */
const BSV_GENESIS_TIME = 1231006505000;

/**
 * Tiempo promedio de bloque en milisegundos (10 minutos)
 */
const AVERAGE_BLOCK_TIME_MS = 600000;

/**
 * Determina el tipo de transacción basado en inputs y outputs
 * @param details - Detalles de la transacción
 * @param walletAddress - Dirección de la wallet
 * @returns Tipo de transacción
 */
function determineTransactionType(
  details: WOCTransactionDetails,
  walletAddress: string
): 'sent' | 'received' | 'self' {
  // Extraer todas las direcciones de inputs y outputs
  const inputAddresses = new Set<string>();
  const outputAddresses = new Set<string>();

  // Procesar inputs
  for (const input of details.vin) {
    if (input.address) {
      inputAddresses.add(input.address);
    }
  }

  // Procesar outputs
  for (const output of details.vout) {
    if (output.scriptPubKey?.addresses) {
      for (const addr of output.scriptPubKey.addresses) {
        outputAddresses.add(addr);
      }
    }
  }

  const walletInInputs = inputAddresses.has(walletAddress);
  const walletInOutputs = outputAddresses.has(walletAddress);

  // Si la wallet está en inputs y outputs, es una transacción a sí misma
  if (walletInInputs && walletInOutputs) {
    return 'self';
  }

  // Si la wallet está en inputs pero no en outputs, es enviada
  if (walletInInputs && !walletInOutputs) {
    return 'sent';
  }

  // Si la wallet está en outputs pero no en inputs, es recibida
  return 'received';
}

/**
 * Calcula el monto neto de la transacción para la wallet
 * @param details - Detalles de la transacción
 * @param walletAddress - Dirección de la wallet
 * @param type - Tipo de transacción
 * @returns Monto neto en satoshis
 */
function calculateNetAmount(
  details: WOCTransactionDetails,
  walletAddress: string,
  type: 'sent' | 'received' | 'self'
): number {
  let amountReceived = 0;
  let amountSent = 0;

  // Calcular lo recibido (suma de outputs a la wallet)
  for (const output of details.vout) {
    if (output.scriptPubKey?.addresses?.includes(walletAddress)) {
      amountReceived += output.value;
    }
  }

  // Calcular lo enviado (suma de inputs desde la wallet)
  for (const input of details.vin) {
    if (input.address === walletAddress && input.value) {
      amountSent += input.value;
    }
  }

  // Para transacciones recibidas, el monto es positivo
  if (type === 'received') {
    return amountReceived;
  }

  // Para transacciones enviadas, retornar lo enviado (sin incluir fee aquí, se calcula aparte)
  if (type === 'sent') {
    // Monto enviado = total inputs - total outputs a la wallet (cambio)
    return -(amountSent - amountReceived);
  }

  // Para transacciones 'self', el único costo es el fee
  // Retornar negativo del fee
  const fee = calculateFee(details);
  return -fee;
}

/**
 * Extrae las direcciones de inputs y outputs
 * @param details - Detalles de la transacción
 * @param walletAddress - Dirección de la wallet
 * @returns Objeto con arrays de direcciones
 */
function extractAddresses(
  details: WOCTransactionDetails,
  walletAddress: string
): { from: string[]; to: string[] } {
  const fromAddresses = new Set<string>();
  const toAddresses = new Set<string>();

  // Extraer direcciones de inputs
  for (const input of details.vin) {
    if (input.address && input.address !== walletAddress) {
      fromAddresses.add(input.address);
    }
  }

  // Extraer direcciones de outputs
  for (const output of details.vout) {
    if (output.scriptPubKey?.addresses) {
      for (const addr of output.scriptPubKey.addresses) {
        if (addr !== walletAddress) {
          toAddresses.add(addr);
        }
      }
    }
  }

  return {
    from: Array.from(fromAddresses),
    to: Array.from(toAddresses),
  };
}

/**
 * Calcula el fee de una transacción
 * @param details - Detalles de la transacción
 * @returns Fee en satoshis
 */
function calculateFee(details: WOCTransactionDetails): number {
  // Calcular total de inputs
  let totalInput = 0;
  for (const input of details.vin) {
    if (input.value) {
      totalInput += input.value;
    }
  }

  // Calcular total de outputs
  let totalOutput = 0;
  for (const output of details.vout) {
    totalOutput += output.value;
  }

  // Fee = inputs - outputs
  return totalInput - totalOutput;
}

/**
 * Estima el timestamp de una transacción basándose en la altura del bloque
 * @param height - Altura del bloque
 * @returns Timestamp en formato ISO 8601
 */
function estimateTimestamp(height: number): string {
  // Estimar tiempo basado en bloques: genesis + (altura * 10 minutos)
  const estimatedTime = BSV_GENESIS_TIME + height * AVERAGE_BLOCK_TIME_MS;
  return new Date(estimatedTime).toISOString();
}

/**
 * Handler principal de la herramienta list_transactions
 */
export async function handleListTransactions(args: unknown) {
  try {
    const params = args as ListTransactionsParams;
    const { walletId, limit = 100 } = params;

    // Validar parámetros
    if (!walletId) {
      throw new Error('Se requiere walletId');
    }

    if (limit && (limit <= 0 || limit > 1000)) {
      throw new Error('limit debe ser entre 1 y 1000');
    }

    // Obtener metadata de la wallet (no requiere password)
    const metadata = await walletManager.getWalletMetadata(walletId);

    // Crear cliente de red
    const networkClient = createNetworkClient(metadata.network);

    // Obtener historial de blockchain
    const wocHistory = await networkClient.getTransactionHistory(metadata.address);

    // Si no hay transacciones, retornar lista vacía
    if (wocHistory.length === 0) {
      const response: ListTransactionsResponse = {
        success: true,
        walletId: metadata.id,
        address: metadata.address,
        network: metadata.network,
        transactions: [],
        total: 0,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2),
          },
        ],
      };
    }

    // Cargar registro local
    const localHistory = await loadLocalHistory(walletId);

    // Obtener altura actual del bloque
    const currentHeight = await networkClient.getCurrentBlockHeight();

    // Procesar cada transacción
    const enrichedTxs: EnrichedTransaction[] = [];

    for (const wocTx of wocHistory) {
      try {
        // Obtener detalles completos
        const details = await networkClient.getTransactionDetails(wocTx.tx_hash);

        // Determinar tipo
        const type = determineTransactionType(details, metadata.address);

        // Calcular confirmaciones
        const confirmations = wocTx.height > 0 ? currentHeight - wocTx.height + 1 : 0;

        // Calcular monto neto
        const amount = calculateNetAmount(details, metadata.address, type);

        // Extraer direcciones
        const addresses = extractAddresses(details, metadata.address);

        // Buscar en registro local
        const localRecord = findLocalRecord(wocTx.tx_hash, localHistory);

        // Calcular fee
        let fee: number | undefined;
        if (localRecord?.fee !== undefined) {
          fee = localRecord.fee;
        } else if (type === 'sent' || type === 'self') {
          fee = calculateFee(details);
        }

        // Determinar timestamp
        let timestamp: string;
        if (localRecord?.timestamp) {
          timestamp = localRecord.timestamp;
        } else if (wocTx.height > 0) {
          timestamp = estimateTimestamp(wocTx.height);
        } else {
          // Transacción en mempool
          timestamp = new Date().toISOString();
        }

        // Crear transacción enriquecida
        enrichedTxs.push({
          txid: wocTx.tx_hash,
          timestamp,
          height: wocTx.height > 0 ? wocTx.height : undefined,
          confirmations,
          type,
          amount,
          fee,
          addresses,
          isLocal: !!localRecord,
          purpose: localRecord?.purpose,
        });
      } catch (error) {
        // Si falla al obtener detalles de una transacción, continuar con las demás
        console.error(`Error al procesar transacción ${wocTx.tx_hash}:`, error);
      }
    }

    // Ordenar por timestamp (más reciente primero)
    enrichedTxs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Aplicar límite
    const limited = enrichedTxs.slice(0, limit);

    // Preparar respuesta
    const response: ListTransactionsResponse = {
      success: true,
      walletId: metadata.id,
      address: metadata.address,
      network: metadata.network,
      transactions: limited,
      total: limited.length,
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error: errorMessage,
            },
            null,
            2
          ),
        },
      ],
    };
  }
}
