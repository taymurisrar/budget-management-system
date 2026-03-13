export function formatDateTimeLocalInput(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function parseTagInput(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export function formatTagInput(tags: string[] | null | undefined) {
  return Array.isArray(tags) ? tags.join(", ") : "";
}

export function formatCurrency(amount: number, currencyCode: string) {
  return `${amount.toFixed(2)} ${currencyCode}`;
}
