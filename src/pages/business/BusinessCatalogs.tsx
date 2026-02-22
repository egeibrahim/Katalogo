import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Boxes, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePageMeta } from "@/hooks/usePageMeta";
import { slugify } from "@/lib/slug";
import { toast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Catalog = {
  id: string;
  owner_user_id: string;
  name: string;
  slug: string;
  contact_email: string;
  is_public: boolean;
  logo_url: string | null;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
};

const formSchema = z.object({
  name: z.string().min(1, "Katalog adı zorunlu"),
  slug: z
    .string()
    .min(1, "Slug zorunlu")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug sadece a-z, 0-9 ve '-' içermeli"),
  contact_email: z.string().email("Geçerli bir e-posta girin"),
  is_public: z.boolean().default(false),
  logo_url: z.string().url("Geçerli bir URL girin").optional().or(z.literal("")),
  cover_image_url: z.string().url("Geçerli bir URL girin").optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

function normalizeCatalogPayload(values: FormValues) {
  return {
    name: values.name.trim(),
    slug: values.slug.trim(),
    contact_email: values.contact_email.trim(),
    is_public: values.is_public,
    logo_url: values.logo_url?.trim() ? values.logo_url.trim() : null,
    cover_image_url: values.cover_image_url?.trim() ? values.cover_image_url.trim() : null,
  };
}

function humanizeCatalogError(err: unknown) {
  const message = (err as { message?: string })?.message ?? "";
  if (message.includes("catalogs_slug_key") || message.toLowerCase().includes("duplicate")) {
    return "Bu slug kullanımda";
  }
  return "İşlem başarısız";
}

export default function BusinessCatalogs() {
  usePageMeta({ title: "Kataloglarım", description: "Kurumsal katalog yönetimi", noIndex: true });

  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Catalog | null>(null);
  const [deleting, setDeleting] = useState<Catalog | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
      contact_email: "",
      is_public: false,
      logo_url: "",
      cover_image_url: "",
    },
  });

  const { data: catalogs, isLoading } = useQuery({
    queryKey: ["business", "catalogs", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Catalog[]> => {
      const { data, error } = await supabase
        .from("catalogs")
        .select("*")
        .eq("owner_user_id", userId as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Catalog[];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!userId) throw new Error("unauthorized");
      const payload = normalizeCatalogPayload(values);

      if (!editing) {
        const { error } = await supabase.from("catalogs").insert({ ...payload, owner_user_id: userId });
        if (error) throw error;
        return;
      }

      const { error } = await supabase.from("catalogs").update(payload).eq("id", editing.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["business", "catalogs", userId] });
      setDialogOpen(false);
      setEditing(null);
      toast({ title: "Kaydedildi" });
    },
    onError: (e) => toast({ title: humanizeCatalogError(e), variant: "destructive" }),
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, is_public }: { id: string; is_public: boolean }) => {
      const { error } = await supabase.from("catalogs").update({ is_public }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["business", "catalogs", userId] });
    },
    onError: (e) => toast({ title: humanizeCatalogError(e), variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("catalogs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["business", "catalogs", userId] });
      setDeleting(null);
      toast({ title: "Silindi" });
    },
    onError: (e) => toast({ title: humanizeCatalogError(e), variant: "destructive" }),
  });

  const previewUrl = useMemo(() => {
    const slug = (editing?.slug ?? form.watch("slug") ?? "").trim();
    if (!slug) return "";
    return `${window.location.origin}/brand/${slug}`;
  }, [editing?.slug, form]);

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: "", slug: "", contact_email: "", is_public: false, logo_url: "", cover_image_url: "" });
    setDialogOpen(true);
  };

  const openEdit = (c: Catalog) => {
    setEditing(c);
    form.reset({
      name: c.name,
      slug: c.slug,
      contact_email: c.contact_email,
      is_public: c.is_public,
      logo_url: c.logo_url ?? "",
      cover_image_url: c.cover_image_url ?? "",
    });
    setDialogOpen(true);
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Kataloglarım</h1>
          <p className="text-sm text-muted-foreground">Müşteriye açık URL yalnızca “Yayınla” açıkken çalışır.</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Yeni Katalog
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          <Card>
            <CardHeader>
              <CardTitle>Yükleniyor…</CardTitle>
            </CardHeader>
          </Card>
        ) : (catalogs ?? []).length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Henüz katalog yok</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">“Yeni Katalog” ile ilk kataloğunu oluştur.</p>
            </CardContent>
          </Card>
        ) : (
          (catalogs ?? []).map((c) => (
            <Card key={c.id}>
              <CardHeader className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-base">{c.name}</CardTitle>
                    <p className="truncate text-sm text-muted-foreground">/{c.slug}</p>
                  </div>
                  <Switch
                    checked={c.is_public}
                    onCheckedChange={(checked) => togglePublishMutation.mutate({ id: c.id, is_public: checked })}
                    aria-label="Yayınla"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => openEdit(c)}>
                    <Pencil className="h-4 w-4" /> Düzenle
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2" asChild>
                    <Link to={`/business/catalogs/${c.id}/products`}>
                      <Boxes className="h-4 w-4" /> Ürünler
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => setDeleting(c)}>
                    <Trash2 className="h-4 w-4" /> Sil
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2" asChild disabled={!c.is_public}>
                    <a href={`/brand/${c.slug}`} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" /> Aç
                    </a>
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">contact_email: {c.contact_email}</p>
                <div className="grid grid-cols-2 gap-2">
                  <img
                    src={c.logo_url || "/placeholder.svg"}
                    alt={`${c.name} logo`}
                    loading="lazy"
                    className="h-16 w-full rounded-md border border-border object-contain bg-background"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "/placeholder.svg";
                    }}
                  />
                  <img
                    src={c.cover_image_url || "/placeholder.svg"}
                    alt={`${c.name} kapak görseli`}
                    loading="lazy"
                    className="h-16 w-full rounded-md border border-border object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "/placeholder.svg";
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(v) => {
          if (!v) {
            setDialogOpen(false);
            setEditing(null);
            return;
          }
          setDialogOpen(true);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Kataloğu Düzenle" : "Yeni Katalog"}</DialogTitle>
            <DialogDescription>Alanlar: name, slug, contact_email, logo/cover URL, yayın durumu.</DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit(async (values) => {
                await upsertMutation.mutateAsync(values);
              })}
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Katalog adı</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          const nextName = e.target.value;
                          if (!editing) {
                            const currentSlug = form.getValues("slug");
                            if (!currentSlug) form.setValue("slug", slugify(nextName), { shouldValidate: true });
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="ornegin: acme-2026" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contact_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>İletişim e-postası</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="sales@company.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="logo_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Logo URL</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cover_image_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cover URL</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="is_public"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <FormLabel>Yayınla</FormLabel>
                      <p className="text-xs text-muted-foreground">Açık olunca public sayfa erişilebilir olur.</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex flex-col gap-2">
                <Button type="submit" disabled={upsertMutation.isPending}>
                  {upsertMutation.isPending ? "Kaydediliyor…" : "Kaydet"}
                </Button>
                {previewUrl ? <p className="text-xs text-muted-foreground">Public URL: {previewUrl}</p> : null}
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(v) => (!v ? setDeleting(null) : null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Silinsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleting?.name}” kalıcı olarak silinecek. Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleting) await deleteMutation.mutateAsync(deleting.id);
              }}
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
