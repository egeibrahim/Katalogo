import { ProductDesigner } from "@/components/designer/ProductDesigner";
import { usePageMeta } from "@/hooks/usePageMeta";
import { ErrorBoundary } from "@/ErrorBoundary";

const DesignerPage = () => {
  usePageMeta({ title: "Designer", noIndex: true });
  return (
    <ErrorBoundary>
      <ProductDesigner />
    </ErrorBoundary>
  );
};

export default DesignerPage;
