/**
 * Tool MCP: get_bsv_price
 * Obtiene precios de BSV en monedas fiat (USD, EUR) con caché
 */

import { coinGeckoClient } from '../price/coingecko-client.js';
import { priceCache } from '../price/price-cache.js';
import type { GetBsvPriceParams, GetBsvPriceResponse } from '../types/index.js';

export async function handleGetBsvPrice(args: unknown) {
  try {
    const params = args as GetBsvPriceParams;
    const { currency = 'usd', amount, includeMarketData = false } = params;

    // Validar currency
    if (currency !== 'usd' && currency !== 'eur') {
      throw new Error('currency debe ser "usd" o "eur"');
    }

    // Validar amount si fue proporcionado
    if (amount !== undefined && amount <= 0) {
      throw new Error('amount debe ser mayor que 0');
    }

    // Verificar caché primero
    const cacheKey = includeMarketData ? 'bsv-price-market' : 'bsv-price';
    let priceData = priceCache.get(cacheKey);
    let cacheHit = false;

    if (!priceData) {
      // Cache miss - consultar API
      priceData = await coinGeckoClient.getBsvPrice(includeMarketData);
      priceCache.set(cacheKey, priceData);
    } else {
      cacheHit = true;
    }

    // Preparar respuesta
    const response: GetBsvPriceResponse = {
      success: true,
      prices: priceData.prices,
      lastUpdated: priceData.timestamp,
      cacheHit,
    };

    // Agregar conversión si amount fue proporcionado
    if (amount !== undefined) {
      response.conversion = {
        bsv: amount,
        [currency]: amount * priceData.prices[currency],
      };
    }

    // Agregar market data si fue solicitado
    if (includeMarketData && priceData.marketData) {
      response.marketData = priceData.marketData;
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
