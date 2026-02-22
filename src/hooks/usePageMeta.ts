import { useEffect, useLayoutEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";

import { useAppSettings } from "@/hooks/useAppSettings";

type SiteMetaSettings = {
  siteName: string;
  titleTemplate: string;
  defaultDescription: string;
  defaultOgImageUrl?: string;
};

type PageMetaInput = {
  title?: string | null;
  description?: string | null;
  ogImageUrl?: string | null;
  /** For pages you don't want indexed (admin, drafts, etc.) */
  noIndex?: boolean;
};

const FALLBACKS: SiteMetaSettings = {
  siteName: "Newcatalog",
  titleTemplate: "{title} | {site}",
  defaultDescription: "Newcatalog ile ürün kataloğunu tasarla, yönet ve yayınla.",
  defaultOgImageUrl: "",
};

function setOrCreateMeta(selector: string, attrs: Record<string, string>, content: string) {
  if (typeof document === "undefined") return;
  const head = document.head;
  if (!head) return;

  let el = head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLinkRelCanonical(href: string) {
  if (typeof document === "undefined") return;
  const head = document.head;
  if (!head) return;
  let el = head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function applyTitleTemplate(template: string, title: string | null | undefined, site: string) {
  const cleanedSite = (site || "").trim();
  const cleanedTitle = (title || "").trim();
  if (!cleanedTitle) return cleanedSite || cleanedTitle;

  // Avoid String.prototype.replaceAll for older TS lib targets.
  return (template || "{title} | {site}")
    .replace(/\{title\}/g, cleanedTitle)
    .replace(/\{site\}/g, cleanedSite)
    .trim();
}

export function useSiteMetaSettings() {
  const { data } = useAppSettings(["site_name", "title_template", "default_meta_description", "default_og_image_url"]);

  return useMemo<SiteMetaSettings>(() => {
    return {
      siteName: (data?.site_name || FALLBACKS.siteName).trim() || FALLBACKS.siteName,
      titleTemplate: (data?.title_template || FALLBACKS.titleTemplate).trim() || FALLBACKS.titleTemplate,
      defaultDescription:
        (data?.default_meta_description || FALLBACKS.defaultDescription).trim() || FALLBACKS.defaultDescription,
      defaultOgImageUrl: (data?.default_og_image_url || FALLBACKS.defaultOgImageUrl || "").trim(),
    };
  }, [data]);
}

/**
 * Sets default meta for pages that don't call usePageMeta.
 * Page-level calls (usePageMeta) should override these values.
 */
export function useDefaultMeta() {
  const location = useLocation();
  const site = useSiteMetaSettings();

  useEffect(() => {
    // Default title: brand only
    document.title = site.siteName;

    setOrCreateMeta('meta[name="description"]', { name: "description" }, site.defaultDescription);
    setOrCreateMeta('meta[property="og:title"]', { property: "og:title" }, site.siteName);
    setOrCreateMeta('meta[property="og:description"]', { property: "og:description" }, site.defaultDescription);
    setOrCreateMeta('meta[property="og:type"]', { property: "og:type" }, "website");

    const img = site.defaultOgImageUrl?.trim();
    if (img) setOrCreateMeta('meta[property="og:image"]', { property: "og:image" }, img);

    // Twitter
    setOrCreateMeta('meta[name="twitter:card"]', { name: "twitter:card" }, "summary_large_image");
    setOrCreateMeta('meta[name="twitter:title"]', { name: "twitter:title" }, site.siteName);
    setOrCreateMeta('meta[name="twitter:description"]', { name: "twitter:description" }, site.defaultDescription);
    if (img) setOrCreateMeta('meta[name="twitter:image"]', { name: "twitter:image" }, img);

    // Canonical
    const canonical = `${window.location.origin}${location.pathname}${location.search}`;
    upsertLinkRelCanonical(canonical);
  }, [location.pathname, location.search, site.defaultDescription, site.defaultOgImageUrl, site.siteName]);
}

export function usePageMeta(input: PageMetaInput) {
  const location = useLocation();
  const site = useSiteMetaSettings();

  const resolved = useMemo(() => {
    const title = applyTitleTemplate(site.titleTemplate, input.title, site.siteName);
    const description = (input.description ?? site.defaultDescription).trim() || site.defaultDescription;
    const ogImageUrl = (input.ogImageUrl ?? site.defaultOgImageUrl ?? "").trim();
    const canonical = `${window.location.origin}${location.pathname}${location.search}`;

    return { title, description, ogImageUrl, canonical };
  }, [input.description, input.ogImageUrl, input.title, location.pathname, location.search, site.defaultDescription, site.defaultOgImageUrl, site.siteName, site.titleTemplate]);

  useLayoutEffect(() => {
    document.title = resolved.title;

    setOrCreateMeta('meta[name="description"]', { name: "description" }, resolved.description);
    setOrCreateMeta('meta[property="og:title"]', { property: "og:title" }, resolved.title);
    setOrCreateMeta('meta[property="og:description"]', { property: "og:description" }, resolved.description);
    setOrCreateMeta('meta[property="og:type"]', { property: "og:type" }, "website");

    if (resolved.ogImageUrl) {
      setOrCreateMeta('meta[property="og:image"]', { property: "og:image" }, resolved.ogImageUrl);
      setOrCreateMeta('meta[name="twitter:image"]', { name: "twitter:image" }, resolved.ogImageUrl);
    }

    setOrCreateMeta('meta[name="twitter:card"]', { name: "twitter:card" }, "summary_large_image");
    setOrCreateMeta('meta[name="twitter:title"]', { name: "twitter:title" }, resolved.title);
    setOrCreateMeta('meta[name="twitter:description"]', { name: "twitter:description" }, resolved.description);

    if (input.noIndex) {
      setOrCreateMeta('meta[name="robots"]', { name: "robots" }, "noindex, nofollow");
    } else {
      // If already exists from previous admin page, reset back to indexable.
      const robots = document.head?.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
      if (robots?.getAttribute("content") === "noindex, nofollow") robots.setAttribute("content", "index, follow");
    }

    upsertLinkRelCanonical(resolved.canonical);
  }, [input.noIndex, resolved]);
}
