/**
 * Módulo de firma de mensajes BSV
 * Permite firmar y verificar mensajes con claves privadas/públicas
 */

import { PrivateKey, PublicKey, Hash, Signature } from '@bsv/sdk';

/**
 * Resultado de una firma de mensaje
 */
export interface SignedMessage {
  message: string;
  signature: string;
  publicKey: string;
  address: string;
  messageHash: string;
}

/**
 * Firma un mensaje con una clave privada
 * @param privateKey - Clave privada para firmar
 * @param message - Mensaje a firmar
 * @param encoding - Codificación del mensaje ('utf8' o 'hex')
 * @returns Información de la firma
 */
export function signMessage(
  privateKey: PrivateKey,
  message: string,
  encoding: 'utf8' | 'hex' = 'utf8'
): SignedMessage {
  try {
    // Convertir mensaje a buffer según encoding
    let messageBuffer: number[];

    if (encoding === 'hex') {
      // Convertir hex string a array de bytes
      if (message.length % 2 !== 0) {
        throw new Error('Mensaje hex debe tener longitud par');
      }
      messageBuffer = [];
      for (let i = 0; i < message.length; i += 2) {
        messageBuffer.push(parseInt(message.substr(i, 2), 16));
      }
    } else {
      // UTF-8
      messageBuffer = Array.from(Buffer.from(message, 'utf8'));
    }

    // Calcular hash del mensaje (SHA-256)
    const messageHash = Hash.sha256(messageBuffer);

    // Firmar el hash
    const signature = privateKey.sign(messageHash);

    // Obtener clave pública y dirección
    const publicKey = privateKey.toPublicKey();
    const address = publicKey.toAddress();

    return {
      message,
      signature: Buffer.from(signature.toDER()).toString('base64'),
      publicKey: publicKey.toString(),
      address: address.toString(),
      messageHash: Buffer.from(messageHash).toString('hex'),
    };
  } catch (error) {
    throw new Error(
      `Error al firmar mensaje: ${error instanceof Error ? error.message : 'Error desconocido'}`
    );
  }
}

/**
 * Verifica una firma de mensaje
 * @param publicKey - Clave pública que firmó el mensaje
 * @param message - Mensaje original
 * @param signatureBase64 - Firma en formato DER base64
 * @param encoding - Codificación del mensaje
 * @returns true si la firma es válida, false si no
 */
export function verifySignature(
  publicKey: PublicKey,
  message: string,
  signatureBase64: string,
  encoding: 'utf8' | 'hex' = 'utf8'
): boolean {
  try {
    // Convertir mensaje a buffer según encoding
    let messageBuffer: number[];

    if (encoding === 'hex') {
      if (message.length % 2 !== 0) {
        return false;
      }
      messageBuffer = [];
      for (let i = 0; i < message.length; i += 2) {
        messageBuffer.push(parseInt(message.substr(i, 2), 16));
      }
    } else {
      messageBuffer = Array.from(Buffer.from(message, 'utf8'));
    }

    // Calcular hash del mensaje
    const messageHash = Hash.sha256(messageBuffer);

    // Convertir firma de base64 a Signature
    const signatureBuffer = Buffer.from(signatureBase64, 'base64');
    const signature = Signature.fromDER(Array.from(signatureBuffer));

    // Verificar firma
    return publicKey.verify(messageHash, signature);
  } catch {
    return false;
  }
}

/**
 * Verifica una firma usando la dirección del firmante
 * @param address - Dirección BSV que firmó
 * @param message - Mensaje original
 * @param signatureBase64 - Firma en base64
 * @param publicKeyHex - Clave pública en hex
 * @param encoding - Codificación del mensaje
 * @returns true si la firma es válida y corresponde a la dirección
 */
export function verifySignatureWithAddress(
  address: string,
  message: string,
  signatureBase64: string,
  publicKeyHex: string,
  encoding: 'utf8' | 'hex' = 'utf8'
): boolean {
  try {
    // Parsear clave pública
    const publicKey = PublicKey.fromString(publicKeyHex);

    // Verificar que la clave pública corresponde a la dirección
    const derivedAddress = publicKey.toAddress().toString();
    if (derivedAddress !== address) {
      return false;
    }

    // Verificar firma
    return verifySignature(publicKey, message, signatureBase64, encoding);
  } catch {
    return false;
  }
}

/**
 * Crea un mensaje prefijado al estilo "Bitcoin Signed Message"
 * (Útil para compatibilidad con algunas wallets)
 */
export function createPrefixedMessage(message: string): string {
  const prefix = 'Bitcoin Signed Message:\n';
  return prefix + message;
}

/**
 * Firma un mensaje con el prefijo de Bitcoin
 */
export function signPrefixedMessage(
  privateKey: PrivateKey,
  message: string
): SignedMessage {
  const prefixedMessage = createPrefixedMessage(message);
  return signMessage(privateKey, prefixedMessage, 'utf8');
}

/**
 * Verifica un mensaje con prefijo de Bitcoin
 */
export function verifyPrefixedSignature(
  publicKey: PublicKey,
  message: string,
  signatureBase64: string
): boolean {
  const prefixedMessage = createPrefixedMessage(message);
  return verifySignature(publicKey, prefixedMessage, signatureBase64, 'utf8');
}
