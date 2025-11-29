/**
 * Módulo de almacenamiento de wallets en filesystem
 * Gestiona lectura/escritura de archivos con permisos seguros
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { existsSync } from 'fs';
import type { WalletData, WalletMetadata } from '../types/index.js';
import { config } from '../config.js';

/**
 * Asegura que el directorio de wallets existe con permisos correctos
 */
export async function ensureWalletsDir(): Promise<void> {
  const walletsDir = config.walletsDir;

  if (!existsSync(walletsDir)) {
    // Crear directorio con permisos 700 (solo propietario)
    await fs.mkdir(walletsDir, { recursive: true, mode: 0o700 });
  } else {
    // Verificar/actualizar permisos del directorio existente
    try {
      await fs.chmod(walletsDir, 0o700);
    } catch (error) {
      // En Windows, chmod puede no funcionar completamente, pero no es crítico
      console.error('Advertencia: No se pudieron establecer permisos del directorio:', error);
    }
  }
}

/**
 * Obtiene la ruta del archivo de una wallet
 */
function getWalletPath(walletId: string): string {
  return join(config.walletsDir, `${walletId}.json`);
}

/**
 * Guarda una wallet en el filesystem
 * @param wallet - Datos de la wallet a guardar
 */
export async function saveWallet(wallet: WalletData): Promise<void> {
  try {
    // Asegurar que el directorio existe
    await ensureWalletsDir();

    const walletPath = getWalletPath(wallet.id);

    // Serializar wallet a JSON
    const walletJson = JSON.stringify(wallet, null, 2);

    // Escribir archivo con permisos 600 (lectura/escritura solo propietario)
    await fs.writeFile(walletPath, walletJson, {
      encoding: 'utf8',
      mode: 0o600
    });

    // Asegurar permisos (en caso de que writeFile no los haya aplicado)
    try {
      await fs.chmod(walletPath, 0o600);
    } catch (error) {
      // En Windows, chmod puede no funcionar completamente
      console.error('Advertencia: No se pudieron establecer permisos del archivo:', error);
    }

  } catch (error) {
    throw new Error(`Error al guardar wallet ${wallet.id}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

/**
 * Carga una wallet desde el filesystem
 * @param walletId - ID de la wallet a cargar
 * @returns Datos de la wallet
 */
export async function loadWallet(walletId: string): Promise<WalletData> {
  try {
    const walletPath = getWalletPath(walletId);

    // Verificar que el archivo existe
    if (!existsSync(walletPath)) {
      throw new Error(`Wallet no encontrada: ${walletId}`);
    }

    // Leer archivo
    const walletJson = await fs.readFile(walletPath, 'utf8');

    // Parsear JSON
    const wallet = JSON.parse(walletJson) as WalletData;

    // Validar estructura básica
    if (!wallet.id || !wallet.encrypted || !wallet.address) {
      throw new Error('Archivo de wallet corrupto o inválido');
    }

    return wallet;

  } catch (error) {
    if (error instanceof Error && error.message.includes('Wallet no encontrada')) {
      throw error;
    }
    throw new Error(`Error al cargar wallet ${walletId}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

/**
 * Lista todas las wallets disponibles (solo metadata, sin claves privadas)
 * @returns Array de metadata de wallets
 */
export async function listWallets(): Promise<WalletMetadata[]> {
  try {
    // Asegurar que el directorio existe
    await ensureWalletsDir();

    const walletsDir = config.walletsDir;

    // Leer todos los archivos del directorio
    const files = await fs.readdir(walletsDir);

    // Filtrar solo archivos .json
    const walletFiles = files.filter(file => file.endsWith('.json'));

    // Cargar metadata de cada wallet
    const wallets: WalletMetadata[] = [];

    for (const file of walletFiles) {
      try {
        const walletPath = join(walletsDir, file);
        const walletJson = await fs.readFile(walletPath, 'utf8');
        const wallet = JSON.parse(walletJson) as WalletData;

        // Extraer solo metadata (sin clave privada encriptada)
        wallets.push({
          id: wallet.id,
          name: wallet.name,
          address: wallet.address,
          network: wallet.network,
          createdAt: wallet.createdAt
        });
      } catch (error) {
        // Si un archivo está corrupto, lo ignoramos y continuamos
        console.error(`Advertencia: No se pudo leer wallet ${file}:`, error);
      }
    }

    // Ordenar por fecha de creación (más reciente primero)
    wallets.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return wallets;

  } catch (error) {
    throw new Error(`Error al listar wallets: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

/**
 * Elimina una wallet del filesystem
 * @param walletId - ID de la wallet a eliminar
 */
export async function deleteWallet(walletId: string): Promise<void> {
  try {
    const walletPath = getWalletPath(walletId);

    // Verificar que el archivo existe
    if (!existsSync(walletPath)) {
      throw new Error(`Wallet no encontrada: ${walletId}`);
    }

    // Eliminar archivo
    await fs.unlink(walletPath);

  } catch (error) {
    if (error instanceof Error && error.message.includes('Wallet no encontrada')) {
      throw error;
    }
    throw new Error(`Error al eliminar wallet ${walletId}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

/**
 * Verifica si una wallet existe
 * @param walletId - ID de la wallet
 * @returns true si existe, false si no
 */
export function walletExists(walletId: string): boolean {
  const walletPath = getWalletPath(walletId);
  return existsSync(walletPath);
}

/**
 * Obtiene el número total de wallets
 */
export async function getWalletCount(): Promise<number> {
  try {
    await ensureWalletsDir();
    const files = await fs.readdir(config.walletsDir);
    return files.filter(file => file.endsWith('.json')).length;
  } catch (error) {
    return 0;
  }
}
