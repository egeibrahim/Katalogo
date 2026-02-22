import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { usePageMeta } from "@/hooks/usePageMeta";
import { SignedImage } from "@/components/ui/signed-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pencil, ExternalLink } from "lucide-react";

type ProductRow = {
  id: string;
  name: string;
  slug: string | null;
  cover_image_url: string | null;
  thumbnail_url: string | null;
  price_from: number | null;
  is_active: boolean | null;
  created_at: string;
  categories?: { name: string } | null;
};

export default function AdminCatalog() {
  usePageMeta({ title: "Catalog", description: "Platform catalog", noIndex: true });
  const navigate = useNavigate();

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin", "catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,slug,cover_image_url,thumbnail_url,price_from,is_active,created_at,categories(name)")
        .is("owner_user_id", null)
        .order("sort_order", { ascending: true });
      if (!error) return (data ?? []) as ProductRow[];
      if (!error.message?.includes("owner_user_id") && !error.message?.includes("schema cache")) throw error;
      const { data: data2, error: err2 } = await supabase
        .from("products")
        .select("id,name,slug,cover_image_url,thumbnail_url,price_from,is_active,created_at,categories(name)")
        .order("sort_order", { ascending: true });
      if (err2) throw err2;
      return (data2 ?? []) as ProductRow[];
    },
  });

  const items = products ?? [];

  return (
    <div className="p-4 md:p-6">
      <Card className="rounded-xl border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Katalog</CardTitle>
          <p className="text-sm text-muted-foreground">
            Platform catalog. These products are offered to store accounts as the standard catalog. Use the Products tab to edit.
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product name</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Fiyat</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[160px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Loading…</TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      No products in catalog yet. Add new products from the Products tab.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 overflow-hidden rounded-md border bg-muted">
                            {(p.thumbnail_url || p.cover_image_url) ? (
                              <SignedImage src={p.thumbnail_url ?? p.cover_image_url ?? undefined} alt="" loading="lazy" className="h-full w-full object-cover" />
                            ) : null}
                          </div>
                          <div className="truncate font-medium">{p.name}</div>
                        </div>
                      </TableCell>
                      <TableCell>{p.categories?.name ?? "—"}</TableCell>
                      <TableCell>{p.price_from != null ? `$${p.price_from}` : "—"}</TableCell>
                      <TableCell>
                        <Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Published" : "Draft"}</Badge>
                      </TableCell>
                      <TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="icon" asChild title="Open in store">
                            <a href={p.slug ? `/product/${p.slug}` : `/product/id/${p.id}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => navigate(`/admin/products/${p.id}`)}>
                            <Pencil className="h-4 w-4" /> Edit
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
