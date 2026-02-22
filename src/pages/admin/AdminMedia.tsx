import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { uploadPublicFile, sanitizeStorageFileName } from "@/lib/storage";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";

type MediaItem = { name: string; url: string };

export default function AdminMedia() {
  const [q, setQ] = useState("");
  const bucket = "product-mockups";

  const { data: items, refetch } = useQuery({
    queryKey: ["admin", "media", bucket],
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(bucket).list("", { limit: 200, sortBy: { column: "created_at", order: "desc" } });
      if (error) throw error;

      const mapped: MediaItem[] = (data ?? []).map((o) => {
        const { data: pub } = supabase.storage.from(bucket).getPublicUrl(o.name);
        return { name: o.name, url: pub.publicUrl };
      });
      return mapped;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      for (const file of files) {
        const path = `${Date.now()}-${sanitizeStorageFileName(file.name)}`;
        await uploadPublicFile({ bucket, path, file });
      }
    },
    onSuccess: async () => {
      toast.success("Uploaded");
      await refetch();
    },
    onError: (e: any) => toast.error(e?.message ?? "Upload failed"),
  });

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items ?? [];
    return (items ?? []).filter((i) => i.name.toLowerCase().includes(query));
  }, [items, q]);

  return (
    <div className="p-4 md:p-6">
      <Card className="rounded-xl border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Media</CardTitle>
          <p className="text-sm text-muted-foreground">Upload and reuse assets (public bucket).</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Upload image</Label>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (!files.length) return;
                  uploadMutation.mutate(files);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" placeholder="Search assets…" />
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((m) => (
              <div key={m.name} className="overflow-hidden rounded-lg border bg-card">
                <img src={m.url} alt={m.name} loading="lazy" className="aspect-square w-full object-cover" />
                <div className="flex items-center justify-between gap-2 p-2">
                  <p className="truncate text-xs text-muted-foreground">{m.name}</p>
                  <Button variant="outline" size="sm" className="h-7" onClick={() => navigator.clipboard.writeText(m.url)}>
                    Copy
                  </Button>
                </div>
              </div>
            ))}
            {(filtered.length ?? 0) === 0 ? (
              <div className="col-span-full rounded-md border p-10 text-center text-sm text-muted-foreground">No media found.</div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
