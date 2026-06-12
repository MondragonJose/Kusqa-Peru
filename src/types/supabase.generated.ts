/**
 * Supabase Database types — generated from SQL migrations.
 *
 * Regenerate with:
 *   npx supabase gen types typescript --project-id <PROJECT_ID> > src/types/supabase.generated.ts
 *
 * WARNING: This file matches the schema in supabase/migrations/.
 * If you alter a table, update this file — or regenerate it —
 * so that a column rename/deletion fails at `tsc` instead of at runtime.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          username: string;
          full_name: string | null;
          avatar_url: string | null;
          experience_points: number;
          level: number;
          bio: string | null;
          location: string | null;
          district: string | null;
          region: "costa" | "sierra" | "selva" | null;
          district_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          username: string;
          full_name?: string | null;
          avatar_url?: string | null;
          experience_points?: number;
          level?: number;
          bio?: string | null;
          location?: string | null;
          district?: string | null;
          region?: "costa" | "sierra" | "selva" | null;
          district_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_district_id_fkey";
            columns: ["district_id"];
            referencedRelation: "districts";
            referencedColumns: ["id"];
          },
        ];
      };
      missions: {
        Row: {
          id: string;
          title: string;
          description: string;
          district: string;
          category: string;
          latitude: number;
          longitude: number;
          organizer_id: string | null;
          start_date: string | null;
          end_date: string | null;
          current_progress: number | null;
          max_participants: number | null;
          xp_reward: number;
          difficulty: string | null;
          impact: string | null;
          district_id: string | null;
          source_proposal_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          district: string;
          category?: string;
          latitude: number;
          longitude: number;
          organizer_id?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          current_progress?: number | null;
          max_participants?: number | null;
          xp_reward?: number;
          difficulty?: string | null;
          impact?: string | null;
          district_id?: string | null;
          source_proposal_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["missions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "missions_district_id_fkey";
            columns: ["district_id"];
            referencedRelation: "districts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "missions_source_proposal_id_fkey";
            columns: ["source_proposal_id"];
            referencedRelation: "proposals";
            referencedColumns: ["id"];
          },
        ];
      };
      mission_participants: {
        Row: {
          id: string;
          user_id: string;
          mission_id: string;
          xp_earned: number | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          mission_id: string;
          xp_earned?: number | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["mission_participants"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "mission_participants_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mission_participants_mission_id_fkey";
            columns: ["mission_id"];
            referencedRelation: "missions";
            referencedColumns: ["id"];
          },
        ];
      };
      user_missions: {
        Row: {
          id: string;
          user_id: string;
          mission_id: string;
          status: "completed" | "in_progress";
          completed_at: string | null;
          xp_earned: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          mission_id: string;
          status: "completed" | "in_progress";
          completed_at?: string | null;
          xp_earned?: number | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_missions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "user_missions_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_missions_mission_id_fkey";
            columns: ["mission_id"];
            referencedRelation: "missions";
            referencedColumns: ["id"];
          },
        ];
      };
      user_progress: {
        Row: {
          user_id: string;
          total_missions_completed: number;
          community_points: number;
          last_activity_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          total_missions_completed?: number;
          community_points?: number;
          last_activity_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_progress"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "user_progress_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      proposals: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          category: string;
          district: string;
          region: "costa" | "sierra" | "selva";
          team_size: number;
          images: string[];
          status: "pending" | "active" | "resolved" | "rejected";
          latitude: number | null;
          longitude: number | null;
          proposed_date: string | null;
          summary: string | null;
          why: string | null;
          location_label: string | null;
          district_id: string | null;
          has_converted_mission_id: string | null;
          ready_at: string | null;
          converted_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          category: string;
          district: string;
          region: "costa" | "sierra" | "selva";
          team_size: number;
          images?: string[];
          status?: "pending" | "active" | "resolved" | "rejected";
          latitude?: number | null;
          longitude?: number | null;
          proposed_date?: string | null;
          summary?: string | null;
          why?: string | null;
          location_label?: string | null;
          district_id?: string | null;
          has_converted_mission_id?: string | null;
          ready_at?: string | null;
          converted_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["proposals"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "proposals_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "proposals_district_id_fkey";
            columns: ["district_id"];
            referencedRelation: "districts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "proposals_has_converted_mission_id_fkey";
            columns: ["has_converted_mission_id"];
            referencedRelation: "missions";
            referencedColumns: ["id"];
          },
        ];
      };
      proposal_supports: {
        Row: {
          id: string;
          user_id: string;
          proposal_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          proposal_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["proposal_supports"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "proposal_supports_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "proposal_supports_proposal_id_fkey";
            columns: ["proposal_id"];
            referencedRelation: "proposals";
            referencedColumns: ["id"];
          },
        ];
      };
      proposal_comments: {
        Row: {
          id: string;
          initiative_id: string;
          user_id: string;
          parent_comment_id: string | null;
          content: string;
          initiative_type: "proposal" | "mission";
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          initiative_id: string;
          user_id: string;
          parent_comment_id?: string | null;
          content: string;
          initiative_type?: "proposal" | "mission";
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["proposal_comments"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "proposal_comments_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      districts: {
        Row: {
          id: string;
          slug: string;
          display_name: string;
          region: "costa" | "sierra" | "selva";
          department: string | null;
          latitude: number | null;
          longitude: number | null;
          narrative: string | null;
          sort_order: number | null;
          boundary: Json | null;
          svg_x: number | null;
          svg_y: number | null;
          geometry: unknown | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          display_name: string;
          region: "costa" | "sierra" | "selva";
          department?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          narrative?: string | null;
          sort_order?: number | null;
          boundary?: Json | null;
          svg_x?: number | null;
          svg_y?: number | null;
          geometry?: unknown | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["districts"]["Insert"]>;
        Relationships: [];
      };
      initiatives: {
        Row: {
          id: string;
          kind: "proposal" | "mission";
          title: string;
          description: string | null;
          summary: string | null;
          why: string | null;
          location_label: string | null;
          category: string;
          district: string;
          district_id: string | null;
          region: "costa" | "sierra" | "selva";
          latitude: number | null;
          longitude: number | null;
          owner_id: string;
          organizer_id: string | null;
          team_size: number | null;
          images: string[];
          proposed_date: string | null;
          start_date: string | null;
          end_date: string | null;
          max_participants: number | null;
          xp_reward: number | null;
          current_progress: number | null;
          status: "forming" | "gathering" | "active" | "completed" | "dormant";
          ready_at: string | null;
          converted_at: string | null;
          completed_at: string | null;
          has_converted_initiative_id: string | null;
          source_initiative_id: string | null;
          legacy_proposal_status: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          kind: "proposal" | "mission";
          title: string;
          description?: string | null;
          summary?: string | null;
          why?: string | null;
          location_label?: string | null;
          category?: string;
          district: string;
          district_id?: string | null;
          region: "costa" | "sierra" | "selva";
          latitude?: number | null;
          longitude?: number | null;
          owner_id: string;
          organizer_id?: string | null;
          team_size?: number | null;
          images?: string[];
          proposed_date?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          max_participants?: number | null;
          xp_reward?: number | null;
          current_progress?: number | null;
          status?: "forming" | "gathering" | "active" | "completed" | "dormant";
          ready_at?: string | null;
          converted_at?: string | null;
          completed_at?: string | null;
          has_converted_initiative_id?: string | null;
          source_initiative_id?: string | null;
          legacy_proposal_status?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["initiatives"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "initiatives_owner_id_fkey";
            columns: ["owner_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "initiatives_district_id_fkey";
            columns: ["district_id"];
            referencedRelation: "districts";
            referencedColumns: ["id"];
          },
        ];
      };
      initiative_supports: {
        Row: {
          id: string;
          initiative_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          initiative_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["initiative_supports"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "initiative_supports_initiative_id_fkey";
            columns: ["initiative_id"];
            referencedRelation: "initiatives";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "initiative_supports_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      initiative_participants: {
        Row: {
          id: string;
          initiative_id: string;
          user_id: string;
          xp_earned: number | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          initiative_id: string;
          user_id: string;
          xp_earned?: number | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["initiative_participants"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "initiative_participants_initiative_id_fkey";
            columns: ["initiative_id"];
            referencedRelation: "initiatives";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "initiative_participants_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      initiative_comments: {
        Row: {
          id: string;
          initiative_id: string;
          initiative_type: "proposal" | "mission";
          user_id: string;
          parent_comment_id: string | null;
          content: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          initiative_id: string;
          initiative_type: "proposal" | "mission";
          user_id: string;
          parent_comment_id?: string | null;
          content: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["initiative_comments"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "initiative_comments_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      initiative_stewards: {
        Row: {
          id: string;
          initiative_id: string;
          user_id: string;
          role: "steward" | "co_steward" | "ally" | "supporter" | "participant";
          initiative_type: "proposal" | "mission";
          invited_by: string | null;
          status: "pending" | "accepted" | "declined";
          message: string | null;
          created_at: string;
          responded_at: string | null;
        };
        Insert: {
          id?: string;
          initiative_id: string;
          user_id: string;
          role?: "steward" | "co_steward" | "ally" | "supporter" | "participant";
          initiative_type?: "proposal" | "mission";
          invited_by?: string | null;
          status?: "pending" | "accepted" | "declined";
          message?: string | null;
          created_at?: string;
          responded_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["initiative_stewards"]["Insert"]>;
        Relationships: [];
      };
      mission_evidence: {
        Row: {
          id: string;
          mission_id: string;
          user_id: string;
          storage_path: string;
          mime_type: string;
          byte_size: number;
          width_px: number | null;
          height_px: number | null;
          caption: string | null;
          moderation_status: "pending" | "approved" | "rejected" | "flagged";
          evidence_type: "photo" | "text" | "checkpoint" | "mixed";
          description: string | null;
          media_urls: string[] | null;
          location_lat: number | null;
          location_lng: number | null;
          verified_by: string | null;
          verified_at: string | null;
          rejection_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mission_id: string;
          user_id: string;
          storage_path: string;
          mime_type: string;
          byte_size: number;
          width_px?: number | null;
          height_px?: number | null;
          caption?: string | null;
          moderation_status?: "pending" | "approved" | "rejected" | "flagged";
          evidence_type?: "photo" | "text" | "checkpoint" | "mixed";
          description?: string | null;
          media_urls?: string[] | null;
          location_lat?: number | null;
          location_lng?: number | null;
          verified_by?: string | null;
          verified_at?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["mission_evidence"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "mission_evidence_mission_id_fkey";
            columns: ["mission_id"];
            referencedRelation: "missions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mission_evidence_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      mission_events: {
        Row: {
          id: string;
          actor_id: string;
          mission_id: string | null;
          event_type: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id: string;
          mission_id?: string | null;
          event_type: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["mission_events"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "mission_events_actor_id_fkey";
            columns: ["actor_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      civic_events: {
        Row: {
          id: string;
          kind: string;
          actor_id: string | null;
          target_type: string;
          target_id: string;
          district_id: string | null;
          payload: Json;
          occurred_at: string;
          dedupe_key: string | null;
        };
        Insert: {
          id?: string;
          kind: string;
          actor_id?: string | null;
          target_type: string;
          target_id: string;
          district_id?: string | null;
          payload?: Json;
          occurred_at?: string;
          dedupe_key?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["civic_events"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "civic_events_district_id_fkey";
            columns: ["district_id"];
            referencedRelation: "districts";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          notification_type: string;
          title: string;
          body: string;
          payload: Json;
          dedupe_key: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          notification_type: string;
          title: string;
          body: string;
          payload?: Json;
          dedupe_key?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "user_notifications_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      moderation_reports: {
        Row: {
          id: string;
          reporter_id: string;
          target_type: string;
          target_id: string;
          reason_code: string;
          description: string | null;
          status: "pending" | "reviewing" | "resolved" | "dismissed";
          metadata: Json;
          created_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          target_type: string;
          target_id: string;
          reason_code: string;
          description?: string | null;
          status?: "pending" | "reviewing" | "resolved" | "dismissed";
          metadata?: Json;
          created_at?: string;
          resolved_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["moderation_reports"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "moderation_reports_reporter_id_fkey";
            columns: ["reporter_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      event_log: {
        Row: {
          id: string;
          type: string;
          actor_id: string;
          entity_id: string | null;
          mission_id: string | null;
          evidence_id: string | null;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: string;
          actor_id: string;
          entity_id?: string | null;
          mission_id?: string | null;
          evidence_id?: string | null;
          payload?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["event_log"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "event_log_actor_id_fkey";
            columns: ["actor_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      proposal_collaborators: {
        Row: {
          id: string;
          proposal_id: string;
          user_id: string;
          role: "co_author" | "ally";
          invited_by: string | null;
          status: "pending" | "accepted" | "declined";
          message: string | null;
          created_at: string;
          responded_at: string | null;
        };
        Insert: {
          id?: string;
          proposal_id: string;
          user_id: string;
          role?: "co_author" | "ally";
          invited_by?: string | null;
          status?: "pending" | "accepted" | "declined";
          message?: string | null;
          created_at?: string;
          responded_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["proposal_collaborators"]["Insert"]>;
        Relationships: [];
      };
      proposal_lifecycle_events: {
        Row: {
          id: string;
          proposal_id: string;
          event_type: string;
          actor_id: string | null;
          from_status: string | null;
          to_status: string | null;
          converted_mission_id: string | null;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          proposal_id: string;
          event_type: string;
          actor_id?: string | null;
          from_status?: string | null;
          to_status?: string | null;
          converted_mission_id?: string | null;
          payload?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["proposal_lifecycle_events"]["Insert"]>;
        Relationships: [];
      };
      region_metadata: {
        Row: {
          slug: string;
          display_name: string;
          svg_x: number;
          svg_y: number;
          description: string | null;
        };
        Insert: {
          slug: string;
          display_name: string;
          svg_x: number;
          svg_y: number;
          description?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["region_metadata"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      proposal_support_stats: {
        Row: {
          proposal_id: string | null;
          supporter_count: number | null;
          collaborator_count: number | null;
        };
      };
      initiative_stats: {
        Row: {
          initiative_id: string | null;
          support_count: number | null;
          participant_count: number | null;
          steward_count: number | null;
          accepted_steward_count: number | null;
        };
      };
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      civic_event_kind:
        | "proposal.created"
        | "proposal.supported"
        | "proposal.unsupported"
        | "proposal.comment_added"
        | "proposal.collaborator_joined"
        | "proposal.threshold_reached"
        | "proposal.converted_to_mission"
        | "proposal.reopened"
        | "mission.joined"
        | "mission.completed"
        | "mission.evidence_submitted"
        | "mission.evidence_verified"
        | "district.first_movement"
        | "community.trust_changed"
        | "community.profile_milestone";
      initiative_status: "forming" | "gathering" | "active" | "completed" | "dormant";
      initiative_kind: "proposal" | "mission";
      initiative_role: "steward" | "co_steward" | "ally" | "supporter" | "participant";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

