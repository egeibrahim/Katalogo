import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { z } from "zod";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { ColorPoolPopover } from "@/components/designer/ColorPoolPopover";

import {
  PrelineButton,
  PrelineCard,
  PrelineCardContent,
  PrelineCardHeader,
  PrelineCardTitle,
  PrelineInput,
  PrelineSelect,
  PrelineModal,
  PrelineModalTrigger,
} from "@/components/preline";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Settings, X, GripVertical, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AdminAttributeValuesList } from "@/components/admin/AdminAttributeValuesList";

// NOTE: Previously some attribute keys were "protected" (non-editable) to prevent accidental changes.
// Per request, we allow admins to edit/delete/manage options for all attributes.
const isProtectedAttributeKey = (_k?: string | null) => false;

const displayAttributeName = (attr: { key?: string | null; name?: string | null }) => {
  const k = (attr.key ?? "").toLowerCase();
  if (k === "technique" || k === "decoration_method" || k === "method") return "Technique";
  if (k === "elements") return "Elements";
  if (k === "season") return "Season";
  return attr.name ?? "";
};

/** Filters tablosunda Key sütununda gösterilecek değer: decoration_method/method → technique */
const displayAttributeKey = (key: string | null | undefined) => {
  const k = (key ?? "").toLowerCase();
  if (k === "decoration_method" || k === "method") return "technique";
  return key ?? "";
};

const schema = z.object({
  name: z.string().min(2),
  key: z.string().min(2),
  type: z.enum(["text", "number", "select", "multiselect"]),
  category_id: z.string().nullable(),
});

// Sortable Badge Component
function SortableBadge({ 
  optionId, 
  value, 
  hex, 
  name, 
  attributeKey, 
  onDelete 
}: { 
  optionId: string; 
  value: string; 
  hex: string | null; 
  name: string; 
  attributeKey: string; 
  onDelete: () => void 
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: optionId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
    >
      {attributeKey === "color" ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={name}
              title={name}
              className="group relative h-7 w-7 shrink-0 rounded-full border border-border"
              style={{ backgroundColor: hex ?? "transparent" }}
              {...attributes}
              {...listeners}
            >
              <span className="sr-only">{name}</span>
              <span className="pointer-events-none absolute inset-0 rounded-full ring-0 ring-primary/50 transition group-hover:ring-2" />
              <span className="absolute -top-1 -right-1 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm hover:text-destructive">
                  <X
                    className="h-3 w-3"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDelete();
                    }}
                  />
                </span>
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="font-medium leading-none">{name}</p>
            <p className="mt-1 text-xs text-muted-foreground leading-none">{hex ?? ""}</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        <Badge
          variant="outline"
          className="gap-1 pl-1.5 cursor-move"
          title={hex ? `${name}\n${hex}` : name}
        >
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="h-3 w-3 text-muted-foreground" />
          </div>
          {hex && (
            <span
              className="inline-block w-3 h-3 rounded-full border border-border"
              style={{ backgroundColor: hex }}
            />
          )}
          {value}
          <button onClick={onDelete} className="ml-1 hover:text-destructive">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}
    </div>
  );
}

function SortableAttributeRow({
  attrId,
  children,
}: {
  attrId: string;
  children: (args: { handle: JSX.Element; isDragging: boolean }) => any;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: attrId });

  const style: any = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      className="-ml-1 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted cursor-grab active:cursor-grabbing"
      aria-label="Reorder"
      title="Drag to reorder"
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );

  return <TableRow ref={setNodeRef} style={style}>{children({ handle, isDragging })}</TableRow>;
}

