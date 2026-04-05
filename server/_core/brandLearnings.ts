import * as fs from "fs/promises";
import * as path from "path";

const LEARNINGS_DIR = "/home/ubuntu/webdev-static-assets/brand-learnings";

/**
 * Get the path to a brand's learnings file
 */
function getLearningsPath(brandId: string): string {
  return path.join(LEARNINGS_DIR, `${brandId}.md`);
}

/**
 * Read a brand's learnings from file
 */
export async function readBrandLearnings(brandId: string): Promise<string> {
  try {
    const filePath = getLearningsPath(brandId);
    const content = await fs.readFile(filePath, "utf-8");
    return content;
  } catch (error) {
    // File doesn't exist yet, return empty string
    if ((error as any).code === "ENOENT") {
      return "";
    }
    throw error;
  }
}

/**
 * Append feedback to a brand's learnings file
 */
export async function appendBrandLearning(
  brandId: string,
  feedback: string
): Promise<void> {
  const filePath = getLearningsPath(brandId);
  const timestamp = new Date().toISOString();
  
  // Format the learning entry
  const entry = `\n- **[${timestamp}]** ${feedback}`;
  
  try {
    // Append to existing file or create new one
    await fs.appendFile(filePath, entry, "utf-8");
  } catch (error) {
    // If file doesn't exist, create it with header
    if ((error as any).code === "ENOENT") {
      const header = `# Brand Learnings for Brand ${brandId}\n\nAccumulated feedback and learnings from user feedback on content generation.\n`;
      await fs.writeFile(filePath, header + entry, "utf-8");
    } else {
      throw error;
    }
  }
}

/**
 * Get formatted learnings for inclusion in LLM prompt
 */
export async function getFormattedLearnings(brandId: string): Promise<string> {
  const learnings = await readBrandLearnings(brandId);
  
  if (!learnings) {
    return "No learnings recorded yet for this brand.";
  }
  
  return learnings;
}
