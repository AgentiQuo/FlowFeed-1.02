import { describe, it, expect, beforeEach } from "vitest";

// Mock persistent platform selection state
interface PersistentSelectionState {
  selectedAssetId: string;
  selectedPlatforms: string[];
  carouselIndex: number;
  assets: Array<{ id: string; fileName: string }>;
}

describe("Persistent Platform Selection", () => {
  let state: PersistentSelectionState;

  const initializeState = (assetCount: number) => {
    state = {
      selectedAssetId: `asset-0`,
      selectedPlatforms: ["instagram"],
      carouselIndex: 0,
      assets: Array.from({ length: assetCount }, (_, i) => ({
        id: `asset-${i}`,
        fileName: `property-${i}.jpg`,
      })),
    };
  };

  const navigateCarousel = (index: number) => {
    if (index >= 0 && index < state.assets.length) {
      state.carouselIndex = index;
      state.selectedAssetId = state.assets[index].id;
      // Platforms remain unchanged
    }
  };

  const togglePlatform = (platform: string) => {
    if (state.selectedPlatforms.includes(platform)) {
      state.selectedPlatforms = state.selectedPlatforms.filter((p) => p !== platform);
    } else {
      state.selectedPlatforms.push(platform);
    }
  };

  const selectAllPlatforms = () => {
    state.selectedPlatforms = ["instagram", "linkedin", "facebook", "x", "website"];
  };

  beforeEach(() => {
    initializeState(5);
  });

  it("should initialize with default platform selection", () => {
    expect(state.selectedPlatforms).toEqual(["instagram"]);
    expect(state.selectedAssetId).toBe("asset-0");
  });

  it("should maintain platforms when navigating carousel", () => {
    state.selectedPlatforms = ["instagram", "linkedin"];

    navigateCarousel(2);
    expect(state.selectedPlatforms).toEqual(["instagram", "linkedin"]);
    expect(state.selectedAssetId).toBe("asset-2");
  });

  it("should apply same platforms to multiple assets", () => {
    state.selectedPlatforms = ["instagram", "facebook"];

    // Process first asset
    expect(state.selectedAssetId).toBe("asset-0");
    expect(state.selectedPlatforms).toEqual(["instagram", "facebook"]);

    // Navigate to second asset
    navigateCarousel(1);
    expect(state.selectedAssetId).toBe("asset-1");
    expect(state.selectedPlatforms).toEqual(["instagram", "facebook"]);

    // Navigate to third asset
    navigateCarousel(2);
    expect(state.selectedAssetId).toBe("asset-2");
    expect(state.selectedPlatforms).toEqual(["instagram", "facebook"]);
  });

  it("should allow changing platforms mid-carousel", () => {
    navigateCarousel(1);
    expect(state.selectedPlatforms).toEqual(["instagram"]);

    togglePlatform("linkedin");
    expect(state.selectedPlatforms).toEqual(["instagram", "linkedin"]);

    navigateCarousel(2);
    expect(state.selectedPlatforms).toEqual(["instagram", "linkedin"]);
  });

  it("should support selecting all platforms", () => {
    selectAllPlatforms();
    expect(state.selectedPlatforms).toEqual(["instagram", "linkedin", "facebook", "x", "website"]);
    expect(state.selectedPlatforms.length).toBe(5);

    navigateCarousel(3);
    expect(state.selectedPlatforms).toEqual(["instagram", "linkedin", "facebook", "x", "website"]);
  });

  it("should track platform count for UI display", () => {
    expect(state.selectedPlatforms.length).toBe(1);

    togglePlatform("linkedin");
    expect(state.selectedPlatforms.length).toBe(2);

    togglePlatform("facebook");
    expect(state.selectedPlatforms.length).toBe(3);

    navigateCarousel(2);
    expect(state.selectedPlatforms.length).toBe(3);
  });

  it("should handle rapid carousel navigation with persistent selection", () => {
    state.selectedPlatforms = ["instagram", "x"];

    for (let i = 0; i < 5; i++) {
      navigateCarousel(i);
      expect(state.selectedPlatforms).toEqual(["instagram", "x"]);
    }
  });

  it("should allow toggling platforms on and off", () => {
    togglePlatform("instagram");
    expect(state.selectedPlatforms).toEqual([]);

    togglePlatform("linkedin");
    expect(state.selectedPlatforms).toEqual(["linkedin"]);

    togglePlatform("facebook");
    expect(state.selectedPlatforms).toEqual(["linkedin", "facebook"]);

    navigateCarousel(2);
    expect(state.selectedPlatforms).toEqual(["linkedin", "facebook"]);
  });

  it("should maintain selection through full carousel cycle", () => {
    state.selectedPlatforms = ["instagram", "linkedin", "facebook"];

    // Navigate through all assets
    for (let i = 0; i < state.assets.length; i++) {
      navigateCarousel(i);
      expect(state.selectedPlatforms).toEqual(["instagram", "linkedin", "facebook"]);
      expect(state.selectedAssetId).toBe(`asset-${i}`);
    }
  });

  it("should support switching between all and custom selections", () => {
    togglePlatform("linkedin");
    expect(state.selectedPlatforms.length).toBe(2);

    selectAllPlatforms();
    expect(state.selectedPlatforms.length).toBe(5);

    navigateCarousel(1);
    expect(state.selectedPlatforms.length).toBe(5);

    // User can then deselect
    togglePlatform("instagram");
    expect(state.selectedPlatforms.length).toBe(4);
  });

  it("should generate correct button label for platform count", () => {
    const getButtonLabel = () => {
      const count = state.selectedPlatforms.length;
      return `Create for ${count} Platform${count !== 1 ? "s" : ""}`;
    };

    expect(getButtonLabel()).toBe("Create for 1 Platform");

    togglePlatform("linkedin");
    expect(getButtonLabel()).toBe("Create for 2 Platforms");

    selectAllPlatforms();
    expect(getButtonLabel()).toBe("Create for 5 Platforms");
  });

  it("should preserve selection when navigating back to previous asset", () => {
    state.selectedPlatforms = ["instagram", "facebook", "x"];

    navigateCarousel(2);
    expect(state.selectedAssetId).toBe("asset-2");
    expect(state.selectedPlatforms).toEqual(["instagram", "facebook", "x"]);

    navigateCarousel(0);
    expect(state.selectedAssetId).toBe("asset-0");
    expect(state.selectedPlatforms).toEqual(["instagram", "facebook", "x"]);
  });
});
