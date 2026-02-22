import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { NewcatalogChrome } from "@/components/newcatalog/layout/NewcatalogChrome";
import { useCart, type CartItem } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePageMeta } from "@/hooks/usePageMeta";
import { usePublicProductAttributes, usePublicProductSizes } from "@/hooks/usePublicProduct";
import { getSignedImageUrl } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";
import { toast } from "sonner";
import { ChevronDown, Info } from "lucide-react";

function CartItemImage({ src }: { src: string | null | undefined }) {
  const [displaySrc, setDisplaySrc] = useState<string | null>(src ?? null);
  const [triedSigned, setTriedSigned] = useState(false);

  useEffect(() => {
    const raw = src ?? null;
    setDisplaySrc(raw);
    setTriedSigned(false);
    if (raw && !raw.startsWith("http")) {
      getSignedImageUrl(raw).then((signed) => {
        if (signed) setDisplaySrc(signed);
      });
    }
  }, [src]);

  const handleError = () => {
    if (!src || triedSigned) return;
    setTriedSigned(true);
    getSignedImageUrl(src).then((signed) => {
      if (signed) setDisplaySrc(signed);
    });
  };

  if (!displaySrc) return <div className="h-full w-full bg-muted" />;
  return (
    <img
      src={displaySrc}
      alt=""
      className="h-full w-full object-cover"
      onError={handleError}
    />
  );
}

function formatPrice(price: number | null) {
  if (price == null) return "—";
  return `$${Number(price).toFixed(2)}`;
}

function cartItemMaxQuantity(attrs: Record<string, unknown> | undefined): number | null {
  if (!attrs) return null;
  const mode = (attrs as any).stock_mode;
  if (mode === "out_of_stock") return 0;
  if (mode === "quantity") {
    const v = (attrs as any).stock_quantity;
    const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
    return Number.isNaN(n) || n < 0 ? 0 : n;
  }
  return null;
}

