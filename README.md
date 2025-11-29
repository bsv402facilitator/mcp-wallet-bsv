<div align="center">

# BSV Wallet MCP Server

**Enterprise-grade Bitcoin SV wallet management through the Model Context Protocol**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![MCP Protocol](https://img.shields.io/badge/MCP-1.0-purple)](https://modelcontextprotocol.io/)

[Features](#features) • [Installation](#installation) • [Usage](#usage) • [Security](#security) • [Documentation](#documentation)

</div>

---

## Overview

BSV Wallet MCP Server is a production-ready Model Context Protocol server that enables AI assistants like Claude to perform secure Bitcoin SV operations autonomously. Built with enterprise-grade security and developer experience in mind, it provides comprehensive wallet management, transaction building, and X402 payment protocol support.

### Key Highlights

- **🔐 Military-Grade Security**: AES-256-GCM encryption with OWASP-compliant Scrypt key derivation
- **💰 X402 Payment Protocol**: Native support for monetized API payments on Bitcoin SV
- **🤖 AI-Native Design**: Purpose-built for autonomous AI agents through MCP
- **🌐 Network Flexibility**: Seamless testnet and mainnet support
- **♿ Accessibility First**: Built-in support for multilingual, cognitive-level adapted responses
- **⚡ Production Ready**: Comprehensive error handling, retry logic, and transaction validation

---

## Features

### Wallet Management
- **Secure Storage**: Military-grade AES-256-GCM encryption for private keys
- **Multiple Import Options**: Support for WIF and BIP39 mnemonic phrases (12/24 words)
- **Hierarchical Derivation**: BIP32/BIP44 compatible key derivation
- **Network Isolation**: Separate wallets for mainnet and testnet environments

### Transaction Capabilities
- **P2PKH Transactions**: Standard Bitcoin SV payment transactions
- **Smart UTXO Selection**: Optimized largest-first strategy to minimize fees
- **Automatic Fee Calculation**: Dynamic fee estimation based on transaction size
- **Source Transaction Validation**: Full verification of input transactions

### X402 Payment Protocol
- **Standardized Payments**: Create X402-compliant payment payloads
- **Facilitator Integration**: Built-in support for X402 facilitator services
- **Accessibility Features**: Language, cognitive-level, and audio-friendly options
- **Usage Instructions**: Auto-generated integration guides for API calls

### Additional Features
- **Message Signing**: Cryptographic message signing with private keys
- **Balance Queries**: Real-time balance and UTXO information via WhatsOnChain
- **Transaction History**: Comprehensive transaction tracking and reporting
- **Price Integration**: Live BSV/USD and BSV/EUR pricing via CoinGecko
- **Retry Logic**: Exponential backoff for network resilience

---

## Installation

### Prerequisites

- **Node.js**: Version 20.0.0 or higher ([Download](https://nodejs.org/))
- **Claude Desktop**: Latest version ([Download](https://claude.ai/download))
- **BSV Testnet Account**: Recommended for development ([Faucet](https://faucet.bsvblockchain.org/))

### Quick Start

```bash
# Clone the repository
git clone https://github.com/bsv402facilitator/mcp-wallet-bsv.git
cd mcp-wallet-bsv

# Install dependencies
npm install

# Build the project
npm run build

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Auto-configure Claude Desktop
npm run setup
```

### Manual Claude Desktop Configuration

If automatic setup fails, manually edit your Claude Desktop configuration file:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "bsv-wallet": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-wallet-bsv/dist/index.js"],
      "env": {
        "BSV_NETWORK": "testnet",
        "WALLETS_DIR": "/path/to/.bsv-wallets",
        "FACILITATOR_URL": "https://facilitador-bsv-x402.workers.dev",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

Restart Claude Desktop to activate the MCP server.

---

## Usage

### Natural Language Interface

Interact with your BSV wallet using natural language through Claude:

```
Create a new testnet wallet called "my-wallet"

What's the balance of my wallet?

Send 10000 satoshis to mzzU86QdkgRqhknJydb9PacNGMY7XePhDR

Create an X402 payment of 5000 sats to mhSDV8SPswwXCGFpkE8pTWUftVnSW6g3qk

Sign the message "Hello World" with my wallet

Show me my recent transactions
```

### Available MCP Tools

#### 1. `manage_wallets`
Comprehensive wallet lifecycle management.

**Operations**:
- `create`: Generate new HD wallet with encrypted storage
- `list`: Display all available wallets with metadata
- `import`: Import wallet from WIF private key
- `import-mnemonic`: Restore wallet from BIP39 seed phrase
- `export`: Export wallet WIF (requires password)

**Example**:
```typescript
{
  operation: "create",
  name: "production-wallet",
  network: "mainnet",
  password: "secure-password-123"
}
```

#### 2. `send_transaction`
Broadcast standard P2PKH transactions to the blockchain.

**Parameters**:
- `walletId`: Wallet identifier
- `password`: Encryption password
- `toAddress`: Recipient BSV address
- `amount`: Satoshis to send
- `changeAddress` (optional): Custom change address
- `feeRate` (optional): Custom fee rate (sat/byte, default: 0.5)

#### 3. `create_x402_payment`
Generate X402 payment payloads for monetized APIs.

**Parameters**:
- `walletId`, `password`, `payTo`, `amount`, `network`
- `facilitatorUrl` (optional): Custom facilitator endpoint
- `language` (optional): 'es' | 'en' (default: 'es')
- `cognitiveLevel` (optional): 'simple' | 'medium' | 'advanced'
- `audioFriendly` (optional): Optimize for screen readers

**Returns**: Base64-encoded X402 payload with usage instructions

#### 4. `get_balance`
Query wallet balance and UTXO set.

**Parameters**:
- `walletId`: Wallet identifier
- `includeUTXOs` (optional): Include detailed UTXO list

**Note**: No password required (uses public address only)

#### 5. `sign_message`
Cryptographically sign arbitrary messages.

**Parameters**:
- `walletId`, `password`, `message`
- `encoding` (optional): 'utf8' | 'hex' (default: 'utf8')

**Returns**: DER-encoded signature with verification metadata

#### 6. `list_transactions`
Retrieve transaction history with enriched metadata.

**Parameters**:
- `walletId`: Wallet identifier
- `limit` (optional): Max transactions to return (default: 100)

#### 7. `get_bsv_price`
Fetch current BSV market price.

**Parameters**:
- `currency` (optional): 'usd' | 'eur' (default: 'usd')
- `amount` (optional): BSV amount to convert
- `includeMarketData` (optional): Include market cap and volume

**Cache**: 3-minute TTL for API efficiency

---

## Security

### Encryption Architecture

**Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Length**: 256 bits (32 bytes)
- **IV**: 16 bytes (random per encryption)
- **Auth Tag**: 16 bytes (integrity verification)
- **Salt**: 32 bytes (random per wallet)

**Key Derivation**: Scrypt with OWASP parameters
```
Key = Scrypt(password, salt, keyLength=32, {
  N: 32768,  // CPU/memory cost factor
  r: 8,       // Block size parameter
  p: 1        // Parallelization parameter
})
```

### File System Security

**Permissions** (Unix-based systems):
- Wallet directory: `chmod 700` (owner-only access)
- Wallet files: `chmod 600` (owner read/write only)

**Storage Location**: `~/.bsv-wallets/` (configurable via `WALLETS_DIR`)

### Security Best Practices

- **No Credential Caching**: Passwords required per sensitive operation
- **Minimal Memory Exposure**: Private keys held in memory only during operation
- **Secure Logging**: No passwords, private keys, or WIFs in logs
- **Testnet Default**: Production requires explicit configuration
- **Input Validation**: Comprehensive parameter validation on all tools
- **Network Isolation**: Separate wallets per network environment

---

## Development

### Build Commands

```bash
npm run build          # Compile TypeScript to JavaScript
npm run dev            # Watch mode for development
npm run clean          # Remove build artifacts
npm start              # Run compiled server
```

### Testing

```bash
npm test                        # Run all tests
npm run test:unit              # Unit tests only
npm run test:integration       # Integration tests only
vitest run tests/unit/crypto.test.ts  # Single test file
```

**Current Coverage**:
- Encryption/decryption: ✅ 12 tests
- Tool exports and schemas: ✅ 9 tests
- Integration tests: 🚧 In progress

### Code Quality

```bash
npm run lint           # ESLint with TypeScript support
```

**Configuration**:
- **TypeScript**: Strict mode enabled
- **Module System**: ES Modules (Node16 resolution)
- **Target**: ES2022
- **Source Maps**: Enabled for debugging

---

## Architecture

### High-Level System Design

```
┌─────────────────────────────────────────────────┐
│         Claude Desktop (MCP Client)             │
└────────────────┬────────────────────────────────┘
                 │ JSON-RPC over stdio
┌────────────────▼────────────────────────────────┐
│           MCP Server (Node.js)                  │
│  ┌──────────────────────────────────────────┐  │
│  │  Server Layer (server.ts)                │  │
│  │  - 7 MCP Tools Registration              │  │
│  │  - Request/Response Handling             │  │
│  └──────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────┐  │
│  │  Business Logic Layer                    │  │
│  │  - Wallet Manager (singleton)            │  │
│  │  - Transaction Builder                   │  │
│  │  - X402 Payment Creator                  │  │
│  │  - Message Signer                        │  │
│  └──────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────┐  │
│  │  Infrastructure Layer                    │  │
│  │  - AES-256-GCM Crypto                    │  │
│  │  - Encrypted File Storage                │  │
│  │  - WhatsOnChain API Client               │  │
│  │  - CoinGecko Price API                   │  │
│  └──────────────────────────────────────────┘  │
└─────────────────┬───────────────┬──────────────┘
                  │               │
        ┌─────────▼────────┐  ┌──▼──────────────┐
        │ BSV Blockchain   │  │ External APIs   │
        │ (WhatsOnChain)   │  │ (CoinGecko,     │
        │                  │  │  Facilitator)   │
        └──────────────────┘  └─────────────────┘
```

### Project Structure

```
src/
├── index.ts                      # Application entry point
├── server.ts                     # MCP server configuration
├── config.ts                     # Environment configuration
├── types/
│   └── index.ts                  # TypeScript type definitions
├── wallet/
│   ├── manager.ts                # High-level wallet API
│   ├── crypto.ts                 # AES-256-GCM encryption
│   └── storage.ts                # File system operations
├── bsv/
│   ├── transaction-builder.ts    # TX construction and signing
│   ├── message-signer.ts         # Message signing/verification
│   ├── network-client.ts         # WhatsOnChain API client
│   └── transaction-history.ts    # TX tracking and enrichment
├── x402/
│   ├── payment-creator.ts        # X402 payload generation
│   └── facilitator-client.ts     # Facilitator HTTP client
├── price/
│   ├── coingecko-client.ts       # CoinGecko API client
│   └── price-cache.ts            # In-memory price cache
└── tools/
    ├── manage-wallets.ts         # Wallet CRUD operations
    ├── send-transaction.ts       # Standard BSV transactions
    ├── create-x402-payment.ts    # X402 payment generation
    ├── sign-message.ts           # Message signing
    ├── get-balance.ts            # Balance queries
    ├── list-transactions.ts      # Transaction history
    └── get-bsv-price.ts          # Price queries
```

---

## Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)**: Detailed technical architecture and design patterns
- **[EXAMPLES.md](./EXAMPLES.md)**: Comprehensive usage examples and tutorials
- **[ACCESSIBILITY.md](./ACCESSIBILITY.md)**: Accessibility features and guidelines
- **[CLAUDE.md](./CLAUDE.md)**: Guide for Claude Code instances working with this codebase

### External Resources

- [Model Context Protocol Specification](https://spec.modelcontextprotocol.io/)
- [BSV TypeScript SDK Documentation](https://docs.bsvblockchain.org/ts-sdk)
- [X402 Payment Protocol](https://github.com/bitcoin-sv/x402)
- [WhatsOnChain API Reference](https://developers.whatsonchain.com/)
- [CoinGecko API Documentation](https://www.coingecko.com/api/documentation)

---

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Maintain TypeScript strict mode compliance
- Add tests for new features (target: >80% coverage)
- Follow existing code style (ESLint configuration)
- Update documentation for API changes
- Use conventional commit messages

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Support

- **Issues**: [GitHub Issues](https://github.com/bsv402facilitator/mcp-wallet-bsv/issues)
- **Discussions**: [GitHub Discussions](https://github.com/bsv402facilitator/mcp-wallet-bsv/discussions)
- **Email**: support@bsv402facilitator.com

---

<div align="center">

**Built with ❤️ for the Bitcoin SV ecosystem**

[⬆ Back to Top](#bsv-wallet-mcp-server)

</div>
