# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

BSV Wallet MCP Server - Servidor del Model Context Protocol que permite a Claude gestionar wallets BSV y crear pagos X402 de forma segura y autónoma.

## Comandos Esenciales

### Build y Compilación
```bash
npm run build          # Compilar TypeScript a dist/
npm run dev            # Watch mode para desarrollo
npm run clean          # Eliminar carpeta dist/
```

### Testing
```bash
npm test               # Ejecutar todos los tests con vitest
npm run test:unit      # Solo tests unitarios (tests/unit/)
npm run test:integration  # Solo tests de integración
vitest run tests/unit/crypto.test.ts  # Ejecutar un test específico
```

### Setup y Configuración
```bash
npm run setup          # Configurar Claude Desktop automáticamente
npm run start          # Ejecutar el servidor MCP compilado
npm run lint           # Linting con ESLint
```

### Variables de Entorno
Copiar `.env.example` a `.env` antes de desarrollar:
- `BSV_NETWORK`: testnet | mainnet
- `WALLETS_DIR`: Ruta al directorio de wallets (default: ~/.bsv-wallets)
- `FACILITATOR_URL`: URL del facilitador X402
- `LOG_LEVEL`: info | debug | warn | error

## Arquitectura de Alto Nivel

### Comunicación MCP
```
Claude Desktop (stdio) ←→ server.ts ←→ Tools ←→ Business Logic ←→ Infrastructure
```

El servidor MCP expone **7 tools** a Claude a través de JSON-RPC sobre stdio:
1. `create_x402_payment` - Crea pagos X402 para APIs monetizadas
2. `send_transaction` - Envía transacciones BSV directamente a blockchain
3. `sign_message` - Firma mensajes con clave privada
4. `get_balance` - Consulta balances y UTXOs
5. `manage_wallets` - CRUD de wallets (create, list, import, export)
6. `list_transactions` - Historial de transacciones
7. `get_bsv_price` - Precio BSV en USD/EUR desde CoinGecko

### Flujo Crítico: Crear Pago X402

Este es el flujo más complejo del sistema:

```
Tool Handler (create-x402-payment.ts)
  ↓
WalletManager.loadWallet(walletId, password)
  ↓ [Desencripta con AES-256-GCM]
NetworkClient.getUTXOs(address)
  ↓ [WhatsOnChain API]
TransactionBuilder.selectUTXOs(utxos, amount)
  ↓ [Largest-first strategy]
TransactionBuilder.fetchSourceTransactions(selectedUTXOs)
  ↓ [Obtiene TX hex de cada UTXO padre]
TransactionBuilder.buildTransaction({...})
  ↓ [Crea TX BSV firmada]
PaymentCreator.createPaymentPayload(tx, network)
  ↓ [Convierte a formato X402 base64]
Response: { payload, usageInstructions, txid, ... }
```

**Puntos clave:**
- Password NO se cachea - se pide por operación
- Source transactions son necesarias para firmar inputs
- Selección de UTXOs: largest-first minimiza fees
- Fee calculation: `ceil((10 + inputs*148 + outputs*34) * feeRate)`

### Seguridad: Encriptación de Wallets

Las wallets se almacenan encriptadas en `~/.bsv-wallets/{walletId}.json`:

```typescript
{
  id: string,
  name: string,
  network: 'mainnet' | 'testnet',
  address: string,  // Pública
  encryptedWif: {
    ciphertext: string,  // AES-256-GCM
    iv: string,          // 16 bytes
    salt: string,        // 32 bytes
    authTag: string      // 16 bytes
  },
  createdAt: string
}
```

**Derivación de clave:**
```typescript
Scrypt(password, salt, keyLength=32, {
  N: 32768,  // CPU/memory cost (OWASP)
  r: 8,      // Block size
  p: 1       // Parallelization
})
```

**Permisos:**
- Directorio: `chmod 700` (solo owner)
- Archivos: `chmod 600` (solo owner read/write)

### Módulos Core

#### Wallet Module (`src/wallet/`)
- `manager.ts`: API de alto nivel (singleton: `walletManager`)
- `crypto.ts`: AES-256-GCM encrypt/decrypt, Scrypt key derivation
- `storage.ts`: Filesystem I/O con manejo de permisos

**NO password por defecto:**
- `get_balance` solo lee metadata (sin desencriptar)
- `list_transactions` solo usa address pública
- Operaciones que firman SÍ requieren password

#### BSV Module (`src/bsv/`)
- `transaction-builder.ts`: Construcción de TXs P2PKH, selección de UTXOs, fee estimation
- `network-client.ts`: WhatsOnChain API con retry + exponential backoff (1s, 2s, 4s, max 10s)
- `message-signer.ts`: Firma/verificación de mensajes con SHA-256
- `transaction-history.ts`: Tracking de TXs con metadata enriquecida

**Network Client:**
- Retry en rate limits (429)
- Timeout default: 10s
- Exponential backoff en errores transitorios

#### X402 Module (`src/x402/`)
- `payment-creator.ts`: Convierte TX BSV → payload X402 base64
- `facilitator-client.ts`: Cliente del facilitador (/verify, /settle)

