import * as React from "react";

import { ProductDetailsAccordion } from "@/components/newcatalog/product/ProductDetailsAccordion";
import type { PublicProduct } from "@/hooks/usePublicProduct";

export function ProductV2DetailsTab({ product }: { product: PublicProduct | null | undefined }) {
  const productId = product?.id ?? "";
  const noteHtml = (product?.description ?? "").trim() ? (product?.description ?? "") : null;

  return <ProductDetailsAccordion productId={productId} noteHtml={noteHtml} embedded />;
}
