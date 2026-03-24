import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import challengeService from "@/services/ChallengeService";

export const challengesRouter = createTRPCRouter({
  getChallenges: publicProcedure
    .input(
      z.object({
        status: z.enum(['upcoming', 'active', 'voting', 'completed']).optional(),
        userId: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      console.log('[ChallengesRouter] getChallenges:', input);
      
      const challenges = await challengeService.getChallenges(
        input.status,
        input.userId
      );
      
      return challenges;
    }),

  getChallengeById: publicProcedure
    .input(
      z.object({
        challengeId: z.string(),
        userId: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      console.log('[ChallengesRouter] getChallengeById:', input);
      
      const challenge = await challengeService.getChallengeById(
        input.challengeId,
        input.userId
      );
      
      return challenge;
    }),

  joinChallenge: publicProcedure
    .input(
      z.object({
        challengeId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      console.log('[ChallengesRouter] joinChallenge:', input);
      
      const result = await challengeService.joinChallenge(
        input.challengeId,
        input.userId
      );
      
      return result;
    }),

  leaveChallenge: publicProcedure
    .input(
      z.object({
        challengeId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      console.log('[ChallengesRouter] leaveChallenge:', input);
      
      const result = await challengeService.leaveChallenge(
        input.challengeId,
        input.userId
      );
      
      return result;
    }),

  getChallengeProgress: publicProcedure
    .input(
      z.object({
        challengeId: z.string(),
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      console.log('[ChallengesRouter] getChallengeProgress:', input);
      
      const progress = await challengeService.getChallengeProgress(
        input.challengeId,
        input.userId
      );
      
      return progress;
    }),

  voteForParticipant: publicProcedure
    .input(
      z.object({
        challengeId: z.string(),
        participantId: z.string(),
        voterId: z.string(),
        score: z.number().min(1).max(5),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      console.log('[ChallengesRouter] voteForParticipant:', input);
      
      const result = await challengeService.voteForParticipant(
        input.challengeId,
        input.participantId,
        input.voterId,
        input.score,
        input.comment
      );
      
      return result;
    }),

  shareAchievement: publicProcedure
    .input(
      z.object({
        achievementId: z.string(),
        achievementName: z.string(),
        achievementIcon: z.string(),
        achievementRarity: z.string(),
        playerId: z.string(),
        playerName: z.string(),
        playerAvatar: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      console.log('[ChallengesRouter] shareAchievement:', input);
      
      const share = await challengeService.shareAchievement(
        input.achievementId,
        input.achievementName,
        input.achievementIcon,
        input.achievementRarity,
        input.playerId,
        input.playerName,
        input.playerAvatar
      );
      
      return share;
    }),

  getAchievementFeed: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).optional().default(20),
        userId: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      console.log('[ChallengesRouter] getAchievementFeed:', input);
      
      const feed = await challengeService.getAchievementFeed(
        input.limit,
        input.userId
      );
      
      return feed;
    }),

  congratulateAchievement: publicProcedure
    .input(
      z.object({
        shareId: z.string(),
        playerId: z.string(),
        playerName: z.string(),
        playerAvatar: z.string(),
        message: z.string().max(200),
        emoji: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      console.log('[ChallengesRouter] congratulateAchievement:', input);
      
      const congratulation = await challengeService.congratulateAchievement(
        input.shareId,
        input.playerId,
        input.playerName,
        input.playerAvatar,
        input.message,
        input.emoji
      );
      
      return congratulation;
    }),

  likeAchievementShare: publicProcedure
    .input(
      z.object({
        shareId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      console.log('[ChallengesRouter] likeAchievementShare:', input);
      
      const result = await challengeService.likeAchievementShare(
        input.shareId,
        input.userId
      );
      
      return result;
    }),
});
