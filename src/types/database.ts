// Hand-written types matching the supabase/migrations/*.sql files. If you
// change the schema, regenerate this with `supabase gen types typescript`
// (or the Supabase MCP `generate_typescript_types` tool) and reconcile.

export type Role = "owner" | "staff";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          role: Role;
          removed_at: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          role: Role;
          removed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          role?: Role;
          removed_at?: string | null;
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
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          label: string;
          price: number;
          stock_quantity: number;
          low_stock_threshold: number;
          archived_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          label: string;
          price?: number;
          stock_quantity?: number;
          low_stock_threshold?: number;
          archived_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          label?: string;
          price?: number;
          stock_quantity?: number;
          low_stock_threshold?: number;
          archived_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      sales: {
        Row: {
          id: string;
          product_id: string | null;
          variant_id: string | null;
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
          variant_id?: string | null;
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
          variant_id?: string | null;
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
            foreignKeyName: "sales_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
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
      app_settings: {
        Row: {
          id: true;
          paused_at: string | null;
          paused_by: string | null;
        };
        Insert: {
          id?: true;
          paused_at?: string | null;
          paused_by?: string | null;
        };
        Update: {
          id?: true;
          paused_at?: string | null;
          paused_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "app_settings_paused_by_fkey";
            columns: ["paused_by"];
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
          p_variant_id?: string | null;
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
          p_variant_id?: string | null;
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
      restock_variant: {
        Args: {
          p_variant_id: string;
          p_quantity_added: number;
          p_adjusted_by: string;
        };
        Returns: Database["public"]["Tables"]["product_variants"]["Row"];
      };
      remove_product: {
        // Smart removal: hard-deletes a product with no sales history,
        // otherwise archives it (sets archived_at), along with its variants.
        // Returns 'deleted' or 'archived'.
        Args: { p_product_id: string };
        Returns: string;
      };
      remove_variant: {
        // Smart removal, same rule as remove_product but for one variant.
        Args: { p_variant_id: string };
        Returns: string;
      };
      revoke_user_sessions: {
        // Service-role only. Drops a removed user's live sessions/refresh
        // tokens immediately, rather than waiting for their access token to
        // expire on its own.
        Args: { target_user: string };
        Returns: number;
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
export type ProductVariant =
  Database["public"]["Tables"]["product_variants"]["Row"];
export type Sale = Database["public"]["Tables"]["sales"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type StockAdjustment =
  Database["public"]["Tables"]["stock_adjustments"]["Row"];
export type AppSettings = Database["public"]["Tables"]["app_settings"]["Row"];

export interface SaleWithRelations extends Sale {
  product: Pick<Product, "id" | "name" | "category"> | null;
  variant: Pick<ProductVariant, "id" | "label"> | null;
  seller: Pick<Profile, "id" | "name"> | null;
}
