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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      auditoria_registros: {
        Row: {
          alterado_por_profile_id: string
          campo_alterado: string | null
          created_at: string
          id: string
          motivo: string | null
          registro_id: string
          status_anterior: Database["public"]["Enums"]["registro_status"] | null
          status_novo: Database["public"]["Enums"]["registro_status"] | null
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          alterado_por_profile_id: string
          campo_alterado?: string | null
          created_at?: string
          id?: string
          motivo?: string | null
          registro_id: string
          status_anterior?:
            | Database["public"]["Enums"]["registro_status"]
            | null
          status_novo?: Database["public"]["Enums"]["registro_status"] | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          alterado_por_profile_id?: string
          campo_alterado?: string | null
          created_at?: string
          id?: string
          motivo?: string | null
          registro_id?: string
          status_anterior?:
            | Database["public"]["Enums"]["registro_status"]
            | null
          status_novo?: Database["public"]["Enums"]["registro_status"] | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auditoria_registros_alterado_por_profile_id_fkey"
            columns: ["alterado_por_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditoria_registros_registro_id_fkey"
            columns: ["registro_id"]
            isOneToOne: false
            referencedRelation: "registros"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          created_at: string
          id: string
          nome: string
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: []
      }
      motorista_veiculos: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          motorista_id: string
          veiculo_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          motorista_id: string
          veiculo_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          motorista_id?: string
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "motorista_veiculos_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "motorista_veiculos_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      motoristas: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          matricula: string | null
          nome_exibicao: string
          posto_principal_id: string | null
          profile_id: string
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          id?: string
          matricula?: string | null
          nome_exibicao: string
          posto_principal_id?: string | null
          profile_id: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          id?: string
          matricula?: string | null
          nome_exibicao?: string
          posto_principal_id?: string | null
          profile_id?: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "motoristas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "motoristas_posto_principal_id_fkey"
            columns: ["posto_principal_id"]
            isOneToOne: false
            referencedRelation: "postos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "motoristas_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      postos: {
        Row: {
          created_at: string
          empresa_id: string
          endereco: string | null
          id: string
          nome: string
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          endereco?: string | null
          id?: string
          nome: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          endereco?: string | null
          id?: string
          nome?: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "postos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          nome: string
          status: Database["public"]["Enums"]["entity_status"]
          telefone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          nome?: string
          status?: Database["public"]["Enums"]["entity_status"]
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          nome?: string
          status?: Database["public"]["Enums"]["entity_status"]
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      registros: {
        Row: {
          created_at: string
          data_referencia: string
          empresa_id: string
          entrada_at: string
          foto_path: string | null
          id: string
          km_rodados: number
          km_saida: number
          km_volta: number
          motorista_id: string
          observacao: string | null
          posto_id: string
          profile_id: string
          saida_at: string
          status: Database["public"]["Enums"]["registro_status"]
          updated_at: string
          veiculo_id: string
        }
        Insert: {
          created_at?: string
          data_referencia: string
          empresa_id: string
          entrada_at: string
          foto_path?: string | null
          id?: string
          km_rodados?: number
          km_saida: number
          km_volta: number
          motorista_id: string
          observacao?: string | null
          posto_id: string
          profile_id: string
          saida_at: string
          status?: Database["public"]["Enums"]["registro_status"]
          updated_at?: string
          veiculo_id: string
        }
        Update: {
          created_at?: string
          data_referencia?: string
          empresa_id?: string
          entrada_at?: string
          foto_path?: string | null
          id?: string
          km_rodados?: number
          km_saida?: number
          km_volta?: number
          motorista_id?: string
          observacao?: string | null
          posto_id?: string
          profile_id?: string
          saida_at?: string
          status?: Database["public"]["Enums"]["registro_status"]
          updated_at?: string
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registros_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "postos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      veiculos: {
        Row: {
          created_at: string
          descricao: string | null
          empresa_id: string
          id: string
          placa: string
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          empresa_id: string
          id?: string
          placa: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          empresa_id?: string
          id?: string
          placa?: string
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "veiculos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "motorista"
      entity_status: "ativo" | "inativo"
      registro_status:
        | "pendente"
        | "revisado"
        | "aprovado"
        | "corrigido"
        | "cancelado"
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
      app_role: ["admin", "motorista"],
      entity_status: ["ativo", "inativo"],
      registro_status: [
        "pendente",
        "revisado",
        "aprovado",
        "corrigido",
        "cancelado",
      ],
    },
  },
} as const
