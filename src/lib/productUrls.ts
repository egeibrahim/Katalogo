export function normalizeProductCode(code: string | null | undefined): string {
  if (!code) return "";
  return code.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

const PUBLIC_CATEGORY_ALIASES: Record<string, string> = {
};

const INTERNAL_CATEGORY_ALIASES: Record<string, string> = Object.fromEntries(
  Object.entries(PUBLIC_CATEGORY_ALIASES).map(([internal, external]) => [external, internal])
);

export function toPublicCategorySlug(slug: string | null | undefined): string {
  const normalized = String(slug ?? "").trim().toLowerCase();
  if (!normalized) return "";
  return PUBLIC_CATEGORY_ALIASES[normalized] ?? normalized;
}

export function fromPublicCategorySlug(slug: string | null | undefined): string {
  const normalized = String(slug ?? "").trim().toLowerCase();
  if (!normalized) return "";
  return INTERNAL_CATEGORY_ALIASES[normalized] ?? normalized;
}

export function getProductPath(input: {
  slug: string | null | undefined;
  productCode?: string | null;
  id: string;
}): string {
  const slug = input.slug?.trim();
  if (!slug) return `/product/id/${input.id}`;

  const code = normalizeProductCode(input.productCode);
  return code ? `/product/${slug}/${code}` : `/product/${slug}`;
}

export function getCategoryProductPath(input: {
  slug: string | null | undefined;
  categorySlug?: string | null;
  parentCategorySlug?: string | null;
  productCode?: string | null;
  id: string;
}): string {
  const slug = input.slug?.trim();
  const categorySlug = input.categorySlug?.trim();
  const parentCategorySlug = input.parentCategorySlug?.trim();

  if (slug && categorySlug && parentCategorySlug) {
    return `/${toPublicCategorySlug(parentCategorySlug)}/${toPublicCategorySlug(categorySlug)}/${slug}`;
  }

  return getProductPath({
    slug: input.slug,
    productCode: input.productCode,
    id: input.id,
  });
}

export function getBrandProductPath(input: {
  brandSlug: string | null | undefined;
  slug: string | null | undefined;
  parentCategorySlug?: string | null;
  categorySlug?: string | null;
  productCode?: string | null;
  id: string;
}): string {
  const brandSlug = input.brandSlug?.trim();
  const slug = input.slug?.trim();
  const parentCategorySlug = input.parentCategorySlug?.trim();
  const categorySlug = input.categorySlug?.trim();

  if (brandSlug && slug && parentCategorySlug && categorySlug) {
    const parent = toPublicCategorySlug(parentCategorySlug);
    const child = toPublicCategorySlug(categorySlug);
    return `/brand/${brandSlug}/${parent}/${child}/${slug}`;
  }

  return getCategoryProductPath({
    slug: input.slug,
    categorySlug: input.categorySlug,
    parentCategorySlug: input.parentCategorySlug,
    productCode: input.productCode,
    id: input.id,
  });
}
