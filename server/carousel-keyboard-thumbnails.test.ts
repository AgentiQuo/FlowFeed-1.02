import { describe, it, expect, beforeEach } from "vitest";

// Mock carousel with keyboard and thumbnail support
interface CarouselState {
  currentIndex: number;
  totalItems: number;
  items: Array<{ id: string; fileName: string; thumbnail: string }>;
  selectedAssetId: string;
}

describe("Carousel Keyboard Navigation and Thumbnails", () => {
  let carouselState: CarouselState;

  const initializeCarousel = (itemCount: number) => {
    carouselState = {
      currentIndex: 0,
      totalItems: itemCount,
      items: Array.from({ length: itemCount }, (_, i) => ({
        id: `asset-${i}`,
        fileName: `property-${i}.jpg`,
        thumbnail: `thumb-${i}.jpg`,
      })),
      selectedAssetId: `asset-0`,
    };
  };

  const handleKeyboardNavigation = (key: string) => {
    if (key === "ArrowLeft") {
      carouselState.currentIndex = (carouselState.currentIndex - 1 + carouselState.totalItems) % carouselState.totalItems;
    } else if (key === "ArrowRight") {
      carouselState.currentIndex = (carouselState.currentIndex + 1) % carouselState.totalItems;
    }
    carouselState.selectedAssetId = carouselState.items[carouselState.currentIndex].id;
  };

  const handleThumbnailClick = (index: number) => {
    if (index >= 0 && index < carouselState.totalItems) {
      carouselState.currentIndex = index;
      carouselState.selectedAssetId = carouselState.items[index].id;
    }
  };

  beforeEach(() => {
    initializeCarousel(5);
  });

  it("should initialize carousel with keyboard support", () => {
    expect(carouselState.currentIndex).toBe(0);
    expect(carouselState.selectedAssetId).toBe("asset-0");
    expect(carouselState.items.length).toBe(5);
  });

  it("should navigate with ArrowRight key", () => {
    handleKeyboardNavigation("ArrowRight");
    expect(carouselState.currentIndex).toBe(1);
    expect(carouselState.selectedAssetId).toBe("asset-1");

    handleKeyboardNavigation("ArrowRight");
    expect(carouselState.currentIndex).toBe(2);
    expect(carouselState.selectedAssetId).toBe("asset-2");
  });

  it("should navigate with ArrowLeft key", () => {
    carouselState.currentIndex = 2;
    carouselState.selectedAssetId = "asset-2";

    handleKeyboardNavigation("ArrowLeft");
    expect(carouselState.currentIndex).toBe(1);
    expect(carouselState.selectedAssetId).toBe("asset-1");
  });

  it("should wrap around with ArrowRight at end", () => {
    carouselState.currentIndex = 4;
    carouselState.selectedAssetId = "asset-4";

    handleKeyboardNavigation("ArrowRight");
    expect(carouselState.currentIndex).toBe(0);
    expect(carouselState.selectedAssetId).toBe("asset-0");
  });

  it("should wrap around with ArrowLeft at start", () => {
    carouselState.currentIndex = 0;
    carouselState.selectedAssetId = "asset-0";

    handleKeyboardNavigation("ArrowLeft");
    expect(carouselState.currentIndex).toBe(4);
    expect(carouselState.selectedAssetId).toBe("asset-4");
  });

  it("should jump to thumbnail on click", () => {
    handleThumbnailClick(3);
    expect(carouselState.currentIndex).toBe(3);
    expect(carouselState.selectedAssetId).toBe("asset-3");

    handleThumbnailClick(1);
    expect(carouselState.currentIndex).toBe(1);
    expect(carouselState.selectedAssetId).toBe("asset-1");
  });

  it("should handle rapid keyboard navigation", () => {
    for (let i = 0; i < 7; i++) {
      handleKeyboardNavigation("ArrowRight");
    }
    // 7 % 5 = 2
    expect(carouselState.currentIndex).toBe(2);
    expect(carouselState.selectedAssetId).toBe("asset-2");
  });

  it("should handle mixed keyboard and thumbnail navigation", () => {
    handleKeyboardNavigation("ArrowRight");
    expect(carouselState.currentIndex).toBe(1);

    handleThumbnailClick(4);
    expect(carouselState.currentIndex).toBe(4);

    handleKeyboardNavigation("ArrowLeft");
    expect(carouselState.currentIndex).toBe(3);

    handleThumbnailClick(0);
    expect(carouselState.currentIndex).toBe(0);
  });

  it("should ignore invalid thumbnail clicks", () => {
    const initialIndex = carouselState.currentIndex;
    const initialAssetId = carouselState.selectedAssetId;

    handleThumbnailClick(-1);
    expect(carouselState.currentIndex).toBe(initialIndex);
    expect(carouselState.selectedAssetId).toBe(initialAssetId);

    handleThumbnailClick(10);
    expect(carouselState.currentIndex).toBe(initialIndex);
    expect(carouselState.selectedAssetId).toBe(initialAssetId);
  });

  it("should maintain thumbnail visibility state", () => {
    const visibleThumbnails = carouselState.items.map((item, index) => ({
      id: item.id,
      isActive: index === carouselState.currentIndex,
    }));

    expect(visibleThumbnails[0].isActive).toBe(true);
    expect(visibleThumbnails[1].isActive).toBe(false);

    handleKeyboardNavigation("ArrowRight");

    const updatedThumbnails = carouselState.items.map((item, index) => ({
      id: item.id,
      isActive: index === carouselState.currentIndex,
    }));

    expect(updatedThumbnails[0].isActive).toBe(false);
    expect(updatedThumbnails[1].isActive).toBe(true);
  });

  it("should support keyboard navigation with single item", () => {
    initializeCarousel(1);

    handleKeyboardNavigation("ArrowRight");
    expect(carouselState.currentIndex).toBe(0);

    handleKeyboardNavigation("ArrowLeft");
    expect(carouselState.currentIndex).toBe(0);
  });

  it("should sync keyboard and thumbnail state", () => {
    handleKeyboardNavigation("ArrowRight");
    const keyboardIndex = carouselState.currentIndex;

    handleThumbnailClick(0);
    handleKeyboardNavigation("ArrowRight");

    expect(carouselState.currentIndex).toBe(1);
    expect(carouselState.selectedAssetId).toBe("asset-1");
  });

  it("should display correct thumbnail for current position", () => {
    handleThumbnailClick(2);
    const currentThumbnail = carouselState.items[carouselState.currentIndex];

    expect(currentThumbnail.id).toBe("asset-2");
    expect(currentThumbnail.fileName).toBe("property-2.jpg");
    expect(currentThumbnail.thumbnail).toBe("thumb-2.jpg");
  });
});
