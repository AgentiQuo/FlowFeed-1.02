/**
 * Platform name abbreviations for cleaner UI display
 */

export type Platform = "instagram" | "facebook" | "linkedin" | "x" | "website";

export const PLATFORM_ABBREVIATIONS: Record<Platform, string> = {
  instagram: "IG",
  facebook: "FB",
  linkedin: "LI",
  x: "X",
  website: "MV",
};

export const PLATFORM_FULL_NAMES: Record<Platform, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  x: "X",
  website: "MV Post",
};

/**
 * Get abbreviated platform name
 * @param platform - Platform identifier
 * @returns Abbreviated name (e.g., "IG" for "instagram")
 */
export function getPlatformAbbr(platform: string): string {
  return PLATFORM_ABBREVIATIONS[platform as Platform] || platform;
}

/**
 * Get full platform name
 * @param platform - Platform identifier
 * @returns Full name (e.g., "Instagram" for "instagram")
 */
export function getPlatformFullName(platform: string): string {
  return PLATFORM_FULL_NAMES[platform as Platform] || platform;
}
