# Multiplayer con Supabase

## 1. Crear y conectar el proyecto

1. En Supabase, entra a tu proyecto.
2. Ve a `SQL Editor`.
3. Ejecuta el archivo `supabase/migrations/001_multiplayer_schema.sql`.
4. Verifica que se hayan creado las tablas:
   - `profiles`
   - `rooms`
   - `room_players`
   - `room_moves`

## 2. Activar autenticacion real

1. Ve a `Authentication > Providers`.
2. Activa `Email`.
3. Si quieres pruebas rapidas, deja habilitado email+password.
4. Luego crea 2 usuarios de prueba desde la app o desde el dashboard.

## 3. Variables que vas a usar en el frontend

Agrega estas variables en Vercel y en tu entorno local:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY
VITE_ADMIN_EMAIL=tu@email.com
```

## 4. Cambios que hay que hacer en la app

1. Reemplazar el login local actual por Supabase Auth.
2. Crear o actualizar el `profile` del usuario al iniciar sesion.
3. Reemplazar el polling actual por suscripciones Realtime a:
   - `rooms`
   - `room_players`
   - `room_moves`
4. Mover las acciones del juego a funciones seguras:
   - crear sala
   - unirse a sala
   - enviar jugada
   - avanzar turno
   - salir de sala

## 5. Regla importante

El cliente nunca debe decidir solo:

- quien tiene el turno
- si una jugada es valida
- como cambia el pozo
- que cartas salen

Eso debe validarse del lado servidor o mediante una funcion SQL/Edge Function.

## 6. Orden recomendado

1. Auth
2. Profiles
3. Rooms
4. Join/Create room
5. Realtime
6. Send move con validacion segura
7. Turnos y reconexion

## 7. Lo siguiente en este proyecto

El paso siguiente ideal es implementar:

1. `src/lib/supabase.ts`
2. login real con Supabase
3. servicio multiplayer nuevo
4. suscripcion realtime por sala
5. migracion gradual desde `api.ts`
