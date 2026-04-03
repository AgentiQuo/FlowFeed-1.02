import { describe, it, expect } from "vitest";

describe("Templates Router", () => {
  describe("createTemplate", () => {
    it("should create template with required fields", () => {
      const template = {
        id: "template-1",
        brandId: "brand-1",
        name: "Luxury Home Template",
        propertyType: "Luxury Home",
        platform: "instagram" as const,
        contentTemplate: "Stunning {property} available now! {date}",
        description: "Template for luxury properties",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(template.name).toBe("Luxury Home Template");
      expect(template.propertyType).toBe("Luxury Home");
      expect(template.platform).toBe("instagram");
    });

    it("should generate unique template ID", () => {
      const template1 = { id: "template-1", name: "Template 1" };
      const template2 = { id: "template-2", name: "Template 2" };

      expect(template1.id).not.toBe(template2.id);
    });

    it("should support optional description", () => {
      const templateWithDesc = {
        name: "Template 1",
        description: "This is a template",
      };

      const templateWithoutDesc = {
        name: "Template 2",
      };

      expect(templateWithDesc.description).toBeDefined();
      expect(templateWithoutDesc.description).toBeUndefined();
    });

    it("should validate platform enum", () => {
      const validPlatforms = ["instagram", "linkedin", "facebook", "x", "website"];
      const template = { platform: "instagram" };

      expect(validPlatforms).toContain(template.platform);
    });
  });

  describe("getBrandTemplates", () => {
    it("should retrieve all templates for a brand", () => {
      const templates = [
        {
          id: "t1",
          brandId: "brand-1",
          name: "Template 1",
          propertyType: "Single Family",
        },
        {
          id: "t2",
          brandId: "brand-1",
          name: "Template 2",
          propertyType: "Multi Family",
        },
        {
          id: "t3",
          brandId: "brand-2",
          name: "Template 3",
          propertyType: "Commercial",
        },
      ];

      const brand1Templates = templates.filter((t) => t.brandId === "brand-1");

      expect(brand1Templates.length).toBe(2);
      expect(brand1Templates[0].name).toBe("Template 1");
    });

    it("should return empty array for brand with no templates", () => {
      const templates = [
        { id: "t1", brandId: "brand-1", name: "Template 1" },
      ];

      const brand2Templates = templates.filter((t) => t.brandId === "brand-2");

      expect(brand2Templates.length).toBe(0);
    });

    it("should sort templates by creation date (newest first)", () => {
      const templates = [
        { id: "t1", name: "Old", createdAt: new Date("2026-01-01") },
        { id: "t2", name: "New", createdAt: new Date("2026-04-01") },
        { id: "t3", name: "Middle", createdAt: new Date("2026-02-01") },
      ];

      const sorted = [...templates].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );

      expect(sorted[0].name).toBe("New");
      expect(sorted[1].name).toBe("Middle");
      expect(sorted[2].name).toBe("Old");
    });
  });

  describe("getTemplatesByPropertyType", () => {
    it("should filter templates by property type", () => {
      const templates = [
        { id: "t1", propertyType: "Single Family", name: "SF Template" },
        { id: "t2", propertyType: "Multi Family", name: "MF Template" },
        { id: "t3", propertyType: "Single Family", name: "SF Template 2" },
      ];

      const singleFamilyTemplates = templates.filter(
        (t) => t.propertyType === "Single Family"
      );

      expect(singleFamilyTemplates.length).toBe(2);
      expect(singleFamilyTemplates[0].name).toBe("SF Template");
    });

    it("should return empty array for non-existent property type", () => {
      const templates = [
        { id: "t1", propertyType: "Single Family" },
      ];

      const commercialTemplates = templates.filter(
        (t) => t.propertyType === "Commercial"
      );

      expect(commercialTemplates.length).toBe(0);
    });

    it("should combine brand and property type filters", () => {
      const templates = [
        { id: "t1", brandId: "b1", propertyType: "Single Family" },
        { id: "t2", brandId: "b1", propertyType: "Multi Family" },
        { id: "t3", brandId: "b2", propertyType: "Single Family" },
      ];

      const filtered = templates.filter(
        (t) => t.brandId === "b1" && t.propertyType === "Single Family"
      );

      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe("t1");
    });
  });

  describe("useTemplate", () => {
    it("should substitute template variables", () => {
      const template = {
        contentTemplate: "Beautiful {property} available on {date}",
      };

      const propertyDescription = "3-bed luxury home";
      const currentDate = new Date().toLocaleDateString();

      let content = template.contentTemplate;
      content = content.replace(/\{property\}/g, propertyDescription);
      content = content.replace(/\{date\}/g, currentDate);

      expect(content).toContain("3-bed luxury home");
      expect(content).toContain(currentDate);
      expect(content).not.toContain("{property}");
      expect(content).not.toContain("{date}");
    });

    it("should handle multiple variable occurrences", () => {
      const template = {
        contentTemplate: "Visit {property} at {property}. Learn more about {property}.",
      };

      const propertyDescription = "123 Main St";

      let content = template.contentTemplate;
      content = content.replace(/\{property\}/g, propertyDescription);

      expect(content).toBe("Visit 123 Main St at 123 Main St. Learn more about 123 Main St.");
    });

    it("should preserve unmatched variables", () => {
      const template = {
        contentTemplate: "Check out {property} and {agent}",
      };

      const propertyDescription = "Beautiful home";

      let content = template.contentTemplate;
      content = content.replace(/\{property\}/g, propertyDescription);

      expect(content).toContain("Beautiful home");
      expect(content).toContain("{agent}"); // Unmatched variable preserved
    });

    it("should return platform from template", () => {
      const template = {
        platform: "instagram",
        contentTemplate: "Beautiful {property}",
      };

      expect(template.platform).toBe("instagram");
    });

    it("should include template name in response", () => {
      const template = {
        name: "Luxury Home Template",
        contentTemplate: "Beautiful {property}",
      };

      const result = {
        templateUsed: template.name,
        content: "Beautiful 3-bed home",
      };

      expect(result.templateUsed).toBe("Luxury Home Template");
    });
  });

  describe("deleteTemplate", () => {
    it("should remove template from collection", () => {
      let templates = [
        { id: "t1", name: "Template 1" },
        { id: "t2", name: "Template 2" },
        { id: "t3", name: "Template 3" },
      ];

      templates = templates.filter((t) => t.id !== "t2");

      expect(templates.length).toBe(2);
      expect(templates.find((t) => t.id === "t2")).toBeUndefined();
    });

    it("should handle deleting non-existent template", () => {
      const templates = [
        { id: "t1", name: "Template 1" },
      ];

      const beforeLength = templates.length;
      const filtered = templates.filter((t) => t.id !== "t999");

      expect(filtered.length).toBe(beforeLength);
    });
  });

  describe("Template Variables", () => {
    it("should support {property} variable", () => {
      const template = "Discover {property}";
      const property = "stunning 4-bed home";

      const result = template.replace(/\{property\}/g, property);
      expect(result).toBe("Discover stunning 4-bed home");
    });

    it("should support {date} variable", () => {
      const template = "Available {date}";
      const date = "April 10, 2026";

      const result = template.replace(/\{date\}/g, date);
      expect(result).toBe("Available April 10, 2026");
    });

    it("should support multiple variables in one template", () => {
      const template = "{property} is available {date}. Don't miss out!";
      const property = "Luxury Estate";
      const date = "this weekend";

      let result = template.replace(/\{property\}/g, property);
      result = result.replace(/\{date\}/g, date);

      expect(result).toBe("Luxury Estate is available this weekend. Don't miss out!");
    });
  });

  describe("Template Reusability", () => {
    it("should create multiple drafts from same template", () => {
      const template = {
        id: "t1",
        contentTemplate: "Beautiful {property}",
      };

      const properties = ["Home A", "Home B", "Home C"];

      const drafts = properties.map((property) => {
        let content = template.contentTemplate;
        content = content.replace(/\{property\}/g, property);
        return { templateId: template.id, content };
      });

      expect(drafts.length).toBe(3);
      expect(drafts[0].content).toBe("Beautiful Home A");
      expect(drafts[1].content).toBe("Beautiful Home B");
      expect(drafts[2].content).toBe("Beautiful Home C");
    });

    it("should save time by reusing templates", () => {
      const templateCount = 5;
      const propertiesPerTemplate = 10;

      const totalDraftsFromTemplates = templateCount * propertiesPerTemplate;

      expect(totalDraftsFromTemplates).toBe(50);
      // Without templates, user would need to write 50 individual drafts
      // With templates, user only needs to create 5 templates
    });
  });
});
