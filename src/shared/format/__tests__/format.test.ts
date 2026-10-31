import { dueLabel, formatPeso, formatUpdatedAt, isDueSoon } from "../format";

describe("en-PH formatting", () => {
  it("formats pesos without trailing zero centavos", () => {
    expect(formatPeso(1500)).toBe("₱1,500");
    expect(formatPeso(1500.5)).toBe("₱1,500.50");
    expect(formatPeso(null)).toBe("₱—");
  });

  it("labels the last refresh time", () => {
    expect(formatUpdatedAt("2026-10-31T11:34:00.000Z")).toMatch(
      /^Updated \d{1,2}:\d{2}\s?[AP]M$/i,
    );
    expect(formatUpdatedAt(null)).toBe("Not updated yet");
    expect(formatUpdatedAt("not a date")).toBe("Not updated yet");
  });

  it("detects work due within 48 hours and describes due dates", () => {
    const now = new Date("2026-10-31T00:00:00.000Z");
    expect(isDueSoon("2026-11-01T12:00:00.000Z", now)).toBe(true);
    expect(isDueSoon("2026-11-05T00:00:00.000Z", now)).toBe(false);
    expect(isDueSoon("2026-10-30T00:00:00.000Z", now)).toBe(false);
    expect(isDueSoon(null, now)).toBe(false);
    expect(dueLabel(null, now)).toBe("No due date");
    expect(dueLabel("2026-10-30T00:00:00.000Z", now)).toMatch(/^Overdue/);
    expect(dueLabel("2026-11-02T00:00:00.000Z", now)).toMatch(/^Due /);
  });
});
