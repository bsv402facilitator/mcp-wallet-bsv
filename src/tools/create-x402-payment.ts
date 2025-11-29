/**
 * Tool MCP: create_x402_payment
 * Crea una transacción BSV y genera un payload X402
 */

import { walletManager } from '../wallet/manager.js';
import { createNetworkClient } from '../bsv/network-client.js';
import { buildTransaction, fetchSourceTransactions, getTransactionInfo } from '../bsv/transaction-builder.js';
import { createPaymentPayload, createUsageInstructions } from '../x402/payment-creator.js';
import { logTransaction } from '../bsv/transaction-history.js';
import type { CreatePaymentResponse } from '../types/index.js';

export async function handleCreateX402Payment(args: unknown) {
  try {
    const params = args as any;
    const {
      walletId,
      password,
      payTo,
      amount,
      network = 'mainnet',
      changeAddress,
      feeRate = 0.5,
      language,
      cognitiveLevel,
      audioFriendly,
    } = params;

    // Validar parámetros requeridos
    if (!walletId) {
      throw new Error('Se requiere walletId');
    }
    if (!password) {
      throw new Error('Se requiere password');
    }
    if (!payTo) {
      throw new Error('Se requiere payTo (dirección del destinatario)');
    }
    if (!amount || amount <= 0) {
      throw new Error('Se requiere amount (debe ser mayor a 0)');
    }
    if (network !== 'mainnet' && network !== 'testnet') {
      throw new Error('network debe ser "mainnet" o "testnet"');
    }

    // Cargar wallet (requiere password)
    const wallet = await walletManager.loadWallet(walletId, password);

    // Verificar que la wallet esté en la misma network
    if (wallet.network !== network) {
      throw new Error(
        `La wallet está configurada para ${wallet.network} pero se solicitó ${network}`
      );
    }

    // Crear cliente de red
    const networkClient = createNetworkClient(network);

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
      payToAddress: payTo,
      amount,
      changeAddress,
      feeRate,
      network,
    });

    // Obtener información de la transacción
    const txInfo = getTransactionInfo(tx);

    // Construir preferencias de accesibilidad si están presentes
    const accessibility =
      language || cognitiveLevel || audioFriendly !== undefined
        ? {
            ...(language && { language }),
            ...(cognitiveLevel && { cognitiveLevel }),
            ...(audioFriendly !== undefined && { audioFriendly }),
          }
        : undefined;

    // Crear payload X402 con preferencias de accesibilidad
    const paymentPayload = createPaymentPayload(tx, network, accessibility);

    // Crear instrucciones de uso
    const instructions = createUsageInstructions(paymentPayload);

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
      toAddress: payTo,
      network,
      purpose: 'X402 payment',
      metadata: {
        x402: true,
        changeAmount: change,
        inputs: txInfo.inputs,
        outputs: txInfo.outputs,
      },
    });

    // Preparar respuesta
    const response: CreatePaymentResponse = {
      success: true,
      paymentPayload,
      txid: txInfo.txid,
      amount,
      fee: txInfo.fee,
      change,
      inputs: txInfo.inputs,
      outputs: txInfo.outputs,
      size: txInfo.size,
      instructions,
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
