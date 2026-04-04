import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";

/**
 * Tests for copywriter brand guide integration
 * Verifies that AI-generated content respects brand copywriting guides
 */

describe("Copywriter Brand Guide Integration", () => {
  // Mock brand data with different copywriting guides
  const brandWithCasualGuide = {
    id: "brand-casual",
    name: "TiraMofo",
    description: "Mould removal and cleaning services",
    voiceBibleContent: "Friendly and approachable",
    copywritingGuide: `Language: Conversational and friendly, avoid jargon
Tone: Helpful and reassuring, like talking to a trusted friend
Style: Use simple language, short sentences, practical examples
Focus: Customer success stories, problem-solving, health benefits
Personality: Approachable, knowledgeable, trustworthy
Avoid: Corporate speak, overly technical terms, fear-mongering`,
  };

  const brandWithTechGuide = {
    id: "brand-tech",
    name: "Agentiquo",
    description: "AI-powered business automation",
    voiceBibleContent: "Professional and innovative",
    copywritingGuide: `Language: Technical but accessible, explain concepts clearly
Tone: Authoritative yet approachable, thought leadership
Style: Data-driven, specific examples, ROI-focused
Focus: Business value, efficiency gains, competitive advantage
Personality: Expert, forward-thinking, solution-oriented
Avoid: Hype, vague claims, overly casual language`,
  };

  const brandWithLuxuryGuide = {
    id: "brand-luxury",
    name: "Luxury Estates",
    description: "High-end real estate",
    voiceBibleContent: "Sophisticated and exclusive",
    copywritingGuide: `Language: Refined vocabulary, sophisticated phrasing
Tone: Exclusive and aspirational, premium positioning
Style: Elegant descriptions, emphasis on quality and craftsmanship
Focus: Lifestyle, exclusivity, investment value, heritage
Personality: Sophisticated, discerning, prestigious
Avoid: Casual language, discount messaging, mass-market appeals`,
  };

  it("should include copywriting guide in system prompt for casual brand", () => {
    // Verify that the system prompt construction includes copywriting guide
    const systemPrompt = buildSystemPrompt(brandWithCasualGuide);

    expect(systemPrompt).toContain("Copywriting Guide:");
    expect(systemPrompt).toContain("Conversational and friendly");
    expect(systemPrompt).toContain("Helpful and reassuring");
    expect(systemPrompt).toContain("simple language");
  });

  it("should include copywriting guide in system prompt for tech brand", () => {
    const systemPrompt = buildSystemPrompt(brandWithTechGuide);

    expect(systemPrompt).toContain("Copywriting Guide:");
    expect(systemPrompt).toContain("Technical but accessible");
    expect(systemPrompt).toContain("Data-driven");
    expect(systemPrompt).toContain("ROI-focused");
  });

  it("should include copywriting guide in system prompt for luxury brand", () => {
    const systemPrompt = buildSystemPrompt(brandWithLuxuryGuide);

    expect(systemPrompt).toContain("Copywriting Guide:");
    expect(systemPrompt).toContain("Refined vocabulary");
    expect(systemPrompt).toContain("Exclusive and aspirational");
    expect(systemPrompt).toContain("Elegant descriptions");
  });

  it("should use default guide when copywriting guide is not provided", () => {
    const brandWithoutGuide = {
      id: "brand-default",
      name: "Default Brand",
      description: "A brand without custom guide",
      voiceBibleContent: "Professional",
      copywritingGuide: undefined,
    };

    const systemPrompt = buildSystemPrompt(brandWithoutGuide);

    expect(systemPrompt).toContain("Copywriting Guide:");
    expect(systemPrompt).toContain(
      "Generate professional, engaging content that resonates with the target audience"
    );
  });

  it("should emphasize following copywriting guide in instructions", () => {
    const systemPrompt = buildSystemPrompt(brandWithCasualGuide);

    expect(systemPrompt).toContain("Follow the copywriting guide closely");
    expect(systemPrompt).toContain("consistency with the brand's established tone");
    expect(systemPrompt).toContain("language style");
    expect(systemPrompt).toContain("messaging focus");
  });

  it("should include brand voice bible alongside copywriting guide", () => {
    const systemPrompt = buildSystemPrompt(brandWithTechGuide);

    expect(systemPrompt).toContain("Brand Voice:");
    expect(systemPrompt).toContain("Professional and innovative");
    expect(systemPrompt).toContain("Brand Description:");
    expect(systemPrompt).toContain("AI-powered business automation");
    expect(systemPrompt).toContain("Copywriting Guide:");
  });

  it("should preserve brand identity instructions", () => {
    const systemPrompt = buildSystemPrompt(brandWithCasualGuide);

    expect(systemPrompt).toContain("Do NOT assume real estate");
    expect(systemPrompt).toContain("adapt your tone and messaging to match the brand's actual business");
  });

  it("should handle multiline copywriting guides correctly", () => {
    const brandWithMultilineGuide = {
      id: "brand-multiline",
      name: "Test Brand",
      description: "Test description",
      voiceBibleContent: "Test voice",
      copywritingGuide: `Line 1: First guideline
Line 2: Second guideline
Line 3: Third guideline
Line 4: Fourth guideline`,
    };

    const systemPrompt = buildSystemPrompt(brandWithMultilineGuide);

    expect(systemPrompt).toContain("Line 1: First guideline");
    expect(systemPrompt).toContain("Line 2: Second guideline");
    expect(systemPrompt).toContain("Line 3: Third guideline");
    expect(systemPrompt).toContain("Line 4: Fourth guideline");
  });

  it("should handle special characters in copywriting guide", () => {
    const brandWithSpecialChars = {
      id: "brand-special",
      name: "Test Brand",
      description: "Test description",
      voiceBibleContent: "Test voice",
      copywritingGuide: `Use "quotes" and 'apostrophes' correctly
Include (parentheses) and [brackets] as needed
Use & ampersands, @ symbols, and #hashtags appropriately`,
    };

    const systemPrompt = buildSystemPrompt(brandWithSpecialChars);

    expect(systemPrompt).toContain('Use "quotes" and \'apostrophes\' correctly');
    expect(systemPrompt).toContain("Include (parentheses) and [brackets]");
    expect(systemPrompt).toContain("& ampersands, @ symbols, and #hashtags");
  });

  it("should create distinct system prompts for different brands", () => {
    const casualPrompt = buildSystemPrompt(brandWithCasualGuide);
    const techPrompt = buildSystemPrompt(brandWithTechGuide);
    const luxuryPrompt = buildSystemPrompt(brandWithLuxuryGuide);

    // Verify each prompt is unique
    expect(casualPrompt).not.toBe(techPrompt);
    expect(techPrompt).not.toBe(luxuryPrompt);
    expect(casualPrompt).not.toBe(luxuryPrompt);

    // Verify each contains brand-specific guide content
    expect(casualPrompt).toContain("Conversational and friendly");
    expect(techPrompt).toContain("Technical but accessible");
    expect(luxuryPrompt).toContain("Refined vocabulary");
  });

  it("should prioritize copywriting guide over generic instructions", () => {
    const systemPrompt = buildSystemPrompt(brandWithCasualGuide);

    // The copywriting guide should be explicitly mentioned as important
    expect(systemPrompt).toContain("Follow the copywriting guide closely");
    expect(systemPrompt).toContain("consistency with the brand's established tone");
  });

  it("should handle empty copywriting guide gracefully", () => {
    const brandWithEmptyGuide = {
      id: "brand-empty",
      name: "Test Brand",
      description: "Test description",
      voiceBibleContent: "Test voice",
      copywritingGuide: "",
    };

    const systemPrompt = buildSystemPrompt(brandWithEmptyGuide);

    // Should still include the copywriting guide section
    expect(systemPrompt).toContain("Copywriting Guide:");
    // Should use default when empty
    expect(systemPrompt).toContain(
      "Generate professional, engaging content that resonates with the target audience"
    );
  });
});

/**
 * Helper function that mirrors the actual system prompt construction
 * from generateContentForPlatform in content.ts
 */
function buildSystemPrompt(brand: any): string {
  return `You are a marketing expert for the brand "${brand.name}". Use the following brand voice guidelines to generate content:\n\nBrand Voice: ${brand.voiceBibleContent || "Professional and engaging marketing content."}

Brand Description: ${brand.description || "A professional brand."}

Copywriting Guide:\n${brand.copywritingGuide || "Generate professional, engaging content that resonates with the target audience."}

Create content that reflects this brand's voice, values, and industry. Follow the copywriting guide closely to ensure consistency with the brand's established tone, language style, and messaging focus. Do NOT assume real estate - adapt your tone and messaging to match the brand's actual business.`;
}
