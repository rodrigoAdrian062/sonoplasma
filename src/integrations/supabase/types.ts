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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      sonoplastia_configuracoes: {
        Row: {
          cor_tema: string | null
          created_at: string
          id: string
          logo_url: string | null
          nome_app: string
          subtitulo_app: string | null
          updated_at: string
        }
        Insert: {
          cor_tema?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          nome_app?: string
          subtitulo_app?: string | null
          updated_at?: string
        }
        Update: {
          cor_tema?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          nome_app?: string
          subtitulo_app?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sonoplastia_etapa_audios: {
        Row: {
          audio_url: string
          created_at: string
          etapa_id: string
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          audio_url: string
          created_at?: string
          etapa_id: string
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          audio_url?: string
          created_at?: string
          etapa_id?: string
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sonoplastia_etapa_audios_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "sonoplastia_etapas"
            referencedColumns: ["id"]
          },
        ]
      }
      sonoplastia_etapas: {
        Row: {
          ativo: boolean
          audio_url: string | null
          created_at: string
          descricao: string | null
          icone: string | null
          icone_url: string | null
          id: string
          nome_simbolico: string
          ordem: number
          secao_id: string | null
          tempo_padrao: number | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          audio_url?: string | null
          created_at?: string
          descricao?: string | null
          icone?: string | null
          icone_url?: string | null
          id?: string
          nome_simbolico: string
          ordem?: number
          secao_id?: string | null
          tempo_padrao?: number | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          audio_url?: string | null
          created_at?: string
          descricao?: string | null
          icone?: string | null
          icone_url?: string | null
          id?: string
          nome_simbolico?: string
          ordem?: number
          secao_id?: string | null
          tempo_padrao?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sonoplastia_etapas_secao_id_fkey"
            columns: ["secao_id"]
            isOneToOne: false
            referencedRelation: "sonoplastia_secoes"
            referencedColumns: ["id"]
          },
        ]
      }
      sonoplastia_execucoes: {
        Row: {
          created_at: string
          etapa_id: string | null
          fim: string | null
          id: string
          inicio: string | null
          status: string | null
          tempo_executado: number | null
        }
        Insert: {
          created_at?: string
          etapa_id?: string | null
          fim?: string | null
          id?: string
          inicio?: string | null
          status?: string | null
          tempo_executado?: number | null
        }
        Update: {
          created_at?: string
          etapa_id?: string | null
          fim?: string | null
          id?: string
          inicio?: string | null
          status?: string | null
          tempo_executado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sonoplastia_execucoes_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "sonoplastia_etapas"
            referencedColumns: ["id"]
          },
        ]
      }
      sonoplastia_secoes: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          icone: string | null
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          icone?: string | null
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          icone?: string | null
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
