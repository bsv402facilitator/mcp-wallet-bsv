/**
 * Configuración del servidor MCP y registro de tools
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Import tool handlers (will be implemented)
import { handleCreateX402Payment } from './tools/create-x402-payment.js';
import { handleSignMessage } from './tools/sign-message.js';
import { handleGetBalance } from './tools/get-balance.js';
import { handleManageWallets } from './tools/manage-wallets.js';
import { handleListTransactions } from './tools/list-transactions.js';
import { handleSendTransaction } from './tools/send-transaction.js';
import { handleGetBsvPrice } from './tools/get-bsv-price.js';

export function createServer(): Server {
  const server = new Server(
    {
      name: 'bsv-wallet-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        prompts: {},
      },
    }
  );

  // Handler para listar tools disponibles
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'create_x402_payment',
        description: 'Crea una transacción BSV y genera un payload X402 para pagos a APIs monetizadas. Requiere password de la wallet.',
        inputSchema: {
          type: 'object',
          properties: {
            walletId: {
              type: 'string',
              description: 'ID de la wallet a usar',
            },
            password: {
              type: 'string',
              description: 'Password para desencriptar la wallet',
            },
            payTo: {
              type: 'string',
              description: 'Dirección BSV del destinatario (merchant)',
            },
            amount: {
              type: 'number',
              description: 'Cantidad en satoshis a pagar',
            },
            network: {
              type: 'string',
              enum: ['mainnet', 'testnet'],
              description: 'Red BSV a usar',
            },
            facilitatorUrl: {
              type: 'string',
              description: 'URL del facilitador X402 (opcional)',
            },
            changeAddress: {
              type: 'string',
              description: 'Dirección para el cambio (opcional, por defecto usa la misma wallet)',
            },
            feeRate: {
              type: 'number',
              description: 'Tasa de fee en sat/byte (opcional, por defecto 0.5)',
            },
            language: {
              type: 'string',
              enum: ['es', 'en'],
              description: 'Idioma preferido para respuestas de accesibilidad (opcional, por defecto es)',
            },
            cognitiveLevel: {
              type: 'string',
              enum: ['simple', 'medium', 'advanced'],
              description: 'Nivel de complejidad de las explicaciones (opcional, por defecto simple)',
            },
            audioFriendly: {
              type: 'boolean',
              description: 'Formato optimizado para lectores de pantalla (opcional, por defecto true)',
            },
          },
          required: ['walletId', 'password', 'payTo', 'amount', 'network'],
        },
      },
      {
        name: 'sign_message',
        description: 'Firma un mensaje arbitrario con la clave privada de la wallet',
        inputSchema: {
          type: 'object',
          properties: {
            walletId: {
              type: 'string',
              description: 'ID de la wallet a usar',
            },
            password: {
              type: 'string',
              description: 'Password para desencriptar la wallet',
            },
            message: {
              type: 'string',
              description: 'Mensaje a firmar',
            },
            encoding: {
              type: 'string',
              enum: ['utf8', 'hex'],
              description: 'Codificación del mensaje (opcional, por defecto utf8)',
            },
          },
          required: ['walletId', 'password', 'message'],
        },
      },
      {
        name: 'get_balance',
        description: 'Consulta el balance y UTXOs de una wallet',
        inputSchema: {
          type: 'object',
          properties: {
            walletId: {
              type: 'string',
              description: 'ID de la wallet a consultar',
            },
            includeUTXOs: {
              type: 'boolean',
              description: 'Incluir lista detallada de UTXOs (opcional, por defecto false)',
            },
          },
          required: ['walletId'],
        },
      },
      {
        name: 'manage_wallets',
        description: 'Gestión de wallets: crear, listar, importar (WIF o mnemonic) o exportar',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['create', 'list', 'import', 'import-mnemonic', 'export'],
              description: 'Operación a realizar',
            },
            name: {
              type: 'string',
              description: 'Nombre de la wallet (requerido para create, import e import-mnemonic)',
            },
            network: {
              type: 'string',
              enum: ['mainnet', 'testnet'],
              description: 'Red BSV (requerido para create, import e import-mnemonic)',
            },
            password: {
              type: 'string',
              description: 'Password para encriptar/desencriptar (requerido para create, import, import-mnemonic y export)',
            },
            walletId: {
              type: 'string',
              description: 'ID de la wallet (requerido para export)',
            },
            wif: {
              type: 'string',
              description: 'Clave privada en formato WIF (requerido para import)',
            },
            mnemonic: {
              type: 'string',
              description: 'Frase mnemonic BIP39 de 12 o 24 palabras (requerido para import-mnemonic)',
            },
          },
          required: ['operation'],
        },
      },
      {
        name: 'list_transactions',
        description: 'Lista el historial de transacciones de una wallet, combinando datos de blockchain con registro local enriquecido',
        inputSchema: {
          type: 'object',
          properties: {
            walletId: {
              type: 'string',
              description: 'ID de la wallet a consultar',
            },
            limit: {
              type: 'number',
              description: 'Número máximo de transacciones a retornar (opcional, por defecto 100)',
            },
          },
          required: ['walletId'],
        },
      },
      {
        name: 'send_transaction',
        description: 'Crea, firma y envía una transacción BSV simple directamente a la blockchain. Requiere password de la wallet.',
        inputSchema: {
          type: 'object',
          properties: {
            walletId: {
              type: 'string',
              description: 'ID de la wallet a usar',
            },
            password: {
              type: 'string',
              description: 'Password para desencriptar la wallet',
            },
            toAddress: {
              type: 'string',
              description: 'Dirección BSV del destinatario',
            },
            amount: {
              type: 'number',
              description: 'Cantidad en satoshis a enviar',
            },
            changeAddress: {
              type: 'string',
              description: 'Dirección para el cambio (opcional, por defecto usa la misma wallet)',
            },
            feeRate: {
              type: 'number',
              description: 'Tasa de fee en sat/byte (opcional, por defecto 0.5)',
            },
          },
          required: ['walletId', 'password', 'toAddress', 'amount'],
        },
      },
      {
        name: 'get_bsv_price',
        description: 'Obtiene el precio actual de BSV en monedas fiat (USD, EUR) con conversión opcional de cantidades. Usa CoinGecko API con caché de 3 minutos.',
        inputSchema: {
          type: 'object',
          properties: {
            currency: {
              type: 'string',
              enum: ['usd', 'eur'],
              description: 'Moneda fiat objetivo (opcional, por defecto: usd)',
            },
            amount: {
              type: 'number',
              description: 'Cantidad de BSV a convertir a fiat (opcional)',
            },
            includeMarketData: {
              type: 'boolean',
              description: 'Incluir market cap, volumen 24h y cambio de precio (opcional, por defecto: false)',
            },
          },
          required: [],
        },
      },
    ],
  }));

  // Handler para listar prompts disponibles
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: [
      {
        name: 'accessibility-guide',
        description: 'Guía completa sobre cómo usar las preferencias de accesibilidad en pagos X402',
        arguments: [],
      },
    ],
  }));

  // Handler para obtener un prompt específico
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name } = request.params;

    if (name === 'accessibility-guide') {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `# Guía de Accesibilidad X402

El sistema X402 ahora incluye soporte completo para preferencias de accesibilidad que permiten personalizar las respuestas según las necesidades del usuario.

## Preferencias Disponibles

### 1. language (idioma)
- **Valores**: 'es' | 'en'
- **Default**: 'es'
- **Uso**: Selecciona el idioma de las respuestas del facilitador
- **Ejemplo**:
  - 'es': Respuestas en español claro
  - 'en': Responses in clear English

### 2. cognitiveLevel (nivel cognitivo)
- **Valores**: 'simple' | 'medium' | 'advanced'
- **Default**: 'simple'
- **Uso**: Ajusta la complejidad de las explicaciones
- **Ejemplo**:
  - 'simple': Explicaciones muy básicas, paso a paso
  - 'medium': Explicaciones moderadas con algo de contexto técnico
  - 'advanced': Explicaciones técnicas detalladas

### 3. audioFriendly (optimizado para audio)
- **Valores**: true | false
- **Default**: true
- **Uso**: Optimiza el formato para lectores de pantalla
- **Ejemplo**:
  - true: Formato lineal, sin símbolos complejos
  - false: Puede incluir formato visual

## Cómo Usar las Preferencias

### Al crear un pago X402:

\`\`\`typescript
// Ejemplo 1: Usuario con discapacidad visual, español
create_x402_payment({
  walletId: "test1",
  payTo: "mhSDV8SPswwXCGFpkE8pTWUftVnSW6g3qk",
  amount: 1000,
  network: "testnet",
  password: "******",
  language: "es",
  cognitiveLevel: "simple",
  audioFriendly: true
})

// Ejemplo 2: Desarrollador técnico, inglés
create_x402_payment({
  walletId: "dev-wallet",
  payTo: "mhSDV8SPswwXCGFpkE8pTWUftVnSW6g3qk",
  amount: 5000,
  network: "testnet",
  password: "******",
  language: "en",
  cognitiveLevel: "advanced",
  audioFriendly: false
})
\`\`\`

## Cuándo Usar Cada Configuración

### Usuario con Discapacidad Visual:
- language: según preferencia del usuario
- cognitiveLevel: 'simple' (explicaciones claras y directas)
- audioFriendly: true (optimizado para lectores de pantalla)

### Usuario No Técnico:
- language: según preferencia
- cognitiveLevel: 'simple' o 'medium'
- audioFriendly: según necesidad

### Desarrollador/Usuario Técnico:
- language: según preferencia
- cognitiveLevel: 'advanced' (detalles técnicos completos)
- audioFriendly: false

### Usuario Internacional:
- language: 'en' o 'es' según región
- cognitiveLevel: según nivel técnico
- audioFriendly: según necesidad

## Respuestas del Sistema

Cuando incluyes preferencias de accesibilidad, recibirás metadata estructurada:

\`\`\`json
{
  "accessibility": {
    "plainLanguage": "Payment verified successfully",
    "explanation": "Your transaction meets all requirements...",
    "stepByStep": [
      "We received your transaction",
      "We validated the amount and destination",
      "The transaction is ready to be processed"
    ],
    "hints": {
      "nextSteps": "Call the /settle endpoint to complete"
    },
    "language": "en",
    "audioFriendly": false,
    "cognitiveLevel": "advanced"
  }
}
\`\`\`

## Mejores Prácticas

1. **Pregunta al Usuario**: Si no conoces las necesidades del usuario, pregunta:
   - "¿Prefieres las respuestas en español o inglés?"
   - "¿Necesitas explicaciones muy detalladas o prefieres respuestas simples?"
   - "¿Usas un lector de pantalla?"

2. **Usa Defaults Sensatos**: Si no tienes información, usa:
   - language: 'es' (o según región del usuario)
   - cognitiveLevel: 'simple' (más accesible)
   - audioFriendly: true (más inclusivo)

3. **Adapta según Contexto**:
   - Para tutoriales → 'simple'
   - Para debugging → 'advanced'
   - Para usuarios finales → 'simple' o 'medium'

## Retrocompatibilidad

Si NO incluyes preferencias, el sistema usa defaults sensatos:
- language: 'es'
- cognitiveLevel: 'simple'
- audioFriendly: true

Esto asegura que todos los usuarios reciban respuestas accesibles por defecto.`,
            },
          },
        ],
      };
    }

    throw new Error(`Prompt desconocido: ${name}`);
  });

  // Handler para llamadas a tools
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'create_x402_payment':
          return await handleCreateX402Payment(args);

        case 'sign_message':
          return await handleSignMessage(args);

        case 'get_balance':
          return await handleGetBalance(args);

        case 'manage_wallets':
          return await handleManageWallets(args);

        case 'list_transactions':
          return await handleListTransactions(args);

        case 'send_transaction':
          return await handleSendTransaction(args);

        case 'get_bsv_price':
          return await handleGetBsvPrice(args);

        default:
          throw new Error(`Tool desconocido: ${name}`);
      }
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
  });

  // Conectar via stdio
  const transport = new StdioServerTransport();
  server.connect(transport);

  return server;
}
