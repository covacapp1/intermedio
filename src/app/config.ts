export const appConfig = {
  adminEmail: (import.meta.env.VITE_ADMIN_EMAIL as string | undefined)?.trim().toLowerCase() || "grafica.covac@hotmail.com",
  mercadopagoPublicKey: (import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY as string | undefined)?.trim() || "",
};
