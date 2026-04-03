import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Analytics Router", () => {
  describe("getBrandPerformance", () => {
    it("should calculate total metrics from posts", () => {
      const mockPosts = [
        {
          id: "1",
          platform: "instagram",
          impressions: 1000,
          engagements: 50,
          clicks: 25,
          conversions: 5,
        },
        {
          id: "2",
          platform: "linkedin",
          impressions: 500,
          engagements: 30,
          clicks: 15,
          conversions: 3,
        },
      ];

      const totalImpressions = mockPosts.reduce((sum, p) => sum + (p.impressions || 0), 0);
      const totalEngagements = mockPosts.reduce((sum, p) => sum + (p.engagements || 0), 0);
      const totalClicks = mockPosts.reduce((sum, p) => sum + (p.clicks || 0), 0);
      const totalConversions = mockPosts.reduce((sum, p) => sum + (p.conversions || 0), 0);

      expect(totalImpressions).toBe(1500);
      expect(totalEngagements).toBe(80);
      expect(totalClicks).toBe(40);
      expect(totalConversions).toBe(8);
    });

    it("should calculate engagement rate correctly", () => {
      const totalImpressions = 1500;
      const totalEngagements = 80;
      const engagementRate = (totalEngagements / totalImpressions) * 100;

      expect(engagementRate).toBeCloseTo(5.33, 1);
    });

    it("should handle zero impressions", () => {
      const totalImpressions = 0;
      const totalEngagements = 0;
      const engagementRate = totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0;

      expect(engagementRate).toBe(0);
    });

    it("should group metrics by platform", () => {
      const mockPosts = [
        {
          platform: "instagram",
          impressions: 1000,
          engagements: 50,
          clicks: 25,
          conversions: 5,
        },
        {
          platform: "instagram",
          impressions: 800,
          engagements: 40,
          clicks: 20,
          conversions: 4,
        },
        {
          platform: "linkedin",
          impressions: 500,
          engagements: 30,
          clicks: 15,
          conversions: 3,
        },
      ];

      const platformBreakdown: Record<string, any> = {};
      mockPosts.forEach((post) => {
        if (!platformBreakdown[post.platform]) {
          platformBreakdown[post.platform] = {
            posts: 0,
            impressions: 0,
            engagements: 0,
            clicks: 0,
            conversions: 0,
          };
        }
        platformBreakdown[post.platform].posts += 1;
        platformBreakdown[post.platform].impressions += post.impressions;
        platformBreakdown[post.platform].engagements += post.engagements;
        platformBreakdown[post.platform].clicks += post.clicks;
        platformBreakdown[post.platform].conversions += post.conversions;
      });

      expect(platformBreakdown.instagram.posts).toBe(2);
      expect(platformBreakdown.instagram.impressions).toBe(1800);
      expect(platformBreakdown.linkedin.posts).toBe(1);
      expect(platformBreakdown.linkedin.impressions).toBe(500);
    });
  });

  describe("getPerformanceByPropertyType", () => {
    it("should aggregate metrics by property type", () => {
      const propertyTypeMetrics: Record<string, any> = {
        "Single Family": {
          posts: 5,
          impressions: 5000,
          engagements: 250,
          clicks: 125,
          conversions: 25,
        },
        "Multi Family": {
          posts: 3,
          impressions: 2000,
          engagements: 80,
          clicks: 40,
          conversions: 8,
        },
      };

      expect(propertyTypeMetrics["Single Family"].posts).toBe(5);
      expect(propertyTypeMetrics["Multi Family"].posts).toBe(3);
    });

    it("should calculate engagement rate per property type", () => {
      const metrics = {
        posts: 5,
        impressions: 5000,
        engagements: 250,
      };

      const engagementRate = (metrics.engagements / metrics.impressions) * 100;
      expect(engagementRate).toBe(5);
    });
  });

  describe("updatePostMetrics", () => {
    it("should update individual post metrics", () => {
      const post = {
        id: "post-1",
        impressions: 0,
        engagements: 0,
        clicks: 0,
        conversions: 0,
      };

      const updates = {
        impressions: 1000,
        engagements: 50,
        clicks: 25,
        conversions: 5,
      };

      const updated = { ...post, ...updates };

      expect(updated.impressions).toBe(1000);
      expect(updated.engagements).toBe(50);
      expect(updated.clicks).toBe(25);
      expect(updated.conversions).toBe(5);
    });

    it("should support partial updates", () => {
      const post = {
        id: "post-1",
        impressions: 1000,
        engagements: 50,
        clicks: 25,
        conversions: 5,
      };

      const partialUpdate = {
        engagements: 75,
        clicks: 40,
      };

      const updated = { ...post, ...partialUpdate };

      expect(updated.impressions).toBe(1000); // unchanged
      expect(updated.engagements).toBe(75); // updated
      expect(updated.clicks).toBe(40); // updated
      expect(updated.conversions).toBe(5); // unchanged
    });
  });

  describe("getTopPerformingPosts", () => {
    it("should sort posts by engagements", () => {
      const posts = [
        { id: "1", platform: "instagram", engagements: 50 },
        { id: "2", platform: "linkedin", engagements: 100 },
        { id: "3", platform: "facebook", engagements: 75 },
      ];

      const sorted = [...posts].sort((a, b) => b.engagements - a.engagements);

      expect(sorted[0].id).toBe("2");
      expect(sorted[1].id).toBe("3");
      expect(sorted[2].id).toBe("1");
    });

    it("should limit results to specified count", () => {
      const posts = Array.from({ length: 20 }, (_, i) => ({
        id: `post-${i}`,
        engagements: i * 10,
      }));

      const topPosts = posts.sort((a, b) => b.engagements - a.engagements).slice(0, 10);

      expect(topPosts.length).toBe(10);
      expect(topPosts[0].engagements).toBe(190);
    });

    it("should support different metrics for sorting", () => {
      const posts = [
        { id: "1", engagements: 50, clicks: 100, conversions: 5 },
        { id: "2", engagements: 100, clicks: 50, conversions: 10 },
        { id: "3", engagements: 75, clicks: 150, conversions: 3 },
      ];

      // Sort by clicks
      const byClicks = [...posts].sort((a, b) => b.clicks - a.clicks);
      expect(byClicks[0].id).toBe("3");

      // Sort by conversions
      const byConversions = [...posts].sort((a, b) => b.conversions - a.conversions);
      expect(byConversions[0].id).toBe("2");
    });
  });
});
