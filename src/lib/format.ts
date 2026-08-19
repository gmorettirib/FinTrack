export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

/** Formata "2026-08-19" (ou Date) como 19/08/2026, sem deslocamento de fuso. */
export function formatDate(value: string | Date): string {
  if (value instanceof Date) {
    return new Intl.DateTimeFormat("pt-BR").format(value);
  }
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

export function toISODate(value: Date = new Date()): string {
  const offset = value.getTimezoneOffset() * 60000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 10);
}

export function daysUntil(dateISO: string): number {
  const today = new Date(toISODate());
  const target = new Date(dateISO.slice(0, 10));
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function percent(current: number, target: number): number {
  if (!target) return 0;
  return Math.min(100, Math.max(0, (current / target) * 100));
}

export function parseAmount(input: string): number {
  const normalized = input.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}
