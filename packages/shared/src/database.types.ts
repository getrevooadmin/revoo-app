export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      businesses: {
        Row: {
          created_at: string
          currency_symbol: string
          id: string
          logo_url: string | null
          name: string
        }
        Insert: {
          created_at?: string
          currency_symbol?: string
          id?: string
          logo_url?: string | null
          name: string
        }
        Update: {
          created_at?: string
          currency_symbol?: string
          id?: string
          logo_url?: string | null
          name?: string
        }
        Relationships: []
      }
      interactions: {
        Row: {
          ai_category: string | null
          ai_sentiment: string | null
          ai_spam_confidence: boolean
          business_id: string
          campaign_id: string | null
          created_at: string
          customer_phone: string
          feedback_promo_applied: boolean | null
          feedback_text: string
          id: string
          invoice_number: string | null
          item_promo_name: string | null
          multiplier: number | null
          points_earned: number
          promo_amount: number | null
          status: string
        }
        Insert: {
          ai_category?: string | null
          ai_sentiment?: string | null
          ai_spam_confidence?: boolean
          business_id: string
          campaign_id?: string | null
          created_at?: string
          customer_phone: string
          feedback_promo_applied?: boolean | null
          feedback_text: string
          id?: string
          invoice_number?: string | null
          item_promo_name?: string | null
          multiplier?: number | null
          points_earned?: number
          promo_amount?: number | null
          status: string
        }
        Update: {
          ai_category?: string | null
          ai_sentiment?: string | null
          ai_spam_confidence?: boolean
          business_id?: string
          campaign_id?: string | null
          created_at?: string
          customer_phone?: string
          feedback_promo_applied?: boolean | null
          feedback_text?: string
          id?: string
          invoice_number?: string | null
          item_promo_name?: string | null
          multiplier?: number | null
          points_earned?: number
          promo_amount?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "loyalty_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_campaigns: {
        Row: {
          business_id: string
          created_at: string
          description: string
          end_date: string
          feedback_multiplier: number | null
          feedback_promo_enabled: boolean | null
          grace_period_announcement: string | null
          grace_period_end_date: string | null
          id: string
          multipliers: Json | null
          points_per_value_unit: number
          prize_description: string
          start_date: string
          status: string
          target_points: number
          tiers: Json | null
          title: string
          unredeemed_points_policy: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          description?: string
          end_date: string
          feedback_multiplier?: number | null
          feedback_promo_enabled?: boolean | null
          grace_period_announcement?: string | null
          grace_period_end_date?: string | null
          id?: string
          multipliers?: Json | null
          points_per_value_unit?: number
          prize_description: string
          start_date: string
          status?: string
          target_points: number
          tiers?: Json | null
          title?: string
          unredeemed_points_policy?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string
          end_date?: string
          feedback_multiplier?: number | null
          feedback_promo_enabled?: boolean | null
          grace_period_announcement?: string | null
          grace_period_end_date?: string | null
          id?: string
          multipliers?: Json | null
          points_per_value_unit?: number
          prize_description?: string
          start_date?: string
          status?: string
          target_points?: number
          tiers?: Json | null
          title?: string
          unredeemed_points_policy?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_campaigns_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      one_time_codes: {
        Row: {
          associated_at: string | null
          business_id: string
          campaign_id: string | null
          code: string
          created_at: string
          customer_phone: string | null
          invoice_number: string | null
          is_active: boolean
          is_associated: boolean
          is_redeemed: boolean
          item_promo_name: string | null
          multiplier: number | null
          promo_amount: number | null
          purchase_amount: number
          redeemed_at: string | null
          updated_at: string
        }
        Insert: {
          associated_at?: string | null
          business_id: string
          campaign_id?: string | null
          code: string
          created_at?: string
          customer_phone?: string | null
          invoice_number?: string | null
          is_active?: boolean
          is_associated?: boolean
          is_redeemed?: boolean
          item_promo_name?: string | null
          multiplier?: number | null
          promo_amount?: number | null
          purchase_amount?: number
          redeemed_at?: string | null
          updated_at?: string
        }
        Update: {
          associated_at?: string | null
          business_id?: string
          campaign_id?: string | null
          code?: string
          created_at?: string
          customer_phone?: string | null
          invoice_number?: string | null
          is_active?: boolean
          is_associated?: boolean
          is_redeemed?: boolean
          item_promo_name?: string | null
          multiplier?: number | null
          promo_amount?: number | null
          purchase_amount?: number
          redeemed_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "one_time_codes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "one_time_codes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "loyalty_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      profile_roles: {
        Row: {
          created_at: string
          profile_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          profile_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          profile_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_roles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          alias: string | null
          business_id: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          username: string | null
        }
        Insert: {
          alias?: string | null
          business_id?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          username?: string | null
        }
        Update: {
          alias?: string | null
          business_id?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_auth_user_business_id: { Args: never; Returns: string }
    }
    Enums: {
      user_role: "merchant" | "consumer" | "admin"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      user_role: ["merchant", "consumer", "admin"],
    },
  },
} as const

