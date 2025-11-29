/**
 * Sistema de registro local de transacciones
 * Mantiene un log de transacciones creadas por este servidor con metadatos enriquecidos
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { existsSync } from 'fs';
import type { LocalTransactionRecord, TransactionLog } from '../types/index.js';
import { config } from '../config.js';

/**
 * Obtiene el directorio de transacciones
 */
function getTransactionsDir(): string {
  return join(config.walletsDir, 'transactions');
}

/**
 * Asegura que el directorio de transacciones existe con permisos correctos
 */
async function ensureTransactionsDir(): Promise<void> {
  const transactionsDir = getTransactionsDir();

  if (!existsSync(transactionsDir)) {
    // Crear directorio con permisos 700 (solo propietario)
    await fs.mkdir(transactionsDir, { recursive: true, mode: 0o700 });
  } else {
    // Verificar/actualizar permisos del directorio existente
    try {
      await fs.chmod(transactionsDir, 0o700);
    } catch (error) {
      // En Windows, chmod puede no funcionar completamente, pero no es crítico
      console.error('Advertencia: No se pudieron establecer permisos del directorio:', error);
    }
  }
}

/**
 * Obtiene la ruta del archivo de transacciones de una wallet
 */
function getTransactionLogPath(walletId: string): string {
  return join(getTransactionsDir(), `${walletId}-transactions.json`);
}

/**
 * Carga el log de transacciones de una wallet
 * @param walletId - ID de la wallet
 * @returns Log de transacciones (vacío si no existe)
 */
async function loadTransactionLog(walletId: string): Promise<TransactionLog> {
  try {
    await ensureTransactionsDir();

    const logPath = getTransactionLogPath(walletId);

    // Si el archivo no existe, retornar log vacío
    if (!existsSync(logPath)) {
      return {
        version: '1.0',
        walletId,
        transactions: [],
        lastUpdated: new Date().toISOString(),
      };
    }

    // Leer archivo
    const logJson = await fs.readFile(logPath, 'utf8');
    const log = JSON.parse(logJson) as TransactionLog;

    // Validar estructura básica
    if (!log.walletId || !Array.isArray(log.transactions)) {
      console.error(`Archivo de log corrupto para wallet ${walletId}, creando nuevo log`);
      return {
        version: '1.0',
        walletId,
        transactions: [],
        lastUpdated: new Date().toISOString(),
      };
    }

    return log;
  } catch (error) {
    console.error(`Error al cargar log de transacciones para wallet ${walletId}:`, error);
    // En caso de error, retornar log vacío
    return {
      version: '1.0',
      walletId,
      transactions: [],
      lastUpdated: new Date().toISOString(),
    };
  }
}

/**
 * Guarda el log de transacciones de una wallet
 * @param log - Log de transacciones a guardar
 */
async function saveTransactionLog(log: TransactionLog): Promise<void> {
  try {
    await ensureTransactionsDir();

    const logPath = getTransactionLogPath(log.walletId);

    // Actualizar timestamp
    log.lastUpdated = new Date().toISOString();

    // Serializar a JSON
    const logJson = JSON.stringify(log, null, 2);

    // Escribir archivo con permisos 600
    await fs.writeFile(logPath, logJson, {
      encoding: 'utf8',
      mode: 0o600,
    });

    // Asegurar permisos
    try {
      await fs.chmod(logPath, 0o600);
    } catch (error) {
      console.error('Advertencia: No se pudieron establecer permisos del archivo:', error);
    }
  } catch (error) {
    throw new Error(
      `Error al guardar log de transacciones para wallet ${log.walletId}: ${error instanceof Error ? error.message : 'Error desconocido'}`
    );
  }
}

/**
 * Registra una transacción en el historial local
 * @param record - Registro de transacción a guardar
 */
export async function logTransaction(record: LocalTransactionRecord): Promise<void> {
  try {
    // Cargar log existente
    const log = await loadTransactionLog(record.walletId);

    // Verificar si ya existe (evitar duplicados)
    const exists = log.transactions.some((tx) => tx.txid === record.txid);
    if (exists) {
      console.log(`Transacción ${record.txid} ya está registrada para wallet ${record.walletId}`);
      return;
    }

    // Agregar nueva transacción
    log.transactions.push(record);

    // Guardar log actualizado
    await saveTransactionLog(log);
  } catch (error) {
    // No fallar si hay error al guardar el log (no es crítico)
    console.error(`Error al registrar transacción ${record.txid}:`, error);
  }
}

/**
 * Carga el historial local de transacciones de una wallet
 * @param walletId - ID de la wallet
 * @returns Array de registros de transacciones
 */
export async function loadLocalHistory(walletId: string): Promise<LocalTransactionRecord[]> {
  try {
    const log = await loadTransactionLog(walletId);
    return log.transactions;
  } catch (error) {
    console.error(`Error al cargar historial local para wallet ${walletId}:`, error);
    return [];
  }
}

/**
 * Verifica si una transacción está en el registro local
 * @param txid - ID de la transacción
 * @param localHistory - Historial local
 * @returns true si está en el registro local
 */
export function isLocalTransaction(txid: string, localHistory: LocalTransactionRecord[]): boolean {
  return localHistory.some((record) => record.txid === txid);
}

/**
 * Busca un registro local por txid
 * @param txid - ID de la transacción
 * @param localHistory - Historial local
 * @returns Registro local o undefined
 */
export function findLocalRecord(
  txid: string,
  localHistory: LocalTransactionRecord[]
): LocalTransactionRecord | undefined {
  return localHistory.find((record) => record.txid === txid);
}
