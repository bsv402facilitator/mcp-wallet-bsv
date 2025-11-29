# Ejemplos de Uso - BSV Wallet MCP

Este documento muestra ejemplos prácticos de cómo usar el servidor MCP BSV Wallet con Claude.

## Prerequisitos

1. Haber instalado y compilado el proyecto
2. Haber ejecutado `npm run setup` para configurar Claude Desktop
3. Haber reiniciado Claude Desktop

## Flujo de Trabajo Típico

### 1. Crear una Wallet

**Comando para Claude:**
```
Crea una nueva wallet BSV de testnet llamada "mi-wallet-test" con password "MiPassword123!"
```

**Lo que hace Claude:**
- Invoca `manage_wallets` con operación `create`
- Genera una nueva clave privada aleatoria
- La encripta con AES-256-GCM usando el password
- Guarda la wallet en `~/.bsv-wallets/`

**Respuesta esperada:**
```json
{
  "success": true,
  "operation": "create",
  "walletId": "a1b2c3d4e5f6...",
  "name": "mi-wallet-test",
  "address": "mzzU86QdkgRqhknJydb9PacNGMY7XePhDR",
  "network": "testnet"
}
```

### 2. Listar Wallets Disponibles

**Comando para Claude:**
```
Muéstrame todas mis wallets
```

**Respuesta esperada:**
```json
{
  "success": true,
  "operation": "list",
  "wallets": [
    {
      "id": "a1b2c3d4e5f6...",
      "name": "mi-wallet-test",
      "address": "mzzU86QdkgRqhknJydb9PacNGMY7XePhDR",
      "network": "testnet",
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

### 3. Fondear la Wallet (Testnet)

**Importante:** Necesitas obtener BSV de testnet de un faucet:
- https://faucet.satoshisvision.network/
- https://testnet.bitcoincloud.net/

Copia tu dirección de la wallet (ej: `mzzU86QdkgRqhknJydb9PacNGMY7XePhDR`) y pega en el faucet para recibir fondos.

### 4. Consultar Balance

**Comando para Claude:**
```
¿Cuál es el balance de mi wallet a1b2c3d4e5f6?
```

**Respuesta esperada:**
```json
{
  "success": true,
  "walletId": "a1b2c3d4e5f6...",
  "address": "mzzU86QdkgRqhknJydb9PacNGMY7XePhDR",
  "network": "testnet",
  "balance": 100000,
  "balanceBSV": 0.001,
  "utxoCount": 1
}
```

**Con UTXOs detallados:**
```
Muéstrame el balance de mi wallet incluyendo los UTXOs
```

### 5. Crear un Pago X402

**Comando para Claude:**
```
Crea un pago X402 de 5000 satoshis a la dirección mzzU86QdkgRqhknJydb9PacNGMY7XePhDR
usando mi wallet a1b2c3d4e5f6 con password "MiPassword123!"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "paymentPayload": "eyJ4NDAyVmVyc2lvbiI6MSwic2NoZW1lIjoiZXhhY3QiLCJuZXR3b3JrIjoiYnN2LXRlc3RuZXQiLCJwYXlsb2FkIjp7InRyYW5zYWN0aW9uIjoiMDEwMDAwMDAw...",
  "txid": "abc123def456...",
  "amount": 5000,
  "fee": 134,
  "change": 94866,
  "inputs": 1,
  "outputs": 2,
  "size": 226,
  "instructions": "Para usar este pago X402, agrega el siguiente header a tu request HTTP:\n\nX-PAYMENT: eyJ4NDAy..."
}
```

### 6. Usar el Pago X402

**Con curl:**
```bash
curl -H "X-PAYMENT: eyJ4NDAyVmVyc2lvbiI6MSwic2NoZW1lIjoiZXhhY3QiLC4uLg==" \
  https://resource-server-x402-demo.workers.dev/api/data
