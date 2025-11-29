/**
 * Sistema de caché en memoria con TTL (Time To Live)
 * Reduce llamadas a la API de precios almacenando resultados temporalmente
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export class PriceCache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private ttlMs: number;

  constructor(ttlMinutes = 3) {
    this.cache = new Map();
    this.ttlMs = ttlMinutes * 60 * 1000;
  }

  set(key: string, data: T): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + this.ttlMs,
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Verificar si expiró
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  getAge(key: string): number | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    return Date.now() - entry.timestamp;
  }
}

// Singleton instance con TTL de 3 minutos
export const priceCache = new PriceCache<any>(3);
