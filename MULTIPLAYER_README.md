# 🎮 Sistema Multijugador - Intermedio

## ¿Cómo funciona el Multijugador?

Tu juego de **Intermedio** ahora es **totalmente multijugador** usando Supabase como backend.

### 🏗️ Arquitectura

```
┌─────────────┐     ┌──────────────┐     ┌────────────┐
│  Jugador 1  │────▶│   Servidor   │◀────│ Jugador 2  │
│  (Browser)  │     │  (Supabase)  │     │ (Browser)  │
└─────────────┘     └──────────────┘     └────────────┘
       │                    │                    │
       └────────────────────┴────────────────────┘
              Sincronización en Tiempo Real
```

### 📡 Cómo se Sincronizan los Jugadores

1. **Polling cada 2 segundos**: Cada jugador consulta el estado de la mesa al servidor
2. **Heartbeat cada 5 segundos**: Mantiene al jugador marcado como "conectado"
3. **Base de datos centralizada**: El servidor almacena el estado real del juego
4. **Lógica del servidor**: Todas las acciones (apostar, pasar) se procesan en el servidor

### 🎯 Flujo de Juego Multijugador

#### 1️⃣ Crear/Unirse a una Mesa

**Jugador A crea una mesa:**
```
1. Hace clic en "Crear Mesa"
2. Define nombre y buy-in
3. POST /tables → Servidor crea la mesa
4. Se descuenta el buy-in de su saldo
5. Entra en modo "Esperando jugadores..."
```

**Jugador B se une:**
```
1. Ve la mesa en la lista (actualizada cada 3 segundos)
2. Hace clic en "Unirse"
3. POST /tables/:tableId/join
4. Si la mesa llega a 3 jugadores → AUTO-INICIO
```

#### 2️⃣ Jugar una Ronda

**Cuando un jugador apuesta:**
```
1. Jugador 1 hace una apuesta de $100
2. POST /tables/:tableId/bet { betAmount: 100 }
3. Servidor:
   - Valida el monto
   - Saca tercera carta del mazo
   - Calcula ganancia/pérdida
   - Actualiza balance y pozo
   - Marca la acción como completada
4. Todos los jugadores ven el resultado (vía polling)
```

**Siguiente Ronda:**
```
1. Cualquier jugador presiona "Siguiente Ronda"
2. POST /tables/:tableId/next-round
3. Servidor:
   - Reparte nuevas cartas a todos
   - Reinicia estado de apuestas
   - Incrementa número de ronda
4. Todos reciben las nuevas cartas
```

#### 3️⃣ Abandonar Mesa

```
1. Jugador hace clic en "Abandonar Mesa"
2. POST /tables/:tableId/leave { userId }
3. Servidor elimina al jugador
4. Si quedan 0 jugadores → Elimina la mesa
5. Otros jugadores continúan
```

### 🔑 Endpoints del Servidor

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/tables` | Lista todas las mesas disponibles |
| POST | `/tables` | Crea una nueva mesa |
| POST | `/tables/:id/join` | Un jugador se une a la mesa |
| GET | `/tables/:id` | Obtiene el estado actual de la mesa |
| POST | `/tables/:id/bet` | Procesa una apuesta |
| POST | `/tables/:id/next-round` | Inicia la siguiente ronda |
| POST | `/tables/:id/leave` | Jugador abandona la mesa |
| POST | `/tables/:id/heartbeat` | Mantiene al jugador conectado |

### 💾 Estructura de Datos (KV Store)

**Clave:** `table:1710012345_abc123`

**Valor:**
```json
{
  "id": "table:1710012345_abc123",
  "name": "Mesa Pro",
  "code": "A3K9XY",
  "buyIn": 300,
  "maxPlayers": 3,
  "currentPlayers": 2,
  "pot": 600,
  "round": 3,
  "roundResolved": false,
  "status": "playing",
  "players": [
    {
      "id": "user_123",
      "name": "Juan",
      "photoUrl": "",
      "isAI": false,
      "balance": 450,
      "bet": 0,
      "cards": [
        { "suit": "oros", "value": 7, "displayValue": "7" },
        { "suit": "copas", "value": 12, "displayValue": "R" }
      ],
      "thirdCard": null,
      "result": "",
      "connected": true,
      "lastSeen": 1710012789000
    },
    { ... }
  ],
  "deck": [ ... ],
  "createdAt": 1710012345000,
  "lastActivity": 1710012789000
}
```

### 🧪 Probar el Multijugador

Para probar que funciona en **tiempo real**:

1. **Abre 2 ventanas del navegador** (o 2 pestañas en modo incógnito)
2. **Ventana 1**: Inicia sesión como "jugador1@test.com"
3. **Ventana 2**: Inicia sesión como "jugador2@test.com"
4. **Ventana 1**: Crea una mesa con buy-in $200
5. **Ventana 2**: Verás la mesa aparecer (espera hasta 3 segundos)
6. **Ventana 2**: Únete a la mesa
7. **Ambas ventanas**: Cuando haya 3 jugadores, el juego inicia automáticamente
8. **Ambas ventanas**: Haz apuestas y verás cómo se sincronizan

### ⚡ Características del Sistema

✅ **Sincronización en tiempo real** - Todos los jugadores ven las mismas cartas y resultados  
✅ **Detección de desconexión** - Sistema de heartbeat detecta jugadores inactivos  
✅ **Lógica centralizada** - Imposible hacer trampa, todo se valida en el servidor  
✅ **Auto-inicio de partidas** - Cuando la mesa se llena, comienza automáticamente  
✅ **Persistencia** - Las mesas se guardan en la base de datos  
✅ **Multi-dispositivo** - Juega desde diferentes dispositivos  

### 🚀 Para Producción

Para llevar esto a producción, considera:

1. **WebSockets**: Reemplazar polling por subscripciones en tiempo real de Supabase
2. **Autenticación real**: Usar Supabase Auth en lugar de IDs generados
3. **Rate limiting**: Proteger endpoints del servidor
4. **Manejo de reconexión**: Permitir que jugadores vuelvan si pierden conexión
5. **Límite de tiempo**: Auto-pasar si un jugador no actúa en X segundos
6. **Chat en mesa**: Comunicación entre jugadores
7. **Historial de manos**: Registro de todas las jugadas

### 🐛 Debugging

Para ver qué está pasando en el servidor:

1. Abre la consola del navegador (F12)
2. Ve a la pestaña "Network"
3. Filtra por "make-server"
4. Verás todas las llamadas al servidor y sus respuestas

Los logs del servidor se muestran en el dashboard de Supabase.

### 📝 Notas Importantes

- **No uses dinero real**: Este es un prototipo, no está auditado para dinero real
- **SUPABASE_SERVICE_ROLE_KEY**: Mantén esta clave en el servidor, nunca la expongas al frontend
- **IDs de usuario**: En producción usa UUIDs generados por Supabase Auth
- **Validación**: El servidor valida todas las acciones antes de procesarlas

---

¡Ahora tienes un juego de Intermedio completamente multijugador! 🎉
