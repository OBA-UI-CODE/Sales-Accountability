// Hand-written types matching supabase/migrations/0001_init.sql and
// 0002_sale_functions.sql. Once the Supabase project is live, regenerate
// this file with `supabase gen types typescript` (or the Supabase MCP
// `generate_typescript_types` tool) and it should match closely.

export type Role = "owner" | "staff";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          role: Role;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          role: Role;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          role?: Role;
          created_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          name: string;
          category: string;
          default_price: number;
          stock_quantity: number;
          low_stock_threshold: number;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category?: string;
          default_price?: number;
          stock_quantity?: number;
          low_stock_threshold?: number;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category?: string;
          default_price?: number;
          stock_quantity?: number;
          low_stock_threshold?: number;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sales: {
        Row: {
          id: string;
          product_id: string | null;
          custom_item_name: string | null;
          unit_price: number;
          quantity: number;
          total_price: number;
          amount_paid: number;
          debtor_name: string | null;
          sold_by: string;
          sold_at: string;
          edited_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id?: string | null;
          custom_item_name?: string | null;
          unit_price: number;
          quantity?: number;
          amount_paid?: number;
          debtor_name?: string | null;
          sold_by: string;
          sold_at?: string;
          edited_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string | null;
          custom_item_name?: string | null;
          unit_price?: number;
          quantity?: number;
          amount_paid?: number;
          debtor_name?: string | null;
          sold_by?: string;
          sold_at?: string;
          edited_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sales_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_sold_by_fkey";
            columns: ["sold_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_adjustments: {
        Row: {
          id: string;
          product_id: string;
          quantity_added: number;
          adjusted_by: string;
          adjusted_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          quantity_added: number;
          adjusted_by: string;
          adjusted_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          quantity_added?: number;
          adjusted_by?: string;
          adjusted_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_adjustments_adjusted_by_fkey";
            columns: ["adjusted_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_sale: {
        Args: {
          p_product_id: string | null;
          p_custom_item_name: string | null;
          p_unit_price: number;
          p_quantity: number;
          p_sold_by: string;
          p_amount_paid?: number | null;
          p_debtor_name?: string | null;
        };
        Returns: Database["public"]["Tables"]["sales"]["Row"];
      };
      update_sale: {
        Args: {
          p_sale_id: string;
          p_product_id: string | null;
          p_custom_item_name: string | null;
          p_unit_price: number;
          p_quantity: number;
          p_amount_paid?: number | null;
          p_debtor_name?: string | null;
        };
        Returns: Database["public"]["Tables"]["sales"]["Row"];
      };
      delete_sale: {
        Args: { p_sale_id: string };
        Returns: void;
      };
      record_payment: {
        // Pay down a debt. Pass p_pay_full = true to settle the whole
        // outstanding balance, or p_amount to add a partial payment.
        Args: {
          p_sale_id: string;
          p_amount?: number | null;
          p_pay_full?: boolean;
        };
        Returns: Database["public"]["Tables"]["sales"]["Row"];
      };
      restock_product: {
        Args: {
          p_product_id: string;
          p_quantity_added: number;
          p_adjusted_by: string;
        };
        Returns: Database["public"]["Tables"]["products"]["Row"];
      };
      remove_product: {
        // Smart removal: hard-deletes a product with no sales history,
        // otherwise archives it (sets archived_at). Returns 'deleted' or
        // 'archived'.
        Args: { p_product_id: string };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Product = Database["public"]["Tables"]["products"]["Row"];
export type Sale = Database["public"]["Tables"]["sales"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type StockAdjustment =
  Database["public"]["Tables"]["stock_adjustments"]["Row"];

export interface SaleWithRelations extends Sale {
  product: Pick<Product, "id" | "name" | "category"> | null;
  seller: Pick<Profile, "id" | "name"> | null;
}
