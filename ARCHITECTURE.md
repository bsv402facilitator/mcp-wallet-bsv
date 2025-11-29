# Arquitectura Técnica - BSV Wallet MCP Server

## Visión General

El BSV Wallet MCP Server es un servidor del Model Context Protocol que permite a Claude gestionar wallets BSV y crear pagos X402 de forma segura y autónoma.

## Stack Tecnológico

- **Lenguaje:** TypeScript 5.7+
- **Runtime:** Node.js 20+
- **SDK MCP:** @modelcontextprotocol/sdk 1.0+
- **SDK BSV:** @bsv/sdk 1.1+
- **Cliente HTTP:** axios 1.7+
- **Validación:** zod 3.24+
- **Testing:** vitest 2.1+

## Arquitectura de Módulos

```
┌─────────────────────────────────────────────────┐
│         Claude Desktop (Cliente MCP)            │
└────────────────┬────────────────────────────────┘
                 │ stdio (JSON-RPC)
┌────────────────▼────────────────────────────────┐
│           MCP Server (Node.js)                  │
│  ┌──────────────────────────────────────────┐  │
│  │  Server Layer (server.ts, index.ts)     │  │
│  │  - Registro de tools                     │  │
│  │  - Manejo de requests MCP                │  │
│  │  - Configuración y validación            │  │
│  └──────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────┐  │
│  │  Tools Layer (tools/)                    │  │
│  │  - create_x402_payment                   │  │
│  │  - sign_message                          │  │
│  │  - get_balance                           │  │
│  │  - manage_wallets                        │  │
│  └──────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────┐  │
│  │  Business Logic Layer                    │  │
│  │  ┌────────────┬────────────┬──────────┐ │  │
│  │  │  Wallet    │    BSV     │   X402   │ │  │
│  │  │  Manager   │ Operations │  Payment │ │  │
│  │  └────────────┴────────────┴──────────┘ │  │
│  └──────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────┐  │
│  │  Infrastructure Layer                    │  │
│  │  - Crypto (AES-256-GCM, Scrypt)         │  │
│  │  - Storage (Filesystem)                  │  │
│  │  - Network Client (WhatsOnChain API)    │  │
│  └──────────────────────────────────────────┘  │
└─────────────────┬────────────────┬─────────────┘
                  │                │
        ┌─────────▼────────┐   ┌──▼──────────────┐
        │ WhatsOnChain API │   │ Facilitador X402│
        │   (Blockchain)   │   │   (Cloudflare)  │
        └──────────────────┘   └─────────────────┘
```

## Capas del Sistema

### 1. Server Layer

**Responsabilidad:** Punto de entrada del servidor MCP, manejo de comunicación con Claude.

**Archivos:**
- `src/index.ts`: Entry point, inicialización y configuración
- `src/server.ts`: Configuración del servidor MCP, registro de tools
- `src/config.ts`: Gestión de configuración y variables de entorno

**Flujo:**
1. `index.ts` valida la configuración
2. `server.ts` crea instancia del servidor MCP
3. Registra los 4 tools disponibles
4. Conecta via `StdioServerTransport`
5. Escucha requests JSON-RPC desde Claude

### 2. Tools Layer

**Responsabilidad:** Implementación de los 4 tools MCP expuestos a Claude.

#### Tool: `create_x402_payment`
**Archivo:** `src/tools/create-x402-payment.ts`

**Flujo:**
```
1. Validar params (walletId, password, payTo, amount, network)
2. Cargar wallet → WalletManager.loadWallet()
3. Verificar network correcta
4. Obtener UTXOs → NetworkClient.getUTXOs()
5. Obtener source transactions → fetchSourceTransactions()
6. Construir TX → TransactionBuilder.buildTransaction()
7. Crear payload X402 → PaymentCreator.createPaymentPayload()
8. Generar instrucciones → createUsageInstructions()
9. Retornar response con payload base64
```

