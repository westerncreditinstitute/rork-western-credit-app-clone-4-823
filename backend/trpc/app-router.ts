import { createTRPCRouter } from "./create-context";
import { exampleRouter } from "./routes/example";
import { videosRouter } from "./routes/videos";
import { documentsRouter } from "./routes/documents";
import { avatarsRouter } from "./routes/avatars";
import { disputesRouter } from "./routes/disputes";
import { usersRouter } from "./routes/users";
import { progressRouter } from "./routes/progress";
import { providersRouter } from "./routes/providers";
import { subscriptionsRouter } from "./routes/subscriptions";
import { walletRouter } from "./routes/wallet";
import { blogRouter } from "./routes/blog";
import { bunnyRouter } from "./routes/bunny";
import { videoProgressRouter } from "./routes/video-progress";
import { videoNotesRouter } from "./routes/video-notes";
import { cloudflareRouter } from "./routes/cloudflare";
import { featuredVideosRouter } from "./routes/featured-videos";
import { gameStateRouter } from "./routes/game-state";
import { musoTokenRouter } from "./routes/muso-token";
import { multiplayerRouter } from "./routes/multiplayer";
import { educationRouter } from "./routes/education";
import { homesRouter } from "./routes/homes";
import { activityTrackingRouter } from "./routes/activity-tracking";
import { adminRouter } from "./routes/admin";
import { leaderboardsRouter } from "./routes/leaderboards";
import { challengesRouter } from "./routes/challenges";

export const appRouter = createTRPCRouter({
  example: exampleRouter,
  videos: videosRouter,
  documents: documentsRouter,
  avatars: avatarsRouter,
  disputes: disputesRouter,
  users: usersRouter,
  progress: progressRouter,
  providers: providersRouter,
  subscriptions: subscriptionsRouter,
  wallet: walletRouter,
  blog: blogRouter,
  bunny: bunnyRouter,
  videoProgress: videoProgressRouter,
  videoNotes: videoNotesRouter,
  cloudflare: cloudflareRouter,
  featuredVideos: featuredVideosRouter,
  gameState: gameStateRouter,
  musoToken: musoTokenRouter,
  multiplayer: multiplayerRouter,
  education: educationRouter,
  homes: homesRouter,
  activityTracking: activityTrackingRouter,
  admin: adminRouter,
  leaderboards: leaderboardsRouter,
  challenges: challengesRouter,
});

export type AppRouter = typeof appRouter;
