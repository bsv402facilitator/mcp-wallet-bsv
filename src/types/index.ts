/**
 * Tipos TypeScript compartidos para el servidor MCP BSV Wallet
 */

export type Network = 'mainnet' | 'testnet';

export interface EncryptedData {
  algorithm: 'aes-256-gcm';
  salt: string;      // Base64
  iv: string;        // Base64
  authTag: string;   // Base64
  data: string;      // Base64 encrypted WIF
}

export interface WalletData {
  version: string;
  id: string;
  name: string;
  network: Network;
  address: string;
  createdAt: string;
  encrypted: EncryptedData;
}

export interface WalletMetadata {
  id: string;
  name: string;
  address: string;
  network: Network;
  createdAt: string;
}

export interface UnlockedWallet {
  id: string;
  name: string;
  network: Network;
  address: string;
  privateKey: any; // PrivateKey from @bsv/sdk
  publicKey: any;  // PublicKey from @bsv/sdk
}

export interface UTXO {
  txid: string;
  vout: number;
  value: number;
  satoshis: number;
  height?: number;
  tx_pos?: number;
}

export interface SelectedUTXOs {
  utxos: UTXOWithSource[];
  totalValue: number;
  change: number;
  fee: number;
}

export interface UTXOWithSource extends UTXO {
  sourceTransactionHex: string;
}

export interface BuildTxParams {
  privateKey: any;
  utxos: UTXOWithSource[];
  payToAddress: string;
  amount: number;
  changeAddress?: string;
  feeRate?: number;
  network: Network;
}

export interface AccessibilityPreferences {
  language?: 'es' | 'en';
  cognitiveLevel?: 'simple' | 'medium' | 'advanced';
  audioFriendly?: boolean;
}

export interface X402PaymentPayload {
  x402Version: number;
  scheme: 'exact';
  network: 'bsv-mainnet' | 'bsv-testnet';
  payload: {
    transaction: string; // Base64
  };
  accessibility?: AccessibilityPreferences;
}

export interface CreatePaymentParams {
  walletId: string;
  password: string;
  payTo: string;
  amount: number;
  network: Network;
  facilitatorUrl?: string;
  changeAddress?: string;
  feeRate?: number;
}

export interface CreatePaymentResponse {
  success: boolean;
  paymentPayload?: string;
  txid?: string;
  amount?: number;
  fee?: number;
  change?: number;
  inputs?: number;
  outputs?: number;
  size?: number;
  instructions?: string;
  error?: string;
}

export interface SignMessageParams {
  walletId: string;
  password: string;
  message: string;
  encoding?: 'utf8' | 'hex';
}

export interface SignMessageResponse {
  success: boolean;
  signature?: string;
  signingAddress?: string;
  publicKey?: string;
  message?: string;
  messageHash?: string;
  error?: string;
}

export interface GetBalanceParams {
  walletId: string;
  includeUTXOs?: boolean;
}

export interface GetBalanceResponse {
  success: boolean;
  walletId?: string;
  address?: string;
  network?: Network;
  balance?: number;
  balanceBSV?: number;
  utxoCount?: number;
  utxos?: Array<{
    txid: string;
    vout: number;
    value: number;
  }>;
  error?: string;
}

export type ManageWalletsOperation = 'create' | 'list' | 'import' | 'import-mnemonic' | 'export';

export interface ManageWalletsParams {
  operation: ManageWalletsOperation;
  name?: string;
  network?: Network;
  password?: string;
  walletId?: string;
  wif?: string;
  mnemonic?: string;
}

export interface ManageWalletsResponse {
  success: boolean;
  operation?: ManageWalletsOperation;
  walletId?: string;
  name?: string;
  address?: string;
  network?: Network;
  wallets?: WalletMetadata[];
  wif?: string;
  mnemonic?: string;
  error?: string;
}

export interface Config {
  network: Network;
  walletsDir: string;
  facilitatorUrl: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface VerifyResponse {
  success: boolean;
  valid?: boolean;
  invalidReason?: string;
  payer?: string;
  error?: string;
}

export interface SettleResponse {
  success: boolean;
  txid?: string;
  payer?: string;
  network?: string;
  broadcasted?: boolean;
  error?: string;
}

// Tipos para historial de transacciones

export interface WOCTransaction {
  tx_hash: string;
  height: number;
  tx_pos: number;
}

export interface WOCTransactionDetails {
  txid: string;
  hash: string;
  version: number;
  size: number;
  locktime: number;
  vin: Array<{
    txid: string;
    vout: number;
    scriptSig: {
      asm: string;
      hex: string;
    };
    sequence: number;
    value?: number;
    address?: string;
  }>;
  vout: Array<{
    value: number;
    n: number;
    scriptPubKey: {
      asm: string;
      hex: string;
      reqSigs?: number;
      type: string;
      addresses?: string[];
    };
  }>;
  blockhash?: string;
  confirmations?: number;
  time?: number;
  blocktime?: number;
}

export interface LocalTransactionRecord {
  txid: string;
  walletId: string;
  timestamp: string;
  type: 'sent' | 'received';
  amount: number;
  fee?: number;
  toAddress?: string;
  fromAddress?: string;
  network: Network;
  purpose?: string;
  metadata?: {
    x402?: boolean;
    changeAmount?: number;
    inputs?: number;
    outputs?: number;
  };
}

export interface TransactionLog {
  version: string;
  walletId: string;
  transactions: LocalTransactionRecord[];
  lastUpdated: string;
}

export interface EnrichedTransaction {
  txid: string;
  timestamp: string;
  height?: number;
  confirmations: number;
  type: 'sent' | 'received' | 'self';
  amount: number;
  fee?: number;
  addresses: {
    from: string[];
    to: string[];
  };
  isLocal: boolean;
  purpose?: string;
}

export interface ListTransactionsParams {
  walletId: string;
  limit?: number;
}

export interface ListTransactionsResponse {
  success: boolean;
  walletId?: string;
  address?: string;
  network?: Network;
  transactions?: EnrichedTransaction[];
  total?: number;
  error?: string;
}

export interface SendTransactionParams {
  walletId: string;
  password: string;
  toAddress: string;
  amount: number;
  changeAddress?: string;
  feeRate?: number;
}

export interface SendTransactionResponse {
  success: boolean;
  txid?: string;
  amount?: number;
  fee?: number;
  change?: number;
  toAddress?: string;
  fromAddress?: string;
  network?: Network;
  inputs?: number;
  outputs?: number;
  size?: number;
  broadcasted?: boolean;
  error?: string;
}

// Price-related types
export interface GetBsvPriceParams {
  currency?: 'usd' | 'eur';
  amount?: number;
  includeMarketData?: boolean;
}

export interface GetBsvPriceResponse {
  success: boolean;
  prices?: {
    usd: number;
    eur: number;
  };
  lastUpdated?: string;
  conversion?: {
    bsv: number;
    [key: string]: number;
  };
  marketData?: {
    marketCapUsd: number;
    volume24hUsd: number;
    priceChange24h: number;
  };
  cacheHit?: boolean;
  error?: string;
}