function CartItemRow({
  item,
  selected,
  onSelect,
  updateQuantity,
  updateQuantityBySize,
  removeItem,
}: {
  item: CartItem;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateQuantityBySize: (itemId: string, size: string, quantity: number) => void;
  removeItem: (itemId: string) => void;
}) {
  const { data: attrsRow } = usePublicProductAttributes(item.productId);
  const { data: sizes } = usePublicProductSizes(item.productId);
  const attrs = (attrsRow?.data ?? {}) as Record<string, unknown>;
  const maxQty = useMemo(() => cartItemMaxQuantity(attrs), [attrs]);

  const sizeNames = useMemo(() => (sizes ?? []).map((s) => s.name), [sizes]);
  const hasSizeColumns = sizeNames.length > 0;

  const unitPrice = (item.price_from ?? 0) + (item.placementFeePerItem ?? 0);
  const lineTotal = unitPrice * item.quantity;

  const getQtyForSize = (size: string) => {
    if (item.quantityBySize && size in item.quantityBySize) return item.quantityBySize[size] ?? 0;
    if (item.selectedSize === size) return item.quantity;
    return 0;
  };

  const handleSizeQtyChange = (size: string, v: number) => {
    const capped = maxQty != null ? Math.min(Math.max(0, v), maxQty) : Math.max(0, v);
    if (maxQty != null && v > maxQty) {
      toast.info(`Kalan stok: ${maxQty} adet. En fazla ${maxQty} adet seçebilirsiniz.`);
    }
    updateQuantityBySize(item.id, size, capped);
  };

  const handleQtyChange = (v: number) => {
    if (Number.isNaN(v) || v < 1) {
      updateQuantity(item.id, 1);
      return;
    }
    const capped = maxQty != null ? Math.min(v, maxQty) : v;
    if (maxQty != null && v > maxQty) {
      toast.info(`Kalan stok: ${maxQty} adet. En fazla ${maxQty} adet seçebilirsiniz.`);
    }
    updateQuantity(item.id, capped);
  };

  const productUrl = item.slug ? `/product/${item.slug}` : `/product/id/${item.productId}`;
  const designerUrl = `/designer?productId=${item.productId}${item.selectedColorName ? `&colorId=${item.selectedColorName}` : ""}`;

  return (
    <div className="ru-cart-item">
      <div className="ru-cart-item-left">
        <div className="ru-cart-item-check">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect(e.target.checked)}
            aria-label={`Seç: ${item.name}`}
            className="h-4 w-4 rounded border-input"
          />
        </div>
        <div className="ru-cart-item-thumb">
          <CartItemImage src={item.cover_image_url} />
        </div>
        <div className="ru-cart-item-body">
          <Link to={productUrl} className="ru-cart-item-name">
            {item.name}
          </Link>
          <p className="ru-cart-item-sku">
            {item.product_code ? `#${item.product_code}` : ""}
            {item.selectedColorName ? ` / ${item.selectedColorName}` : ""}
          </p>
          {item.designData && Object.keys(item.designData).length > 0 ? (
            <span className="ru-cart-item-tech inline-block mt-1">Tasarımlı{item.designName ? `: ${item.designName}` : ""}</span>
          ) : null}
          {item.selectedTechnique ? (
            <span className="ru-cart-item-tech">{item.selectedTechnique}</span>
          ) : null}
          {item.selectedPlacements && item.selectedPlacements.length > 0 ? (
            <p className="text-xs text-muted-foreground mt-1">
              Baskı alanları: {item.selectedPlacements.map((p) => p.name).filter(Boolean).join(", ")}
            </p>
          ) : null}
          <div className="ru-cart-item-links">
            <Link to={designerUrl}>Design</Link>
            <Link to={productUrl}>Ürün</Link>
            <button
              type="button"
              className="text-destructive"
              onClick={() => removeItem(item.id)}
            >
              Remove
            </button>
          </div>
        </div>
      </div>
      <div className="ru-cart-item-sizes">
        {hasSizeColumns ? (
          <div className="ru-cart-item-sizes-inner">
            {sizeNames.map((size) => (
              <div key={size} className="ru-cart-item-size-cell">
                <span className="ru-cart-size-label">{size}</span>
                <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="ru-cart-qty-btn"
                  aria-label={`${size} azalt`}
                  onClick={() => handleSizeQtyChange(size, getQtyForSize(size) - 1)}
                >
                  −
                </button>
                <input
                  type="number"
                  min={0}
                  max={maxQty ?? undefined}
                  value={getQtyForSize(size)}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    handleSizeQtyChange(size, Number.isNaN(v) ? 0 : v);
                  }}
                  className="ru-cart-qty-input"
                  aria-label={`${size} adet`}
                />
                <button
                  type="button"
                  className="ru-cart-qty-btn"
                  aria-label={`${size} artır`}
                  onClick={() => handleSizeQtyChange(size, getQtyForSize(size) + 1)}
                >
                  +
                </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="ru-cart-qty-wrap">
            <button
              type="button"
              className="ru-cart-qty-btn"
              aria-label="Azalt"
              onClick={() => handleQtyChange(Math.max(1, item.quantity - 1))}
            >
              −
            </button>
            <input
              type="number"
              min={1}
              max={maxQty ?? undefined}
              value={item.quantity}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                handleQtyChange(Number.isNaN(v) ? 1 : v);
              }}
              className="ru-cart-qty-input"
              aria-label="Adet"
            />
            <button
              type="button"
              className="ru-cart-qty-btn"
              aria-label="Artır"
              onClick={() => handleQtyChange(item.quantity + 1)}
            >
              +
            </button>
          </div>
        )}
      </div>
      <div className="ru-cart-item-right">
        <span className="ru-cart-item-price">
          {formatPrice(lineTotal)}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />
      </div>
    </div>
  );
}

