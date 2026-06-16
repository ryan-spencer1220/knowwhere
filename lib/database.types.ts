// Hand-maintained to match supabase/migrations/0001_init.sql.
// Once you have the Supabase CLI linked you can regenerate this with:
//   npx supabase gen types typescript --linked > lib/database.types.ts

type Timestamp = string;

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          display_name: string | null;
          bio: string | null;
          city: string | null;
          avatar_url: string | null;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id: string;
          username?: string | null;
          display_name?: string | null;
          bio?: string | null;
          city?: string | null;
          avatar_url?: string | null;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      lists: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          description: string | null;
          city: string | null;
          location: string | null;
          cover_image_url: string | null;
          is_public: boolean;
          saves_count: number;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          description?: string | null;
          city?: string | null;
          location?: string | null;
          cover_image_url?: string | null;
          is_public?: boolean;
          saves_count?: number;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["lists"]["Insert"]>;
        Relationships: [];
      };
      list_places: {
        Row: {
          id: string;
          list_id: string;
          google_place_id: string | null;
          name: string;
          address: string | null;
          latitude: number | null;
          longitude: number | null;
          note: string | null;
          position: number;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          list_id: string;
          google_place_id?: string | null;
          name: string;
          address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          note?: string | null;
          position?: number;
          created_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["list_places"]["Insert"]>;
        Relationships: [];
      };
      follows: {
        Row: {
          follower_id: string;
          following_id: string;
          created_at: Timestamp;
        };
        Insert: {
          follower_id: string;
          following_id: string;
          created_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["follows"]["Insert"]>;
        Relationships: [];
      };
      list_saves: {
        Row: {
          user_id: string;
          list_id: string;
          created_at: Timestamp;
        };
        Insert: {
          user_id: string;
          list_id: string;
          created_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["list_saves"]["Insert"]>;
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          target_type: string;
          target_id: string;
          reason: string;
          details: string | null;
          status: string;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          target_type: string;
          target_id: string;
          reason: string;
          details?: string | null;
          status?: string;
          created_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["reports"]["Insert"]>;
        Relationships: [];
      };
      blocks: {
        Row: {
          blocker_id: string;
          blocked_id: string;
          created_at: Timestamp;
        };
        Insert: {
          blocker_id: string;
          blocked_id: string;
          created_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["blocks"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      lists_with_counts: {
        Row: Database["public"]["Tables"]["lists"]["Row"] & {
          places_count: number;
          saves_count: number;
        };
        Relationships: [];
      };
    };
    Functions: Record<never, never>;
    Enums: Record<never, never>;
  };
};

// Convenience aliases for app code.
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type List = Database["public"]["Tables"]["lists"]["Row"];
export type ListPlace = Database["public"]["Tables"]["list_places"]["Row"];
export type ListWithCounts = Database["public"]["Views"]["lists_with_counts"]["Row"];
