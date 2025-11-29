# Guía de Accesibilidad X402

## 🌐 Introducción

El sistema X402 BSV incluye soporte completo para preferencias de accesibilidad, permitiendo que las respuestas del facilitador se adapten a las necesidades de diferentes usuarios, incluyendo personas con discapacidades.

## 📋 Características de Accesibilidad

### 1. **Soporte Multiidioma**
- Español (es) - Default
- Inglés (en)

### 2. **Niveles Cognitivos**
- **Simple**: Explicaciones básicas, paso a paso
- **Medium**: Explicaciones moderadas con contexto técnico
- **Advanced**: Explicaciones técnicas detalladas

### 3. **Optimización para Lectores de Pantalla**
- **AudioFriendly true**: Formato lineal optimizado para audio
- **AudioFriendly false**: Puede incluir formato visual complejo

## 🔧 Cómo Usar en Claude Desktop

### Acceder al Prompt de Guía

Claude Desktop puede acceder automáticamente al prompt `accessibility-guide` que contiene toda la información sobre cómo usar las preferencias.

### Ejemplo 1: Usuario con Discapacidad Visual

```javascript
// Claude usará el prompt para saber cómo configurar:
create_x402_payment({
  walletId: "test1",
  payTo: "mhSDV8SPswwXCGFpkE8pTWUftVnSW6g3qk",
  amount: 1000,
  network: "testnet",
  password: "mi-password",
  language: "es",           // Español
  cognitiveLevel: "simple", // Explicaciones claras
  audioFriendly: true       // Optimizado para lector de pantalla
})
```

### Ejemplo 2: Desarrollador Técnico

```javascript
create_x402_payment({
  walletId: "dev-wallet",
  payTo: "mhSDV8SPswwXCGFpkE8pTWUftVnSW6g3qk",
  amount: 5000,
  network: "testnet",
  password: "dev-password",
  language: "en",              // English
  cognitiveLevel: "advanced",  // Detalles técnicos
  audioFriendly: false         // Formato visual OK
})
```

## 📊 Estructura de Respuestas Accesibles

Cuando usas preferencias de accesibilidad, las respuestas del facilitador incluyen:

```json
{
  "data": {
    // Datos de la transacción
  },
  "accessibility": {
    "plainLanguage": "Resumen ejecutivo en lenguaje claro",
    "explanation": "Explicación detallada de qué pasó",
    "stepByStep": [
      "Paso 1: Qué hicimos primero",
      "Paso 2: Qué hicimos después",
      "Paso 3: Resultado final"
    ],
    "hints": {
      "ifError": "Qué hacer si hay un problema",
      "commonMistakes": ["Error común 1", "Error común 2"],
      "nextSteps": "Qué hacer a continuación"
    },
    "language": "es",
    "audioFriendly": true,
    "cognitiveLevel": "simple"
  }
}
```

## 🎯 Casos de Uso

### Usuario con Discapacidad Visual
```javascript
{
  language: "es",           // o "en" según preferencia
  cognitiveLevel: "simple",
  audioFriendly: true
}
```

**Por qué:**
- `simple`: Explicaciones claras sin jerga técnica
- `audioFriendly`: Formato optimizado para NVDA, JAWS, VoiceOver, etc.

### Usuario No Técnico
```javascript
{
  language: "es",
  cognitiveLevel: "simple",  // o "medium"
  audioFriendly: false       // puede usar formato visual
}
```

**Por qué:**
- `simple/medium`: Evita términos técnicos complejos
- Explicaciones paso a paso

### Desarrollador/Usuario Técnico
```javascript
{
  language: "en",
  cognitiveLevel: "advanced",
  audioFriendly: false
}
```

**Por qué:**
- `advanced`: Detalles técnicos completos, nombres de funciones, códigos de error
- Asume conocimiento técnico previo

## 🌍 Internacionalización

### Español (es)
```javascript
{
  "plainLanguage": "El pago se verificó correctamente",
  "explanation": "Tu transacción cumple con todos los requisitos...",
  "stepByStep": [
    "Recibimos tu transacción",
    "Validamos el monto y la dirección",
    "La transacción está lista"
  ]
}
```

### English (en)
```javascript
{
  "plainLanguage": "Payment verified successfully",
  "explanation": "Your transaction meets all requirements...",
  "stepByStep": [
    "We received your transaction",
    "We validated the amount and address",
    "The transaction is ready"
  ]
}
```

## 💡 Mejores Prácticas para Claude

Cuando Claude Desktop usa este MCP:

1. **Pregunta al usuario** si no conoces sus preferencias:
   - "¿Prefieres las respuestas en español o inglés?"
   - "¿Usas un lector de pantalla?"
   - "¿Prefieres explicaciones simples o técnicas?"

2. **Usa defaults inclusivos** si no hay respuesta:
   ```javascript
   language: "es",
   cognitiveLevel: "simple",
   audioFriendly: true
   ```

3. **Adapta según contexto**:
   - Tutorial para nuevo usuario → `simple`
   - Debugging para desarrollador → `advanced`
   - Error crítico → `simple` (claro para todos)

## 🔄 Retrocompatibilidad

**Sin preferencias especificadas:**
```javascript
create_x402_payment({
  walletId: "test1",
  payTo: "address",
  amount: 1000,
  network: "testnet",
  password: "******"
  // NO incluye language, cognitiveLevel, audioFriendly
})
```

**El sistema usa defaults:**
- `language: "es"`
- `cognitiveLevel: "simple"`
- `audioFriendly: true`

Esto asegura que todos los usuarios reciban respuestas accesibles por defecto.

## 📚 Recursos Adicionales

- **Prompt del sistema**: Claude puede acceder al prompt `accessibility-guide` para información detallada
- **Testing**: Ver `TESTING-REPORT.md` para ejemplos de uso
- **Especificación**: Ver `docs/IMPLEMENTATION-PLAN.md` para detalles técnicos

## 🚀 Próximos Pasos

1. Cuando uses el tool `create_x402_payment` en Claude Desktop, considera las necesidades del usuario
2. Incluye las preferencias apropiadas
3. Las respuestas del facilitador se adaptarán automáticamente
4. La metadata accesible estará disponible para presentar al usuario

---

**Última actualización**: 2025-11-28
**Versión**: 1.0.0
