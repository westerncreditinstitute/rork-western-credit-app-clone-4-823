export interface VideoForm {
  id?: string;
  title: string;
  url: string;
  embedCode: string;
  bunnyVideoId: string;
  bunnyLibraryId: string;
  cloudflareVideoId: string;
  cloudflareAccountId: string;
  duration: string;
  description: string;
}

export interface DocumentForm {
  id?: string;
  title: string;
  url: string;
  embedCode: string;
  type: "pdf" | "form" | "link" | "other";
  description: string;
}

export interface AvatarForm {
  id?: string;
  title: string;
  embedCode: string;
  apiKey: string;
  description: string;
}

export interface FeaturedVideoForm {
  id?: string;
  youtubeId: string;
  title: string;
  duration: string;
  description: string;
  isActive: boolean;
}

export type ManagementMode = "videos" | "documents" | "avatars" | "promo";

export interface BunnyVideo {
  videoId: string;
  title: string;
  length: number;
  status: string;
  thumbnailUrl: string | null;
}

export interface CloudflareVideo {
  videoId: string;
  title: string;
  length: number;
  status: string;
  thumbnailUrl: string | null;
}

export type VideoProvider = "bunny" | "cloudflare";

export interface ConnectionStatus {
  success: boolean;
  error: string | null;
  details: any;
}

export const ADMIN_SESSION_KEY = "admin_session_token";
export const REQUIRE_LOGIN_EACH_VISIT = true;

export const initialVideoForm: VideoForm = {
  title: "",
  url: "",
  embedCode: "",
  bunnyVideoId: "",
  bunnyLibraryId: "",
  cloudflareVideoId: "",
  cloudflareAccountId: "",
  duration: "",
  description: "",
};

export const initialDocumentForm: DocumentForm = {
  title: "",
  url: "",
  embedCode: "",
  type: "link",
  description: "",
};

export const initialAvatarForm: AvatarForm = {
  title: "",
  embedCode: "",
  apiKey: "",
  description: "",
};

export const initialFeaturedVideoForm: FeaturedVideoForm = {
  youtubeId: "",
  title: "",
  duration: "",
  description: "",
  isActive: true,
};
