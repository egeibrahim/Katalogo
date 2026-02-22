import { useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { Checkbox } from "@/components/ui/checkbox";
import { FilterMultiSelectDropdown, type FilterKey } from "@/components/newcatalog/collection/FilterMultiSelectDropdown";

export function CollectionFilters() {
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const filtersWrapRef = useRef<HTMLDivElement | null>(null);

  const [selected, setSelected] = useState<Record<string, string[]>>({
    deliverTo: [],
    fulfillment: [],
    size: [],
    color: [],
    fit: [],
    printAreas: [],
    sleeveLength: [],
    elements: [],
  });

  // Elements ve Style seçenekleri: admin/filters (attributes + attribute_values) ile eşleşir
  const { data: filterAttributesOptions } = useQuery({
    queryKey: ["public", "filter_attributes", "elements_style"],
    queryFn: async () => {
      const { data: attrs, error: attrsErr } = await supabase
        .from("attributes")
        .select("id,key")
        .in("key", ["elements", "style"])
        .eq("is_active", true);
      if (attrsErr || !attrs?.length) return { elements: [] as string[], style: [] as string[] };
      const out: { elements: string[]; style: string[] } = { elements: [], style: [] };
      for (const attr of attrs) {
        const { data: vals } = await supabase
          .from("attribute_values")
          .select("value,sort_order")
          .eq("attribute_id", attr.id)
          .eq("is_active", true)
          .order("sort_order", { ascending: true });
        const arr = (vals ?? []).map((v: any) => String(v.value ?? "").trim()).filter(Boolean);
        if ((attr.key ?? "").toLowerCase() === "elements") out.elements = arr;
        if ((attr.key ?? "").toLowerCase() === "style") out.style = arr;
      }
      return out;
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: attributeOptions } = useQuery({
    queryKey: ["public", "product_attributes", "distinct-options"],
    queryFn: async () => {
      // Public RLS allows SELECT; we aggregate client-side.
      const { data, error } = await supabase.from("product_attributes").select("data").limit(1000);
      if (error) throw error;
      const acc: Record<string, Set<string>> = {
        region: new Set(),
        fulfillment_from: new Set(),
        size: new Set(),
        color: new Set(),
        fit: new Set(),
        print_areas: new Set(),
        sleeve_length: new Set(),
        thickness: new Set(),
        fabric_weight: new Set(),
        decoration_method: new Set(),
        material: new Set(),
        sleeve_style: new Set(),
        neckline: new Set(),
        style: new Set(),
        elements: new Set(),
      };

      const push = (key: keyof typeof acc, v: unknown) => {
        if (v == null) return;
        if (Array.isArray(v)) {
          v.forEach((x) => typeof x === "string" && acc[key].add(x));
          return;
        }
        if (typeof v === "string") {
          const s = v.trim();
          if (!s) return;
          // allow comma-separated legacy values
          s.split(",")
            .map((t) => t.trim())
            .filter(Boolean)
            .forEach((t) => acc[key].add(t));
        }
      };

      for (const row of data ?? []) {
        const d: any = row.data ?? {};
        push("region", d.region);
        push("fulfillment_from", d.fulfillment_from);
        push("size", d.size);
        push("color", d.color);
        push("fit", d.fit);
        push("print_areas", d.print_areas);
        push("sleeve_length", d.sleeve_length);
        push("thickness", d.thickness);
        push("fabric_weight", d.fabric_weight);
        push("decoration_method", d.decoration_method);
        push("material", d.material);
        push("sleeve_style", d.sleeve_style);
        push("neckline", d.neckline);
        push("style", d.style);
        push("elements", d.elements);
      }

      const toArr = (s: Set<string>) => Array.from(s).sort((a, b) => a.localeCompare(b));
      return {
        region: toArr(acc.region),
        fulfillment_from: toArr(acc.fulfillment_from),
        size: toArr(acc.size),
        color: toArr(acc.color),
        fit: toArr(acc.fit),
        print_areas: toArr(acc.print_areas),
        sleeve_length: toArr(acc.sleeve_length),
        thickness: toArr(acc.thickness),
        fabric_weight: toArr(acc.fabric_weight),
        decoration_method: toArr(acc.decoration_method),
        material: toArr(acc.material),
        sleeve_style: toArr(acc.sleeve_style),
        neckline: toArr(acc.neckline),
        style: toArr(acc.style),
        elements: toArr(acc.elements),
      };
    },
    staleTime: 1000 * 60 * 5,
  });

  const colors = useMemo(() => {
    // Keep existing visual swatches as fallback; if we have named colors from attributes, show those as chips instead.
    const dynamic = attributeOptions?.color ?? [];
    if (dynamic.length > 0) return dynamic;
    return [
      "rgb(20, 20, 20)",
      "rgb(243, 244, 245)",
      "rgb(225, 225, 225)",
      "rgb(205, 222, 248)",
      "rgb(255, 246, 223)",
      "rgb(231, 184, 128)",
      "rgb(228, 162, 162)",
      "rgb(255, 233, 152)",
      "rgb(82, 82, 82)",
      "rgb(69, 77, 47)",
      "rgb(105, 47, 21)",
      "rgb(41, 57, 70)",
      "rgb(209, 24, 67)",
      "rgb(130, 2, 17)",
      "rgb(60, 14, 30)",
      "rgb(14, 17, 37)",
    ];
  }, [attributeOptions?.color]);

  const deliverToOptions = useMemo(
    () =>
      attributeOptions?.region?.length
        ? attributeOptions.region
        : ["United States", "United Kingdom", "Canada", "Australia", "Germany"],
    [attributeOptions?.region]
  );

  const fulfillmentOptions = useMemo(
    () =>
      attributeOptions?.fulfillment_from?.length ? attributeOptions.fulfillment_from : ["On demand", "In stock"],
    [attributeOptions?.fulfillment_from]
  );

  const sizeOptions = useMemo(
    () => (attributeOptions?.size?.length ? attributeOptions.size : ["XS", "S", "M", "L", "XL", "2XL", "3XL"]),
    [attributeOptions?.size]
  );

  const fitOptions = useMemo(
    () => (attributeOptions?.fit?.length ? attributeOptions.fit : ["Regular", "Oversized", "Slim"]),
    [attributeOptions?.fit]
  );

  const printAreasOptions = useMemo(
    () =>
      attributeOptions?.print_areas?.length
        ? attributeOptions.print_areas
        : ["Front", "Back", "Left sleeve", "Right sleeve"],
    [attributeOptions?.print_areas]
  );

  const sleeveLengthOptions = useMemo(
    () =>
      attributeOptions?.sleeve_length?.length
        ? attributeOptions.sleeve_length
        : ["Sleeveless", "Short Sleeve", "Half Sleeve", "3/4 Sleeve", "Long Sleeve", "Extra Long Sleeve"],
    [attributeOptions?.sleeve_length]
  );

  const elementsOptions = useMemo(
    () =>
      filterAttributesOptions?.elements?.length
        ? filterAttributesOptions.elements
        : attributeOptions?.elements?.length
          ? attributeOptions.elements
          : [
              "None",
              "Snow Wash",
              "Washed",
              "Frayed",
              "Pocket",
              "Elastic Waist",
              "Drawstring",
              "Zipper",
              "Patchwork",
              "Ripped",
              "Slit",
              "Pleated",
              "Button",
              "Elastic Straps",
              "Knotted",
              "Hollow Out",
              "Asymmetrical",
            ],
    [filterAttributesOptions?.elements, attributeOptions?.elements]
  );

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const el = filtersWrapRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setOpenFilter(null);
    };

    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  return (
    <div ref={filtersWrapRef} className="ts-collection-filters" role="group" aria-label="Filters">
      <FilterMultiSelectDropdown
        k="deliverTo"
        label="Deliver to"
        openKey={openFilter}
        setOpenKey={setOpenFilter}
        value={selected.deliverTo}
        options={deliverToOptions}
        onChange={(next) => setSelected((p) => ({ ...p, deliverTo: next }))}
      />

      <FilterMultiSelectDropdown
        k="fulfillment"
        label="Fulfillment"
        openKey={openFilter}
        setOpenKey={setOpenFilter}
        value={selected.fulfillment}
        options={fulfillmentOptions}
        onChange={(next) => setSelected((p) => ({ ...p, fulfillment: next }))}
      />

      <FilterMultiSelectDropdown
        k="size"
        label="Size"
        openKey={openFilter}
        setOpenKey={setOpenFilter}
        value={selected.size}
        options={sizeOptions}
        onChange={(next) => setSelected((p) => ({ ...p, size: next }))}
      />

      <FilterMultiSelectDropdown
        k="color"
        label="Color"
        openKey={openFilter}
        setOpenKey={setOpenFilter}
        value={selected.color}
        options={attributeOptions?.color?.length ? attributeOptions.color : colors}
        onChange={(next) => setSelected((p) => ({ ...p, color: next }))}
        renderOption={
          attributeOptions?.color?.length
            ? undefined
            : ({ option, checked, onToggle }) => (
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-1 hover:bg-muted">
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="h-4 w-4 rounded-full border"
                      style={{ backgroundColor: option }}
                    />
                    <span className="text-sm">{option}</span>
                  </span>
                  <Checkbox checked={checked} onCheckedChange={onToggle} />
                </label>
              )
        }
      />

      <div className="ts-filter-dd">
        <button
          type="button"
          className="ts-filter-pill"
          aria-haspopup="menu"
          aria-expanded={openFilter === "price"}
          onClick={() => setOpenFilter(openFilter === "price" ? null : "price")}
        >
          <span>Price</span>
        </button>

        {openFilter === "price" ? (
          <div className="ts-filter-menu" role="menu" aria-label="Price filter">
            <div className="ts-filter-menu-title">Price</div>
            <div className="ts-filter-menu-note">Coming next: range slider + apply/reset</div>
          </div>
        ) : null}
      </div>

      <FilterMultiSelectDropdown
        k="fit"
        label="Fit"
        openKey={openFilter}
        setOpenKey={setOpenFilter}
        value={selected.fit}
        options={fitOptions}
        onChange={(next) => setSelected((p) => ({ ...p, fit: next }))}
      />

      <FilterMultiSelectDropdown
        k="printAreas"
        label="Print Areas"
        openKey={openFilter}
        setOpenKey={setOpenFilter}
        value={selected.printAreas}
        options={printAreasOptions}
        onChange={(next) => setSelected((p) => ({ ...p, printAreas: next }))}
      />

      <FilterMultiSelectDropdown
        k="sleeveLength"
        label="Sleeve Length"
        openKey={openFilter}
        setOpenKey={setOpenFilter}
        value={selected.sleeveLength}
        options={sleeveLengthOptions}
        onChange={(next) => setSelected((p) => ({ ...p, sleeveLength: next }))}
      />

      <FilterMultiSelectDropdown
        k="elements"
        label="Elements"
        openKey={openFilter}
        setOpenKey={setOpenFilter}
        value={selected.elements}
        options={elementsOptions}
        onChange={(next) => setSelected((p) => ({ ...p, elements: next }))}
      />

      <div className="ts-filter-dd">
        <button
          type="button"
          className="ts-filter-pill ts-filter-pill--add"
          aria-haspopup="menu"
          aria-expanded={openFilter === "add"}
          onClick={() => setOpenFilter(openFilter === "add" ? null : "add")}
        >
          <Plus className="ts-filter-plus" aria-hidden />
          <span>Add filter</span>
        </button>

        {openFilter === "add" ? (
          <div className="ts-filter-menu" role="menu" aria-label="Add filter">
            <div className="ts-filter-menu-title">Add filter</div>
            <div className="ts-filter-menu-list" role="none">
              {(
                attributeOptions
                  ? [
                      ...(attributeOptions.material?.length ? ["Material"] : []),
                      ...(attributeOptions.sleeve_style?.length ? ["Sleeve Style"] : []),
                      ...(attributeOptions.sleeve_length?.length ? ["Sleeve Length"] : []),
                      ...(attributeOptions.neckline?.length ? ["Neckline"] : []),
                      ...(attributeOptions.style?.length ? ["Style"] : []),
                      ...(attributeOptions.thickness?.length ? ["Thickness"] : []),
                      ...(attributeOptions.fabric_weight?.length ? ["Fabric Weight"] : []),
                      ...(attributeOptions.decoration_method?.length ? ["Technique"] : []),
                      ...(attributeOptions.elements?.length ? ["Elements"] : []),
                    ]
                  : ["Material", "Sleeve", "Brand"]
              ).map((x) => (
                <button
                  key={x}
                  type="button"
                  className="ts-filter-menu-item"
                  role="menuitem"
                  onClick={() => setOpenFilter(null)}
                >
                  {x}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
