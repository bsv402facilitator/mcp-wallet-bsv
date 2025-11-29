/**
 * Módulo de encriptación/desencriptación de claves privadas
 * Usa AES-256-GCM con derivación de claves Scrypt (OWASP recomendado)
 */

import { randomBytes, scrypt, createCipheriv, createDecipheriv } from 'crypto';
import { promisify } from 'util';
import type { EncryptedData } from '../types/index.js';

const scryptAsync = promisify(scrypt);

// Parámetros Scrypt según OWASP
const SCRYPT_PARAMS = {
  N: 32768,  // Factor de costo (CPU/memoria)
  r: 8,      // Tamaño de bloque
  p: 1,      // Paralelización
  keyLen: 32 // 256 bits para AES-256
};

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;  // 128 bits
const SALT_LENGTH = 32; // 256 bits
// const AUTH_TAG_LENGTH = 16; // 128 bits (no usado actualmente)

/**
 * Deriva una clave de encriptación desde un password usando Scrypt
 */
async function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  // scrypt en Node.js recibe (password, salt, keylen) y devuelve un Buffer
  // Las opciones N, r, p se pasan como parte del cuarto parámetro opcional
  return (await scryptAsync(
    password,
    salt,
    SCRYPT_PARAMS.keyLen
  )) as Buffer;
}

/**
 * Encripta una clave privada WIF con un password
 * @param wif - Clave privada en formato WIF
 * @param password - Password para encriptar
 * @returns Datos encriptados con salt, iv, authTag
 */
export async function encryptWif(wif: string, password: string): Promise<EncryptedData> {
  try {
    // Validar parámetros
    if (!wif || wif.trim().length === 0) {
      throw new Error('WIF no puede estar vacío');
    }
    if (!password || password.length === 0) {
      throw new Error('Password no puede estar vacío');
    }

    // Generar salt e IV aleatorios
    const salt = randomBytes(SALT_LENGTH);
    const iv = randomBytes(IV_LENGTH);

    // Derivar clave desde password
    const key = await deriveKey(password, salt);

    // Crear cipher
    const cipher = createCipheriv(ALGORITHM, key, iv);

    // Encriptar
    const encrypted = Buffer.concat([
      cipher.update(wif, 'utf8'),
      cipher.final()
    ]);

    // Obtener authentication tag
    const authTag = cipher.getAuthTag();

    return {
      algorithm: ALGORITHM,
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      data: encrypted.toString('base64')
    };
  } catch (error) {
    throw new Error(`Error al encriptar WIF: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

/**
 * Desencripta una clave privada WIF con un password
 * @param encrypted - Datos encriptados
 * @param password - Password para desencriptar
 * @returns Clave privada WIF desencriptada
 * @throws Error si el password es incorrecto o los datos están corruptos
 */
export async function decryptWif(encrypted: EncryptedData, password: string): Promise<string> {
  try {
    // Validar algoritmo
    if (encrypted.algorithm !== ALGORITHM) {
      throw new Error(`Algoritmo no soportado: ${encrypted.algorithm}`);
    }

    // Convertir de base64 a Buffer
    const salt = Buffer.from(encrypted.salt, 'base64');
    const iv = Buffer.from(encrypted.iv, 'base64');
    const authTag = Buffer.from(encrypted.authTag, 'base64');
    const data = Buffer.from(encrypted.data, 'base64');

    // Derivar clave desde password
    const key = await deriveKey(password, salt);

    // Crear decipher con opciones para evitar deprecation warning
    const decipher = createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: 16 // 128 bits
    });
    decipher.setAuthTag(authTag);

    // Desencriptar
    const decrypted = Buffer.concat([
      decipher.update(data),
      decipher.final()
    ]);

    return decrypted.toString('utf8');
  } catch (error) {
    // El error más común es password incorrecto o datos corruptos
    if (error instanceof Error) {
      if (error.message.includes('Unsupported state') ||
          error.message.includes('auth') ||
          error.message.includes('TAG')) {
        throw new Error('Password incorrecto o datos corruptos');
      }
    }
    throw new Error(`Error al desencriptar WIF: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

/**
 * Valida que los datos encriptados tengan el formato correcto
 */
export function validateEncryptedData(encrypted: unknown): encrypted is EncryptedData {
  if (!encrypted || typeof encrypted !== 'object') {
    return false;
  }

  const data = encrypted as Record<string, unknown>;

  return (
    data.algorithm === ALGORITHM &&
    typeof data.salt === 'string' &&
    typeof data.iv === 'string' &&
    typeof data.authTag === 'string' &&
    typeof data.data === 'string'
  );
}

/**
 * Genera un salt aleatorio (útil para testing)
 */
export function generateSalt(): string {
  return randomBytes(SALT_LENGTH).toString('base64');
}

/**
 * Genera un IV aleatorio (útil para testing)
 */
export function generateIV(): string {
  return randomBytes(IV_LENGTH).toString('base64');
}
