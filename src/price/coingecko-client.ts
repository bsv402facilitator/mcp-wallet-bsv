/**
 * Cliente para CoinGecko API
 * Obtiene precios de BSV con retry logic y exponential backoff
 */

import axios, { AxiosError } from 'axios';

/**
 * Configuración de retry
 */
interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
};

/**
 * Respuesta de precio de BSV
 */
export interface PriceResponse {
  prices: {
    usd: number;
    eur: number;
  };
  marketData?: {
    marketCapUsd: number;
    volume24hUsd: number;
    priceChange24h: number;
  };
  timestamp: string;
}

/**
 * Sleep utility para delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calcula delay con exponential backoff
 */
function getBackoffDelay(attempt: number, config: RetryConfig): number {
  const delay = config.initialDelayMs * Math.pow(2, attempt);
  return Math.min(delay, config.maxDelayMs);
}

/**
 * Verifica si un error es retryable
 */
function isRetryableError(error: AxiosError): boolean {
  // Sin respuesta = error de red (retryable)
  if (!error.response) return true;

  const status = error.response.status;

  // Server errors (5xx) son retryables
  if (status >= 500) return true;

  // Rate limit (429) es retryable
  if (status === 429) return true;

  return false;
}

/**
 * Cliente de CoinGecko API para precios de BSV
 */
export class CoinGeckoClient {
  private baseUrl = 'https://api.coingecko.com/api/v3';
  private retryConfig: RetryConfig;

  constructor(retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG) {
    this.retryConfig = retryConfig;
  }

  /**
   * Obtiene el precio actual de BSV en USD y EUR
   * @param includeMarketData - Incluir datos de mercado (market cap, volumen, cambio 24h)
   * @returns Precios y metadata
   */
  async getBsvPrice(includeMarketData = false): Promise<PriceResponse> {
    const url = `${this.baseUrl}/simple/price`;
    const params: any = {
      ids: 'bitcoin-sv',
      vs_currencies: 'usd,eur',
    };

    if (includeMarketData) {
      params.include_market_cap = 'true';
      params.include_24hr_vol = 'true';
      params.include_24hr_change = 'true';
    }

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const response = await axios.get(url, { params });

        if (response.status === 200) {
          const data = response.data['bitcoin-sv'];

          if (!data || !data.usd || !data.eur) {
            throw new Error('Invalid response format from CoinGecko');
          }

          const result: PriceResponse = {
            prices: {
              usd: data.usd,
              eur: data.eur,
            },
            timestamp: new Date().toISOString(),
          };

          if (includeMarketData) {
            result.marketData = {
              marketCapUsd: data.usd_market_cap || 0,
              volume24hUsd: data.usd_24h_vol || 0,
              priceChange24h: data.usd_24h_change || 0,
            };
          }

          return result;
        }

        throw new Error(`Unexpected status: ${response.status}`);
      } catch (error) {
        if (error instanceof AxiosError) {
          // Manejo especial para rate limits
          if (error.response?.status === 429) {
            if (attempt < this.retryConfig.maxRetries) {
              const delay = getBackoffDelay(attempt, this.retryConfig);
              await sleep(delay);
              continue;
            }
            throw new Error('CoinGecko rate limit exceeded. Please try again in a few minutes.');
          }

          // Si es retryable y quedan intentos
          if (isRetryableError(error) && attempt < this.retryConfig.maxRetries) {
            const delay = getBackoffDelay(attempt, this.retryConfig);
            await sleep(delay);
            continue;
          }
        }

        // Error no retryable o max retries excedido
        throw new Error(
          `Error fetching BSV price: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    throw new Error('Max retries exceeded fetching BSV price');
  }
}

// Singleton instance
export const coinGeckoClient = new CoinGeckoClient();
