# Deploy Intermedio

## 1. Variables de entorno

### Frontend (`.env`)

```env
VITE_MERCADO_PAGO_PUBLIC_KEY=APP_USR-...
VITE_ADMIN_EMAIL=grafica.covac@hotmail.com
```

### Supabase Edge Function secrets

```bash
supabase secrets set MERCADO_PAGO_ACCESS_TOKEN=APP_USR-...
supabase secrets set RESEND_API_KEY=re_...
supabase secrets set ADMIN_EMAIL=grafica.covac@hotmail.com
supabase secrets set WITHDRAWAL_NOTIFICATION_FROM="Intermedio <retiros@tu-dominio.com>"
supabase secrets set WITHDRAWAL_NOTIFICATION_TO="grafica.covac@hotmail.com"
```

`MERCADO_PAGO_ACCESS_TOKEN` debe vivir solo en backend.

## 2. Build del frontend

```bash
npm install
npm run build
```

Publica la carpeta `dist/` en tu hosting final.

Importante: si abres la app con `npm run dev`, va a vivir en `localhost` o en la IP local de tu PC. Eso sirve para pruebas, pero no para usarla "siempre online" desde el celular. Para que funcione de forma permanente, el frontend tiene que quedar publicado en una URL real, por ejemplo:

- `https://intermedio.vercel.app`
- `https://intermedio.netlify.app`
- tu propio dominio, por ejemplo `https://intermedio.com`

Una vez publicado, esa URL publica pasa a ser el origen real de la app.

## 3. Deploy de la funcion de Supabase

```bash
supabase functions deploy server
```

La app ya consume la funcion publicada en:

```text
https://<project-ref>.supabase.co/functions/v1/server
```

## 4. URLs de retorno de Mercado Pago

En produccion, usa tu dominio final como base. Ejemplo:

- Exito: `https://tu-dominio.com/?payment=success`
- Error: `https://tu-dominio.com/?payment=error`
- Pendiente: `https://tu-dominio.com/?payment=pending`

La app las arma automaticamente desde `window.location.origin`, asi que lo importante es publicar el frontend en su dominio real.

Si el frontend corre en local, `window.location.origin` sera algo como `http://localhost:5173` o `http://192.168.x.x:5173`, y Mercado Pago intentara volver ahi. Por eso desde el celular te fallaba: no estabas usando una URL publica permanente.

## 5. Webhook de Mercado Pago

La preferencia de Checkout Pro ya se crea con este webhook:

```text
https://<project-ref>.supabase.co/functions/v1/server/wallet/mercadopago/webhook
```

Tambien conviene registrarlo en el panel de Mercado Pago para tener trazabilidad extra.

## 6. Flujo esperado

### Carga de saldo

1. El usuario abre el cajero y elige un monto.
2. El backend crea una preferencia de Checkout Pro.
3. Mercado Pago redirige al usuario al checkout.
4. Mercado Pago llama al webhook.
5. La Edge Function consulta el pago y, si esta `approved`, acredita el saldo.

### Retiro

1. El usuario carga nombre, DNI, email, titular y destino.
2. La app crea una solicitud pendiente y reserva el saldo.
3. Si `RESEND_API_KEY` esta configurado, llega un email a `WITHDRAWAL_NOTIFICATION_TO`.
4. El admin entra con `VITE_ADMIN_EMAIL`.
5. Si aprueba, el retiro queda confirmado.
6. Si rechaza, el saldo se reintegra automaticamente.

## 7. Login admin

Hoy el panel admin se habilita si el email del usuario coincide con:

```env
VITE_ADMIN_EMAIL
```

Y en backend conviene espejarlo como secret:

```bash
supabase secrets set ADMIN_EMAIL=grafica.covac@hotmail.com
```

Para algo mas fuerte, el siguiente paso recomendado es mover autenticacion a Supabase Auth y proteger el panel con roles.

## 8. Checklist final

- Cargar `Public Key` y `Access Token` productivos de Mercado Pago.
- Publicar el frontend en su dominio final.
- Configurar los secrets en Supabase.
- Desplegar la Edge Function.
- Probar una carga real o sandbox.
- Probar un retiro pendiente, uno aprobado y uno rechazado.

## 9. Redeploy rapido paso a paso

1. Guarda y sube tus cambios a Git.
2. Genera el build del frontend con `npm run build`.
3. Publica `dist/` en tu hosting.
4. Redeploya la Edge Function con `supabase functions deploy server`.
5. Verifica que el frontend publicado abra desde tu celular usando la URL publica, no `localhost`.
