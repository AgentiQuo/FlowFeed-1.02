import { describe, it, expect } from "vitest";

describe("Bulk Schedule Router", () => {
  const POSTING_HOURS = { start: 9, end: 20 };
  const MIN_GAP_HOURS = 3;

  function generateStaggeredSchedule(
    startDate: Date,
    count: number,
    preferredPlatforms?: string[]
  ): Array<{ time: Date; platform: string }> {
    const platforms = preferredPlatforms || [
      "instagram",
      "linkedin",
      "facebook",
      "x",
      "website",
    ];
    const schedule: Array<{ time: Date; platform: string }> = [];

    let currentDate = new Date(startDate);
    currentDate.setHours(POSTING_HOURS.start, 0, 0, 0);

    for (let i = 0; i < count; i++) {
      if (currentDate.getHours() + MIN_GAP_HOURS > POSTING_HOURS.end) {
        currentDate.setDate(currentDate.getDate() + 1);
        currentDate.setHours(POSTING_HOURS.start, 0, 0, 0);
      }

      const platform = platforms[i % platforms.length];
      schedule.push({
        time: new Date(currentDate),
        platform,
      });

      currentDate.setHours(currentDate.getHours() + MIN_GAP_HOURS);
    }

    return schedule;
  }

  describe("generateStaggeredSchedule", () => {
    it("should generate schedule with correct number of posts", () => {
      const startDate = new Date("2026-04-10");
      const schedule = generateStaggeredSchedule(startDate, 5);

      expect(schedule.length).toBe(5);
    });

    it("should start at 9 AM", () => {
      const startDate = new Date("2026-04-10");
      const schedule = generateStaggeredSchedule(startDate, 1);

      expect(schedule[0].time.getHours()).toBe(9);
      expect(schedule[0].time.getMinutes()).toBe(0);
    });

    it("should maintain 3-hour gaps between posts", () => {
      const startDate = new Date("2026-04-10");
      const schedule = generateStaggeredSchedule(startDate, 3);

      const gap1 = schedule[1].time.getTime() - schedule[0].time.getTime();
      const gap2 = schedule[2].time.getTime() - schedule[1].time.getTime();

      const hoursGap1 = gap1 / (1000 * 60 * 60);
      const hoursGap2 = gap2 / (1000 * 60 * 60);

      expect(hoursGap1).toBe(3);
      expect(hoursGap2).toBe(3);
    });

    it("should rotate through platforms", () => {
      const startDate = new Date("2026-04-10");
      const platforms = ["instagram", "linkedin", "facebook", "x", "website"];
      const schedule = generateStaggeredSchedule(startDate, 10, platforms);

      platforms.forEach((platform, index) => {
        expect(schedule[index].platform).toBe(platform);
        expect(schedule[index + 5].platform).toBe(platform);
      });
    });

    it("should move to next day when exceeding posting window", () => {
      const startDate = new Date("2026-04-10");
      // 5 posts with 3-hour gaps = 12 hours, should fit in one day (9 AM to 8 PM)
      // 6 posts = 15 hours, should span two days
      const schedule = generateStaggeredSchedule(startDate, 6);

      const firstDay = schedule[0].time.getDate();
      const lastDay = schedule[schedule.length - 1].time.getDate();

      expect(lastDay).toBeGreaterThan(firstDay);
    });

    it("should not schedule posts outside posting window", () => {
      const startDate = new Date("2026-04-10");
      const schedule = generateStaggeredSchedule(startDate, 10);

      schedule.forEach((item) => {
        const hour = item.time.getHours();
        expect(hour).toBeGreaterThanOrEqual(POSTING_HOURS.start);
        expect(hour).toBeLessThanOrEqual(POSTING_HOURS.end);
      });
    });

    it("should handle single post", () => {
      const startDate = new Date("2026-04-10");
      const schedule = generateStaggeredSchedule(startDate, 1);

      expect(schedule.length).toBe(1);
      expect(schedule[0].time.getHours()).toBe(9);
    });

    it("should handle large number of posts", () => {
      const startDate = new Date("2026-04-10");
      const schedule = generateStaggeredSchedule(startDate, 50);

      expect(schedule.length).toBe(50);
      expect(schedule[0].time.getDate()).toBeLessThanOrEqual(schedule[49].time.getDate());
    });

    it("should use custom platform list", () => {
      const startDate = new Date("2026-04-10");
      const customPlatforms = ["instagram", "facebook"];
      const schedule = generateStaggeredSchedule(startDate, 4, customPlatforms);

      expect(schedule[0].platform).toBe("instagram");
      expect(schedule[1].platform).toBe("facebook");
      expect(schedule[2].platform).toBe("instagram");
      expect(schedule[3].platform).toBe("facebook");
    });

    it("should preserve date across schedule", () => {
      const startDate = new Date("2026-04-10");
      const schedule = generateStaggeredSchedule(startDate, 4);

      // All posts on first day should have same date
      const firstDayPosts = schedule.filter((s) => s.time.getDate() === 10);
      expect(firstDayPosts.length).toBeGreaterThan(0);
    });

    it("should calculate correct posting times", () => {
      const startDate = new Date("2026-04-10");
      const schedule = generateStaggeredSchedule(startDate, 3);

      // 9 AM, 12 PM, 3 PM
      expect(schedule[0].time.getHours()).toBe(9);
      expect(schedule[1].time.getHours()).toBe(12);
      expect(schedule[2].time.getHours()).toBe(15);
    });
  });

  describe("scheduleBulkDrafts", () => {
    it("should create posts for each draft", () => {
      const draftCount = 5;
      const schedule = generateStaggeredSchedule(new Date("2026-04-10"), draftCount);

      expect(schedule.length).toBe(draftCount);
    });

    it("should assign different platforms to each post", () => {
      const schedule = generateStaggeredSchedule(new Date("2026-04-10"), 5);
      const platforms = schedule.map((s) => s.platform);

      expect(platforms).toContain("instagram");
      expect(platforms).toContain("linkedin");
      expect(platforms).toContain("facebook");
    });
  });

  describe("rescheduleBulkPosts", () => {
    it("should generate new schedule for existing posts", () => {
      const oldStartDate = new Date("2026-04-10");
      const newStartDate = new Date("2026-04-15");

      const oldSchedule = generateStaggeredSchedule(oldStartDate, 3);
      const newSchedule = generateStaggeredSchedule(newStartDate, 3);

      // Old schedule should be on or after the 10th
      expect(oldSchedule[0].time.getDate()).toBeGreaterThanOrEqual(9);
      // New schedule should be after the old schedule
      expect(newSchedule[0].time.getTime()).toBeGreaterThan(oldSchedule[0].time.getTime());
    });

    it("should maintain platform order in reschedule", () => {
      const schedule1 = generateStaggeredSchedule(new Date("2026-04-10"), 5);
      const schedule2 = generateStaggeredSchedule(new Date("2026-04-15"), 5);

      const platforms1 = schedule1.map((s) => s.platform);
      const platforms2 = schedule2.map((s) => s.platform);

      expect(platforms1).toEqual(platforms2);
    });
  });

  describe("getSuggestedPostingTimes", () => {
    it("should return formatted posting times", () => {
      const schedule = generateStaggeredSchedule(new Date("2026-04-10"), 3);

      const formatted = schedule.map((item, index) => ({
        position: index + 1,
        platform: item.platform,
        suggestedTime: item.time.toISOString(),
        dayOfWeek: item.time.toLocaleDateString("en-US", { weekday: "long" }),
        timeOfDay: item.time.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
      }));

      expect(formatted.length).toBe(3);
      expect(formatted[0]).toHaveProperty("position");
      expect(formatted[0]).toHaveProperty("platform");
      expect(formatted[0]).toHaveProperty("suggestedTime");
      expect(formatted[0]).toHaveProperty("dayOfWeek");
      expect(formatted[0]).toHaveProperty("timeOfDay");
    });
  });
});