**Dependencias:**
- WalletManager (desencriptar wallet)
- NetworkClient (UTXOs, source transactions)
- TransactionBuilder (construir y firmar TX)
- PaymentCreator (formato X402)

#### Tool: `sign_message`
**Archivo:** `src/tools/sign-message.ts`

**Flujo:**
```
1. Validar params (walletId, password, message, encoding)
2. Cargar wallet → WalletManager.loadWallet()
3. Firmar mensaje → MessageSigner.signMessage()
4. Retornar signature + metadata
```

**Dependencias:**
- WalletManager
- MessageSigner

#### Tool: `get_balance`
**Archivo:** `src/tools/get-balance.ts`

**Flujo:**
```
1. Validar params (walletId, includeUTXOs)
2. Obtener metadata → WalletManager.getWalletMetadata() [NO password]
3. Crear cliente de red → createNetworkClient(network)
4. Obtener UTXOs → NetworkClient.getUTXOs()
5. Calcular balance (sumar UTXOs)
6. Retornar balance + UTXOs opcionales
```

**Dependencias:**
- WalletManager (solo metadata)
- NetworkClient

#### Tool: `manage_wallets`
**Archivo:** `src/tools/manage-wallets.ts`

**Flujo:**
```
Switch (operation):
  - 'create': WalletManager.createWallet()
  - 'list': WalletManager.listWallets()
  - 'import': WalletManager.importWallet()
  - 'export': WalletManager.exportWif()
```

**Dependencias:**
- WalletManager

### 3. Business Logic Layer

#### Wallet Module (`src/wallet/`)

**crypto.ts:**
- Encriptación/desencriptación con AES-256-GCM
- Derivación de claves con Scrypt (N=32768, r=8, p=1)
- Generación de salt e IV aleatorios
- AuthTag para integridad

```typescript
encryptWif(wif: string, password: string): Promise<EncryptedData>
decryptWif(encrypted: EncryptedData, password: string): Promise<string>
```

**storage.ts:**
- Lectura/escritura de archivos JSON
- Gestión de permisos (chmod 600 para wallets, 700 para directorio)
- Listado de wallets disponibles

```typescript
saveWallet(wallet: WalletData): Promise<void>
loadWallet(walletId: string): Promise<WalletData>
listWallets(): Promise<WalletMetadata[]>
deleteWallet(walletId: string): Promise<void>
```

**manager.ts:**
- API de alto nivel para gestión de wallets
- Integración con @bsv/sdk para generación de claves
- Orquestación entre crypto y storage

```typescript
class WalletManager {
  createWallet(name, network, password): Promise<WalletInfo>
  importWallet(name, wif, network, password): Promise<WalletInfo>
  loadWallet(walletId, password): Promise<UnlockedWallet>
  listWallets(): Promise<WalletMetadata[]>
  exportWif(walletId, password): Promise<string>
  getWalletMetadata(walletId): Promise<WalletMetadata>
}
```

#### BSV Module (`src/bsv/`)

**transaction-builder.ts:**
- Construcción de transacciones P2PKH
- Selección de UTXOs (estrategia: largest first)
- Cálculo automático de fees
- Gestión de cambio

```typescript
selectUTXOs(utxos, amount, feeRate): SelectedUTXOs
estimateFee(numInputs, numOutputs, feeRate): number
fetchSourceTransactions(utxos, networkClient): Promise<UTXOWithSource[]>
buildTransaction(params: BuildTxParams): Promise<Transaction>
getTransactionInfo(tx): TxInfo
```

**Fórmula de fee:**
```
size = 10 (header) + inputs * 148 + outputs * 34
fee = ceil(size * feeRate)
```

**network-client.ts:**
- Cliente WhatsOnChain API con retry logic
- Exponential backoff (1s, 2s, 4s, max 10s)
- Manejo de rate limits (429)

