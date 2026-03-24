import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { supabase } from "@/lib/supabase";

const gameStateSchema = z.object({
  playerId: z.string(),
  playerName: z.string(),
  avatar: z.any(),
  profilePhotoUrl: z.string().optional().nullable(),
  useCustomPhoto: z.boolean().optional(),
  gameMode: z.enum(['simulation', 'real']).optional(),
  alerts: z.array(z.any()).optional(),
  healthStatus: z.any().optional(),
  gameStartDate: z.number(),
  currentDate: z.number(),
  creditScores: z.any(),
  creditAccounts: z.array(z.any()),
  hardInquiries: z.array(z.any()),
  currentJob: z.any().optional().nullable(),
  jobHistory: z.array(z.any()),
  monthlyIncome: z.number(),
  expenses: z.array(z.any()),
  bankBalance: z.number(),
  savingsBalance: z.number(),
  emergencyFund: z.number(),
  investments: z.number(),
  ownedProperties: z.array(z.any()),
  ownedVehicles: z.array(z.any()),
  ownedClothing: z.array(z.any()).optional(),
  pendingApplications: z.array(z.any()),
  achievements: z.array(z.any()).optional(),
  unlockedAchievements: z.array(z.string()),
  totalNetWorth: z.number(),
  monthsPlayed: z.number(),
  consecutiveOnTimePayments: z.number(),
  lifetimeEarnings: z.number(),
  lifetimeSpending: z.number(),
  tutorialCompleted: z.boolean(),
  lastEventDate: z.number(),
  lifestyle: z.any().optional(),
  isPublicProfile: z.boolean().optional(),
  activityLog: z.array(z.any()).optional(),
  scoreHistory: z.array(z.any()).optional(),
  lastLoginDate: z.number().optional(),
  consecutiveLoginDays: z.number().optional(),
  pendingIncidents: z.array(z.any()).optional(),
  tokenWallet: z.any().optional(),
  citySelectionCompleted: z.boolean().optional(),
  paidExpenses: z.record(z.string(), z.any()).optional(),
  lastUpdated: z.number().optional(),
}).passthrough();

export const gameStateRouter = createTRPCRouter({
  getByUserId: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      console.log('[GameState] Fetching game state for user:', input.userId);
      
      const { data, error } = await supabase
        .from('game_states')
        .select('*')
        .eq('user_id', input.userId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('[GameState] Error fetching game state:', error);
        return null;
      }
      
      if (!data) {
        console.log('[GameState] No game state found for user:', input.userId);
        return null;
      }
      
      console.log('[GameState] Found game state for user:', input.userId);
      
      return {
        id: data.id,
        userId: data.user_id,
        gameState: typeof data.game_state === 'string' ? JSON.parse(data.game_state) : data.game_state,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    }),

  save: publicProcedure
    .input(z.object({
      userId: z.string(),
      gameState: gameStateSchema,
    }))
    .mutation(async ({ input }) => {
      console.log('[GameState] Saving game state for user:', input.userId);
      
      try {
        const { data: existing, error: fetchError } = await supabase
          .from('game_states')
          .select('id')
          .eq('user_id', input.userId)
          .single();
        
        if (fetchError && fetchError.code !== 'PGRST116') {
          console.error('[GameState] Error checking existing game state:', fetchError);
        }
        
        const now = new Date().toISOString();
        
        const cleanGameState = {
          ...input.gameState,
          activityLog: (input.gameState.activityLog || []).slice(-100),
          scoreHistory: (input.gameState.scoreHistory || []).slice(-50),
          pendingIncidents: (input.gameState.pendingIncidents || []).slice(-20),
        };
        
        if (existing) {
          console.log('[GameState] Updating existing game state for user:', input.userId);
          const { data, error } = await supabase
            .from('game_states')
            .update({ 
              game_state: cleanGameState, 
              updated_at: now 
            })
            .eq('user_id', input.userId)
            .select()
            .single();
          
          if (error) {
            console.error('[GameState] Error updating game state:', error);
            throw new Error(`Failed to update game state: ${error.message}`);
          }
          
          console.log('[GameState] Successfully updated game state for user:', input.userId);
          return {
            id: data.id,
            userId: input.userId,
            gameState: cleanGameState,
            updatedAt: now,
          };
        } else {
          console.log('[GameState] Creating new game state for user:', input.userId);
          
          const { data, error } = await supabase
            .from('game_states')
            .insert({
              user_id: input.userId,
              game_state: cleanGameState,
              created_at: now,
              updated_at: now,
            })
            .select()
            .single();
          
          if (error) {
            console.error('[GameState] Error creating game state:', error);
            throw new Error(`Failed to create game state: ${error.message}`);
          }
          
          console.log('[GameState] Successfully created game state for user:', input.userId);
          return {
            id: data.id,
            userId: input.userId,
            gameState: cleanGameState,
            createdAt: now,
            updatedAt: now,
          };
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('[GameState] Critical error saving game state:', errorMessage);
        throw new Error(`Failed to save game state: ${errorMessage}`);
      }
    }),

  delete: publicProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input }) => {
      console.log('[GameState] Deleting game state for user:', input.userId);
      
      const { error } = await supabase
        .from('game_states')
        .delete()
        .eq('user_id', input.userId);
      
      if (error) {
        console.error('[GameState] Error deleting game state:', error);
        throw new Error(`Failed to delete game state: ${error.message}`);
      }
      
      return { success: true };
    }),
});
