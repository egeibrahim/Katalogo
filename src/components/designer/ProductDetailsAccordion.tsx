import { useMemo } from "react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { useProductDetails } from "@/hooks/useProductDetails";

function renderContent(type: string, content: string) {
  if (type === "link") {
    return (
      <a href={content} target="_blank" rel="noreferrer" className="underline text-primary">
        {content}
      </a>
    );
  }

  if (type === "list") {
    const items = content
      .split(/\r?\n/)
      .map((l) => l.replace(/^\s*[-*]\s*/, "").trim())
      .filter(Boolean);

    return (
      <ul className="list-disc pl-5 space-y-1">
        {items.map((it, idx) => (
          <li key={idx}>{it}</li>
        ))}
      </ul>
    );
  }

  return <p className="whitespace-pre-wrap">{content}</p>;
}

export function ProductDetailsAccordion({ productId }: { productId: string }) {
  const { data, isLoading } = useProductDetails(productId);

  const items = useMemo(() => (data ?? []).filter((d) => Boolean(d.title)), [data]);

  if (isLoading) return null;

  if (items.length === 0) {
    return (
      <section className="space-y-2">
        <h4 className="text-sm font-semibold">Product details</h4>
        <p className="text-xs text-muted-foreground">Bu ürün için henüz detay eklenmemiş.</p>
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Product details</h4>
        <span className="text-xs text-muted-foreground">{items.length}</span>
      </div>
      <Separator />
      <Accordion type="single" collapsible className="w-full">
        {items.map((d) => (
          <AccordionItem key={d.id} value={d.id}>
            <AccordionTrigger className="text-left text-sm">{d.title}</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">
              {renderContent(d.content_type, d.content)}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
