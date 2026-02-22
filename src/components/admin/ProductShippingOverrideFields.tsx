import * as React from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type ProductShippingOverrideDraft = {
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

const fields: Array<{
  key: keyof ProductShippingOverrideDraft;
  label: string;
  placeholder?: string;
  kind?: "input" | "textarea";
}> = [
  { key: "shipping_tip", label: "Shipping tip", kind: "textarea" },
  { key: "shipping_method_name", label: "Shipping method name" },
  { key: "shipping_method_time_text", label: "Shipping method time text" },
  { key: "shipping_method_cost_from_text", label: "Shipping cost text" },
  { key: "shipping_method_additional_item_text", label: "Additional item text" },
  { key: "production_time_text", label: "Production time" },
  { key: "shipping_time_text", label: "Shipping time" },
  { key: "total_fulfillment_time_text", label: "Total fulfillment time" },
  { key: "estimated_delivery_text", label: "Estimated delivery" },
];

export function ProductShippingOverrideFields({
  value,
  onChange,
  includeKeys,
}: {
  value: ProductShippingOverrideDraft;
  onChange: (next: ProductShippingOverrideDraft) => void;
  includeKeys?: Array<keyof ProductShippingOverrideDraft>;
}) {
  const visibleFields = React.useMemo(() => {
    if (!includeKeys || includeKeys.length === 0) return fields;
    const set = new Set(includeKeys);
    return fields.filter((f) => set.has(f.key));
  }, [includeKeys]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {visibleFields.map((f) => {
          const v = value[f.key] ?? "";
          const common = {
            value: v,
            placeholder: f.placeholder,
            onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
              onChange({ ...value, [f.key]: e.target.value }),
          };

          if (f.kind === "textarea") {
            return (
              <div key={String(f.key)} className="space-y-2 md:col-span-2">
                <Label>{f.label}</Label>
                <Textarea {...common} />
              </div>
            );
          }

          return (
            <div key={String(f.key)} className="space-y-2">
              <Label>{f.label}</Label>
              <Input {...common} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
