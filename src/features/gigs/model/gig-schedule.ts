import { z } from "zod";

const dateInput = z
  .string()
  .trim()
  .refine((value) => {
    if (!value) return true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  }, "Enter a valid date as YYYY-MM-DD.");

export const gigScheduleSchema = z
  .object({ dueDate: dateInput, applicationDate: dateInput })
  .refine(
    (value) =>
      !value.dueDate ||
      !value.applicationDate ||
      value.applicationDate <= value.dueDate,
    "Applications must close on or before the work due date.",
  )
  .transform((value) => ({
    dueAt: value.dueDate ? `${value.dueDate}T23:59:00+08:00` : null,
    applicationDeadline: value.applicationDate
      ? `${value.applicationDate}T23:59:00+08:00`
      : null,
  }));

export function scheduleDateFromTimestamp(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Date(date.getTime() + 8 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}
