export const appConfig = {
  adminEmail: (import.meta.env.VITE_ADMIN_EMAIL as string | undefined)?.trim().toLowerCase() || "covacapp1@gmail.com",
  mercadopagoPublicKey: (import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY as string | undefined)?.trim() || "",
};
