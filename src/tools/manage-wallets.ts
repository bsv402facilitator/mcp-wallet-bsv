/**
 * Tool MCP: manage_wallets
 * Gestión de wallets: crear, listar, importar o exportar
 */

import { walletManager } from '../wallet/manager.js';
import type { ManageWalletsParams, ManageWalletsResponse } from '../types/index.js';

export async function handleManageWallets(args: unknown) {
  try {
    const params = args as ManageWalletsParams;
    const { operation } = params;

    let response: ManageWalletsResponse;

    switch (operation) {
      case 'create': {
        // Validar parámetros requeridos
        if (!params.name || !params.network || !params.password) {
          throw new Error('Para crear una wallet se requiere: name, network y password');
        }

        const walletInfo = await walletManager.createWallet(
          params.name,
          params.network,
          params.password
        );

        response = {
          success: true,
          operation: 'create',
          walletId: walletInfo.id,
          name: walletInfo.name,
          address: walletInfo.address,
          network: walletInfo.network,
          mnemonic: walletInfo.mnemonic, // Incluir el mnemonic
        };
        break;
      }

      case 'list': {
        const wallets = await walletManager.listWallets();

        response = {
          success: true,
          operation: 'list',
          wallets,
        };
        break;
      }

      case 'import': {
        // Validar parámetros requeridos
        if (!params.name || !params.wif || !params.network || !params.password) {
          throw new Error('Para importar una wallet se requiere: name, wif, network y password');
        }

        const walletInfo = await walletManager.importWallet(
          params.name,
          params.wif,
          params.network,
          params.password
        );

        response = {
          success: true,
          operation: 'import',
          walletId: walletInfo.id,
          name: walletInfo.name,
          address: walletInfo.address,
          network: walletInfo.network,
        };
        break;
      }

      case 'import-mnemonic': {
        // Validar parámetros requeridos
        if (!params.name || !params.mnemonic || !params.network || !params.password) {
          throw new Error('Para importar una wallet desde mnemonic se requiere: name, mnemonic, network y password');
        }

        const walletInfo = await walletManager.importFromMnemonic(
          params.name,
          params.mnemonic,
          params.network,
          params.password
        );

        response = {
          success: true,
          operation: 'import-mnemonic',
          walletId: walletInfo.id,
          name: walletInfo.name,
          address: walletInfo.address,
          network: walletInfo.network,
        };
        break;
      }

      case 'export': {
        // Validar parámetros requeridos
        if (!params.walletId || !params.password) {
          throw new Error('Para exportar una wallet se requiere: walletId y password');
        }

        const wif = await walletManager.exportWif(params.walletId, params.password);

        response = {
          success: true,
          operation: 'export',
          walletId: params.walletId,
          wif,
        };
        break;
      }

      default:
        throw new Error(`Operación desconocida: ${operation}`);
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
