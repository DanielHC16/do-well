const LOCALE = "en-PH";
const DUE_SOON_MS = 48 * 60 * 60 * 1000;

const pesoWhole = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});
const pesoCents = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});

/** Always ₱ (PHP). Whole amounts drop the ".00". */
export function formatPeso(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) {
    return "₱—";
  }
  return Number.isInteger(amount)
    ? pesoWhole.format(amount)
    : pesoCents.format(amount);
}

function parseDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatTime(iso: string | null | undefined): string | null {
  const date = parseDate(iso);
  return date
    ? date.toLocaleTimeString(LOCALE, { hour: "numeric", minute: "2-digit" })
    : null;
}

export function formatShortDate(iso: string | null | undefined): string | null {
  const date = parseDate(iso);
  return date
    ? date.toLocaleDateString(LOCALE, { month: "short", day: "numeric" })
    : null;
}

export function formatUpdatedAt(iso: string | null | undefined): string {
  const time = formatTime(iso);
  return time ? `Updated ${time}` : "Not updated yet";
}

export function isDueSoon(
  iso: string | null | undefined,
  now: Date = new Date(),
): boolean {
  const date = parseDate(iso);
  if (!date) return false;
  const remaining = date.getTime() - now.getTime();
  return remaining >= 0 && remaining <= DUE_SOON_MS;
}

export function dueLabel(
  iso: string | null | undefined,
  now: Date = new Date(),
): string {
  const date = parseDate(iso);
  if (!date) return "No due date";
  const day = formatShortDate(iso);
  return date.getTime() < now.getTime() ? `Overdue · ${day}` : `Due ${day}`;
}
