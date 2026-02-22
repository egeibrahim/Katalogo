import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

type Props = {
  breadcrumb: ReactNode;
  title: string;
  statusControl?: ReactNode;
  meta?: ReactNode;
  onBack: () => void;
  onSave: () => void;
  saving?: boolean;
};

export function ProductEditHeader({
  breadcrumb,
  title,
  statusControl,
  meta,
  onBack,
  onSave,
  saving,
}: Props) {
  return (
    <header className="mb-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm md:p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{breadcrumb}</div>
          <h1 className="mt-1 truncate text-xl font-semibold tracking-tight">{title}</h1>
          {meta ? <div className="mt-1.5">{meta}</div> : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 md:pl-4">
          {statusControl}
          <Button size="sm" variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button size="sm" onClick={onSave} disabled={Boolean(saving)}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </header>
  );
}