**Estructura X402 payload:**
```json
{
  "x402Version": 1,
  "scheme": "exact",
  "network": "bsv-testnet" | "bsv-mainnet",
  "payload": {
    "transaction": "base64(txHex)"
  }
}
```

#### Price Module (`src/price/`)
- `coingecko-client.ts`: Cliente CoinGecko API
- `price-cache.ts`: Cache en memoria con TTL de 3 minutos

### Tools Layer (`src/tools/`)

Cada tool exporta un handler: `handleXxxYyy(args: unknown)`

**Patrón común:**
```typescript
export async function handleToolName(args: unknown) {
  try {
    // 1. Validar args (manualmente o con Zod)
    // 2. Ejecutar lógica de negocio
    // 3. Retornar response estructurada
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error.message
        }, null, 2)
      }]
    };
  }
}
```

**Registro en `server.ts`:**
- `ListToolsRequestSchema` → Define schema de inputs
- `CallToolRequestSchema` → Switch case por tool name

## Patterns y Convenciones

### TypeScript
- **Module System:** ES Modules (`.js` imports en TS files)
- **Target:** ES2022, Node 20+
- **Strict Mode:** Habilitado
- **Source Maps:** Habilitados para debugging

### Error Handling
- Todos los handlers de tools tienen try/catch
- Errores retornan `{ success: false, error: string }`
- NO usar `throw` en handlers MCP (siempre retornar response)

### Testing
- Framework: Vitest
- Ubicación: `tests/unit/` y `tests/integration/`
- Naming: `*.test.ts`
- Cobertura actual: crypto, tools exports

### Imports
**IMPORTANTE:** Usar `.js` en imports TypeScript (no `.ts`):
```typescript
// ✅ Correcto
import { foo } from './bar.js';

// ❌ Incorrecto
import { foo } from './bar';
import { foo } from './bar.ts';
```

Esto es requerido por Node16 module resolution.

## Accesibilidad X402

El sistema soporta preferencias de accesibilidad en pagos X402:

### Parámetros Opcionales en `create_x402_payment`:
- `language`: 'es' | 'en' (default: 'es')
- `cognitiveLevel`: 'simple' | 'medium' | 'advanced' (default: 'simple')
- `audioFriendly`: boolean (default: true)

### Uso:
```typescript
// Usuario con discapacidad visual
create_x402_payment({
  ...,
  language: 'es',
  cognitiveLevel: 'simple',
  audioFriendly: true
})

// Desarrollador técnico
create_x402_payment({
  ...,
  language: 'en',
  cognitiveLevel: 'advanced',
  audioFriendly: false
})
```

Las respuestas incluyen metadata estructurada para lectores de pantalla.

## Limitaciones Conocidas

1. **Solo P2PKH**: No soporta otros script types (multisig, OP_RETURN complejo, etc.)
2. **Un signature por input**: No multisig
3. **Solo BSV**: No otras blockchains
4. **Sin RBF**: No Replace-By-Fee
5. **WhatsOnChain dependency**: Sin nodo propio

## Extender el Sistema

### Agregar un Nuevo Tool

1. Crear handler en `src/tools/nuevo-tool.ts`:
```typescript
export async function handleNuevoTool(args: unknown) {
  // Implementación
}
```

2. Registrar en `src/server.ts`:
```typescript
// En ListToolsRequestSchema
{
  name: 'nuevo_tool',
  description: '...',
  inputSchema: { ... }
}

// En CallToolRequestSchema
case 'nuevo_tool':
  return await handleNuevoTool(args);
```

3. Agregar tipos en `src/types/index.ts` si es necesario

4. Escribir tests en `tests/unit/tools.test.ts`

### Agregar Soporte para Nueva Network

1. Extender type en `src/types/index.ts`:
```typescript
export type Network = 'mainnet' | 'testnet' | 'regtest';
```

2. Actualizar URLs en `src/bsv/network-client.ts`:
```typescript
private getBaseUrl(): string {
  return this.network === 'regtest'
    ? 'http://localhost:3000'
    : // ...existing
}
```

3. Actualizar conversión en `src/x402/payment-creator.ts`

## Debugging

### Modo Verbose
```bash
LOG_LEVEL=debug npm start
```

### Verificar Configuración Claude Desktop
Windows: `%APPDATA%\Claude\claude_desktop_config.json`
macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
Linux: `~/.config/Claude/claude_desktop_config.json`

### Logs de Claude Desktop
Windows: `%APPDATA%\Claude\logs\`
macOS: `~/Library/Logs/Claude/`

### Test Rápido de Tool
```typescript
// tests/manual/test-tool.ts
import { handleGetBalance } from '../src/tools/get-balance.js';

const result = await handleGetBalance({
  walletId: 'test-wallet',
  includeUTXOs: true
});
console.log(JSON.stringify(result, null, 2));
```

## Referencias Externas

- [@bsv/sdk Documentation](https://docs.bsvblockchain.org/ts-sdk)
- [MCP Protocol Specification](https://spec.modelcontextprotocol.io/)
- [WhatsOnChain API](https://developers.whatsonchain.com/)
- [X402 Protocol](https://github.com/bitcoin-sv/x402)
- [CoinGecko API](https://www.coingecko.com/api/documentation)
