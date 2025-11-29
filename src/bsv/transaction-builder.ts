/**
 * Constructor de transacciones BSV P2PKH
 * Basado en el patrón del cliente actual (facilitador/src/client/app.js)
 */

import { Transaction, P2PKH, PrivateKey } from '@bsv/sdk';
import type { BuildTxParams, SelectedUTXOs, UTXOWithSource, UTXO } from '../types/index.js';
import { NetworkClient } from './network-client.js';

/**
 * Selecciona UTXOs suficientes para cubrir el monto + fee
 * Estrategia: "largest first" para minimizar número de inputs
 */
export function selectUTXOs(
  utxos: UTXOWithSource[],
  amount: number,
  feeRate: number = 0.5
): SelectedUTXOs {
  if (utxos.length === 0) {
    throw new Error('No hay UTXOs disponibles');
  }

  // Ordenar UTXOs por valor descendente (largest first)
  const sortedUTXOs = [...utxos].sort((a, b) => b.value - a.value);

  const selectedUTXOs: UTXOWithSource[] = [];
  let totalValue = 0;

  // Seleccionar UTXOs hasta cubrir el monto
  for (const utxo of sortedUTXOs) {
    selectedUTXOs.push(utxo);
    totalValue += utxo.value;

    // Estimar fee actual con los inputs seleccionados
    const estimatedFee = estimateFee(selectedUTXOs.length, 2, feeRate); // 2 outputs (pago + cambio)

    // Verificar si tenemos suficiente
    if (totalValue >= amount + estimatedFee) {
      const change = totalValue - amount - estimatedFee;
      return {
        utxos: selectedUTXOs,
        totalValue,
        change,
        fee: estimatedFee,
      };
    }
  }

  // No hay fondos suficientes
  const minRequired = amount + estimateFee(selectedUTXOs.length, 2, feeRate);
  throw new Error(
    `Fondos insuficientes. Necesitas ${minRequired} satoshis, pero solo tienes ${totalValue} satoshis disponibles`
  );
}

/**
 * Estima el fee de una transacción
 * @param numInputs - Número de inputs
 * @param numOutputs - Número de outputs
 * @param feeRate - Tasa en sat/byte
 * @returns Fee estimado en satoshis
 */
export function estimateFee(numInputs: number, numOutputs: number, feeRate: number = 0.5): number {
  // Tamaño aproximado de una transacción P2PKH:
  // - Header: 10 bytes
  // - Input P2PKH: ~148 bytes cada uno
  // - Output P2PKH: ~34 bytes cada uno
  const headerSize = 10;
  const inputSize = 148;
  const outputSize = 34;

  const estimatedSize = headerSize + numInputs * inputSize + numOutputs * outputSize;

  return Math.ceil(estimatedSize * feeRate);
}

/**
 * Obtiene las transacciones fuente para los UTXOs
 * @param utxos - UTXOs sin transacciones fuente
 * @param networkClient - Cliente de red para obtener transacciones
 * @returns UTXOs con transacciones fuente
 */
export async function fetchSourceTransactions(
  utxos: UTXO[],
  networkClient: NetworkClient
): Promise<UTXOWithSource[]> {
  const utxosWithSource: UTXOWithSource[] = [];

  for (const utxo of utxos) {
    try {
      const txHex = await networkClient.getTransactionHex(utxo.txid);
      utxosWithSource.push({
        ...utxo,
        sourceTransactionHex: txHex,
      });
    } catch (error) {
      throw new Error(
        `Error al obtener transacción fuente ${utxo.txid}: ${error instanceof Error ? error.message : 'Error desconocido'}`
      );
    }
  }

  return utxosWithSource;
}

/**
 * Construye una transacción BSV P2PKH
 * @param params - Parámetros de construcción de transacción
 * @returns Transacción firmada
 */
