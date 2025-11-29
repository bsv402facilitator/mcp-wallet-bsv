/**
 * Tool MCP: get_balance
 * Consulta el balance y UTXOs de una wallet
 */

import { walletManager } from '../wallet/manager.js';
import { createNetworkClient } from '../bsv/network-client.js';
import type { GetBalanceParams, GetBalanceResponse } from '../types/index.js';

export async function handleGetBalance(args: unknown) {
  try {
    const params = args as GetBalanceParams;
    const { walletId, includeUTXOs = false } = params;

    // Validar parámetros
    if (!walletId) {
      throw new Error('Se requiere walletId');
    }

    // Obtener metadata de la wallet (no requiere password)
    const metadata = await walletManager.getWalletMetadata(walletId);

    // Crear cliente de red para la network de la wallet
    const networkClient = createNetworkClient(metadata.network);

    // Obtener UTXOs
    const utxos = await networkClient.getUTXOs(metadata.address);

    // Calcular balance total
    const balance = utxos.reduce((sum, utxo) => sum + utxo.value, 0);
    const balanceBSV = balance / 100000000; // Convertir satoshis a BSV

    // Preparar respuesta
    const response: GetBalanceResponse = {
      success: true,
      walletId: metadata.id,
      address: metadata.address,
      network: metadata.network,
      balance,
      balanceBSV,
      utxoCount: utxos.length,
    };

    // Incluir lista de UTXOs si se solicitó
    if (includeUTXOs) {
      response.utxos = utxos.map(utxo => ({
        txid: utxo.txid,
        vout: utxo.vout,
        value: utxo.value,
      }));
    }

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
          text: JSON.stringify({
            success: false,
            error: errorMessage,
          }, null, 2),
        },
      ],
    };
  }
}
