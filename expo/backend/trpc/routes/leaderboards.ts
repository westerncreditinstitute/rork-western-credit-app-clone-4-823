import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import challengeService from "@/services/ChallengeService";

export const leaderboardsRouter = createTRPCRouter({
  getLeaderboard: publicProcedure
    .input(
      z.object({
        type: z.enum([
          'most_visited',
          'highest_rated',
          'most_expensive',
          'most_items',
          'wealthiest',
          'top_hosts',
          'most_liked',
          'rising_stars',
        ]),
        period: z.enum(['weekly', 'monthly', 'all_time']),
        limit: z.number().min(1).max(100).optional().default(50),
        userId: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      console.log('[LeaderboardsRouter] getLeaderboard:', input);
      
      const leaderboard = await challengeService.getLeaderboard(
        input.type,
        input.period,
        input.limit,
        input.userId
      );
      
      return leaderboard;
    }),

  getMultipleLeaderboards: publicProcedure
    .input(
      z.object({
        types: z.array(z.enum([
          'most_visited',
          'highest_rated',
          'most_expensive',
          'most_items',
          'wealthiest',
          'top_hosts',
          'most_liked',
          'rising_stars',
        ])),
        period: z.enum(['weekly', 'monthly', 'all_time']),
        limit: z.number().min(1).max(20).optional().default(10),
        userId: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      console.log('[LeaderboardsRouter] getMultipleLeaderboards:', input);
      
      const leaderboards = await Promise.all(
        input.types.map(type =>
          challengeService.getLeaderboard(type, input.period, input.limit, input.userId)
        )
      );
      
      return leaderboards;
    }),

  getUserRankings: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        period: z.enum(['weekly', 'monthly', 'all_time']).optional().default('all_time'),
      })
    )
    .query(async ({ input }) => {
      console.log('[LeaderboardsRouter] getUserRankings:', input);
      
      const types = [
        'most_visited',
        'highest_rated',
        'most_expensive',
        'most_items',
        'wealthiest',
      ] as const;
      
      const rankings = await Promise.all(
        types.map(async (type) => {
          const leaderboard = await challengeService.getLeaderboard(
            type,
            input.period,
            100,
            input.userId
          );
          return {
            type,
            rank: leaderboard.userRank,
            score: leaderboard.userScore,
            totalParticipants: leaderboard.totalParticipants,
          };
        })
      );
      
      return rankings;
    }),
});