export default function CartPage() {
  usePageMeta({ title: "Sepet", noIndex: true });
  const { items, updateQuantity, updateQuantityBySize, removeItem, totalCount } = useCart();
  const [quoteFormOpen, setQuoteFormOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const productSubtotal = useMemo(
    () =>
      items.reduce(
        (sum, i) => sum + ((i.price_from ?? 0) + (i.placementFeePerItem ?? 0)) * i.quantity,
        0
      ),
    [items]
  );

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(items.map((i) => i.id)) : new Set());
  };

  const handleRemoveSelected = () => {
    if (selectedIds.size === 0) return;
    selectedIds.forEach((id) => removeItem(id));
    setSelectedIds(new Set());
    toast.success("Seçilen ürünler sepetten kaldırıldı.");
  };

  return (
    <NewcatalogChrome activeCategory="All">
      <div className="ru-max w-full">
        <section className="w-full py-8 px-4 md:px-6" aria-label="Sepet">
          <h1 className="ru-cart-title">Cart ({totalCount})</h1>
          {items.length === 0 ? (
            <div className="mt-6 rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              <p className="mb-4">Sepetiniz boş.</p>
              <Link to="/catalog/all" className="ru-pill">
                Kataloga git
              </Link>
            </div>
          ) : (
            <div className="ru-cart-layout">
              <div>
                <div className="ru-cart-actions">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <span className="text-sm">All</span>
                  </label>
                  <button
                    type="button"
                    className="ru-cart-action-link"
                    onClick={handleRemoveSelected}
                  >
                    Remove
                  </button>
                  <Link to="/catalog/all" className="ru-cart-action-link">
                    Branding
                  </Link>
                  <button
                    type="button"
                    className="ru-cart-action-link"
                    onClick={() => setQuoteFormOpen(true)}
                  >
                    Save as draft
                  </button>
                </div>

                {items.map((item) => (
                  <CartItemRow
                    key={item.id}
                    item={item}
                    selected={selectedIds.has(item.id)}
                    onSelect={(checked) =>
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        if (checked) next.add(item.id);
                        else next.delete(item.id);
                        return next;
                      })
                    }
                    updateQuantity={updateQuantity}
                    updateQuantityBySize={updateQuantityBySize}
                    removeItem={removeItem}
                  />
                ))}
              </div>

              <aside className="ru-cart-summary">
                <h2 className="ru-cart-summary-title">Order summary</h2>
                <div className="ru-cart-summary-row muted">
                  <span>Product ({totalCount} items)</span>
                  <span>{formatPrice(productSubtotal)}</span>
                </div>
                <div className="ru-cart-summary-row muted">
                  <span>Customization</span>
                  <span>$0.00</span>
                </div>
                <div className="ru-cart-summary-row muted">
                  <span>Shipping</span>
                  <span className="flex items-center gap-1">
                    TBD
                    <Info className="h-4 w-4" aria-hidden />
                  </span>
                </div>
                <div className="ru-cart-summary-divider" />
                <div className="ru-cart-summary-row ru-cart-summary-total">
                  <span>Total</span>
                  <span>USD {productSubtotal.toFixed(2)}</span>
                </div>
                <Button
                  type="button"
                  className="ru-cart-checkout-btn bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={totalCount === 0 || productSubtotal <= 0}
                  onClick={() => toast.info("Checkout yakında aktif olacak.")}
                >
                  Checkout
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="ru-cart-checkout-btn mt-2"
                  onClick={() => setQuoteFormOpen(true)}
                >
                  Teklif iste
                </Button>
              </aside>
            </div>
          )}

          {quoteFormOpen && items.length > 0 ? (
            <QuoteFormSection items={items} onClose={() => setQuoteFormOpen(false)} />
          ) : null}
        </section>
      </div>
    </NewcatalogChrome>
  );
}

