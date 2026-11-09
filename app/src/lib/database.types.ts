// Generado con Supabase (generate_typescript_types). No editar a mano.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  __InternalSupabase: { PostgrestVersion: '14.15' }
  public: {
    Tables: {
      categorias: {
        Row: { created_at: string | null; id: number; nombre: string; user_id: string }
        Insert: { created_at?: string | null; id?: number; nombre: string; user_id?: string }
        Update: { created_at?: string | null; id?: number; nombre?: string; user_id?: string }
        Relationships: []
      }
      configuracion_calculadora: {
        Row: { configuracion: Json; id: number; updated_at: string | null; user_id: string }
        Insert: { configuracion: Json; id?: number; updated_at?: string | null; user_id?: string }
        Update: { configuracion?: Json; id?: number; updated_at?: string | null; user_id?: string }
        Relationships: []
      }
      filamentos: {
        Row: { color: string | null; created_at: string | null; fecha: string | null; id: number; kg: number; marca: string | null; precio: number; user_id: string }
        Insert: { color?: string | null; created_at?: string | null; fecha?: string | null; id?: number; kg: number; marca?: string | null; precio: number; user_id?: string }
        Update: { color?: string | null; created_at?: string | null; fecha?: string | null; id?: number; kg?: number; marca?: string | null; precio?: number; user_id?: string }
        Relationships: []
      }
      gastos: {
        Row: { cantidad: number | null; categoria: string | null; colores: string | null; concepto: string; created_at: string | null; descripcion: string | null; fecha: string; id: number; kilos: number | null; marca: string | null; monto: number; precio_por_kg: number | null; tipo: string | null; unidad: string | null; user_id: string }
        Insert: { cantidad?: number | null; categoria?: string | null; colores?: string | null; concepto: string; created_at?: string | null; descripcion?: string | null; fecha?: string; id?: number; kilos?: number | null; marca?: string | null; monto: number; precio_por_kg?: number | null; tipo?: string | null; unidad?: string | null; user_id?: string }
        Update: { cantidad?: number | null; categoria?: string | null; colores?: string | null; concepto?: string; created_at?: string | null; descripcion?: string | null; fecha?: string; id?: number; kilos?: number | null; marca?: string | null; monto?: number; precio_por_kg?: number | null; tipo?: string | null; unidad?: string | null; user_id?: string }
        Relationships: []
      }
      pedido_items: {
        Row: { cantidad: number; created_at: string; descripcion: string; gramos: number | null; horas: number | null; id: number; pedido_id: number; precio_unitario: number; producto_id: number | null; subtotal: number | null; user_id: string }
        Insert: { cantidad?: number; created_at?: string; descripcion: string; gramos?: number | null; horas?: number | null; id?: never; pedido_id: number; precio_unitario?: number; producto_id?: number | null; subtotal?: number | null; user_id?: string }
        Update: { cantidad?: number; created_at?: string; descripcion?: string; gramos?: number | null; horas?: number | null; id?: never; pedido_id?: number; precio_unitario?: number; producto_id?: number | null; subtotal?: number | null; user_id?: string }
        Relationships: [
          { foreignKeyName: 'pedido_items_pedido_id_fkey'; columns: ['pedido_id']; isOneToOne: false; referencedRelation: 'pedidos'; referencedColumns: ['id'] },
          { foreignKeyName: 'pedido_items_producto_id_fkey'; columns: ['producto_id']; isOneToOne: false; referencedRelation: 'productos'; referencedColumns: ['id'] },
        ]
      }
      pedidos: {
        Row: { cantidad: number | null; cliente: string; descripcion: string | null; estado: string; fecha: string | null; id: number; precio_final: number | null; precio_unitario: number | null; producto: string | null; sena_monto: number | null; sena_pagada: boolean | null; user_id: string }
        Insert: { cantidad?: number | null; cliente: string; descripcion?: string | null; estado?: string; fecha?: string | null; id?: number; precio_final?: number | null; precio_unitario?: number | null; producto?: string | null; sena_monto?: number | null; sena_pagada?: boolean | null; user_id?: string }
        Update: { cantidad?: number | null; cliente?: string; descripcion?: string | null; estado?: string; fecha?: string | null; id?: number; precio_final?: number | null; precio_unitario?: number | null; producto?: string | null; sena_monto?: number | null; sena_pagada?: boolean | null; user_id?: string }
        Relationships: []
      }
      productos: {
        Row: { categoria: string | null; categoria_id: number | null; created_at: string | null; descripcion: string | null; gramos: number | null; id: number; nombre: string; precio_base: number | null; tiempo_horas: number | null; user_id: string }
        Insert: { categoria?: string | null; categoria_id?: number | null; created_at?: string | null; descripcion?: string | null; gramos?: number | null; id?: never; nombre: string; precio_base?: number | null; tiempo_horas?: number | null; user_id?: string }
        Update: { categoria?: string | null; categoria_id?: number | null; created_at?: string | null; descripcion?: string | null; gramos?: number | null; id?: never; nombre?: string; precio_base?: number | null; tiempo_horas?: number | null; user_id?: string }
        Relationships: [
          { foreignKeyName: 'productos_categoria_id_fkey'; columns: ['categoria_id']; isOneToOne: false; referencedRelation: 'categorias'; referencedColumns: ['id'] },
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      guardar_pedido: { Args: { p_id: number; p_items: Json; p_pedido: Json }; Returns: number }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