export async function buildTransaction(params: BuildTxParams): Promise<Transaction> {
  const { privateKey, utxos, payToAddress, amount, changeAddress, feeRate = 0.5, network } = params;

  try {
    // Validar parámetros
    if (amount <= 0) {
      throw new Error('El monto debe ser mayor a 0');
    }

    if (utxos.length === 0) {
      throw new Error('No hay UTXOs disponibles');
    }

    // Seleccionar UTXOs suficientes
    const selected = selectUTXOs(utxos, amount, feeRate);

    // Crear transacción
    const tx = new Transaction();

    // Agregar inputs
    for (const utxo of selected.utxos) {
      const sourceTransaction = Transaction.fromHex(utxo.sourceTransactionHex);

      tx.addInput({
        sourceTransaction,
        sourceOutputIndex: utxo.vout,
        unlockingScriptTemplate: new P2PKH().unlock(privateKey),
        sequence: 0xffffffff,
      });
    }

    // Output de pago al merchant
    tx.addOutput({
      lockingScript: new P2PKH().lock(payToAddress),
      satoshis: amount,
    });

    // Output de cambio (si aplica)
    if (selected.change > 0) {
      const changeAddr = changeAddress || privateKey.toPublicKey().toAddress(network === 'testnet' ? 'testnet' : undefined);
      tx.addOutput({
        lockingScript: new P2PKH().lock(changeAddr),
        satoshis: selected.change,
      });
    }

    // Firmar transacción
    await tx.sign();

    return tx;
  } catch (error) {
    throw new Error(
      `Error al construir transacción: ${error instanceof Error ? error.message : 'Error desconocido'}`
    );
  }
}

/**
 * Construye una transacción completa (obtiene UTXOs, transacciones fuente y construye)
 * @param privateKey - Clave privada para firmar
 * @param payToAddress - Dirección del destinatario
 * @param amount - Monto en satoshis
 * @param network - Red BSV
 * @param networkClient - Cliente de red
 * @param changeAddress - Dirección de cambio (opcional)
 * @param feeRate - Tasa de fee (opcional)
 * @returns Transacción firmada lista para broadcast
 */
export async function buildTransactionComplete(
  privateKey: PrivateKey,
  payToAddress: string,
  amount: number,
  network: 'mainnet' | 'testnet',
  networkClient: NetworkClient,
  changeAddress?: string,
  feeRate?: number
): Promise<Transaction> {
  try {
    // Obtener dirección de la wallet
    const address = privateKey
      .toPublicKey()
      .toAddress(network === 'testnet' ? 'testnet' : undefined)
      .toString();

    // Obtener UTXOs
    const utxos = await networkClient.getUTXOs(address);

    if (utxos.length === 0) {
      throw new Error('No hay fondos disponibles en esta wallet');
    }

    // Obtener transacciones fuente
    const utxosWithSource = await fetchSourceTransactions(utxos, networkClient);

    // Construir transacción
    return await buildTransaction({
      privateKey,
      utxos: utxosWithSource,
      payToAddress,
      amount,
      changeAddress,
      feeRate,
      network,
    });
  } catch (error) {
    throw new Error(
      `Error al construir transacción completa: ${error instanceof Error ? error.message : 'Error desconocido'}`
    );
  }
}

/**
 * Obtiene información de una transacción
 */
export function getTransactionInfo(tx: Transaction): {
  txid: string;
  size: number;
  inputs: number;
  outputs: number;
  fee: number;
  hex: string;
} {
  const hex = tx.toHex();
  const inputs = tx.inputs?.length || 0;
  const outputs = tx.outputs?.length || 0;

  // Calcular fee (suma de inputs - suma de outputs)
  let totalInput = 0;
  let totalOutput = 0;

  if (tx.inputs) {
    for (const input of tx.inputs) {
      if (input.sourceTransaction && input.sourceOutputIndex !== undefined) {
        const sourceOutput = input.sourceTransaction.outputs?.[input.sourceOutputIndex];
        if (sourceOutput?.satoshis) {
          totalInput += sourceOutput.satoshis;
        }
      }
    }
  }

  if (tx.outputs) {
    for (const output of tx.outputs) {
      if (output.satoshis) {
        totalOutput += output.satoshis;
      }
    }
  }

  const fee = totalInput - totalOutput;

  return {
    txid: tx.id('hex') as string,
    size: hex.length / 2, // hex es 2 chars por byte
    inputs,
    outputs,
    fee,
    hex,
  };
}
