import * as React from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Group = {
  title: string;
  description: string;
  tables: Array<{ key: string; label?: string }>;
};

const GROUPS: Group[] = [
  {
    title: "Catalog data",
    description: "Products, categories, variants and shipping settings included.",
    tables: [
      { key: "categories" },
      { key: "attributes" },
      { key: "attribute_values" },
      { key: "products" },
      { key: "product_attributes" },
      { key: "product_colors" },
      { key: "product_color_variants" },
      { key: "product_sizes" },
      { key: "product_size_variants" },
      { key: "product_specs" },
      { key: "product_unit_price_tiers" },
      { key: "product_views" },
      { key: "product_view_color_mockups" },
      { key: "product_details" },
      { key: "product_gallery_images" },
      { key: "product_mockups" },
      { key: "product_page_block_orders" },
      { key: "product_shipping_overrides" },
      { key: "delivery_regions" },
      { key: "delivery_region_shipping_overrides" },
      { key: "design_templates" },
      { key: "tapstitch_collections" },
      { key: "tapstitch_collection_products" },
      { key: "catalogs" },
      { key: "catalog_products" },
    ],
  },
  {
    title: "User data",
    description: "Profiles, roles, memberships and user content.",
    tables: [
      { key: "profiles" },
      { key: "user_roles" },
      { key: "user_memberships" },
      { key: "saved_designs" },
      { key: "user_uploads" },
      { key: "user_folders" },
      { key: "user_usage_daily" },
    ],
  },
  {
    title: "Settings",
    description: "App settings and import/export operation logs.",
    tables: [{ key: "app_settings" }, { key: "import_files" }],
  },
];

const ALL_TABLES = GROUPS.flatMap((g) => g.tables.map((t) => t.key));

export default function AdminExport() {
  usePageMeta({ title: "Admin Export", noIndex: true });

  const [isRunning, setIsRunning] = React.useState(false);
  const [lastSignedUrl, setLastSignedUrl] = React.useState<string | null>(null);
  const [lastMeta, setLastMeta] = React.useState<{ expiresInSeconds: number; tablesCount: number } | null>(null);

  const runExport = async () => {
    const tables = ALL_TABLES;

    setIsRunning(true);
    setLastSignedUrl(null);
    setLastMeta(null);

    try {
      const { data, error } = await supabase.functions.invoke("bulk-export-zip", {
        body: {
          tables,
          format: "csv",
          delimiter: ",",
          includeHeaders: true,
          fileNamePrefix: "bulk-export",
        },
      });

      if (error) throw error;
      if (!data?.signedUrl) throw new Error("signedUrl_missing");

      setLastSignedUrl(data.signedUrl);
      setLastMeta({ expiresInSeconds: data.expiresInSeconds ?? 600, tablesCount: data.tablesCount ?? tables.length });

      toast.success("ZIP ready, download starting…");
      window.location.assign(data.signedUrl);
    } catch (e) {
      console.error(e);
      toast.error("Could not create export");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <Card className="rounded-xl border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Export</CardTitle>
              <CardDescription>Export all database tables as CSV and download as a single ZIP file.</CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary">Format: CSV (,)</Badge>
              <Badge variant="secondary">Tablo: {ALL_TABLES.length}</Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <Alert>
            <AlertTitle>Not</AlertTitle>
            <AlertDescription>
              For large tables (especially user uploads), ZIP creation may take a long time and the download link expires in 10 minutes.
            </AlertDescription>
          </Alert>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={runExport} disabled={isRunning}>
              {isRunning ? "Creating…" : "Create export ZIP"}
            </Button>

            {lastSignedUrl ? (
              <Button variant="outline" onClick={() => window.location.assign(lastSignedUrl)}>
                Reopen link
              </Button>
            ) : null}

            {lastMeta ? (
              <span className="text-sm text-muted-foreground">
                {lastMeta.tablesCount} tables • Link valid: {Math.round(lastMeta.expiresInSeconds / 60)} min
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
