/**
 * Tool MCP: sign_message
 * Firma un mensaje arbitrario con la clave privada de la wallet
 */

import { walletManager } from '../wallet/manager.js';
import { signMessage } from '../bsv/message-signer.js';
import type { SignMessageParams, SignMessageResponse } from '../types/index.js';

export async function handleSignMessage(args: unknown) {
  try {
    const params = args as SignMessageParams;
    const { walletId, password, message, encoding = 'utf8' } = params;

    // Validar parámetros
    if (!walletId) {
      throw new Error('Se requiere walletId');
    }
    if (!password) {
      throw new Error('Se requiere password');
    }
    if (!message) {
      throw new Error('Se requiere message');
    }

    // Validar encoding
    if (encoding !== 'utf8' && encoding !== 'hex') {
      throw new Error('encoding debe ser "utf8" o "hex"');
    }

    // Cargar wallet (requiere password)
    const wallet = await walletManager.loadWallet(walletId, password);

    // Firmar mensaje
    const signed = signMessage(wallet.privateKey, message, encoding);

    // Preparar respuesta
    const response: SignMessageResponse = {
      success: true,
      signature: signed.signature,
      signingAddress: signed.address,
      publicKey: signed.publicKey,
      message: signed.message,
      messageHash: signed.messageHash,
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
