import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ProductShippingOverrideFields,
  type ProductShippingOverrideDraft,
} from "@/components/admin/ProductShippingOverrideFields";

type ShippingSettingsDraft = {
  shipping_tip: string;
  shipping_method_name: string;
  shipping_method_time_text: string;
  shipping_method_cost_from_text: string;
  shipping_method_additional_item_text: string;
  production_time_text: string;
  shipping_time_text: string;
  total_fulfillment_time_text: string;
  estimated_delivery_text: string;
};

type SeoSettingsDraft = {
  site_name: string;
  title_template: string;
  default_meta_description: string;
  default_og_image_url: string;
};

type DeliveryRegionRow = {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
};

const DEFAULTS: ShippingSettingsDraft = {
  shipping_tip: "Final shipping cost will be calculated at checkout depending on order size",
  shipping_method_name: "Special Line",
  shipping_method_time_text: "9-14 days average shipping time",
  shipping_method_cost_from_text: "from $6.16",
  shipping_method_additional_item_text: "+$2.66~$3.58 per additional item",
  production_time_text: "1 - 3 days",
  shipping_time_text: "9 - 14 days",
  total_fulfillment_time_text: "10 - 17 days",
  estimated_delivery_text: "Jan 30 - Feb 06",
};

const SHIPPING_KEYS = Object.keys(DEFAULTS) as (keyof ShippingSettingsDraft)[];

const SEO_DEFAULTS: SeoSettingsDraft = {
  site_name: "Newcatalog",
  title_template: "{title} | {site}",
  default_meta_description: "Design, manage and publish your product catalog with Newcatalog.",
  default_og_image_url: "",
};

const SEO_KEYS = Object.keys(SEO_DEFAULTS) as (keyof SeoSettingsDraft)[];

const EXPORT_LIMIT_KEY = "individual_export_daily_limit";
const EXPORT_LIMIT_DEFAULT = 3;

const EMPTY_OVERRIDE: ProductShippingOverrideDraft = {
  shipping_tip: "",
  shipping_method_name: "",
  shipping_method_time_text: "",
  shipping_method_cost_from_text: "",
  shipping_method_additional_item_text: "",
  production_time_text: "",
  shipping_time_text: "",
  total_fulfillment_time_text: "",
  estimated_delivery_text: "",
};

const OVERRIDE_KEYS = Object.keys(EMPTY_OVERRIDE) as (keyof ProductShippingOverrideDraft)[];

type RegionOverrideUpsert = {
  region_id: string;
} & Partial<Record<keyof ProductShippingOverrideDraft, string | null>>;

function isAllBlank(v: ProductShippingOverrideDraft) {
  return OVERRIDE_KEYS.every((k) => !String(v[k] ?? "").trim());
}

