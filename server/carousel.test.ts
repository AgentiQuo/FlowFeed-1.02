import { describe, it, expect } from "vitest";

// Mock carousel state and navigation
interface CarouselState {
  currentIndex: number;
  totalItems: number;
  items: Array<{ id: string; fileName: string }>;
}

describe("Image Carousel Functionality", () => {
  let carouselState: CarouselState;

  const initializeCarousel = (itemCount: number) => {
    carouselState = {
      currentIndex: 0,
      totalItems: itemCount,
      items: Array.from({ length: itemCount }, (_, i) => ({
        id: `asset-${i}`,
        fileName: `property-${i}.jpg`,
      })),
    };
  };

  const navigateNext = () => {
    carouselState.currentIndex = (carouselState.currentIndex + 1) % carouselState.totalItems;
  };

  const navigatePrev = () => {
    carouselState.currentIndex = (carouselState.currentIndex - 1 + carouselState.totalItems) % carouselState.totalItems;
  };

  it("should initialize carousel with correct number of items", () => {
    initializeCarousel(5);
    expect(carouselState.totalItems).toBe(5);
    expect(carouselState.currentIndex).toBe(0);
    expect(carouselState.items.length).toBe(5);
  });

  it("should navigate to next item in carousel", () => {
    initializeCarousel(3);
    expect(carouselState.currentIndex).toBe(0);

    navigateNext();
    expect(carouselState.currentIndex).toBe(1);

    navigateNext();
    expect(carouselState.currentIndex).toBe(2);
  });

  it("should wrap around to first item when reaching end", () => {
    initializeCarousel(3);
    carouselState.currentIndex = 2;

    navigateNext();
    expect(carouselState.currentIndex).toBe(0);
  });

  it("should navigate to previous item in carousel", () => {
    initializeCarousel(3);
    carouselState.currentIndex = 2;

    navigatePrev();
    expect(carouselState.currentIndex).toBe(1);

    navigatePrev();
    expect(carouselState.currentIndex).toBe(0);
  });

  it("should wrap around to last item when going back from first", () => {
    initializeCarousel(3);
    carouselState.currentIndex = 0;

    navigatePrev();
    expect(carouselState.currentIndex).toBe(2);
  });

  it("should get current item details", () => {
    initializeCarousel(4);
    const currentItem = carouselState.items[carouselState.currentIndex];

    expect(currentItem.id).toBe("asset-0");
    expect(currentItem.fileName).toBe("property-0.jpg");
  });

  it("should track carousel position correctly", () => {
    initializeCarousel(5);
    const positions: number[] = [];

    for (let i = 0; i < 7; i++) {
      positions.push(carouselState.currentIndex);
      navigateNext();
    }

    // Should cycle: 0, 1, 2, 3, 4, 0, 1
    expect(positions).toEqual([0, 1, 2, 3, 4, 0, 1]);
  });

  it("should handle single item carousel", () => {
    initializeCarousel(1);

    navigateNext();
    expect(carouselState.currentIndex).toBe(0);

    navigatePrev();
    expect(carouselState.currentIndex).toBe(0);
  });

  it("should support rapid navigation", () => {
    initializeCarousel(5);

    // Rapid next clicks
    for (let i = 0; i < 10; i++) {
      navigateNext();
    }
    expect(carouselState.currentIndex).toBe(0); // 10 % 5 = 0

    // Rapid prev clicks
    for (let i = 0; i < 7; i++) {
      navigatePrev();
    }
    expect(carouselState.currentIndex).toBe(3); // (0 - 7) % 5 = 3
  });

  it("should display carousel counter correctly", () => {
    initializeCarousel(4);

    for (let i = 0; i < 4; i++) {
      const counter = `${carouselState.currentIndex + 1} / ${carouselState.totalItems}`;
      expect(counter).toBe(`${i + 1} / 4`);
      navigateNext();
    }
  });

  it("should maintain item data during navigation", () => {
    initializeCarousel(3);
    const firstItemId = carouselState.items[0].id;

    navigateNext();
    navigateNext();
    navigateNext();

    // Should be back at first item
    expect(carouselState.items[carouselState.currentIndex].id).toBe(firstItemId);
  });
});
