/**
 * Platform-specific preview dimensions and styling
 * Used to show drafts with realistic platform appearance
 */

export type Platform = "instagram" | "linkedin" | "facebook" | "x" | "website";

export interface PlatformPreviewConfig {
  platform: Platform;
  width: number;
  height: number;
  aspectRatio: string;
  textPosition: "bottom" | "center" | "overlay";
  textColor: string;
  backgroundColor: string;
  maxTextLines: number;
  fontSize: string;
  padding: string;
}

export const PLATFORM_PREVIEWS: Record<Platform, PlatformPreviewConfig> = {
  instagram: {
    platform: "instagram",
    width: 1080,
    height: 1080,
    aspectRatio: "1/1",
    textPosition: "overlay",
    textColor: "text-white",
    backgroundColor: "bg-gray-900",
    maxTextLines: 5,
    fontSize: "text-lg",
    padding: "p-6",
  },
  linkedin: {
    platform: "linkedin",
    width: 1200,
    height: 628,
    aspectRatio: "1200/628",
    textPosition: "center",
    textColor: "text-gray-800",
    backgroundColor: "bg-white",
    maxTextLines: 4,
    fontSize: "text-base",
    padding: "p-8",
  },
  facebook: {
    platform: "facebook",
    width: 1200,
    height: 628,
    aspectRatio: "1200/628",
    textPosition: "bottom",
    textColor: "text-gray-800",
    backgroundColor: "bg-white",
    maxTextLines: 4,
    fontSize: "text-base",
    padding: "p-6",
  },
  x: {
    platform: "x",
    width: 506,
    height: 506,
    aspectRatio: "1/1",
    textPosition: "overlay",
    textColor: "text-white",
    backgroundColor: "bg-black",
    maxTextLines: 3,
    fontSize: "text-sm",
    padding: "p-4",
  },
  website: {
    platform: "website",
    width: 1200,
    height: 800,
    aspectRatio: "1200/800",
    textPosition: "bottom",
    textColor: "text-gray-800",
    backgroundColor: "bg-gray-50",
    maxTextLines: 6,
    fontSize: "text-base",
    padding: "p-8",
  },
};

export function getPlatformPreviewConfig(platform: Platform): PlatformPreviewConfig {
  return PLATFORM_PREVIEWS[platform];
}

export function getPreviewDimensions(platform: Platform): { width: number; height: number } {
  const config = PLATFORM_PREVIEWS[platform];
  return { width: config.width, height: config.height };
}

export function getTruncatedText(text: string, maxLines: number, maxCharsPerLine: number = 50): string {
  const lines = text.split("\n").slice(0, maxLines);
  return lines
    .map((line) => {
      if (line.length > maxCharsPerLine) {
        return line.substring(0, maxCharsPerLine) + "...";
      }
      return line;
    })
    .join("\n");
}