export default function AdminSettings() {
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ["app_settings", "shipping"],
    queryFn: async (): Promise<ShippingSettingsDraft> => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key,value")
        .in("key", SHIPPING_KEYS as unknown as string[]);
      if (error) throw error;

      const map = new Map<string, string>((data ?? []).map((r) => [r.key, r.value ?? ""]));
      return {
        shipping_tip: map.get("shipping_tip") ?? DEFAULTS.shipping_tip,
        shipping_method_name: map.get("shipping_method_name") ?? DEFAULTS.shipping_method_name,
        shipping_method_time_text: map.get("shipping_method_time_text") ?? DEFAULTS.shipping_method_time_text,
        shipping_method_cost_from_text: map.get("shipping_method_cost_from_text") ?? DEFAULTS.shipping_method_cost_from_text,
        shipping_method_additional_item_text:
          map.get("shipping_method_additional_item_text") ?? DEFAULTS.shipping_method_additional_item_text,
        production_time_text: map.get("production_time_text") ?? DEFAULTS.production_time_text,
        shipping_time_text: map.get("shipping_time_text") ?? DEFAULTS.shipping_time_text,
        total_fulfillment_time_text: map.get("total_fulfillment_time_text") ?? DEFAULTS.total_fulfillment_time_text,
        estimated_delivery_text: map.get("estimated_delivery_text") ?? DEFAULTS.estimated_delivery_text,
      };
    },
  });

  const [draft, setDraft] = React.useState<ShippingSettingsDraft>(DEFAULTS);

  const seoSettingsQuery = useQuery({
    queryKey: ["app_settings", "seo"],
    queryFn: async (): Promise<SeoSettingsDraft> => {
      const { data, error } = await supabase.from("app_settings").select("key,value").in("key", SEO_KEYS as unknown as string[]);
      if (error) throw error;
      const map = new Map<string, string>((data ?? []).map((r) => [r.key, r.value ?? ""]));
      return {
        site_name: map.get("site_name") ?? SEO_DEFAULTS.site_name,
        title_template: map.get("title_template") ?? SEO_DEFAULTS.title_template,
        default_meta_description: map.get("default_meta_description") ?? SEO_DEFAULTS.default_meta_description,
        default_og_image_url: map.get("default_og_image_url") ?? SEO_DEFAULTS.default_og_image_url,
      };
    },
  });

  const [seoDraft, setSeoDraft] = React.useState<SeoSettingsDraft>(SEO_DEFAULTS);

  const exportLimitQuery = useQuery({
    queryKey: ["app_settings", "export_limit"],
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", EXPORT_LIMIT_KEY)
        .maybeSingle();
      if (error) throw error;
      const parsed = data?.value ? Number.parseInt(String(data.value), 10) : NaN;
      return Number.isFinite(parsed) ? parsed : EXPORT_LIMIT_DEFAULT;
    },
  });

  const [exportLimitDraft, setExportLimitDraft] = React.useState(EXPORT_LIMIT_DEFAULT);

  React.useEffect(() => {
    if (settingsQuery.data) setDraft(settingsQuery.data);
  }, [settingsQuery.data]);

  React.useEffect(() => {
    if (seoSettingsQuery.data) setSeoDraft(seoSettingsQuery.data);
  }, [seoSettingsQuery.data]);

  React.useEffect(() => {
    if (exportLimitQuery.data !== undefined) setExportLimitDraft(exportLimitQuery.data);
  }, [exportLimitQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (next: ShippingSettingsDraft) => {
      const payload = SHIPPING_KEYS.map((k) => ({ key: k, value: String(next[k] ?? "") }));
      const { error } = await supabase.from("app_settings").upsert(payload, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Settings saved");
      await queryClient.invalidateQueries({ queryKey: ["app_settings"] });
    },
    onError: (e) => {
      console.error(e);
      toast.error("Could not save settings");
    },
  });

  const saveSeoMutation = useMutation({
    mutationFn: async (next: SeoSettingsDraft) => {
      const payload = SEO_KEYS.map((k) => ({ key: k, value: String(next[k] ?? "") }));
      const { error } = await supabase.from("app_settings").upsert(payload, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("SEO settings saved");
      await queryClient.invalidateQueries({ queryKey: ["app_settings"] });
    },
    onError: (e) => {
      console.error(e);
      toast.error("Could not save SEO settings");
    },
  });

  const saveExportLimitMutation = useMutation({
    mutationFn: async (limit: number) => {
      const { error } = await supabase
        .from("app_settings")
        .upsert([{ key: EXPORT_LIMIT_KEY, value: String(limit) }], { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("İndirme limiti kaydedildi");
      await queryClient.invalidateQueries({ queryKey: ["app_settings"] });
    },
    onError: (e) => {
      console.error(e);
      toast.error("İndirme limiti kaydedilemedi");
    },
  });

  const deliveryRegionsQuery = useQuery({
    queryKey: ["delivery_regions", "admin"],
    queryFn: async (): Promise<DeliveryRegionRow[]> => {
      const { data, error } = await supabase
        .from("delivery_regions")
        .select("id,name,sort_order,is_active")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DeliveryRegionRow[];
    },
  });

  const [newRegionName, setNewRegionName] = React.useState("");
  const [regionsDraft, setRegionsDraft] = React.useState<Record<string, DeliveryRegionRow>>({});

  React.useEffect(() => {
    const rows = deliveryRegionsQuery.data ?? [];
    setRegionsDraft((prev) => {
      const next: Record<string, DeliveryRegionRow> = { ...prev };
      for (const r of rows) next[r.id] = next[r.id] ? { ...next[r.id], ...r } : r;
      return next;
    });
  }, [deliveryRegionsQuery.data]);

  const createRegionMutation = useMutation({
    mutationFn: async (name: string) => {
      const cleaned = name.trim();
      if (!cleaned) return;
      const { error } = await supabase
        .from("delivery_regions")
        .insert({ name: cleaned, sort_order: 0, is_active: true });
      if (error) throw error;
    },
    onSuccess: async () => {
      setNewRegionName("");
      toast.success("Region added");
      await queryClient.invalidateQueries({ queryKey: ["delivery_regions"] });
    },
    onError: (e) => {
      console.error(e);
      toast.error("Could not add region");
    },
  });

  const updateRegionMutation = useMutation({
    mutationFn: async (row: DeliveryRegionRow) => {
      const payload = {
        name: row.name.trim(),
        sort_order: Number.isFinite(row.sort_order) ? row.sort_order : 0,
        is_active: Boolean(row.is_active),
      };
      const { error } = await supabase.from("delivery_regions").update(payload).eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Region saved");
      await queryClient.invalidateQueries({ queryKey: ["delivery_regions"] });
    },
    onError: (e) => {
      console.error(e);
      toast.error("Could not save region");
    },
  });

  const [selectedRegionId, setSelectedRegionId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (selectedRegionId) return;
    const first = deliveryRegionsQuery.data?.[0]?.id;
    if (first) setSelectedRegionId(first);
  }, [deliveryRegionsQuery.data, selectedRegionId]);

  const regionOverrideQuery = useQuery({
    queryKey: ["delivery_region_shipping_overrides", "admin", selectedRegionId],
    enabled: Boolean(selectedRegionId),
    queryFn: async (): Promise<Partial<ProductShippingOverrideDraft>> => {
      if (!selectedRegionId) return {};
      const { data, error } = await supabase
        .from("delivery_region_shipping_overrides")
        .select(
          "shipping_tip,shipping_method_name,shipping_method_time_text,shipping_method_cost_from_text,shipping_method_additional_item_text,production_time_text,shipping_time_text,total_fulfillment_time_text,estimated_delivery_text"
        )
        .eq("region_id", selectedRegionId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? {}) as Partial<ProductShippingOverrideDraft>;
    },
  });

  const [regionOverrideDraft, setRegionOverrideDraft] = React.useState<ProductShippingOverrideDraft>(EMPTY_OVERRIDE);

  React.useEffect(() => {
    const v = regionOverrideQuery.data;
    if (!v) return;
    setRegionOverrideDraft({
      shipping_tip: v.shipping_tip ?? "",
      shipping_method_name: v.shipping_method_name ?? "",
      shipping_method_time_text: v.shipping_method_time_text ?? "",
      shipping_method_cost_from_text: v.shipping_method_cost_from_text ?? "",
      shipping_method_additional_item_text: v.shipping_method_additional_item_text ?? "",
      production_time_text: v.production_time_text ?? "",
      shipping_time_text: v.shipping_time_text ?? "",
      total_fulfillment_time_text: v.total_fulfillment_time_text ?? "",
      estimated_delivery_text: v.estimated_delivery_text ?? "",
    });
  }, [regionOverrideQuery.data]);

  const saveRegionOverrideMutation = useMutation({
    mutationFn: async (next: ProductShippingOverrideDraft) => {
      if (!selectedRegionId) return;
      if (isAllBlank(next)) {
        const { error } = await supabase
          .from("delivery_region_shipping_overrides")
          .delete()
          .eq("region_id", selectedRegionId);
        if (error) throw error;
        return;
      }

      const payload: RegionOverrideUpsert = { region_id: selectedRegionId };
      for (const k of OVERRIDE_KEYS) payload[k] = String(next[k] ?? "").trim() || null;

      const { error } = await supabase
        .from("delivery_region_shipping_overrides")
        .upsert([payload], { onConflict: "region_id" });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Region override saved");
      await queryClient.invalidateQueries({ queryKey: ["delivery_region_shipping_overrides"] });
    },
    onError: (e) => {
      console.error(e);
      toast.error("Could not save region override");
    },
  });

  return (
    <div className="p-4 md:p-6">
      <Card className="rounded-xl border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <p className="text-sm text-muted-foreground">Global storefront configuration.</p>
        </CardHeader>

        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium">Shipping (Global)</h3>
              <p className="text-sm text-muted-foreground">These texts are shown on all product pages.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <div className="text-sm font-medium">Shipping tip</div>
                <Textarea
                  value={draft.shipping_tip}
                  onChange={(e) => setDraft((p) => ({ ...p, shipping_tip: e.target.value }))}
                  rows={2}
                />
              </div>

              <div className="space-y-1">
                <div className="text-sm font-medium">Shipping method name</div>
                <Input
                  value={draft.shipping_method_name}
                  onChange={(e) => setDraft((p) => ({ ...p, shipping_method_name: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <div className="text-sm font-medium">Method time text</div>
                <Input
                  value={draft.shipping_method_time_text}
                  onChange={(e) => setDraft((p) => ({ ...p, shipping_method_time_text: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <div className="text-sm font-medium">Cost (free text)</div>
                <Input
                  value={draft.shipping_method_cost_from_text}
                  onChange={(e) => setDraft((p) => ({ ...p, shipping_method_cost_from_text: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <div className="text-sm font-medium">Additional item text</div>
                <Input
                  value={draft.shipping_method_additional_item_text}
                  onChange={(e) => setDraft((p) => ({ ...p, shipping_method_additional_item_text: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <div className="text-sm font-medium">Production time</div>
                <Input
                  value={draft.production_time_text}
                  onChange={(e) => setDraft((p) => ({ ...p, production_time_text: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <div className="text-sm font-medium">Shipping time</div>
                <Input
                  value={draft.shipping_time_text}
                  onChange={(e) => setDraft((p) => ({ ...p, shipping_time_text: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <div className="text-sm font-medium">Total fulfillment time</div>
                <Input
                  value={draft.total_fulfillment_time_text}
                  onChange={(e) => setDraft((p) => ({ ...p, total_fulfillment_time_text: e.target.value }))}
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <div className="text-sm font-medium">Estimated delivery</div>
                <Input
                  value={draft.estimated_delivery_text}
                  onChange={(e) => setDraft((p) => ({ ...p, estimated_delivery_text: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => saveMutation.mutate(draft)}
                disabled={settingsQuery.isLoading || saveMutation.isPending}
              >
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
              {settingsQuery.isLoading ? <span className="text-sm text-muted-foreground">Loading...</span> : null}
            </div>

            <div className="border-t pt-6" />

            <div>
              <h3 className="text-sm font-medium">Brand & SEO</h3>
              <p className="text-sm text-muted-foreground">Default title/description values used across the site.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <div className="text-sm font-medium">Site name</div>
                <Input value={seoDraft.site_name} onChange={(e) => setSeoDraft((p) => ({ ...p, site_name: e.target.value }))} />
              </div>

              <div className="space-y-1">
                <div className="text-sm font-medium">Title template</div>
                <Input
                  value={seoDraft.title_template}
                  onChange={(e) => setSeoDraft((p) => ({ ...p, title_template: e.target.value }))}
                  placeholder="{title} | {site}"
                />
                <p className="text-xs text-muted-foreground">Use placeholders: {"{title}"} and {"{site}"}</p>
              </div>

              <div className="space-y-1 md:col-span-2">
                <div className="text-sm font-medium">Default meta description</div>
                <Textarea
                  value={seoDraft.default_meta_description}
                  onChange={(e) => setSeoDraft((p) => ({ ...p, default_meta_description: e.target.value }))}
                  rows={2}
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <div className="text-sm font-medium">Default OG image URL (optional)</div>
                <Input
                  value={seoDraft.default_og_image_url}
                  onChange={(e) => setSeoDraft((p) => ({ ...p, default_og_image_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => saveSeoMutation.mutate(seoDraft)}
                disabled={seoSettingsQuery.isLoading || saveSeoMutation.isPending}
              >
                {saveSeoMutation.isPending ? "Saving..." : "Save SEO"}
              </Button>
              {seoSettingsQuery.isLoading ? <span className="text-sm text-muted-foreground">Loading...</span> : null}
            </div>

            <div className="border-t pt-6" />

            <div>
              <h3 className="text-sm font-medium">Günlük indirme limiti</h3>
              <p className="text-sm text-muted-foreground">
                Bireysel (individual) plan kullanıcıları için tasarım export/indirme başına günlük limit. Bu sayıya ulaşan kullanıcıya &quot;Günlük X indirme limitine ulaştın&quot; mesajı gösterilir.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="space-y-1">
                <div className="text-sm font-medium">Limit (günlük)</div>
                <Input
                  type="number"
                  min={0}
                  max={999}
                  value={exportLimitDraft}
                  onChange={(e) => {
                    const v = e.target.value === "" ? EXPORT_LIMIT_DEFAULT : Number.parseInt(e.target.value, 10);
                    setExportLimitDraft(Number.isFinite(v) ? Math.max(0, Math.min(999, v)) : exportLimitDraft);
                  }}
                  className="w-24"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  onClick={() => saveExportLimitMutation.mutate(exportLimitDraft)}
                  disabled={exportLimitQuery.isLoading || saveExportLimitMutation.isPending}
                >
                  {saveExportLimitMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                </Button>
                {exportLimitQuery.isLoading ? <span className="text-sm text-muted-foreground">Yükleniyor...</span> : null}
              </div>
            </div>

            <div className="border-t pt-6" />

            <div>
              <h3 className="text-sm font-medium">Deliver-to Regions</h3>
              <p className="text-sm text-muted-foreground">
                Manage the Deliver to dropdown options used on product pages.
              </p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="flex-1 space-y-1">
                <div className="text-sm font-medium">Add a region</div>
                <Input value={newRegionName} onChange={(e) => setNewRegionName(e.target.value)} placeholder="e.g. Canada" />
              </div>
              <Button
                onClick={() => createRegionMutation.mutate(newRegionName)}
                disabled={createRegionMutation.isPending || !newRegionName.trim()}
              >
                {createRegionMutation.isPending ? "Adding..." : "Add"}
              </Button>
            </div>

            <div className="space-y-3">
              {(deliveryRegionsQuery.data ?? []).map((r) => {
                const d = regionsDraft[r.id] ?? r;
                return (
                  <div key={r.id} className="rounded-md border p-3">
                    <div className="grid gap-3 md:grid-cols-12 md:items-center">
                      <div className="md:col-span-5">
                        <div className="text-sm font-medium">Name</div>
                        <Input
                          value={d.name}
                          onChange={(e) =>
                            setRegionsDraft((p) => ({
                              ...p,
                              [r.id]: { ...d, name: e.target.value },
                            }))
                          }
                        />
                      </div>

                      <div className="md:col-span-3">
                        <div className="text-sm font-medium">Sort order</div>
                        <Input
                          type="number"
                          value={String(d.sort_order ?? 0)}
                          onChange={(e) =>
                            setRegionsDraft((p) => ({
                              ...p,
                              [r.id]: { ...d, sort_order: Number(e.target.value) },
                            }))
                          }
                        />
                      </div>

                      <div className="md:col-span-2">
                        <div className="text-sm font-medium">Active</div>
                        <div className="pt-2">
                          <Switch
                            checked={Boolean(d.is_active)}
                            onCheckedChange={(checked) =>
                              setRegionsDraft((p) => ({
                                ...p,
                                [r.id]: { ...d, is_active: checked },
                              }))
                            }
                          />
                        </div>
                      </div>

                      <div className="md:col-span-2 md:flex md:justify-end">
                        <Button
                          variant="secondary"
                          onClick={() => updateRegionMutation.mutate(d)}
                          disabled={updateRegionMutation.isPending || !d.name.trim()}
                        >
                          Save
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <Button
                        type="button"
                        variant={selectedRegionId === r.id ? "default" : "outline"}
                        onClick={() => setSelectedRegionId(r.id)}
                      >
                        Edit shipping override
                      </Button>
                      <div className="text-sm text-muted-foreground">Used label: {r.name}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t pt-6" />

            <div>
              <h3 className="text-sm font-medium">Region Shipping Overrides</h3>
              <p className="text-sm text-muted-foreground">
                Overrides apply when a shopper selects the matching Deliver to region.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-sm font-medium">Selected region</div>
              <Select value={selectedRegionId ?? undefined} onValueChange={(v) => setSelectedRegionId(v)}>
                <SelectTrigger className="w-full max-w-64">
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Regions</SelectLabel>
                    {(deliveryRegionsQuery.data ?? []).map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {regionOverrideQuery.isLoading ? <span className="text-sm text-muted-foreground">Loading...</span> : null}
            </div>

            <ProductShippingOverrideFields value={regionOverrideDraft} onChange={setRegionOverrideDraft} />

            <div className="flex items-center gap-3">
              <Button
                onClick={() => saveRegionOverrideMutation.mutate(regionOverrideDraft)}
                disabled={!selectedRegionId || saveRegionOverrideMutation.isPending}
              >
                {saveRegionOverrideMutation.isPending ? "Saving..." : "Save region override"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRegionOverrideDraft(EMPTY_OVERRIDE);
                  saveRegionOverrideMutation.mutate(EMPTY_OVERRIDE);
                }}
                disabled={!selectedRegionId || saveRegionOverrideMutation.isPending}
              >
                Clear override
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
