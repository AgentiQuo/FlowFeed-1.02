import { describe, expect, it, beforeEach, vi } from "vitest";
import { brandsRouter } from "./brands";
import type { TrpcContext } from "../_core/context";

// Mock the database module
vi.mock("../db", () => ({
  getDb: vi.fn(),
  getUserBrands: vi.fn(),
  getBrandById: vi.fn(),
  getBrandCategories: vi.fn(),
  getBrandPartners: vi.fn(),
  getBrandAgents: vi.fn(),
}));

vi.mock("../../drizzle/schema", () => ({
  brands: {},
  categories: {},
  partners: {},
  agents: {},
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ col, val })),
}));

vi.mock("nanoid", () => ({
  nanoid: vi.fn(() => "test-id-123"),
}));

function createMockContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("brandsRouter", () => {
  describe("list", () => {
    it("should return user brands", async () => {
      const { getUserBrands } = await import("../db");
      const mockBrands = [
        { id: "1", userId: 1, name: "Brand 1", createdAt: new Date() },
      ];
      vi.mocked(getUserBrands).mockResolvedValueOnce(mockBrands as any);

      const caller = brandsRouter.createCaller(createMockContext());
      const result = await caller.list();

      expect(result).toEqual(mockBrands);
      expect(getUserBrands).toHaveBeenCalledWith(1);
    });
  });

  describe("create", () => {
    it("should create a new brand", async () => {
      const { getDb } = await import("../db");
      const mockDb = {
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(getDb).mockResolvedValueOnce(mockDb as any);

      const caller = brandsRouter.createCaller(createMockContext());
      const result = await caller.create({
        name: "New Brand",
        websiteUrl: "https://example.com",
      });

      expect(result.name).toBe("New Brand");
      expect(result.userId).toBe(1);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("should throw error if database is not available", async () => {
      const { getDb } = await import("../db");
      vi.mocked(getDb).mockResolvedValueOnce(null);

      const caller = brandsRouter.createCaller(createMockContext());
      
      await expect(
        caller.create({ name: "New Brand" })
      ).rejects.toThrow("Database not available");
    });
  });

  describe("getById", () => {
    it("should return brand by id", async () => {
      const { getBrandById } = await import("../db");
      const mockBrand = {
        id: "1",
        userId: 1,
        name: "Brand 1",
        createdAt: new Date(),
      };
      vi.mocked(getBrandById).mockResolvedValueOnce(mockBrand as any);

      const caller = brandsRouter.createCaller(createMockContext());
      const result = await caller.getById({ brandId: "1" });

      expect(result).toEqual(mockBrand);
      expect(getBrandById).toHaveBeenCalledWith("1");
    });
  });

  describe("listCategories", () => {
    it("should return categories for a brand", async () => {
      const { getBrandCategories } = await import("../db");
      const mockCategories = [
        { id: "1", brandId: "1", name: "Category 1", createdAt: new Date() },
      ];
      vi.mocked(getBrandCategories).mockResolvedValueOnce(mockCategories as any);

      const caller = brandsRouter.createCaller(createMockContext());
      const result = await caller.listCategories({ brandId: "1" });

      expect(result).toEqual(mockCategories);
      expect(getBrandCategories).toHaveBeenCalledWith("1");
    });
  });

  describe("listPartners", () => {
    it("should return partners for a brand", async () => {
      const { getBrandPartners } = await import("../db");
      const mockPartners = [
        { id: "1", brandId: "1", name: "Partner 1", createdAt: new Date() },
      ];
      vi.mocked(getBrandPartners).mockResolvedValueOnce(mockPartners as any);

      const caller = brandsRouter.createCaller(createMockContext());
      const result = await caller.listPartners({ brandId: "1" });

      expect(result).toEqual(mockPartners);
      expect(getBrandPartners).toHaveBeenCalledWith("1");
    });
  });

  describe("listAgents", () => {
    it("should return agents for a brand", async () => {
      const { getBrandAgents } = await import("../db");
      const mockAgents = [
        { id: "1", brandId: "1", name: "Agent 1", email: "agent@example.com", createdAt: new Date() },
      ];
      vi.mocked(getBrandAgents).mockResolvedValueOnce(mockAgents as any);

      const caller = brandsRouter.createCaller(createMockContext());
      const result = await caller.listAgents({ brandId: "1" });

      expect(result).toEqual(mockAgents);
      expect(getBrandAgents).toHaveBeenCalledWith("1");
    });
  });
});
