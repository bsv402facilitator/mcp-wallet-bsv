/**
 * WalletManager - API de alto nivel para gestión de wallets
 * Integra crypto, storage y @bsv/sdk
 */

import { PrivateKey } from '@bsv/sdk';
import { randomBytes } from 'crypto';
import * as bip39 from 'bip39';
import { encryptWif, decryptWif } from './crypto.js';
import {
  saveWallet,
  loadWallet,
  listWallets as listWalletsFromStorage,
  deleteWallet,
  walletExists
} from './storage.js';
import type {
  WalletData,
  WalletMetadata,
  UnlockedWallet,
  Network
} from '../types/index.js';

/**
 * Información de una wallet recién creada o importada
 */
export interface WalletInfo {
  id: string;
  name: string;
  address: string;
  network: Network;
  createdAt: string;
  mnemonic?: string; // Solo se retorna al crear una nueva wallet
}

/**
 * Genera un ID único para una wallet
 */
function generateWalletId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * WalletManager - Clase principal para gestión de wallets
 */
export class WalletManager {
  /**
   * Crea una nueva wallet con clave privada desde mnemonic BIP39
   * @param name - Nombre descriptivo de la wallet
   * @param network - Red BSV (mainnet o testnet)
   * @param password - Password para encriptar la clave privada
   * @returns Información de la wallet creada, incluyendo el mnemonic
   */
  async createWallet(name: string, network: Network, password: string): Promise<WalletInfo> {
    try {
      // Validar parámetros
      if (!name || name.trim().length === 0) {
        throw new Error('El nombre de la wallet es requerido');
      }
      if (!password || password.length < 8) {
        throw new Error('El password debe tener al menos 8 caracteres');
      }
      if (network !== 'mainnet' && network !== 'testnet') {
        throw new Error('Network debe ser "mainnet" o "testnet"');
      }

      // Generar mnemonic BIP39 de 12 palabras
      const mnemonic = bip39.generateMnemonic(128); // 128 bits = 12 palabras

      // Generar seed desde mnemonic
      const seed = bip39.mnemonicToSeedSync(mnemonic);

      // Generar clave privada desde los primeros 32 bytes del seed
      const privateKey = PrivateKey.fromString(seed.subarray(0, 32).toString('hex'), 'hex');

      // Obtener WIF y dirección
      const wif = privateKey.toWif();
      const publicKey = privateKey.toPublicKey();
      const address = publicKey.toAddress(network === 'testnet' ? 'testnet' : undefined);

      // Generar ID único
      const walletId = generateWalletId();

      // Encriptar WIF
      const encrypted = await encryptWif(wif, password);

      // Crear estructura de wallet
      const wallet: WalletData = {
        version: '1.0',
        id: walletId,
        name: name.trim(),
        network,
        address: address.toString(),
        createdAt: new Date().toISOString(),
        encrypted
      };

      // Guardar en filesystem
      await saveWallet(wallet);

      return {
        id: wallet.id,
        name: wallet.name,
        address: wallet.address,
        network: wallet.network,
        createdAt: wallet.createdAt,
        mnemonic // Retornar el mnemonic para que el usuario lo guarde
      };

    } catch (error) {
      throw new Error(`Error al crear wallet: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Importa una wallet desde una clave privada WIF
   * @param name - Nombre descriptivo de la wallet
   * @param wif - Clave privada en formato WIF
   * @param network - Red BSV (mainnet o testnet)
   * @param password - Password para encriptar la clave privada
   * @returns Información de la wallet importada
   */
  async importWallet(name: string, wif: string, network: Network, password: string): Promise<WalletInfo> {
    try {
      // Validar parámetros
      if (!name || name.trim().length === 0) {
        throw new Error('El nombre de la wallet es requerido');
      }
      if (!wif || wif.trim().length === 0) {
        throw new Error('El WIF es requerido');
      }
      if (!password || password.length < 8) {
        throw new Error('El password debe tener al menos 8 caracteres');
      }
      if (network !== 'mainnet' && network !== 'testnet') {
        throw new Error('Network debe ser "mainnet" o "testnet"');
      }

      // Intentar parsear la clave privada para validar
      let privateKey: PrivateKey;
      try {
        privateKey = PrivateKey.fromWif(wif.trim());
      } catch (error) {
        throw new Error('WIF inválido');
      }

      // Obtener dirección
      const publicKey = privateKey.toPublicKey();
      const address = publicKey.toAddress(network === 'testnet' ? 'testnet' : undefined);

      // Generar ID único
      const walletId = generateWalletId();

      // Encriptar WIF
      const encrypted = await encryptWif(wif.trim(), password);

      // Crear estructura de wallet
      const wallet: WalletData = {
        version: '1.0',
        id: walletId,
        name: name.trim(),
        network,
        address: address.toString(),
        createdAt: new Date().toISOString(),
        encrypted
      };

      // Guardar en filesystem
      await saveWallet(wallet);

      return {
        id: wallet.id,
        name: wallet.name,
        address: wallet.address,
        network: wallet.network,
        createdAt: wallet.createdAt
      };

    } catch (error) {
      throw new Error(`Error al importar wallet: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Importa una wallet desde un mnemonic BIP39
   * @param name - Nombre descriptivo de la wallet
   * @param mnemonic - Frase mnemonic BIP39 (12 o 24 palabras)
   * @param network - Red BSV (mainnet o testnet)
   * @param password - Password para encriptar la clave privada
   * @returns Información de la wallet importada
   */
  async importFromMnemonic(name: string, mnemonic: string, network: Network, password: string): Promise<WalletInfo> {
    try {
      // Validar parámetros
      if (!name || name.trim().length === 0) {
        throw new Error('El nombre de la wallet es requerido');
      }
      if (!mnemonic || mnemonic.trim().length === 0) {
        throw new Error('El mnemonic es requerido');
      }
      if (!password || password.length < 8) {
        throw new Error('El password debe tener al menos 8 caracteres');
      }
      if (network !== 'mainnet' && network !== 'testnet') {
        throw new Error('Network debe ser "mainnet" o "testnet"');
      }

      // Validar mnemonic
      const mnemonicTrimmed = mnemonic.trim();
      if (!bip39.validateMnemonic(mnemonicTrimmed)) {
        throw new Error('Mnemonic inválido');
      }

      // Generar seed desde mnemonic
      const seed = bip39.mnemonicToSeedSync(mnemonicTrimmed);

      // Generar clave privada desde los primeros 32 bytes del seed
      const privateKey = PrivateKey.fromString(seed.subarray(0, 32).toString('hex'), 'hex');

      // Obtener WIF y dirección
      const wif = privateKey.toWif();
      const publicKey = privateKey.toPublicKey();
      const address = publicKey.toAddress(network === 'testnet' ? 'testnet' : undefined);

      // Generar ID único
      const walletId = generateWalletId();

      // Encriptar WIF
      const encrypted = await encryptWif(wif, password);

      // Crear estructura de wallet
      const wallet: WalletData = {
        version: '1.0',
        id: walletId,
        name: name.trim(),
        network,
        address: address.toString(),
        createdAt: new Date().toISOString(),
        encrypted
      };

      // Guardar en filesystem
      await saveWallet(wallet);

      return {
        id: wallet.id,
        name: wallet.name,
        address: wallet.address,
        network: wallet.network,
        createdAt: wallet.createdAt
      };

    } catch (error) {
      throw new Error(`Error al importar wallet desde mnemonic: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Carga y desencripta una wallet con el password
   * @param walletId - ID de la wallet a cargar
   * @param password - Password para desencriptar
   * @returns Wallet desencriptada con claves disponibles
   */
  async loadWallet(walletId: string, password: string): Promise<UnlockedWallet> {
    try {
      // Cargar wallet desde storage
      const wallet = await loadWallet(walletId);

      // Desencriptar WIF
      const wif = await decryptWif(wallet.encrypted, password);

      // Parsear clave privada
      const privateKey = PrivateKey.fromWif(wif);
      const publicKey = privateKey.toPublicKey();

      return {
        id: wallet.id,
        name: wallet.name,
        network: wallet.network,
        address: wallet.address,
        privateKey,
        publicKey
      };

    } catch (error) {
      throw new Error(`Error al cargar wallet: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Lista todas las wallets disponibles (solo metadata)
   * @returns Array de metadata de wallets
   */
  async listWallets(): Promise<WalletMetadata[]> {
    return listWalletsFromStorage();
  }

  /**
   * Exporta la clave privada WIF de una wallet (requiere password)
   * @param walletId - ID de la wallet
   * @param password - Password para desencriptar
   * @returns Clave privada en formato WIF
   */
  async exportWif(walletId: string, password: string): Promise<string> {
    try {
      // Cargar wallet desde storage
      const wallet = await loadWallet(walletId);

      // Desencriptar y retornar WIF
      return await decryptWif(wallet.encrypted, password);

    } catch (error) {
      throw new Error(`Error al exportar WIF: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Elimina una wallet permanentemente
   * @param walletId - ID de la wallet a eliminar
   * @param password - Password para confirmar (opcional, por seguridad)
   */
  async removeWallet(walletId: string, password?: string): Promise<void> {
    try {
      // Si se proporciona password, validar que sea correcto antes de eliminar
      if (password) {
        const wallet = await loadWallet(walletId);
        await decryptWif(wallet.encrypted, password);
      }

      // Eliminar wallet
      await deleteWallet(walletId);

    } catch (error) {
      throw new Error(`Error al eliminar wallet: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Verifica si una wallet existe
   * @param walletId - ID de la wallet
   * @returns true si existe, false si no
   */
  walletExists(walletId: string): boolean {
    return walletExists(walletId);
  }

  /**
   * Obtiene la metadata de una wallet sin desencriptarla
   * @param walletId - ID de la wallet
   * @returns Metadata de la wallet
   */
  async getWalletMetadata(walletId: string): Promise<WalletMetadata> {
    try {
      const wallet = await loadWallet(walletId);

      return {
        id: wallet.id,
        name: wallet.name,
        address: wallet.address,
        network: wallet.network,
        createdAt: wallet.createdAt
      };

    } catch (error) {
      throw new Error(`Error al obtener metadata: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Cambia el password de una wallet
   * @param walletId - ID de la wallet
   * @param oldPassword - Password actual
   * @param newPassword - Nuevo password
   */
  async changePassword(walletId: string, oldPassword: string, newPassword: string): Promise<void> {
    try {
      // Validar nuevo password
      if (!newPassword || newPassword.length < 8) {
        throw new Error('El nuevo password debe tener al menos 8 caracteres');
      }

      // Cargar wallet y desencriptar con password antiguo
      const wallet = await loadWallet(walletId);
      const wif = await decryptWif(wallet.encrypted, oldPassword);

      // Re-encriptar con nuevo password
      const encrypted = await encryptWif(wif, newPassword);

      // Actualizar wallet
      wallet.encrypted = encrypted;

      // Guardar
      await saveWallet(wallet);

    } catch (error) {
      throw new Error(`Error al cambiar password: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }
}

// Exportar instancia singleton
export const walletManager = new WalletManager();
