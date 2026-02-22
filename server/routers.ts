import { callsRouter } from "./routers/calls";
import { agentsRouter } from "./routers/agents";
import { publicProcedure, router } from "./_core/trpc";

export const appRouter = router({
  system: router({
    health: publicProcedure
      .query(() => ({ ok: true })),
  }),
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(() => {
      return {
        success: true,
      } as const;
    }),
  }),

  calls: callsRouter,
  agents: agentsRouter,
});

export type AppRouter = typeof appRouter;
