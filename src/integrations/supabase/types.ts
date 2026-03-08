export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          address: string | null
          client_type: Database["public"]["Enums"]["client_type"]
          created_at: string | null
          email: string | null
          entity_id: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          client_type?: Database["public"]["Enums"]["client_type"]
          created_at?: string | null
          email?: string | null
          entity_id: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          client_type?: Database["public"]["Enums"]["client_type"]
          created_at?: string | null
          email?: string | null
          entity_id?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          entity_id: string
          event_id: string
          id: string
          is_internal: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          entity_id: string
          event_id: string
          id?: string
          is_internal?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          entity_id?: string
          event_id?: string
          id?: string
          is_internal?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      decoration_items: {
        Row: {
          created_at: string | null
          description: string | null
          entity_id: string
          event_id: string
          id: string
          name: string
          notes: string | null
          quantity: number | null
          status: Database["public"]["Enums"]["decoration_status"] | null
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          entity_id: string
          event_id: string
          id?: string
          name: string
          notes?: string | null
          quantity?: number | null
          status?: Database["public"]["Enums"]["decoration_status"] | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          entity_id?: string
          event_id?: string
          id?: string
          name?: string
          notes?: string | null
          quantity?: number | null
          status?: Database["public"]["Enums"]["decoration_status"] | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "decoration_items_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decoration_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      entities: {
        Row: {
          accent_color: string | null
          address: string | null
          cnpj: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          is_super_admin: boolean | null
          logo_url: string | null
          name: string
          phone: string | null
          primary_color: string | null
          secondary_color: string | null
          settings: Json | null
          sidebar_color: string | null
          slug: string
          theme: string | null
          updated_at: string | null
        }
        Insert: {
          accent_color?: string | null
          address?: string | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_super_admin?: boolean | null
          logo_url?: string | null
          name: string
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          settings?: Json | null
          sidebar_color?: string | null
          slug: string
          theme?: string | null
          updated_at?: string | null
        }
        Update: {
          accent_color?: string | null
          address?: string | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_super_admin?: boolean | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          settings?: Json | null
          sidebar_color?: string | null
          slug?: string
          theme?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      event_updates: {
        Row: {
          action: string
          created_at: string | null
          description: string | null
          entity_id: string
          event_id: string
          id: string
          new_value: Json | null
          old_value: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          description?: string | null
          entity_id: string
          event_id: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          description?: string | null
          entity_id?: string
          event_id?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_updates_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_updates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address: string | null
          budget: number | null
          client_email: string | null
          client_id: string | null
          client_name: string | null
          client_phone: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          entity_id: string
          event_date: string
          event_time: string | null
          id: string
          location: string | null
          name: string
          notes: string | null
          status: Database["public"]["Enums"]["event_status"] | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          budget?: number | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          entity_id: string
          event_date: string
          event_time?: string | null
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          status?: Database["public"]["Enums"]["event_status"] | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          budget?: number | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          entity_id?: string
          event_date?: string
          event_time?: string | null
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["event_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          entity_id: string
          full_name: string
          id: string
          is_active: boolean | null
          phone: string | null
          position: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          entity_id: string
          full_name: string
          id: string
          is_active?: boolean | null
          phone?: string | null
          position?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          entity_id?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          position?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          entity_id: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      belongs_to_entity: {
        Args: { _entity_id: string; _user_id: string }
        Returns: boolean
      }
      create_super_admin: { Args: { _user_id: string }; Returns: undefined }
      get_user_entity_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "entity_admin"
        | "manager"
        | "user"
        | "decorator"
        | "employee"
        | "driver"
      client_type: "standard" | "vip" | "premium"
      decoration_status:
        | "pending"
        | "in_transit"
        | "delivered"
        | "installed"
        | "returned"
      event_status:
        | "planning"
        | "in_progress"
        | "assembly"
        | "completed"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "super_admin",
        "entity_admin",
        "manager",
        "user",
        "decorator",
        "employee",
        "driver",
      ],
      client_type: ["standard", "vip", "premium"],
      decoration_status: [
        "pending",
        "in_transit",
        "delivered",
        "installed",
        "returned",
      ],
      event_status: [
        "planning",
        "in_progress",
        "assembly",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
