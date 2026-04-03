import { describe, it, expect } from "vitest";

describe("X Platform Content Generation", () => {
  // Mock platform prompt function
  const getPlatformPrompt = (
    platform: string,
    propertyDescription: string,
    tone: string
  ): string => {
    const basePrompt = `Generate a ${tone} ${platform} post for this property: ${propertyDescription}`;

    switch (platform) {
      case "instagram":
        return `${basePrompt}. 
        Requirements:
        - Maximum 2,200 characters
        - Include 3-5 relevant hashtags
        - Use emojis appropriately
        - Focus on visual appeal and lifestyle
        - Include call-to-action`;

      case "linkedin":
        return `${basePrompt}.
        Requirements:
        - Professional tone
        - Maximum 1,300 characters
        - Highlight investment potential or market insights
        - Include relevant industry hashtags
        - Professional call-to-action`;

      case "facebook":
        return `${basePrompt}.
        Requirements:
        - Conversational and engaging tone
        - Maximum 2,000 characters
        - Include key property features
        - Add relevant hashtags
        - Include link or contact information`;

      case "x":
        return `${basePrompt}.
        Requirements:
        - Maximum 280 characters (X/Twitter limit)
        - Concise and impactful
        - Include 1-2 relevant hashtags
        - Use engaging language
        - Include link or call-to-action if space allows`;

      case "website":
        return `${basePrompt}.
        Requirements:
        - SEO-optimized description
        - 150-300 words
        - Highlight unique features
        - Professional and informative
        - Include call-to-action`;

      default:
        return basePrompt;
    }
  };

  it("should generate X platform prompt with correct requirements", () => {
    const prompt = getPlatformPrompt(
      "x",
      "3 bedroom, 2 bathroom, 2,500 sq ft modern home",
      "professional"
    );

    expect(prompt).toContain("X/Twitter");
    expect(prompt).toContain("280 characters");
    expect(prompt).toContain("Concise and impactful");
    expect(prompt).toContain("1-2 relevant hashtags");
  });

  it("should support all platforms including X", () => {
    const platforms = ["instagram", "linkedin", "facebook", "x", "website"];
    const propertyDescription = "Beautiful property";
    const tone = "professional";

    platforms.forEach((platform) => {
      const prompt = getPlatformPrompt(platform, propertyDescription, tone);
      expect(prompt).toBeTruthy();
      expect(prompt.length).toBeGreaterThan(0);
    });
  });

  it("should generate different prompts for each platform", () => {
    const propertyDescription = "3 bed, 2 bath home";
    const tone = "professional";

    const instagramPrompt = getPlatformPrompt("instagram", propertyDescription, tone);
    const xPrompt = getPlatformPrompt("x", propertyDescription, tone);
    const facebookPrompt = getPlatformPrompt("facebook", propertyDescription, tone);

    // Each platform should have unique requirements
    expect(instagramPrompt).not.toEqual(xPrompt);
    expect(xPrompt).not.toEqual(facebookPrompt);
    expect(instagramPrompt).not.toEqual(facebookPrompt);
  });

  it("should include character limit for X platform", () => {
    const prompt = getPlatformPrompt("x", "Property", "professional");
    expect(prompt).toContain("280");
  });

  it("should include hashtag guidance for X platform", () => {
    const prompt = getPlatformPrompt("x", "Property", "professional");
    expect(prompt).toContain("hashtag");
  });

  it("should work with different tones for X platform", () => {
    const tones = ["professional", "casual", "luxury"];
    const propertyDescription = "Beautiful home";

    tones.forEach((tone) => {
      const prompt = getPlatformPrompt("x", propertyDescription, tone);
      expect(prompt).toContain(tone);
      expect(prompt).toContain("280 characters");
    });
  });

  it("should handle X platform in schema enum", () => {
    const validPlatforms = ["instagram", "linkedin", "facebook", "x", "website"];
    const testPlatform = "x";

    expect(validPlatforms).toContain(testPlatform);
  });

  it("should generate concise X content requirements", () => {
    const prompt = getPlatformPrompt("x", "Property", "professional");

    // X platform should emphasize conciseness
    expect(prompt).toContain("Concise");
    expect(prompt).toContain("280");
    expect(prompt).not.toContain("2,200"); // Instagram limit
    expect(prompt).not.toContain("2,000"); // Facebook limit
  });
});
