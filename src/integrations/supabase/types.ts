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
      app_settings: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      attribute_values: {
        Row: {
          attribute_id: string
          created_at: string
          id: string
          is_active: boolean
          sort_order: number
          value: string
        }
        Insert: {
          attribute_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          value: string
        }
        Update: {
          attribute_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "attribute_values_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
        ]
      }
      attributes: {
        Row: {
          category_id: string | null
          created_at: string
          id: string
          is_active: boolean
          key: string
          name: string
          sort_order: number
          type: Database["public"]["Enums"]["attribute_type"]
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          key: string
          name: string
          sort_order?: number
          type?: Database["public"]["Enums"]["attribute_type"]
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string
          name?: string
          sort_order?: number
          type?: Database["public"]["Enums"]["attribute_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attributes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_products: {
        Row: {
          catalog_id: string
          created_at: string
          id: string
          product_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          catalog_id: string
          created_at?: string
          id?: string
          product_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          catalog_id?: string
          created_at?: string
          id?: string
          product_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      catalogs: {
        Row: {
          contact_email: string
          cover_image_url: string | null
          created_at: string
          id: string
          is_public: boolean
          logo_url: string | null
          name: string
          owner_user_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          contact_email: string
          cover_image_url?: string | null
          created_at?: string
          id?: string
          is_public?: boolean
          logo_url?: string | null
          name: string
          owner_user_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          contact_email?: string
          cover_image_url?: string | null
          created_at?: string
          id?: string
          is_public?: boolean
          logo_url?: string | null
          name?: string
          owner_user_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          parent_category_id: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_category_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_category_id?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_region_shipping_overrides: {
        Row: {
          created_at: string
          estimated_delivery_text: string | null
          id: string
          production_time_text: string | null
          region_id: string
          shipping_method_additional_item_text: string | null
          shipping_method_cost_from_text: string | null
          shipping_method_name: string | null
          shipping_method_time_text: string | null
          shipping_time_text: string | null
          shipping_tip: string | null
          total_fulfillment_time_text: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          estimated_delivery_text?: string | null
          id?: string
          production_time_text?: string | null
          region_id: string
          shipping_method_additional_item_text?: string | null
          shipping_method_cost_from_text?: string | null
          shipping_method_name?: string | null
          shipping_method_time_text?: string | null
          shipping_time_text?: string | null
          shipping_tip?: string | null
          total_fulfillment_time_text?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          estimated_delivery_text?: string | null
          id?: string
          production_time_text?: string | null
          region_id?: string
          shipping_method_additional_item_text?: string | null
          shipping_method_cost_from_text?: string | null
          shipping_method_name?: string | null
          shipping_method_time_text?: string | null
          shipping_time_text?: string | null
          shipping_tip?: string | null
          total_fulfillment_time_text?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_region_shipping_overrides_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: true
            referencedRelation: "delivery_regions"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_regions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      design_templates: {
        Row: {
          category: string | null
          created_at: string
          id: string
          image_url: string
          is_active: boolean | null
          name: string
          thumbnail_url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          image_url: string
          is_active?: boolean | null
          name: string
          thumbnail_url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          image_url?: string
          is_active?: boolean | null
          name?: string
          thumbnail_url?: string | null
        }
        Relationships: []
      }
      import_files: {
        Row: {
          created_at: string
          id: string
          logical_name: string
          original_name: string | null
          storage_path: string
          table_name: string
          uploaded_by: string | null
          variant: string
        }
        Insert: {
          created_at?: string
          id?: string
          logical_name: string
          original_name?: string | null
          storage_path: string
          table_name: string
          uploaded_by?: string | null
          variant?: string
        }
        Update: {
          created_at?: string
          id?: string
          logical_name?: string
          original_name?: string | null
          storage_path?: string
          table_name?: string
          uploaded_by?: string | null
          variant?: string
        }
        Relationships: []
      }
      quote_requests: {
        Row: {
          id: string
          created_at: string
          company_name: string | null
          contact_name: string | null
          email: string
          phone: string | null
          address: string | null
          notes: string | null
          items: Json
        }
        Insert: {
          id?: string
          created_at?: string
          company_name?: string | null
          contact_name?: string | null
          email: string
          phone?: string | null
          address?: string | null
          notes?: string | null
          items?: Json
        }
        Update: {
          id?: string
          created_at?: string
          company_name?: string | null
          contact_name?: string | null
          email?: string
          phone?: string | null
          address?: string | null
          notes?: string | null
          items?: Json
        }
        Relationships: []
      }
      product_attributes: {
        Row: {
          created_at: string
          data: Json
          id: string
          product_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          product_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_attributes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_color_variants: {
        Row: {
          color_id: string
          created_at: string
          id: string
          product_id: string
        }
        Insert: {
          color_id: string
          created_at?: string
          id?: string
          product_id: string
        }
        Update: {
          color_id?: string
          created_at?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_color_variants_color_id_fkey"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "product_colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_color_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_colors: {
        Row: {
          created_at: string
          hex_code: string
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          hex_code: string
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          hex_code?: string
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      product_details: {
        Row: {
          content: string
          content_type: string
          created_at: string
          id: string
          product_id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          content_type?: string
          created_at?: string
          id?: string
          product_id: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          content_type?: string
          created_at?: string
          id?: string
          product_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_details_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_gallery_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          product_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          product_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_gallery_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_mockups: {
        Row: {
          back_image_url: string | null
          created_at: string
          export_resolution: number | null
          front_image_url: string | null
          id: string
          print_area_height: number | null
          print_area_width: number | null
          print_area_x: number | null
          print_area_y: number | null
          product_id: string
          side_image_url: string | null
          updated_at: string
        }
        Insert: {
          back_image_url?: string | null
          created_at?: string
          export_resolution?: number | null
          front_image_url?: string | null
          id?: string
          print_area_height?: number | null
          print_area_width?: number | null
          print_area_x?: number | null
          print_area_y?: number | null
          product_id: string
          side_image_url?: string | null
          updated_at?: string
        }
        Update: {
          back_image_url?: string | null
          created_at?: string
          export_resolution?: number | null
          front_image_url?: string | null
          id?: string
          print_area_height?: number | null
          print_area_width?: number | null
          print_area_x?: number | null
          print_area_y?: number | null
          product_id?: string
          side_image_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_mockups_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_page_block_orders: {
        Row: {
          block_order: string[]
          created_at: string
          id: string
          product_id: string
          updated_at: string
        }
        Insert: {
          block_order?: string[]
          created_at?: string
          id?: string
          product_id: string
          updated_at?: string
        }
        Update: {
          block_order?: string[]
          created_at?: string
          id?: string
          product_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_shipping_overrides: {
        Row: {
          created_at: string
          estimated_delivery_text: string | null
          product_id: string
          production_time_text: string | null
          shipping_method_additional_item_text: string | null
          shipping_method_cost_from_text: string | null
          shipping_method_name: string | null
          shipping_method_time_text: string | null
          shipping_time_text: string | null
          shipping_tip: string | null
          total_fulfillment_time_text: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          estimated_delivery_text?: string | null
          product_id: string
          production_time_text?: string | null
          shipping_method_additional_item_text?: string | null
          shipping_method_cost_from_text?: string | null
          shipping_method_name?: string | null
          shipping_method_time_text?: string | null
          shipping_time_text?: string | null
          shipping_tip?: string | null
          total_fulfillment_time_text?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          estimated_delivery_text?: string | null
          product_id?: string
          production_time_text?: string | null
          shipping_method_additional_item_text?: string | null
          shipping_method_cost_from_text?: string | null
          shipping_method_name?: string | null
          shipping_method_time_text?: string | null
          shipping_time_text?: string | null
          shipping_tip?: string | null
          total_fulfillment_time_text?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_shipping_overrides_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_size_variants: {
        Row: {
          created_at: string
          id: string
          product_id: string
          size_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          size_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          size_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_size_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_size_variants_size_id_fkey"
            columns: ["size_id"]
            isOneToOne: false
            referencedRelation: "product_sizes"
            referencedColumns: ["id"]
          },
        ]
      }
      product_sizes: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      product_specs: {
        Row: {
          created_at: string
          guideline_url: string | null
          id: string
          max_upload_mb: number | null
          print_areas: Json | null
          print_dpi: number | null
          product_id: string
          sizes: string | null
          sku: string | null
          supported_file_types: string | null
          technique: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          guideline_url?: string | null
          id?: string
          max_upload_mb?: number | null
          print_areas?: Json | null
          print_dpi?: number | null
          product_id: string
          sizes?: string | null
          sku?: string | null
          supported_file_types?: string | null
          technique?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          guideline_url?: string | null
          id?: string
          max_upload_mb?: number | null
          print_areas?: Json | null
          print_dpi?: number | null
          product_id?: string
          sizes?: string | null
          sku?: string | null
          supported_file_types?: string | null
          technique?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      product_unit_price_tiers: {
        Row: {
          created_at: string
          currency: string
          id: string
          max_qty: number | null
          min_qty: number
          product_id: string
          sort_order: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          max_qty?: number | null
          min_qty?: number
          product_id: string
          sort_order?: number
          unit_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          max_qty?: number | null
          min_qty?: number
          product_id?: string
          sort_order?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_unit_price_tiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_view_color_mockups: {
        Row: {
          color_id: string
          created_at: string
          id: string
          mockup_image_url: string
          product_view_id: string
        }
        Insert: {
          color_id: string
          created_at?: string
          id?: string
          mockup_image_url: string
          product_view_id: string
        }
        Update: {
          color_id?: string
          created_at?: string
          id?: string
          mockup_image_url?: string
          product_view_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_view_color_mockups_color_id_fkey"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "product_colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_view_color_mockups_product_view_id_fkey"
            columns: ["product_view_id"]
            isOneToOne: false
            referencedRelation: "product_views"
            referencedColumns: ["id"]
          },
        ]
      }
      product_views: {
        Row: {
          created_at: string
          design_area_height: number
          design_area_left: number
          design_area_top: number
          design_area_width: number
          id: string
          mockup_image_url: string | null
          product_id: string
          view_name: string
          view_order: number | null
        }
        Insert: {
          created_at?: string
          design_area_height?: number
          design_area_left?: number
          design_area_top?: number
          design_area_width?: number
          id?: string
          mockup_image_url?: string | null
          product_id: string
          view_name: string
          view_order?: number | null
        }
        Update: {
          created_at?: string
          design_area_height?: number
          design_area_left?: number
          design_area_top?: number
          design_area_width?: number
          id?: string
          mockup_image_url?: string | null
          product_id?: string
          view_name?: string
          view_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_views_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          badge: string | null
          category: string | null
          category_id: string | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          is_catalog_product: boolean
          meta_description: string | null
          meta_title: string | null
          name: string
          owner_user_id: string | null
          price_from: number | null
          product_code: string | null
          slug: string | null
          sort_order: number
          source_handle: string | null
          source_provider: string | null
          source_url: string | null
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          badge?: string | null
          category?: string | null
          category_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_catalog_product?: boolean
          meta_description?: string | null
          meta_title?: string | null
          name: string
          owner_user_id?: string | null
          price_from?: number | null
          product_code?: string | null
          slug?: string | null
          sort_order?: number
          source_handle?: string | null
          source_provider?: string | null
          source_url?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          badge?: string | null
          category?: string | null
          category_id?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_catalog_product?: boolean
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          owner_user_id?: string | null
          price_from?: number | null
          product_code?: string | null
          slug?: string | null
          sort_order?: number
          source_handle?: string | null
          source_provider?: string | null
          source_url?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_designs: {
        Row: {
          created_at: string
          design_data: Json
          id: string
          name: string
          product_id: string | null
          thumbnail_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          design_data: Json
          id?: string
          name: string
          product_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          design_data?: Json
          id?: string
          name?: string
          product_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_designs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      tapstitch_collection_products: {
        Row: {
          collection_id: string
          created_at: string
          id: string
          product_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          id?: string
          product_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tapstitch_collection_products_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "tapstitch_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tapstitch_collection_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      tapstitch_collections: {
        Row: {
          created_at: string
          handle: string | null
          id: string
          is_active: boolean
          lastmod: string | null
          name: string | null
          source_url: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          handle?: string | null
          id?: string
          is_active?: boolean
          lastmod?: string | null
          name?: string | null
          source_url: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          handle?: string | null
          id?: string
          is_active?: boolean
          lastmod?: string | null
          name?: string | null
          source_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_folders: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_folder_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_folder_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_folder_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "user_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_memberships: {
        Row: {
          created_at: string
          plan: Database["public"]["Enums"]["membership_plan"]
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          plan?: Database["public"]["Enums"]["membership_plan"]
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          plan?: Database["public"]["Enums"]["membership_plan"]
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          role?: Database["public"]["Enums"]["app_role"]
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
      user_uploads: {
        Row: {
          compressed_url: string | null
          created_at: string
          file_name: string
          file_size: number | null
          folder_id: string | null
          height: number | null
          id: string
          mime_type: string | null
          original_url: string
          user_id: string
          width: number | null
        }
        Insert: {
          compressed_url?: string | null
          created_at?: string
          file_name: string
          file_size?: number | null
          folder_id?: string | null
          height?: number | null
          id?: string
          mime_type?: string | null
          original_url: string
          user_id: string
          width?: number | null
        }
        Update: {
          compressed_url?: string | null
          created_at?: string
          file_name?: string
          file_size?: number | null
          folder_id?: string | null
          height?: number | null
          id?: string
          mime_type?: string | null
          original_url?: string
          user_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_uploads_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "user_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_usage_daily: {
        Row: {
          created_at: string
          day: string
          exports_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day: string
          exports_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          exports_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_consume_export: {
        Args: { _limit: number; _user_id: string }
        Returns: boolean
      }
      claim_first_admin: {
        Args: { claiming_user_id: string }
        Returns: boolean
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_attribute_used: { Args: { _attribute_key: string }; Returns: boolean }
      update_product_gallery_order: {
        Args: { p_product_id: string; p_orders: Json }
        Returns: undefined
      }
      reorder_product_gallery: {
        Args: { p_product_id: string; p_orders: Json }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user" | "business"
      attribute_type: "text" | "number" | "select" | "multiselect"
      membership_plan: "individual" | "corporate" | "custom_request"
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
      app_role: ["admin", "user", "business"],
      attribute_type: ["text", "number", "select", "multiselect"],
      membership_plan: ["individual", "corporate", "custom_request"],
    },
  },
} as const
