import { gigScheduleSchema } from "../gig-schedule";

describe("gig schedule", () => {
  it("keeps scheduling optional and converts Philippine end-of-day dates", () => {
    expect(
      gigScheduleSchema.parse({ dueDate: "", applicationDate: "" }),
    ).toEqual({ dueAt: null, applicationDeadline: null });
    expect(
      gigScheduleSchema.parse({
        dueDate: "2026-11-10",
        applicationDate: "2026-11-08",
      }),
    ).toEqual({
      dueAt: "2026-11-10T23:59:00+08:00",
      applicationDeadline: "2026-11-08T23:59:00+08:00",
    });
  });
  it("rejects impossible dates and applications closing after delivery", () => {
    expect(
      gigScheduleSchema.safeParse({
        dueDate: "2026-02-30",
        applicationDate: "",
      }).success,
    ).toBe(false);
    expect(
      gigScheduleSchema.safeParse({
        dueDate: "2026-11-01",
        applicationDate: "2026-11-02",
      }).success,
    ).toBe(false);
  });
});
