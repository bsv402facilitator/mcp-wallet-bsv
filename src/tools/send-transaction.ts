/**
 * Tool MCP: send_transaction
 * Crea, firma y envía una transacción BSV simple a la blockchain
 */

import { walletManager } from '../wallet/manager.js';
import { createNetworkClient } from '../bsv/network-client.js';
import { buildTransaction, fetchSourceTransactions, getTransactionInfo } from '../bsv/transaction-builder.js';
import { logTransaction } from '../bsv/transaction-history.js';
import type { SendTransactionParams, SendTransactionResponse } from '../types/index.js';

export async function handleSendTransaction(args: unknown) {
  try {
    const params = args as SendTransactionParams;
    const {
      walletId,
      password,
      toAddress,
      amount,
      changeAddress,
      feeRate = 0.5,
    } = params;

    // Validar parámetros requeridos
    if (!walletId) {
      throw new Error('Se requiere walletId');
    }
    if (!password) {
      throw new Error('Se requiere password');
    }
    if (!toAddress) {
      throw new Error('Se requiere toAddress (dirección del destinatario)');
    }
    if (!amount || amount <= 0) {
      throw new Error('Se requiere amount (debe ser mayor a 0)');
    }

    // Cargar wallet (requiere password)
    const wallet = await walletManager.loadWallet(walletId, password);

    // Crear cliente de red para la network de la wallet
    const networkClient = createNetworkClient(wallet.network);

    // Obtener UTXOs de la wallet
    const utxos = await networkClient.getUTXOs(wallet.address);

    if (utxos.length === 0) {
      throw new Error('No hay fondos disponibles en esta wallet');
    }

    // Obtener transacciones fuente para cada UTXO
    const utxosWithSource = await fetchSourceTransactions(utxos, networkClient);

    // Construir transacción
    const tx = await buildTransaction({
      privateKey: wallet.privateKey,
      utxos: utxosWithSource,
      payToAddress: toAddress,
      amount,
      changeAddress,
      feeRate,
      network: wallet.network,
    });

    // Obtener información de la transacción
    const txInfo = getTransactionInfo(tx);

    // Broadcast de la transacción a la blockchain
    const broadcastResult = await networkClient.broadcastTransaction(txInfo.hex);

    if (!broadcastResult.success) {
      throw new Error(`Error al enviar transacción: ${broadcastResult.error}`);
    }

    // Calcular cambio
    const totalInput = utxosWithSource
      .slice(0, tx.inputs?.length || 0)
      .reduce((sum, utxo) => sum + utxo.value, 0);
    const change = totalInput - amount - txInfo.fee;

    // Registrar transacción en historial local
    await logTransaction({
      txid: txInfo.txid,
      walletId: wallet.id,
      timestamp: new Date().toISOString(),
      type: 'sent',
      amount,
      fee: txInfo.fee,
      toAddress,
      network: wallet.network,
      purpose: 'Simple transaction',
      metadata: {
        changeAmount: change,
        inputs: txInfo.inputs,
        outputs: txInfo.outputs,
      },
    });

    // Preparar respuesta
    const response: SendTransactionResponse = {
      success: true,
      txid: txInfo.txid,
      amount,
      fee: txInfo.fee,
      change,
      toAddress,
      fromAddress: wallet.address,
      network: wallet.network,
      inputs: txInfo.inputs,
      outputs: txInfo.outputs,
      size: txInfo.size,
      broadcasted: true,
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
          text: JSON.stringify({
            success: false,
            error: errorMessage,
          }, null, 2),
        },
      ],
    };
  }
}