```typescript
class NetworkClient {
  getUTXOs(address): Promise<UTXO[]>
  getTransactionHex(txid): Promise<string>
  broadcastTransaction(txHex): Promise<BroadcastResult>
  getBalance(address): Promise<number>
}
```

**message-signer.ts:**
- Firma de mensajes con SHA-256
- Formato DER para signatures
- Soporte UTF-8 y Hex

```typescript
signMessage(privateKey, message, encoding): SignedMessage
verifySignature(publicKey, message, signature, encoding): boolean
```

#### X402 Module (`src/x402/`)

**payment-creator.ts:**
- Conversión de TX BSV a formato X402
- Estructura del payload:

```typescript
{
  x402Version: 1,
  scheme: 'exact',
  network: 'bsv-testnet' | 'bsv-mainnet',
  payload: {
    transaction: string  // Base64
  }
}
```

```typescript
createPaymentPayload(tx: Transaction, network): string
parsePaymentPayload(payloadBase64): X402PaymentPayload
validatePaymentPayload(payloadBase64): ValidationResult
createUsageInstructions(payloadBase64, resourceUrl?): string
```

**facilitator-client.ts:**
- Cliente HTTP del facilitador X402
- Endpoints: /verify, /settle

### 4. Infrastructure Layer

#### Tipos (`src/types/index.ts`)

Definiciones TypeScript para:
- `Network`, `WalletData`, `UnlockedWallet`
- `UTXO`, `UTXOWithSource`, `SelectedUTXOs`
- `CreatePaymentParams/Response`
- `SignMessageParams/Response`
- `GetBalanceParams/Response`
- `ManageWalletsParams/Response`

## Flujo de Datos: Crear Pago X402

```
Claude → MCP Server
  ↓
[server.ts] CallToolRequestSchema
  ↓
[create-x402-payment.ts] handleCreateX402Payment()
  ↓
[manager.ts] loadWallet(walletId, password)
  ↓
[storage.ts] loadWallet() → WalletData
  ↓
[crypto.ts] decryptWif() → WIF
  ↓
[@bsv/sdk] PrivateKey.fromWif() → UnlockedWallet
  ↓
[network-client.ts] getUTXOs(address)
  ↓
WhatsOnChain API → UTXO[]
  ↓
[network-client.ts] getTransactionHex() para cada UTXO
  ↓
WhatsOnChain API → TX Hex[]
  ↓
[transaction-builder.ts] selectUTXOs() → SelectedUTXOs
  ↓
[transaction-builder.ts] buildTransaction()
  ↓
[@bsv/sdk] Transaction.addInput/addOutput/sign()
  ↓
[payment-creator.ts] createPaymentPayload()
  ↓
Base64(JSON({ x402Version, scheme, network, payload }))
  ↓
[create-x402-payment.ts] Response
  ↓
MCP Server → Claude
```

## Seguridad

### Encriptación de Wallets

**Algoritmo:** AES-256-GCM
- Longitud de clave: 256 bits (32 bytes)
- Modo: Galois/Counter Mode (autenticación integrada)
- IV: 16 bytes aleatorios por encriptación
- Salt: 32 bytes aleatorios por wallet
- AuthTag: 16 bytes para verificar integridad

**Derivación de Clave:**
```
Scrypt(password, salt, 32, { N: 32768, r: 8, p: 1 })
```

**Parámetros OWASP:**
- N (CPU/memory cost): 32768
- r (block size): 8
- p (parallelization): 1

### Permisos de Archivos

**Directorio wallets:**
```bash
chmod 700 ~/.bsv-wallets/
# Solo propietario: read, write, execute
```

**Archivos wallet:**
```bash
chmod 600 ~/.bsv-wallets/{walletId}.json
# Solo propietario: read, write
```

### Mejores Prácticas

1. **Passwords NO se cachean** - Solicitados por operación
2. **Claves privadas en memoria mínima** - Solo durante operación
3. **No logging de secretos** - WIF, passwords excluidos de logs
4. **Testnet por defecto** - Producción requiere configuración explícita

