import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";

export const learningsRouter = router({
  /**
   * Get brand learnings
   */
  get: protectedProcedure
    .input(z.object({ brandId: z.string() }))
    .query(async ({ input }) => {
      const { readBrandLearnings } = await import("../_core/brandLearnings");
      const learnings = await readBrandLearnings(input.brandId);
      return { learnings };
    }),

  /**
   * Update brand learnings
   */
  update: protectedProcedure
    .input(
      z.object({
        brandId: z.string(),
        learnings: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const fs = await import("fs/promises");
      const path = await import("path");

      const learningsPath = path.join(
        "/home/ubuntu/webdev-static-assets/brand-learnings",
        `${input.brandId}.md`
      );

      await fs.writeFile(learningsPath, input.learnings, "utf-8");
      return { success: true };
    }),
});