```

**Con JavaScript fetch:**
```javascript
fetch('https://resource-server-x402-demo.workers.dev/api/data', {
  headers: {
    'X-PAYMENT': 'eyJ4NDAyVmVyc2lvbiI6MSwic2NoZW1lIjoiZXhhY3QiLC4uLg=='
  }
})
.then(res => res.json())
.then(data => console.log(data));
```

### 7. Firmar un Mensaje

**Comando para Claude:**
```
Firma el mensaje "Hello World" con mi wallet a1b2c3d4e5f6 usando password "MiPassword123!"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "signature": "MEUCIQDx8...",
  "signingAddress": "mzzU86QdkgRqhknJydb9PacNGMY7XePhDR",
  "publicKey": "02a1b2c3d4...",
  "message": "Hello World",
  "messageHash": "a591a6d40b..."
}
```

### 8. Importar una Wallet Existente

**Comando para Claude:**
```
Importa una wallet con el WIF "cT3kHdiNy..." llamada "wallet-importada"
en testnet con password "MiPassword123!"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "operation": "import",
  "walletId": "xyz789...",
  "name": "wallet-importada",
  "address": "n3Wxyz...",
  "network": "testnet"
}
```

### 9. Exportar Clave Privada (WIF)

**Comando para Claude:**
```
Exporta la clave privada WIF de mi wallet a1b2c3d4e5f6 con password "MiPassword123!"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "operation": "export",
  "walletId": "a1b2c3d4e5f6...",
  "wif": "cT3kHdiNy8rEX..."
}
```

**⚠️ IMPORTANTE:** Guarda el WIF en un lugar seguro. Con el WIF cualquiera puede acceder a tus fondos.

## Casos de Uso Avanzados

### Crear Pago con Dirección de Cambio Personalizada

**Comando para Claude:**
```
Crea un pago X402 de 3000 satoshis a mqW3xyz... usando mi wallet abc123
con cambio a la dirección n1Abc... y password "MiPassword123!"
```

### Crear Pago con Fee Rate Personalizado

**Comando para Claude:**
```
Crea un pago X402 de 10000 satoshis a mqW3xyz... con fee rate de 1 sat/byte
usando mi wallet abc123 y password "MiPassword123!"
```

### Firmar Mensaje en Hexadecimal

**Comando para Claude:**
```
Firma el mensaje hex "48656c6c6f" con mi wallet abc123 usando password "MiPassword123!"
```

## Errores Comunes

### Error: "Fondos insuficientes"

**Solución:** Tu wallet no tiene suficientes satoshis. Usa un faucet de testnet para obtener fondos.

### Error: "Password incorrecto"

**Solución:** Verifica que estás usando el password correcto que usaste al crear/importar la wallet.

### Error: "Wallet no encontrada"

**Solución:** Verifica el walletId. Usa `manage_wallets` con operación `list` para ver tus wallets disponibles.

### Error: "No hay UTXOs disponibles"

**Solución:** La wallet no tiene fondos o los fondos aún no están confirmados en la blockchain.

## Integración con el Facilitador X402

El servidor está configurado por defecto para usar:
```
https://facilitador-bsv-x402.workers.dev
```

El facilitador se encarga de:
1. Verificar que la transacción sea válida
2. Verificar que pague el monto correcto
3. Hacer broadcast a la blockchain BSV
4. Confirmar el pago

## Recursos Adicionales

- **Faucets Testnet BSV:**
  - https://faucet.satoshisvision.network/
  - https://testnet.bitcoincloud.net/

- **Explorador de Blockchain Testnet:**
  - https://test.whatsonchain.com/

- **Documentación BSV SDK:**
  - https://github.com/bitcoin-sv/ts-sdk

- **Documentación X402:**
  - https://github.com/bitcoin-sv/x402

## Seguridad

1. **NUNCA** compartas tu password ni tu WIF
2. **USA testnet** para desarrollo y pruebas
3. **Respalda** tus WIFs en un lugar seguro
4. **Cambia** a mainnet solo cuando estés listo para producción
5. **Verifica** siempre las direcciones antes de enviar pagos

## Soporte

Si encuentras problemas:
1. Verifica que el servidor MCP esté compilado: `npm run build`
2. Revisa que Claude Desktop esté correctamente configurado
3. Consulta los logs en la consola de Claude Desktop
4. Revisa el directorio `~/.bsv-wallets/` para verificar archivos de wallets
