import type { CSSProperties, ReactNode } from "react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/slug";
import { uploadPublicFile, sanitizeStorageFileName } from "@/lib/storage";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { arrayMove, buildSortOrderUpdates } from "@/lib/sort-order";
import { ChevronDown, ChevronRight, GripVertical, Plus, X } from "lucide-react";
import { Pencil } from "lucide-react";
import { Trash2 } from "lucide-react";
import { SignedImage } from "@/components/ui/signed-image";

const schema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().optional(),
});

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_image_url: string | null;
  parent_category_id?: string | null;
  is_active: boolean;
  created_at: string;
  sort_order: number;
};

function SortableCategoryRow({
  category,
  children,
}: {
  category: CategoryRow;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TableRow ref={setNodeRef as any} style={style} className={isDragging ? "opacity-70" : undefined}>
      <TableCell className="w-[44px]">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 cursor-grab"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </Button>
      </TableCell>
      {children}
    </TableRow>
  );
}

export default function AdminCategories() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const [subOpen, setSubOpen] = useState(false);
  const [subParentId, setSubParentId] = useState<string>("");
  const [subName, setSubName] = useState("");
  const [subSlug, setSubSlug] = useState("");
  const [subDescription, setSubDescription] = useState("");

  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState<string>("");

  const [editing, setEditing] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCoverUrl, setEditCoverUrl] = useState<string>("");
  const [editIsActive, setEditIsActive] = useState(true);

  useEffect(() => {
    if (!editing) return;
    setEditName(editing.name ?? "");
    setEditSlug(editing.slug ?? "");
    setEditDescription(editing.description ?? "");
    setEditCoverUrl(editing.cover_image_url ?? "");
    setEditIsActive(Boolean(editing.is_active));
  }, [editing]);

  const { data: categories } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CategoryRow[];
    },
  });

  const [items, setItems] = useState<CategoryRow[]>([]);
  useEffect(() => {
    setItems(categories ?? []);
  }, [categories]);

  const parents = useMemo(
    () => (items ?? []).filter((c) => !c.parent_category_id).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [items],
  );

  const childrenByParent = useMemo(() => {
    const m = new Map<string, CategoryRow[]>();
    for (const c of items ?? []) {
      if (!c.parent_category_id) continue;
      const arr = m.get(c.parent_category_id) ?? [];
      arr.push(c);
      m.set(c.parent_category_id, arr);
    }
    for (const [k, arr] of m) {
      arr.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      m.set(k, arr);
    }
    return m;
  }, [items]);

  useEffect(() => {
    // default: expand parents that have children
    setExpandedParents((prev) => {
      const next = { ...prev };
      for (const p of parents) {
        if (next[p.id] === undefined) {
          next[p.id] = (childrenByParent.get(p.id)?.length ?? 0) > 0;
        }
      }
      return next;
    });
  }, [parents, childrenByParent]);

  const parentIds = useMemo(() => parents.map((c) => c.id), [parents]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const parsed = schema.parse({
        name,
        slug: (slug || slugify(name)).trim(),
        description: description || undefined,
      });
      const { error } = await supabase.from("categories").insert({
        name: parsed.name,
        slug: parsed.slug,
        description: parsed.description ?? null,
        cover_image_url: coverUrl || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Category created");
      setOpen(false);
      setName("");
      setSlug("");
      setDescription("");
      setCoverUrl("");
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Create failed"),
  });

  const createSubMutation = useMutation({
    mutationFn: async () => {
      if (!subParentId) throw new Error("Parent category is required");
      const parsed = schema.parse({
        name: subName,
        slug: (subSlug || slugify(subName)).trim(),
        description: subDescription || undefined,
      });

      const siblings = childrenByParent.get(subParentId) ?? [];
      const nextSortOrder = (siblings.at(-1)?.sort_order ?? -1) + 1;

      const { error } = await supabase.from("categories").insert({
        name: parsed.name,
        slug: parsed.slug,
        description: parsed.description ?? null,
        parent_category_id: subParentId,
        sort_order: nextSortOrder,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Subcategory created");
      setSubOpen(false);
      setSubParentId("");
      setSubName("");
      setSubSlug("");
      setSubDescription("");
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to create subcategory"),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editing?.id) throw new Error("No category selected");
      const parsed = schema.parse({
        name: editName,
        slug: (editSlug || slugify(editName)).trim(),
        description: editDescription || undefined,
      });
      const { error } = await supabase
        .from("categories")
        .update({
          name: parsed.name,
          slug: parsed.slug,
          description: parsed.description ?? null,
          cover_image_url: editCoverUrl || null,
          is_active: editIsActive,
        })
        .eq("id", editing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Category updated");
      setEditOpen(false);
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Update failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", categoryId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Category deleted");
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Delete failed"),
  });

  const reorderMutation = useMutation({
    mutationFn: async (next: CategoryRow[]) => {
      const updates = buildSortOrderUpdates(next);
      const results = await Promise.all(
        updates.map((u) => supabase.from("categories").update({ sort_order: u.sort_order }).eq("id", u.id))
      );
      const firstError = results.find((r) => r.error)?.error;
      if (firstError) throw firstError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
    },
    onError: (e: any) => {
      toast.error(e?.message ?? "Reorder failed");
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
    },
  });

  return (
    <div className="p-4 md:p-6">
      <Card className="rounded-xl border-gray-200 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Categories</CardTitle>
            <p className="text-sm text-muted-foreground">Manage category structure for products.</p>
          </div>

          <div className="flex items-center gap-2">
            <Dialog
              open={subOpen}
              onOpenChange={(v) => {
                setSubOpen(v);
                if (!v) {
                  setSubParentId("");
                  setSubName("");
                  setSubSlug("");
                  setSubDescription("");
                }
              }}
            >
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4" />
                  Add new subcategory
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New subcategory</DialogTitle>
                </DialogHeader>

                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>Parent category</Label>
                    <Select value={subParentId} onValueChange={setSubParentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select parent category" />
                      </SelectTrigger>
                      <SelectContent>
                        {parents.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Ad</Label>
                    <Input value={subName} onChange={(e) => setSubName(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label>Slug</Label>
                    <Input
                      value={subSlug}
                      onChange={(e) => setSubSlug(e.target.value)}
                      placeholder={slugify(subName) || "alt-kategori-slug"}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={subDescription} onChange={(e) => setSubDescription(e.target.value)} />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setSubOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => createSubMutation.mutate()} disabled={createSubMutation.isPending}>
                    {createSubMutation.isPending ? "Creating…" : "Create"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4" />
                  Add category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add category</DialogTitle>
                </DialogHeader>

                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Slug</Label>
                    <Input
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder={slugify(name) || "category-slug"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Cover image</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const path = `categories/${Date.now()}-${sanitizeStorageFileName(file.name)}`;
                        const url = await uploadPublicFile({ bucket: "product-mockups", path, file });
                        setCoverUrl(url);
                        toast.success("Uploaded");
                      }}
                    />
                    {coverUrl ? (
                      <div className="mt-2 relative overflow-hidden rounded-md border">
                        <img
                          src={coverUrl}
                          alt="Category cover"
                          loading="lazy"
                          className="h-64 w-full object-contain"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8 rounded-full shadow-md"
                          aria-label="Remove cover"
                          onClick={() => setCoverUrl("")}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating…" : "Create"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[640px] rounded-md border">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={({ active, over }) => {
                if (!over || active.id === over.id) return;
                const oldIndex = parents.findIndex((c) => c.id === active.id);
                const newIndex = parents.findIndex((c) => c.id === over.id);
                if (oldIndex < 0 || newIndex < 0) return;

                const nextParents = arrayMove(parents, oldIndex, newIndex);
                // optimistic update
                setItems((prev) => {
                  const nextSort = new Map(nextParents.map((c, idx) => [c.id, idx] as const));
                  return prev.map((c) => (nextSort.has(c.id) ? { ...c, sort_order: nextSort.get(c.id)! } : c));
                });
                reorderMutation.mutate(nextParents);
              }}
            >
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[44px]" />
                  <TableHead>Category</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[170px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <SortableContext items={parentIds} strategy={verticalListSortingStrategy}>
                  {parents.map((p) => {
                    const children = childrenByParent.get(p.id) ?? [];
                    const isExpanded = Boolean(expandedParents[p.id]);
                    const hasChildren = children.length > 0;

                    return (
                      <Fragment key={p.id}>
                        <SortableCategoryRow category={p}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                aria-label={isExpanded ? "Collapse" : "Expand"}
                                onClick={() =>
                                  hasChildren &&
                                  setExpandedParents((prev) => ({ ...prev, [p.id]: !Boolean(prev[p.id]) }))
                                }
                                disabled={!hasChildren}
                              >
                                {hasChildren ? (
                                  isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )
                                ) : null}
                              </Button>

                              <div className="h-10 w-10 overflow-hidden rounded-md border bg-muted">
                                {p.cover_image_url ? (
                                  <SignedImage
                                    src={p.cover_image_url}
                                    alt={`${p.name} cover`}
                                    loading="lazy"
                                    className="h-full w-full object-cover"
                                  />
                                ) : null}
                              </div>

                              <div className="min-w-0">
                                <div className="truncate font-medium">{p.name}</div>
                                {p.description ? (
                                  <div className="truncate text-xs text-muted-foreground">{p.description}</div>
                                ) : null}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{p.slug}</TableCell>
                          <TableCell>{p.is_active ? "Yes" : "No"}</TableCell>
                          <TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditing(p);
                                  setEditOpen(true);
                                }}
                              >
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                              </Button>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="icon" aria-label="Delete category">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete category?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete “{p.name}”. This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteMutation.mutate(p.id)}
                                      disabled={deleteMutation.isPending}
                                    >
                                      {deleteMutation.isPending ? "Deleting…" : "Delete"}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </SortableCategoryRow>

                        {hasChildren && isExpanded
                          ? children.map((c) => (
                              <TableRow key={c.id} className="bg-muted/20">
                                <TableCell className="w-[44px]" />
                                <TableCell>
                                  <div className="flex items-center gap-3 pl-11">
                                    <div className="h-9 w-9 overflow-hidden rounded-md border bg-muted">
                                      {c.cover_image_url ? (
                                        <SignedImage
                                          src={c.cover_image_url}
                                          alt={`${c.name} cover`}
                                          loading="lazy"
                                          className="h-full w-full object-cover"
                                        />
                                      ) : null}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="truncate">{c.name}</div>
                                      {c.description ? (
                                        <div className="truncate text-xs text-muted-foreground">{c.description}</div>
                                      ) : null}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>{c.slug}</TableCell>
                                <TableCell>{c.is_active ? "Yes" : "No"}</TableCell>
                                <TableCell>{new Date(c.created_at).toLocaleDateString()}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setEditing(c);
                                        setEditOpen(true);
                                      }}
                                    >
                                      <Pencil className="mr-2 h-4 w-4" /> Edit
                                    </Button>

                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="outline" size="icon" aria-label="Delete category">
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete category?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            This will permanently delete “{c.name}”. This action cannot be undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => deleteMutation.mutate(c.id)}
                                            disabled={deleteMutation.isPending}
                                          >
                                            {deleteMutation.isPending ? "Deleting…" : "Delete"}
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          : null}
                      </Fragment>
                    );
                  })}
                </SortableContext>
                {(categories?.length ?? 0) === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      No categories yet.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
              </Table>
            </DndContext>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={editOpen}
        onOpenChange={(v) => {
          setEditOpen(v);
          if (!v) setEditing(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit category</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={editSlug}
                onChange={(e) => setEditSlug(e.target.value)}
                placeholder={slugify(editName) || "category-slug"}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-md border p-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">Active</div>
                <div className="text-xs text-muted-foreground">Hide/show this category in public lists.</div>
              </div>
              <Switch checked={editIsActive} onCheckedChange={setEditIsActive} />
            </div>

            <div className="space-y-2">
              <Label>Cover image</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const path = `categories/${Date.now()}-${sanitizeStorageFileName(file.name)}`;
                  const url = await uploadPublicFile({ bucket: "product-mockups", path, file });
                  setEditCoverUrl(url);
                  toast.success("Uploaded");
                }}
              />
              {editCoverUrl ? (
                <div className="mt-2 relative overflow-hidden rounded-md border">
                  <SignedImage
                    src={editCoverUrl}
                    alt="Category cover"
                    loading="lazy"
                    className="h-64 w-full object-contain"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 rounded-full shadow-md"
                    aria-label="Remove cover"
                    onClick={() => setEditCoverUrl("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