export default function AdminAttributes() {
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [type, setType] = useState<"text" | "number" | "select" | "multiselect">("text");
  // Radix Select does not play nicely with empty-string values; use a sentinel for "global".
  const GLOBAL_CATEGORY = "__global__";
  const [categoryId, setCategoryId] = useState<string>(GLOBAL_CATEGORY);

  const [editing, setEditing] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editKey, setEditKey] = useState("");
  const [editType, setEditType] = useState<"text" | "number" | "select" | "multiselect">("text");
  const [editCategoryId, setEditCategoryId] = useState<string>(GLOBAL_CATEGORY);
  
  const [expandedAttrId, setExpandedAttrId] = useState<string | null>(null);
  const [newOptionValue, setNewOptionValue] = useState("");

  const [orderedAttrs, setOrderedAttrs] = useState<any[]>([]);

  const ensureSessionOrRedirect = async () => {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session) {
      toast.error("Your session may have expired. Please sign in again.");
      navigate("/auth", { replace: true, state: { from: location } });
      throw new Error("SESSION_EXPIRED");
    }

    return session;
  };

  const handleMutationError = (e: any, fallback = "Operation failed") => {
    const msg = String(e?.message ?? "");
    const isRls = msg.toLowerCase().includes("row-level security") || msg.toLowerCase().includes("violates row-level");

    if (e?.message === "SESSION_EXPIRED") return;

    if (isRls) {
      toast.error("Admin permission required for this action (or your session may have expired). Try signing in again.");
      return;
    }

    toast.error(msg || fallback);
  };

  // Helper to extract hex code from "Name (#HEXCODE)" format
  const extractHex = (value: string): string | null => {
    const match = value.match(/#[0-9A-Fa-f]{6}/);
    return match ? match[0] : null;
  };

  const extractName = (value: string): string => {
    return value.replace(/\s*\(#[0-9A-Fa-f]{6}\)\s*/, '').trim() || value;
  };

  const { data: categories } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: async () => {
      // Keep this list identical to /admin/categories: include all rows and use sort_order.
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    (categories ?? []).forEach((c: any) => {
      if (c?.id) map.set(c.id, c.name);
    });
    return map;
  }, [categories]);

  const { data: attrs } = useQuery({
    queryKey: ["admin", "attributes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attributes")
        .select(`
          *,
          attribute_values(id, value, sort_order, is_active)
        `)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(attr => ({
        ...attr,
        attribute_values: (attr.attribute_values as any[] ?? []).sort((a, b) => a.sort_order - b.sort_order)
      }));
    },
  });

  useEffect(() => {
    setOrderedAttrs(attrs ?? []);
  }, [attrs]);

  // Ensure Sleeve Length filter exists (fallback if migration not run)
  const sleeveLengthEnsured = useRef(false);
  useEffect(() => {
    if (!attrs?.length || sleeveLengthEnsured.current) return;
    const hasSleeveLength = attrs.some((a: any) => (a.key ?? "").toLowerCase() === "sleeve_length");
    if (hasSleeveLength) return;
    sleeveLengthEnsured.current = true;
    (async () => {
      try {
        const { data: existing } = await supabase.from("attributes").select("id").eq("key", "sleeve_length").maybeSingle();
        if (existing?.id) {
          qc.invalidateQueries({ queryKey: ["admin", "attributes"] });
          return;
        }
        const { data: maxOrd } = await supabase.from("attributes").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
        const sortOrder = ((maxOrd as any)?.sort_order ?? -1) + 1;
        const { data: inserted, error: insErr } = await supabase
          .from("attributes")
          .insert({ name: "Sleeve Length", key: "sleeve_length", type: "multiselect", sort_order: sortOrder, is_active: true })
          .select("id")
          .single();
        if (insErr || !inserted?.id) {
          if (insErr?.code !== "23505") toast.error("Sleeve Length filter eklenemedi.");
          return;
        }
        const values = [
          { attribute_id: inserted.id, value: "Sleeveless", sort_order: 0, is_active: true },
          { attribute_id: inserted.id, value: "Short Sleeve", sort_order: 1, is_active: true },
          { attribute_id: inserted.id, value: "Half Sleeve", sort_order: 2, is_active: true },
          { attribute_id: inserted.id, value: "3/4 Sleeve", sort_order: 3, is_active: true },
          { attribute_id: inserted.id, value: "Long Sleeve", sort_order: 4, is_active: true },
          { attribute_id: inserted.id, value: "Extra Long Sleeve", sort_order: 5, is_active: true },
        ];
        const { error: valsErr } = await supabase.from("attribute_values").insert(values);
        if (valsErr) {
          toast.error("Could not add Sleeve Length options.");
          return;
        }
        toast.success("Sleeve Length filter eklendi.");
        qc.invalidateQueries({ queryKey: ["admin", "attributes"] });
      } catch {
        sleeveLengthEnsured.current = false;
      }
    })();
  }, [attrs, qc]);

  // Filters → Elements: verdiğin liste options olarak eklensin (yoksa attribute + options oluştur)
  const ELEMENTS_OPTIONS = [
    "None", "Snow Wash", "Washed", "Frayed", "Pocket", "Elastic Waist", "Drawstring", "Zipper",
    "Patchwork", "Ripped", "Slit", "Pleated", "Button", "Elastic Straps", "Knotted", "Hollow Out", "Asymmetrical",
  ];
  const elementsEnsured = useRef(false);
  useEffect(() => {
    if (attrs === undefined || elementsEnsured.current) return;
    elementsEnsured.current = true;
    (async () => {
      try {
        let attrId: string | null = null;
        const elementsAttr = Array.isArray(attrs) ? attrs.find((a: any) => (a.key ?? "").toLowerCase() === "elements") : null;
        if (elementsAttr?.id) attrId = elementsAttr.id;
        if (!attrId) {
          const { data: existing } = await supabase.from("attributes").select("id").eq("key", "elements").maybeSingle();
          attrId = existing?.id ?? null;
        }
        if (!attrId) {
          const { data: maxOrd } = await supabase.from("attributes").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
          const sortOrder = ((maxOrd as any)?.sort_order ?? -1) + 1;
          const { data: inserted, error: insErr } = await supabase
            .from("attributes")
            .insert({ name: "Elements", key: "elements", type: "multiselect", sort_order: sortOrder, is_active: true })
            .select("id")
            .single();
          if (insErr || !inserted?.id) {
            if (insErr?.code !== "23505") toast.error("Elements filter eklenemedi.");
            return;
          }
          attrId = inserted.id;
        }
        const currentValues = (elementsAttr?.attribute_values ?? []) as { value?: string }[];
        const existingSet = new Set((currentValues).map((v) => String(v.value ?? "").trim().toLowerCase()));
        const toAdd = ELEMENTS_OPTIONS.filter((v) => !existingSet.has(v.toLowerCase()));
        if (toAdd.length === 0) {
          qc.invalidateQueries({ queryKey: ["admin", "attributes"] });
          return;
        }
        const { data: freshVals } = await supabase.from("attribute_values").select("value").eq("attribute_id", attrId);
        const freshSet = new Set((freshVals ?? []).map((r: any) => String(r.value ?? "").trim().toLowerCase()));
        const toInsert = ELEMENTS_OPTIONS.filter((v) => !freshSet.has(v.toLowerCase()));
        if (toInsert.length === 0) {
          qc.invalidateQueries({ queryKey: ["admin", "attributes"] });
          return;
        }
        const rows = toInsert.map((value, i) => ({
          attribute_id: attrId,
          value,
          sort_order: ELEMENTS_OPTIONS.indexOf(value),
          is_active: true,
        }));
        const { error: valsErr } = await supabase.from("attribute_values").insert(rows);
        if (valsErr) {
          toast.error("Could not add Elements options.");
          return;
        }
        toast.success("Elements options added.");
        qc.invalidateQueries({ queryKey: ["admin", "attributes"] });
      } catch {
        elementsEnsured.current = false;
      }
    })();
  }, [attrs, qc]);

  // Filters ↔ Edits Style eşleşmesi: Style options aynı kaynaktan (attribute_values)
  const STYLE_OPTIONS = [
    "Casual", "Street", "Basics", "Preppy", "Sporty", "Vintage", "Sexy", "Elegant", "Cute", "Glamorous", "Business",
  ];
  const styleEnsured = useRef(false);
  useEffect(() => {
    if (attrs === undefined || styleEnsured.current) return;
    const styleAttr = Array.isArray(attrs) ? attrs.find((a: any) => (a.key ?? "").toLowerCase() === "style") : null;
    styleEnsured.current = true;
    (async () => {
      try {
        let attrId: string | null = styleAttr?.id ?? null;
        if (!attrId) {
          const { data: existing } = await supabase.from("attributes").select("id").eq("key", "style").maybeSingle();
          attrId = existing?.id ?? null;
        }
        if (!attrId) {
          const { data: maxOrd } = await supabase.from("attributes").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
          const sortOrder = ((maxOrd as any)?.sort_order ?? -1) + 1;
          const { data: inserted, error: insErr } = await supabase
            .from("attributes")
            .insert({ name: "Style", key: "style", type: "multiselect", sort_order: sortOrder, is_active: true })
            .select("id")
            .single();
          if (insErr || !inserted?.id) {
            if (insErr?.code !== "23505") toast.error("Style filter eklenemedi.");
            return;
          }
          attrId = inserted.id;
        }
        const currentValues = (styleAttr?.attribute_values ?? []) as { value?: string }[];
        const existingSet = new Set((currentValues).map((v) => String(v.value ?? "").trim().toLowerCase()));
        const toInsert = STYLE_OPTIONS.filter((v) => !existingSet.has(v.toLowerCase()));
        if (toInsert.length === 0) {
          qc.invalidateQueries({ queryKey: ["admin", "attributes"] });
          return;
        }
        const { data: freshAttr } = await supabase.from("attribute_values").select("value").eq("attribute_id", attrId);
        const freshSet = new Set((freshAttr ?? []).map((r: any) => String(r.value ?? "").trim().toLowerCase()));
        const toAdd = STYLE_OPTIONS.filter((v) => !freshSet.has(v.toLowerCase()));
        if (toAdd.length === 0) {
          qc.invalidateQueries({ queryKey: ["admin", "attributes"] });
          return;
        }
        const values = toAdd.map((value) => ({
          attribute_id: attrId,
          value,
          sort_order: STYLE_OPTIONS.indexOf(value),
          is_active: true,
        }));
        const { error: valsErr } = await supabase.from("attribute_values").insert(values);
        if (valsErr) {
          toast.error("Could not add Style options.");
          return;
        }
        toast.success("Style options added.");
        qc.invalidateQueries({ queryKey: ["admin", "attributes"] });
      } catch {
        styleEnsured.current = false;
      }
    })();
  }, [attrs, qc]);

  // Filters → Season: 4 mevsim dahil seçenekler (product edits ile eşleşir)
  const SEASON_OPTIONS = ["Spring", "Summer", "Fall", "Winter", "4 mevsim"];
  const seasonEnsured = useRef(false);
  useEffect(() => {
    if (attrs === undefined || seasonEnsured.current) return;
    seasonEnsured.current = true;
    (async () => {
      try {
        let attrId: string | null = null;
        const seasonAttr = Array.isArray(attrs) ? attrs.find((a: any) => (a.key ?? "").toLowerCase() === "season") : null;
        if (seasonAttr?.id) attrId = seasonAttr.id;
        if (!attrId) {
          const { data: existing } = await supabase.from("attributes").select("id").eq("key", "season").maybeSingle();
          attrId = existing?.id ?? null;
        }
        if (!attrId) {
          const { data: maxOrd } = await supabase.from("attributes").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
          const sortOrder = ((maxOrd as any)?.sort_order ?? -1) + 1;
          const { data: inserted, error: insErr } = await supabase
            .from("attributes")
            .insert({ name: "Season", key: "season", type: "multiselect", sort_order: sortOrder, is_active: true })
            .select("id")
            .single();
          if (insErr || !inserted?.id) {
            if (insErr?.code !== "23505") toast.error("Season filter eklenemedi.");
            return;
          }
          attrId = inserted.id;
        }
        const currentValues = (seasonAttr?.attribute_values ?? []) as { value?: string }[];
        const existingSet = new Set((currentValues).map((v) => String(v.value ?? "").trim().toLowerCase()));
        const toInsert = SEASON_OPTIONS.filter((v) => !existingSet.has(v.toLowerCase()));
        if (toInsert.length === 0) {
          qc.invalidateQueries({ queryKey: ["admin", "attributes"] });
          return;
        }
        const { data: freshVals } = await supabase.from("attribute_values").select("value").eq("attribute_id", attrId);
        const freshSet = new Set((freshVals ?? []).map((r: any) => String(r.value ?? "").trim().toLowerCase()));
        const toAdd = SEASON_OPTIONS.filter((v) => !freshSet.has(v.toLowerCase()));
        if (toAdd.length === 0) {
          qc.invalidateQueries({ queryKey: ["admin", "attributes"] });
          return;
        }
        const rows = toAdd.map((value) => ({
          attribute_id: attrId,
          value,
          sort_order: SEASON_OPTIONS.indexOf(value),
          is_active: true,
        }));
        const { error: valsErr } = await supabase.from("attribute_values").insert(rows);
        if (valsErr) {
          toast.error("Could not add Season options.");
          return;
        }
        toast.success("Season options added (4 seasons).");
        qc.invalidateQueries({ queryKey: ["admin", "attributes"] });
      } catch {
        seasonEnsured.current = false;
      }
    })();
  }, [attrs, qc]);

  const handleAttributesDragEnd = async (event: DragEndEvent, current: any[]) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = current.findIndex((a) => a.id === active.id);
    const newIndex = current.findIndex((a) => a.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(current, oldIndex, newIndex);
    setOrderedAttrs(reordered);

    const updates = reordered.map((a, idx) => ({ id: a.id, sort_order: idx }));

    try {
      await ensureSessionOrRedirect();
      await Promise.all(
        updates.map((u) => supabase.from("attributes").update({ sort_order: u.sort_order }).eq("id", u.id))
      );
      toast.success("Order updated");
      qc.invalidateQueries({ queryKey: ["admin", "attributes"] });
    } catch (e: any) {
      handleMutationError(e, "Could not update order");
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      await ensureSessionOrRedirect();
      const parsed = schema.parse({
        name,
        key,
        type,
        category_id: categoryId === GLOBAL_CATEGORY ? null : categoryId,
      });
      const payload = {
        name: parsed.name,
        key: parsed.key,
        type: parsed.type,
        category_id: parsed.category_id,
      };
      const { error } = await supabase.from("attributes").insert([payload]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Attribute created");
      (window as any).HSOverlay?.close?.("#add-attribute-modal");
      setName("");
      setKey("");
      setType("text");
      setCategoryId(GLOBAL_CATEGORY);
      qc.invalidateQueries({ queryKey: ["admin", "attributes"] });
    },
    onError: (e: any) => handleMutationError(e, "Create failed"),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      await ensureSessionOrRedirect();
      if (!editing?.id) throw new Error("No attribute selected");
      const parsed = schema.parse({
        name: editName,
        key: editKey,
        type: editType,
        category_id: editCategoryId === GLOBAL_CATEGORY ? null : editCategoryId,
      });

      const { error } = await supabase
        .from("attributes")
        .update({
          name: parsed.name,
          key: parsed.key,
          type: parsed.type,
          category_id: parsed.category_id,
        })
        .eq("id", editing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Attribute updated");
      setEditOpen(false);
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin", "attributes"] });
    },
    onError: (e: any) => handleMutationError(e, "Update failed"),
  });

  const deleteAttributeMutation = useMutation({
    mutationFn: async ({ attrId, attributeKey, attributeName }: { attrId: string; attributeKey: string; attributeName: string }) => {
      await ensureSessionOrRedirect();
      // region/fulfillment_from: options now from FULFILLMENT_COUNTRIES; allow delete.
      const skipUsedCheck = attributeKey === "region" || attributeKey === "fulfillment_from";
      if (!skipUsedCheck) {
      const { data: isUsed, error: usedError } = await supabase.rpc("is_attribute_used", {
        _attribute_key: attributeKey,
      });
      if (usedError) throw usedError;
      if (isUsed) {
        throw new Error(`“${attributeName}” (key: ${attributeKey}) is used by products; cannot delete.`);
      }
      }

      // Ensure options are removed before deleting the attribute (avoids FK issues).
      const { error: valuesError } = await supabase.from("attribute_values").delete().eq("attribute_id", attrId);
      if (valuesError) throw valuesError;

      const { error: attrError } = await supabase.from("attributes").delete().eq("id", attrId);
      if (attrError) throw attrError;
    },
    onSuccess: () => {
      toast.success("Attribute deleted");
      qc.invalidateQueries({ queryKey: ["admin", "attributes"] });
    },
    onError: (e: any) => handleMutationError(e, "Delete failed"),
  });

  const addOptionMutation = useMutation({
    mutationFn: async ({ attrId, value, attributeKey }: { attrId: string; value: string; attributeKey: string }) => {
      await ensureSessionOrRedirect();
      const { error } = await supabase.from("attribute_values").insert([
        { attribute_id: attrId, value: value.trim(), sort_order: 0 },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Option added");
      setNewOptionValue("");
      qc.invalidateQueries({ queryKey: ["admin", "attributes"] });
    },
    onError: (e: any) => handleMutationError(e, "Failed to add option"),
  });

  const importRegionCountriesMutation = useMutation({
    mutationFn: async () => {
      await ensureSessionOrRedirect();
      const { data, error } = await supabase.functions.invoke("import-region-countries", {
        body: {
          sourceUrl: "https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.csv",
        },
      });
      if (error) throw error;
      return data as any;
    },
    onSuccess: (res: any) => {
      toast.success(`Region countries loaded: ${res?.inserted ?? "?"} added`);
      qc.invalidateQueries({ queryKey: ["admin", "attributes"] });
    },
    onError: (e: any) => handleMutationError(e, "Could not load countries"),
  });

  const deleteOptionMutation = useMutation({
    mutationFn: async ({ optionId, attributeKey }: { optionId: string; attributeKey: string }) => {
      await ensureSessionOrRedirect();
      const { error } = await supabase.from("attribute_values").delete().eq("id", optionId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Option deleted");
      qc.invalidateQueries({ queryKey: ["admin", "attributes"] });
    },
    onError: (e: any) => handleMutationError(e, "Failed to delete option"),
  });

  // Handle color pool selection
  const handleColorPoolSelect = (attrId: string, hexCode: string, colorName: string) => {
    const formattedValue = `${colorName} (${hexCode})`;
    addOptionMutation.mutate({ attrId, value: formattedValue, attributeKey: "color" });
  };

  const handleDragEnd = async (event: DragEndEvent, attrId: string, currentOptions: any[]) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = currentOptions.findIndex(opt => opt.id === active.id);
    const newIndex = currentOptions.findIndex(opt => opt.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(currentOptions, oldIndex, newIndex);

    // Update sort_order for all items
    const updates = reordered.map((opt, idx) => ({
      id: opt.id,
      sort_order: idx,
    }));

    try {
      await ensureSessionOrRedirect();
      // Update all in parallel
      await Promise.all(
        updates.map(u =>
          supabase
            .from("attribute_values")
            .update({ sort_order: u.sort_order })
            .eq("id", u.id)
        )
      );

      toast.success("Order updated");
      qc.invalidateQueries({ queryKey: ["admin", "attributes"] });
    } catch (e: any) {
      handleMutationError(e, "Could not update order");
    }
  };

  return (
    <div className="p-3 md:p-4">
      <PrelineCard>
        <PrelineCardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <PrelineCardTitle>Filter</PrelineCardTitle>
            <p className="text-sm text-gray-500">Define filter fields and their types.</p>
          </div>

          <PrelineModalTrigger id="add-attribute-modal" asChild>
            <PrelineButton size="sm">
              <Plus className="h-4 w-4" />
              Add Attribute
            </PrelineButton>
          </PrelineModalTrigger>
        </PrelineCardHeader>

        <PrelineModal id="add-attribute-modal" title="Add Attribute">
          <div className="grid gap-3">
            <PrelineInput label="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <PrelineInput label="Key" value={key} onChange={(e) => setKey(e.target.value)} placeholder="e.g. material" />
            <PrelineSelect
              label="Type"
              value={type}
              onChange={(e) => setType(e.target.value as "text" | "number" | "select" | "multiselect")}
              options={[
                { value: "text", label: "text" },
                { value: "number", label: "number" },
                { value: "select", label: "select" },
                { value: "multiselect", label: "multiselect" },
              ]}
            />
            <div>
              <PrelineSelect
                label="Category (optional)"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                placeholder="All categories (global)"
                options={[
                  { value: GLOBAL_CATEGORY, label: "All categories (global)" },
                  ...(categories ?? []).map((cat: any) => ({ value: cat.id, label: cat.name })),
                ]}
              />
              <p className="mt-1 text-xs text-gray-500">
                Leave empty for global attributes available to all categories
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-end gap-2 border-t border-gray-200 pt-4">
            <PrelineButton
              variant="outline"
              size="sm"
              onClick={() => (window as any).HSOverlay?.close?.("#add-attribute-modal")}
            >
              Cancel
            </PrelineButton>
            <PrelineButton size="sm" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create"}
            </PrelineButton>
          </div>
        </PrelineModal>

        <PrelineCardContent className="pt-0">
          <div className="rounded-lg border border-gray-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Options</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={() => setExpandedAttrId(null)}
                  onDragEnd={(event) => handleAttributesDragEnd(event, orderedAttrs)}
                >
                  <SortableContext items={orderedAttrs.map((a) => a.id)} strategy={verticalListSortingStrategy}>
                    {orderedAttrs.map((a: any) => (
                      <Collapsible key={a.id} asChild open={expandedAttrId === a.id} onOpenChange={(open) => setExpandedAttrId(open ? a.id : null)}>
                        <>
                          <SortableAttributeRow attrId={a.id}>
                            {({ handle }) => (
                              <>
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    {handle}
                                    <span>{displayAttributeName(a)}</span>
                                  </div>
                                </TableCell>
                                <TableCell>{displayAttributeKey(a.key)}</TableCell>
                                <TableCell>{a.type}</TableCell>
                                <TableCell>
                                  {a.category_id ? (
                                    categoryNameById.get(a.category_id) ?? (
                                      <span className="text-muted-foreground italic">(Deleted category)</span>
                                    )
                                  ) : (
                                    <span className="text-muted-foreground italic">Global</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary">{a.attribute_values?.length ?? 0} options</Badge>
                                </TableCell>
                                <TableCell>{new Date(a.created_at).toLocaleDateString()}</TableCell>
                                <TableCell>
                                  <div className="flex items-center justify-end gap-2">
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      aria-label="Edit attribute"
                                      disabled={false}
                                      title="Edit"
                                      onClick={() => {
                                        setEditing(a);
                                        setEditName(a.name ?? "");
                                        setEditKey(a.key ?? "");
                                        setEditType(a.type);
                                        setEditCategoryId(a.category_id ?? GLOBAL_CATEGORY);
                                        setEditOpen(true);
                                      }}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>

                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          aria-label="Delete attribute"
                                          disabled={false}
                                          title="Sil"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete this attribute?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            “{a.name}” attribute and all its options will be permanently deleted. This cannot be undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() =>
                                              deleteAttributeMutation.mutate({
                                                attrId: a.id,
                                                attributeKey: a.key,
                                                attributeName: a.name,
                                              })
                                            }
                                            disabled={deleteAttributeMutation.isPending}
                                          >
                                            {deleteAttributeMutation.isPending ? "Deleting…" : "Delete"}
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>

                                    <CollapsibleTrigger asChild>
                                      <Button variant="ghost" size="icon" aria-label="Manage options">
                                        <Settings className="h-4 w-4" />
                                      </Button>
                                    </CollapsibleTrigger>
                                  </div>
                                </TableCell>
                              </>
                            )}
                          </SortableAttributeRow>

                          <CollapsibleContent asChild>
                            <TableRow>
                              <TableCell colSpan={7} className="bg-muted/50 p-4">
                                <div className="space-y-3">
                                  {a.key === 'color' ? (
                                    <div
                                      className="flex items-center gap-2"
                                    >
                                      <ColorPoolPopover
                                        mode="multi"
                                        selectedColorIds={[]}
                                        onColorToggle={(colorId, hexCode) => {
                                          // Fetch color name from product_colors
                                          supabase
                                            .from("product_colors")
                                            .select("name")
                                            .eq("id", colorId)
                                            .single()
                                            .then(({ data }) => {
                                              if (data) {
                                                handleColorPoolSelect(a.id, hexCode, data.name);
                                              }
                                            });
                                        }}
                                      />
                                      <span className="text-sm text-muted-foreground">Select from color pool</span>
                                    </div>
                                  ) : (
                                     <div className="grid gap-3">
                                       <div className="flex flex-wrap items-center gap-2">
                                       <Input
                                         placeholder="Add new option..."
                                         value={newOptionValue}
                                         onChange={(e) => setNewOptionValue(e.target.value)}
                                         onKeyDown={(e) => {
                                           if (e.key === "Enter" && newOptionValue.trim()) {
                                             addOptionMutation.mutate({ attrId: a.id, value: newOptionValue, attributeKey: a.key });
                                           }
                                         }}
                                         className="w-full max-w-xs"
                                         disabled={false}
                                       />

                                       <Button
                                         size="sm"
                                         onClick={() =>
                                           newOptionValue.trim() &&
                                           addOptionMutation.mutate({ attrId: a.id, value: newOptionValue, attributeKey: a.key })
                                         }
                                         disabled={!newOptionValue.trim() || addOptionMutation.isPending}
                                       >
                                         <Plus className="h-4 w-4 mr-1" />
                                         Add
                                       </Button>

                                        {a.key === "region" ? (
                                          <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={importRegionCountriesMutation.isPending}
                                              >
                                                Load ISO countries
                                              </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                              <AlertDialogHeader>
                                                <AlertDialogTitle>Refresh region list?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                  Filters/region options will be removed and ISO country list will be reloaded in "Name (CODE)" format.
                                                </AlertDialogDescription>
                                              </AlertDialogHeader>
                                              <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                  onClick={() => importRegionCountriesMutation.mutate()}
                                                  disabled={importRegionCountriesMutation.isPending}
                                                >
                                                  {importRegionCountriesMutation.isPending ? "Loading…" : "Load"}
                                                </AlertDialogAction>
                                              </AlertDialogFooter>
                                            </AlertDialogContent>
                                          </AlertDialog>
                                        ) : null}
                                     </div>

                                       <AdminAttributeValuesList
                                         options={(a.attribute_values ?? []).map((opt: any) => ({ id: opt.id, value: opt.value }))}
                                         onDelete={(id) => deleteOptionMutation.mutate({ optionId: id, attributeKey: a.key })}
                                         onReorder={async (orderedIds) => {
                                           try {
                                             await ensureSessionOrRedirect();
                                             await Promise.all(
                                               orderedIds.map((id, idx) =>
                                                 supabase.from("attribute_values").update({ sort_order: idx }).eq("id", id)
                                               )
                                             );
                                             toast.success("Order updated");
                                             qc.invalidateQueries({ queryKey: ["admin", "attributes"] });
                                             qc.invalidateQueries({ queryKey: ["admin", "sizes"] });
                                           } catch (e: any) {
                                             handleMutationError(e, "Could not update order");
                                           }
                                         }}
                                       />
                                     </div>
                                  )}

                                   {a.key === "color" ? (
                                     <DndContext
                                       sensors={sensors}
                                       collisionDetection={closestCenter}
                                       onDragEnd={(event) => {
                                         handleDragEnd(event, a.id, a.attribute_values ?? []);
                                       }}
                                     >
                                       <SortableContext
                                         items={(a.attribute_values ?? []).map((opt: any) => opt.id)}
                                         strategy={verticalListSortingStrategy}
                                       >
                                         <TooltipProvider delayDuration={200}>
                                           <div className="flex flex-wrap gap-1.5">
                                             {(a.attribute_values ?? []).map((opt: any) => {
                                               const hex = extractHex(opt.value);
                                               const name = extractName(opt.value);

                                               return (
                                                 <SortableBadge
                                                   key={opt.id}
                                                   optionId={opt.id}
                                                   value={opt.value}
                                                   hex={hex}
                                                   name={name}
                                                   attributeKey={a.key}
                                                   onDelete={() => deleteOptionMutation.mutate({ optionId: opt.id, attributeKey: a.key })}
                                                 />
                                               );
                                             })}
                                             {(a.attribute_values?.length ?? 0) === 0 && (
                                               <span className="text-sm text-muted-foreground italic">No options yet</span>
                                             )}
                                           </div>
                                         </TooltipProvider>
                                       </SortableContext>
                                     </DndContext>
                                    ) : null}
                                </div>
                              </TableCell>
                            </TableRow>
                          </CollapsibleContent>
                        </>
                      </Collapsible>
                    ))}
                  </SortableContext>
                </DndContext>
                {(attrs?.length ?? 0) === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      No attributes yet.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </PrelineCardContent>
      </PrelineCard>

      <Dialog
        open={editOpen}
        onOpenChange={(v) => {
          setEditOpen(v);
          if (!v) setEditing(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit attribute</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Key</Label>
              <Input value={editKey} onChange={(e) => setEditKey(e.target.value)} placeholder="e.g. material" />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={editType} onValueChange={(v) => setEditType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">text</SelectItem>
                  <SelectItem value="number">number</SelectItem>
                  <SelectItem value="select">select</SelectItem>
                  <SelectItem value="multiselect">multiselect</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category (optional)</Label>
              <Select value={editCategoryId} onValueChange={setEditCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories (global)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={GLOBAL_CATEGORY}>All categories (global)</SelectItem>
                  {(categories ?? []).map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Leave empty for global attributes available to all categories</p>
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