function QuoteFormSection({ items, onClose }: { items: CartItem[]; onClose: () => void }) {
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const lineTotal = (item: CartItem) =>
    ((item.price_from ?? 0) + (item.placementFeePerItem ?? 0)) * item.quantity;
  const grandTotal = items.reduce((sum, i) => sum + lineTotal(i), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      items: items.map((i) => ({
        name: i.name,
        product_code: i.product_code,
        selectedSize: i.selectedSize,
        selectedColorName: i.selectedColorName,
        selectedTechnique: i.selectedTechnique,
        selectedPlacements: i.selectedPlacements,
        quantity: i.quantity,
        quantityBySize: i.quantityBySize ?? undefined,
        unitPrice: (i.price_from ?? 0) + (i.placementFeePerItem ?? 0),
        lineTotal: lineTotal(i),
        hasDesign: Boolean(i.designData && Object.keys(i.designData).length > 0),
        designName: i.designName ?? undefined,
        designData: i.designData ?? undefined,
      })),
      companyName,
      contactName,
      email,
      phone,
      address,
      notes,
    };
    const { error } = await supabase.from("quote_requests").insert({
      company_name: payload.companyName || null,
      contact_name: payload.contactName || null,
      email: payload.email,
      phone: payload.phone || null,
      address: payload.address || null,
      notes: payload.notes || null,
      items: payload.items,
    });
    if (error) {
      setSubmitting(false);
      console.error("Quote request insert error:", error);
      const msg = error.message || "Teklif gönderilemedi. Lütfen tekrar deneyin.";
      toast.error(msg.includes("does not exist") ? "Teklif tablosu henüz oluşturulmamış. Lütfen yöneticiyle iletişime geçin." : msg);
      return;
    }

    await supabase.functions.invoke("send-quote-notification", { body: payload }).then(({ error: fnErr }) => {
      if (fnErr) console.error("Quote notification email error:", fnErr);
    });

    setSubmitting(false);
    toast.success("Teklif talebiniz alındı. En kısa sürede size dönüş yapılacaktır.");
    onClose();
  };

  return (
    <div className="mt-10 rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-muted/30 px-6 py-5">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Teklif talebi</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sepetinizdeki ürünlerin detaylarını kontrol edin ve iletişim bilgilerinizi girin. Talebiniz tarafımıza iletilecektir.
        </p>
      </div>

      <div className="p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Ürün detayları
        </h3>
        <div className="space-y-5">
          {items.map((item) => (
            <article
              key={item.id}
              className="flex flex-col gap-4 rounded-lg border border-border bg-muted/20 p-4 sm:flex-row sm:gap-5"
            >
              <div className="h-28 w-full shrink-0 overflow-hidden rounded-md border border-border bg-muted sm:h-32 sm:w-32">
                <CartItemImage src={item.cover_image_url} />
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                <div>
                  <p className="font-semibold text-foreground">{item.name}</p>
                  {item.product_code ? (
                    <p className="text-xs text-muted-foreground">Ürün kodu: {item.product_code}</p>
                  ) : null}
                  {item.designData && Object.keys(item.designData).length > 0 ? (
                    <p className="text-xs text-primary font-medium mt-0.5">
                      Tasarımlı{item.designName ? ` — ${item.designName}` : ""}
                    </p>
                  ) : null}
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-muted-foreground">Beden</dt>
                    <dd className="font-medium">{item.selectedSize ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Renk</dt>
                    <dd className="font-medium">{item.selectedColorName ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Teknik</dt>
                    <dd className="font-medium">{item.selectedTechnique ?? "—"}</dd>
                  </div>
                  <div className="col-span-2 sm:col-span-3">
                    <dt className="text-muted-foreground">Baskı alanı</dt>
                    <dd className="font-medium">
                      {item.selectedPlacements?.length
                        ? item.selectedPlacements.map((p) => (p.price ? `${p.name} (${p.price})` : p.name)).join(", ")
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Adet</dt>
                    <dd className="font-medium">{item.quantity}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Birim fiyat</dt>
                    <dd className="font-medium">
                      {formatPrice((item.price_from ?? 0) + (item.placementFeePerItem ?? 0))}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Satır toplamı</dt>
                    <dd className="font-semibold text-foreground">{formatPrice(lineTotal(item))}</dd>
                  </div>
                </dl>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-6 flex justify-end border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">
            Genel toplam: <span className="text-lg font-semibold text-foreground">{formatPrice(grandTotal)}</span>
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="border-t border-border bg-muted/10 px-6 py-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          İletişim bilgileri
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="quote-company">Firma adı</Label>
            <Input
              id="quote-company"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Firma veya şirket adı"
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quote-contact">İletişim kişisi</Label>
            <Input
              id="quote-contact"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Ad Soyad"
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quote-email">E-posta *</Label>
            <Input
              id="quote-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@firma.com"
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quote-phone">Telefon</Label>
            <Input
              id="quote-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+90 5XX XXX XX XX"
              className="bg-background"
            />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <Label htmlFor="quote-address">Adres</Label>
          <Input
            id="quote-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Teslimat adresi"
            className="bg-background"
          />
        </div>
        <div className="mt-4 space-y-2">
          <Label htmlFor="quote-notes">Notlar</Label>
          <Input
            id="quote-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ek notlar veya özel istekler"
            className="bg-background"
          />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="submit" size="lg" className="ru-btn-primary" disabled={submitting}>
            {submitting ? "Gönderiliyor…" : "Teklif gönder"}
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={onClose}>
            İptal
          </Button>
        </div>
      </form>
    </div>
  );
}
