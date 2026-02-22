/** Designer'da metin için varsayılan font (index.css --font-sans ile uyumlu). */
export const DEFAULT_FONT_FAMILY = "Instrument Sans";

export interface DesignElement {
  id: string;
  type: "text" | "image";
  content: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  imageUrl?: string;
  // Text styling
  fontWeight?: "normal" | "bold";
  fontStyle?: "normal" | "italic";
  textDecoration?: "none" | "underline";
  textAlign?: "left" | "center" | "right";
  // Transform
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  // Layer properties
  isLocked?: boolean;
  isVisible?: boolean;
  dpi?: number;
  /** true = ürün mockup görseli, mockup alanının tamamını kaplar; false/undefined = yükle ile eklenen tasarım, baskı alanı içinde */
  fillMockup?: boolean;
}

export interface ProductColor {
  id: string;
  name: string;
  hex_code: string;
  sort_order: number;
  is_active: boolean;
}

export interface ProductView {
  id: string;
  product_id: string;
  view_name: string;
  view_order: number;
  mockup_image_url?: string;
  /** Mockup görseli alanda nasıl gösterilsin: contain = sığdır, cover = kapla */
  mockup_object_fit?: 'contain' | 'cover';
  design_area_top: number;
  design_area_left: number;
  design_area_width: number;
  design_area_height: number;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  category?: string;
  is_active: boolean;
  views?: ProductView[];
}

export interface ProductMockup {
  id: string;
  name: string;
  image: string;
  designArea: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}

export interface UserFolder {
  id: string;
  user_id: string;
  name: string;
  parent_folder_id?: string;
  created_at: string;
}

export interface UserUpload {
  id: string;
  user_id: string;
  folder_id?: string;
  file_name: string;
  original_url: string;
  compressed_url?: string;
  file_size?: number;
  mime_type?: string;
  width?: number;
  height?: number;
  created_at: string;
}

export interface ReadyMadeFolder {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface DesignTemplate {
  id: string;
  name: string;
  category?: string;
  image_url: string;
  thumbnail_url?: string;
  is_active: boolean;
  folder_id?: string | null;
  created_at?: string;
}

export interface SavedDesign {
  id: string;
  user_id: string;
  product_id?: string;
  name: string;
  design_data: Record<string, DesignElement[]>;
  thumbnail_url?: string;
  created_at: string;
  updated_at: string;
}

export interface DesignState {
  elements: DesignElement[];
  productId: string;
}

export type ActiveTab = "upload" | "text" | "layers";

export type ActiveTool = "select" | "text" | "upload";
