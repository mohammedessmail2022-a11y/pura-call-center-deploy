import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { upsertAgentSession, getAgentSession } from "../db";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";

export const agentsRouter = router({
  /**
   * Login agent by name
   */
  login: publicProcedure
    .input(
      z.object({
        agentName: z.string().min(1, "Agent name is required"),
        isAdmin: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const sessionId = nanoid(32);
        
        await upsertAgentSession({
          agentName: input.agentName,
          sessionId,
          isAdmin: input.isAdmin ? 1 : 0,
        });

        return {
          success: true,
          sessionId,
          agentName: input.agentName,
          isAdmin: input.isAdmin,
          message: `Welcome, ${input.agentName}!`,
        };
      } catch (error) {
        console.error("Failed to login agent:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to login",
        });
      }
    }),

  /**
   * Get current agent session
   */
  getSession: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      try {
        const session = await getAgentSession(input.sessionId);
        if (!session) {
          return { success: false, session: null };
        }
        return {
          success: true,
          session: {
            agentName: session.agentName,
            isAdmin: session.isAdmin === 1,
            sessionId: session.sessionId,
          },
        };
      } catch (error) {
        console.error("Failed to get session:", error);
        return { success: false, session: null };
      }
    }),

  /**
   * Logout agent (clear session)
   */
  logout: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ input }) => {
      // In a real app, you'd delete the session here
      // For now, just return success
      return { success: true, message: "Logged out successfully" };
    }),
});
