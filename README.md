# BSV Wallet MCP Server

Servidor MCP (Model Context Protocol) que proporciona capacidades de wallet BSV a Claude, con soporte completo para transacciones X402.

## Características

- 🔐 Gestión segura de wallets BSV con encriptación AES-256-GCM
- 💰 Creación de pagos X402 para APIs monetizadas
- ✍️ Firma de mensajes arbitrarios
- 📊 Consulta de balances y UTXOs
- 🔄 Soporte para testnet y mainnet
- 🛠️ Integración completa con Claude Desktop

## Requisitos

- Node.js 20+
- Claude Desktop
- Cuenta en testnet BSV (recomendado para desarrollo)

## Instalación

```bash
# Clonar el repositorio
cd C:/Users/andre/programacion/x402/bsv/mcp-wallet

# Instalar dependencias
npm install

# Compilar
npm run build

# Configurar Claude Desktop
npm run setup
```

## Configuración

Copia `.env.example` a `.env` y ajusta las variables:

```bash
BSV_NETWORK=testnet
WALLETS_DIR=C:/Users/andre/.bsv-wallets
FACILITATOR_URL=https://facilitador-bsv-x402.workers.dev
LOG_LEVEL=info
```

## Uso con Claude

Una vez configurado, puedes usar estos comandos con Claude:

### Crear una wallet

```
Crea una nueva wallet BSV de testnet llamada "mi-wallet"
```

### Consultar balance

```
¿Cuál es el balance de mi wallet?
```

### Crear un pago X402

```
Crea un pago X402 de 5000 satoshis a la dirección mzzU86QdkgRqhknJydb9PacNGMY7XePhDR
```

### Firmar un mensaje

```
Firma el mensaje "Hello World" con mi wallet
```

### Enviar una transacción simple

```
Envía 10000 satoshis a la dirección mzzU86QdkgRqhknJydb9PacNGMY7XePhDR desde mi wallet
```

## Herramientas MCP Disponibles

1. **send_transaction** - Envía transacciones BSV simples directamente a la blockchain
2. **create_x402_payment** - Crea pagos X402 para APIs monetizadas
3. **sign_message** - Firma mensajes arbitrarios
4. **get_balance** - Consulta balance y UTXOs
5. **manage_wallets** - Gestión de wallets (crear, listar, importar WIF/mnemonic, exportar)
6. **list_transactions** - Consulta historial de transacciones

## Seguridad

- Las claves privadas se almacenan encriptadas con AES-256-GCM
- Derivación de claves con Scrypt (parámetros OWASP)
- Permisos de archivos restringidos (600)
- Password requerido para operaciones sensibles
- No se cachean passwords ni claves privadas

## Desarrollo

```bash
# Modo desarrollo (watch)
npm run dev

# Tests unitarios
npm run test:unit

# Tests de integración
npm run test:integration

# Todos los tests
npm test

# Linting
npm run lint
```

## Arquitectura

```
src/
├── index.ts              # Entry point
├── server.ts             # Servidor MCP
├── config.ts             # Configuración
├── wallet/               # Gestión de wallets
│   ├── crypto.ts         # Encriptación
│   ├── storage.ts        # Filesystem
│   └── manager.ts        # API principal
├── bsv/                  # Operaciones BSV
│   ├── transaction-builder.ts
│   ├── message-signer.ts
│   └── network-client.ts
├── x402/                 # Soporte X402
│   ├── payment-creator.ts
│   └── facilitator-client.ts
├── tools/                # Tools MCP
│   ├── create-x402-payment.ts
│   ├── sign-message.ts
│   ├── get-balance.ts
│   └── manage-wallets.ts
└── types/                # Tipos TypeScript
    └── index.ts
```

## Referencias

- [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [@bsv/sdk](https://github.com/bitcoin-sv/ts-sdk)
- [WhatsOnChain API](https://developers.whatsonchain.com/)
- [X402 Protocol](https://github.com/bitcoin-sv/x402)

## Licencia

MIT
