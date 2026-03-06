import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PublicProduct = {
  id: string;
  name: string;
  description: string | null;
  slug: string | null;
  badge: string | null;
  product_code: string | null;
  price_from: number | null;
  currency: string | null;
  category_id: string | null;
  cover_image_url: string | null;
  thumbnail_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  is_active: boolean | null;
};

export type ProductCategory = {
  id: string;
  name: string;
  slug: string;
};

export type ProductGalleryImage = {
  id: string;
  image_url: string;
  sort_order: number;
};

export type ProductColor = {
  id: string;
  name: string;
  hex_code: string;
  sort_order: number | null;
};

export type ProductSize = {
  id: string;
  name: string;
  sort_order: number;
};

export type ProductAttributesRow = {
  data: Record<string, unknown>;
};

export type ProductMockups = {
  front_image_url: string | null;
  back_image_url: string | null;
  side_image_url: string | null;
};

export type ProductView = {
  id: string;
  view_name: string;
  view_order: number | null;
  mockup_image_url: string | null;
};

export type ProductUnitPriceTier = {
  id: string;
  product_id: string;
  min_qty: number;
  max_qty: number | null;
  unit_price: number;
  currency: string;
  sort_order: number;
};

export type ProductShippingOverride = {
  product_id: string;
  shipping_tip: string | null;
  shipping_method_name: string | null;
  shipping_method_time_text: string | null;
  shipping_method_cost_from_text: string | null;
  shipping_method_additional_item_text: string | null;
  production_time_text: string | null;
  shipping_time_text: string | null;
  total_fulfillment_time_text: string | null;
  estimated_delivery_text: string | null;
};

export function usePublicProductBySlug(slug?: string) {
  return useQuery({
    queryKey: ["public", "products", "by-slug", slug],
    enabled: Boolean(slug),
    queryFn: async (): Promise<PublicProduct | null> => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id,name,description,slug,badge,product_code,price_from,currency,category_id,cover_image_url,thumbnail_url,meta_title,meta_description,is_active"
        )
        .eq("slug", slug as string)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as PublicProduct | null;
    },
  });
}

export function usePublicProductById(id?: string) {
  return useQuery({
    queryKey: ["public", "products", "by-id", id],
    enabled: Boolean(id),
    queryFn: async (): Promise<PublicProduct | null> => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id,name,description,slug,badge,product_code,price_from,currency,category_id,cover_image_url,thumbnail_url,meta_title,meta_description,is_active"
        )
        .eq("id", id as string)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as PublicProduct | null;
    },
  });
}

export function usePublicCategory(categoryId?: string | null) {
  return useQuery({
    queryKey: ["public", "categories", "by-id", categoryId],
    enabled: Boolean(categoryId),
    queryFn: async (): Promise<ProductCategory | null> => {
      const { data, error } = await supabase
        .from("categories")
        .select("id,name,slug")
        .eq("id", categoryId as string)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as ProductCategory | null;
    },
  });
}

export function usePublicProductGallery(productId?: string) {
  return useQuery({
    queryKey: ["public", "product_gallery_images", "by-product", productId],
    enabled: Boolean(productId),
    queryFn: async (): Promise<ProductGalleryImage[]> => {
      const { data, error } = await supabase
        .from("product_gallery_images")
        .select("id,image_url,sort_order")
        .eq("product_id", productId as string)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ProductGalleryImage[];
    },
    staleTime: 0,
    refetchOnMount: "always",
  });
}

export function usePublicProductColors(productId?: string) {
  return useQuery({
    queryKey: ["public", "product_color_variants", "colors", productId],
    enabled: Boolean(productId),
    queryFn: async (): Promise<ProductColor[]> => {
      const { data, error } = await supabase
        .from("product_color_variants")
        .select("color_id, product_colors ( id, name, hex_code, sort_order )")
        .eq("product_id", productId as string);

      if (error) throw error;

      const colors = (data ?? [])
        .map((row: any) => row.product_colors)
        .filter(Boolean) as ProductColor[];

      return [...colors].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    },
  });
}

export function usePublicProductSizes(productId?: string) {
  return useQuery({
    queryKey: ["public", "product_size_variants", "sizes", productId],
    enabled: Boolean(productId),
    queryFn: async (): Promise<ProductSize[]> => {
      const { data, error } = await supabase
        .from("product_size_variants")
        .select("size_id, product_sizes ( id, name, sort_order )")
        .eq("product_id", productId as string);
      if (error) throw error;

      const sizes = (data ?? [])
        .map((row: any) => row.product_sizes)
        .filter(Boolean) as ProductSize[];

      return [...sizes].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    },
  });
}

