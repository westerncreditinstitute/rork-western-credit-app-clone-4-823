import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn('[Supabase] Missing configuration - URL or Anon Key not set. Using demo mode.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

export type Database = {
  public: {
    Tables: {
      videos: {
        Row: {
          id: string;
          course_id: string;
          section_id: string;
          title: string;
          url: string;
          embed_code: string;
          bunny_video_id: string;
          bunny_library_id: string;
          cloudflare_video_id: string;
          cloudflare_account_id: string;
          duration: string;
          description: string;
          order_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['videos']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['videos']['Insert']>;
      };
      courses: {
        Row: {
          id: string;
          title: string;
          description: string;
          thumbnail: string;
          instructor: string;
          duration: string;
          lessons_count: number;
          level: string;
          category: string;
          is_premium: boolean;
          price: number;
          order_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['courses']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['courses']['Insert']>;
      };
      sections: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          description: string;
          order_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['sections']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['sections']['Insert']>;
      };
      disputes: {
        Row: {
          id: string;
          user_id: string;
          creditor_name: string;
          account_number: string;
          dispute_reason: string;
          status: string;
          bureau: string;
          amount: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['disputes']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['disputes']['Insert']>;
      };
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          avatar_url: string;
          subscription_tier: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      video_progress: {
        Row: {
          id: string;
          user_id: string;
          video_id: string;
          progress: number;
          completed: boolean;
          last_position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['video_progress']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['video_progress']['Insert']>;
      };
    };
  };
};
