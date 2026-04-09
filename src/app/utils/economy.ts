export const INT_CURRENCY = "INT";
export const INT_TO_ARS_RATE = 1;

const integerFormatter = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 0,
});

const arsFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export function formatInt(value: number): string {
  return `${integerFormatter.format(Math.round(value))} ${INT_CURRENCY}`;
}

export function formatArs(value: number): string {
  return arsFormatter.format(value);
}
