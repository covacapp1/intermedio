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

## 3. Deploy de la funcion de Supabase

```bash
supabase functions deploy server
```

La app ya consume la funcion publicada en:

```text
https://<project-ref>.supabase.co/functions/v1/make-server-b530d664
```

## 4. URLs de retorno de Mercado Pago

En produccion, usa tu dominio final como base. Ejemplo:

- Exito: `https://tu-dominio.com/?payment=success`
- Error: `https://tu-dominio.com/?payment=error`
- Pendiente: `https://tu-dominio.com/?payment=pending`

La app las arma automaticamente desde `window.location.origin`, asi que lo importante es publicar el frontend en su dominio real.

## 5. Webhook de Mercado Pago

La preferencia de Checkout Pro ya se crea con este webhook:

```text
https://<project-ref>.supabase.co/functions/v1/make-server-b530d664/wallet/mercadopago/webhook
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

Para algo mas fuerte, el siguiente paso recomendado es mover autenticacion a Supabase Auth y proteger el panel con roles.

## 8. Checklist final

- Cargar `Public Key` y `Access Token` productivos de Mercado Pago.
- Publicar el frontend en su dominio final.
- Configurar los secrets en Supabase.
- Desplegar la Edge Function.
- Probar una carga real o sandbox.
- Probar un retiro pendiente, uno aprobado y uno rechazado.