export function usePublicProductAttributes(productId?: string) {
  return useQuery({
    queryKey: ["public", "product_attributes", "by-product", productId],
    enabled: Boolean(productId),
    queryFn: async (): Promise<ProductAttributesRow | null> => {
      const { data, error } = await supabase
        .from("product_attributes")
        .select("data")
        .eq("product_id", productId as string)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as ProductAttributesRow | null;
    },
  });
}

export function usePublicProductMockups(productId?: string) {
  return useQuery({
    queryKey: ["public", "product_mockups", "by-product", productId],
    enabled: Boolean(productId),
    queryFn: async (): Promise<ProductMockups | null> => {
      const { data, error } = await supabase
        .from("product_mockups")
        .select("front_image_url,back_image_url,side_image_url")
        .eq("product_id", productId as string)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as ProductMockups | null;
    },
  });
}

export function usePublicProductViews(productId?: string) {
  return useQuery({
    queryKey: ["public", "product_views", "by-product", productId],
    enabled: Boolean(productId),
    queryFn: async (): Promise<ProductView[]> => {
      const { data, error } = await supabase
        .from("product_views")
        .select("id,view_name,view_order,mockup_image_url")
        .eq("product_id", productId as string)
        .order("view_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ProductView[];
    },
  });
}

export function usePublicViewColorMockup(productViewId?: string | null, colorId?: string | null) {
  return useQuery({
    queryKey: ["public", "product_view_color_mockups", "by-view-color", { productViewId, colorId }],
    enabled: Boolean(productViewId && colorId),
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase
        .from("product_view_color_mockups")
        .select("mockup_image_url")
        .eq("product_view_id", productViewId as string)
        .eq("color_id", colorId as string)
        .maybeSingle();
      if (error) throw error;
      return (data?.mockup_image_url ?? null) as string | null;
    },
    staleTime: 1000 * 60 * 10,
  });
}

export type ProductViewColorMockup = {
  product_view_id: string;
  color_id: string;
  mockup_image_url: string | null;
};

export function usePublicViewColorMockupsByViews(viewIds?: string[] | null, colorId?: string | null) {
  const idsKey = (viewIds ?? []).join("|");
  return useQuery({
    queryKey: ["public", "product_view_color_mockups", "by-views-color", { idsKey, colorId }],
    enabled: Boolean(colorId && viewIds && viewIds.length > 0),
    queryFn: async (): Promise<ProductViewColorMockup[]> => {
      const { data, error } = await supabase
        .from("product_view_color_mockups")
        .select("product_view_id,color_id,mockup_image_url")
        .eq("color_id", colorId as string)
        .in("product_view_id", (viewIds ?? []) as string[]);
      if (error) throw error;
      return (data ?? []) as ProductViewColorMockup[];
    },
  });
}

export function usePublicUnitPriceTiers(productId?: string) {
  return useQuery({
    queryKey: ["public", "product_unit_price_tiers", "by-product", productId],
    enabled: Boolean(productId),
    queryFn: async (): Promise<ProductUnitPriceTier[]> => {
      const { data, error } = await supabase
        .from("product_unit_price_tiers")
        .select("id,product_id,min_qty,max_qty,unit_price,currency,sort_order")
        .eq("product_id", productId as string)
        .order("sort_order", { ascending: true })
        .order("min_qty", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ProductUnitPriceTier[];
    },
  });
}

export function usePublicProductShippingOverride(productId?: string) {
  return useQuery({
    queryKey: ["public", "product_shipping_overrides", "by-product", productId],
    enabled: Boolean(productId),
    queryFn: async (): Promise<ProductShippingOverride | null> => {
      const { data, error } = await supabase
        .from("product_shipping_overrides")
        .select(
          "product_id,shipping_tip,shipping_method_name,shipping_method_time_text,shipping_method_cost_from_text,shipping_method_additional_item_text,production_time_text,shipping_time_text,total_fulfillment_time_text,estimated_delivery_text"
        )
        .eq("product_id", productId as string)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as ProductShippingOverride | null;
    },
    staleTime: 5 * 60 * 1000,
  });
}
