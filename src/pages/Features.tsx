import { useI18n } from "@/lib/i18n/LocaleProvider";
import { usePageMeta } from "@/hooks/usePageMeta";

export default function Features() {
  const { t } = useI18n();

  usePageMeta({ title: t("pages.features.title") });

  return (
    <main className="ru-max px-6 py-10">
      <header className="mx-auto max-w-3xl">
        <h1 className="text-balance text-4xl font-semibold tracking-tight">{t("pages.features.title")}</h1>
        <p className="mt-3 text-pretty text-muted-foreground">{t("pages.features.subtitle")}</p>
      </header>
    </main>
  );
}