## Patrones de Diseño

### Singleton Pattern
- `WalletManager`: Instancia única exportada como `walletManager`

### Factory Pattern
- `createNetworkClient(network)`: Crea cliente según network

### Strategy Pattern
- `selectUTXOs()`: Estrategia "largest first" (puede extenderse)

### Repository Pattern
- `storage.ts`: Abstracción del filesystem

## Manejo de Errores

Todos los handlers de tools implementan:
```typescript
try {
  // Lógica del tool
  return { content: [{ type: 'text', text: JSON.stringify(response) }] };
} catch (error) {
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: false,
        error: error.message
      })
    }]
  };
}
```

**Errores comunes:**
- Password incorrecto → "Error al desencriptar"
- Fondos insuficientes → "Fondos insuficientes. Necesitas X satoshis"
- UTXO no encontrado → "Error al obtener transacción fuente"
- Network error → "Max retries excedido"

## Performance

### Optimizaciones

1. **Selección de UTXOs**: Largest first minimiza número de inputs
2. **Retry con backoff**: Evita sobrecarga en errores transitorios
3. **Cache implícito**: WhatsOnChain API tiene cache de 15 min
4. **Lectura sin desencriptar**: `get_balance` no requiere password

### Métricas Típicas

- Crear wallet: ~100ms
- Obtener balance: ~200-500ms (depende de UTXOs)
- Crear pago X402: ~1-3s (UTXOs + source TXs + build)
- Firmar mensaje: ~50ms

## Testing

### Estructura
```
tests/
├── unit/
│   ├── crypto.test.ts       (12 tests)
│   └── tools.test.ts        (9 tests)
└── integration/
    └── (pendiente)
```

### Cobertura
- Encriptación/desencriptación: ✅
- Exports de tools: ✅
- Validación de parámetros: ✅
- Formato de respuestas: ✅

## Extensibilidad

### Agregar nuevo Tool

1. Crear `src/tools/nuevo-tool.ts`:
```typescript
export async function handleNuevoTool(args: unknown) {
  // Implementación
}
```

2. Registrar en `src/server.ts`:
```typescript
{
  name: 'nuevo_tool',
  description: '...',
  inputSchema: { ... }
}
```

3. Agregar case en CallToolRequestSchema handler

### Agregar nueva Network

Modificar `src/types/index.ts`:
```typescript
export type Network = 'mainnet' | 'testnet' | 'regtest';
```

Actualizar URLs en `network-client.ts`

## Deployment

### Requisitos de Producción

1. Node.js 20+ LTS
2. Directorio wallets con permisos correctos
3. Variables de entorno configuradas
4. Claude Desktop instalado

### Variables de Entorno

```bash
BSV_NETWORK=testnet|mainnet
WALLETS_DIR=/path/to/wallets
FACILITATOR_URL=https://facilitador-bsv-x402.workers.dev
LOG_LEVEL=info|debug|warn|error
```

### Configuración Claude Desktop

**Windows:**
`%APPDATA%\Claude\claude_desktop_config.json`

**macOS:**
`~/Library/Application Support/Claude/claude_desktop_config.json`

**Linux:**
`~/.config/Claude/claude_desktop_config.json`

## Limitaciones Conocidas

1. **Solo P2PKH**: No soporta otros tipos de scripts
2. **Un signature por input**: No multisig
3. **Solo BSV**: No otras blockchains
4. **Sin RBF**: No Replace-By-Fee
5. **Sin SegWit**: BSV no usa SegWit

## Roadmap Futuro

- [ ] Soporte para scripts personalizados
- [ ] Integración con hardware wallets
- [ ] Firma multi-dispositivo
- [ ] Soporte para tokens BSV
- [ ] Cache de UTXOs local
- [ ] UI web opcional para gestión
- [ ] Exportación/importación de wallets completas
- [ ] Backup automático encriptado
