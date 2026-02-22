import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  ProductDetail,
  ProductDetailContentType,
  useProductDetails,
} from "@/hooks/useProductDetails";

const TYPE_LABEL: Record<ProductDetailContentType, string> = {
  text: "Text",
  link: "Link",
  list: "List",
};

type LocalDetail = Omit<ProductDetail, "created_at" | "updated_at"> & {
  isNew?: boolean;
};

function newLocalDetail(productId: string, sortOrder: number): LocalDetail {
  return {
    id: `new-${crypto.randomUUID()}`,
    product_id: productId,
    title: "",
    content_type: "text",
    content: "",
    sort_order: sortOrder,
    isNew: true,
  };
}

export function ProductDetailsEditor({
  productId,
  className,
}: {
  productId: string;
  className?: string;
}) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useProductDetails(productId);

  const [rows, setRows] = useState<LocalDetail[]>([]);

  useEffect(() => {
    if (!productId) {
      setRows([]);
      return;
    }

    if (data) {
      setRows(
        data.map((d) => ({
          id: d.id,
          product_id: d.product_id,
          title: d.title,
          content_type: d.content_type,
          content: d.content,
          sort_order: d.sort_order,
        })),
      );
    }
  }, [data, productId]);

  const normalizedRows = useMemo(() => {
    // Always keep stable sequential sort_order for saving
    return rows
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((r, idx) => ({ ...r, sort_order: idx }));
  }, [rows]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const ordered = normalizedRows;

      for (const row of ordered) {
        if (!row.title.trim()) {
          throw new Error("Title cannot be empty");
        }
        if (!row.content.trim()) {
          throw new Error("Content cannot be empty");
        }

        if ((row as LocalDetail).isNew) {
          const { error } = await supabase.from("product_details").insert({
            product_id: row.product_id,
            title: row.title.trim(),
            content_type: row.content_type,
            content: row.content,
            sort_order: row.sort_order,
          });
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("product_details")
            .update({
              title: row.title.trim(),
              content_type: row.content_type,
              content: row.content,
              sort_order: row.sort_order,
            })
            .eq("id", row.id);
          if (error) throw error;
        }
      }

      // Also clean up any deleted rows? (handled via delete action)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["product-details", productId] });
      toast.success("Product Details kaydedildi");
    },
    onError: (err) => {
      toast.error((err as Error).message || "Kaydedilemedi");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_details").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["product-details", productId] });
      toast.success("Silindi");
    },
    onError: () => toast.error("Silinemedi"),
  });

  const handleAdd = () => {
    setRows((prev) => {
      const next = prev.slice();
      next.push(newLocalDetail(productId, next.length));
      return next;
    });
  };

  const moveRow = (index: number, direction: -1 | 1) => {
    setRows((prev) => {
      const ordered = prev.slice().sort((a, b) => a.sort_order - b.sort_order);
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= ordered.length) return prev;

      const a = ordered[index];
      const b = ordered[targetIndex];
      const swapped = ordered.map((r) => ({ ...r }));
      swapped[index] = { ...b, sort_order: a.sort_order };
      swapped[targetIndex] = { ...a, sort_order: b.sort_order };
      return swapped;
    });
  };

  const removeRow = (row: LocalDetail) => {
    if (row.isNew) {
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      return;
    }

    const ok = window.confirm("Do you want to delete this detail?");
    if (!ok) return;

    deleteMutation.mutate(row.id);
    setRows((prev) => prev.filter((r) => r.id !== row.id));
  };

  const isBusy = isLoading || saveMutation.isPending || deleteMutation.isPending;

  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <Label className="text-sm">Product Details</Label>
          <p className="text-xs text-muted-foreground">
            Add/edit product details that will appear in the Designer DETAILS tab.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleAdd} disabled={!productId || isBusy}>
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={!productId || isBusy || normalizedRows.length === 0}
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

      <Separator />

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : normalizedRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No details added yet.</p>
      ) : (
        <div className="space-y-3">
          {normalizedRows.map((row, idx) => (
            <div key={row.id} className="rounded-lg border p-3 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => moveRow(idx, -1)}
                    disabled={idx === 0 || isBusy}
                    aria-label="Move up"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => moveRow(idx, 1)}
                    disabled={idx === normalizedRows.length - 1 || isBusy}
                    aria-label="Move down"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <div className="text-xs text-muted-foreground">#{idx + 1}</div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRow(row)}
                  disabled={isBusy}
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Title</Label>
                  <Input
                    value={row.title}
                    onChange={(e) =>
                      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, title: e.target.value } : r)))
                    }
                    placeholder="e.g. Fabric & Care"
                    className="h-9"
                    disabled={isBusy}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Type</Label>
                  <Select
                    value={row.content_type}
                    onValueChange={(v) =>
                      setRows((prev) =>
                        prev.map((r) =>
                          r.id === row.id ? { ...r, content_type: v as ProductDetailContentType } : r,
                        ),
                      )
                    }
                    disabled={isBusy}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TYPE_LABEL).map(([k, label]) => (
                        <SelectItem key={k} value={k}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">
                  Content {row.content_type === "list" ? "(one item per line)" : row.content_type === "link" ? "(URL)" : ""}
                </Label>
                {row.content_type === "link" ? (
                  <Input
                    value={row.content}
                    onChange={(e) =>
                      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, content: e.target.value } : r)))
                    }
                    placeholder="https://..."
                    className="h-9"
                    disabled={isBusy}
                  />
                ) : (
                  <Textarea
                    value={row.content}
                    onChange={(e) =>
                      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, content: e.target.value } : r)))
                    }
                    placeholder={row.content_type === "list" ? "- Item 1\n- Item 2" : "Detail text"}
                    className="min-h-[90px]"
                    disabled={isBusy}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {normalizedRows.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Tip: Click <span className="font-medium">Save</span> to make ordering changes permanent.
        </p>
      )}
    </section>
  );
}
