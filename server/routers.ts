import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { brandsRouter } from "./routers/brands";
import { ingestionRouter } from "./routers/ingestion";
import { contentRouter } from "./routers/content";
import { queueRouter } from "./routers/queue";
import { exportRouter } from "./routers/export";
import { analyticsRouter } from "./routers/analytics";
import { bulkScheduleRouter } from "./routers/bulk-schedule";
import { templatesRouter } from "./routers/templates";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  brands: brandsRouter,
  ingestion: ingestionRouter,
  content: contentRouter,
  queue: queueRouter,
  export: exportRouter,
  analytics: analyticsRouter,
  bulkSchedule: bulkScheduleRouter,
  templates: templatesRouter,
});

export type AppRouter = typeof appRouter;
