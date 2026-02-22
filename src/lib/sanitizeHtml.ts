import DOMPurify from "dompurify";

/**
 * Sanitizes rich HTML content before rendering.
 *
 * Goal: prevent stored XSS while keeping common rich-text formatting.
 */
export function sanitizeRichHtml(dirtyHtml: string): string {
  // DOMPurify already strips event handlers (onerror, onclick, etc.) and scripts.
  // We additionally constrain allowed tags/attrs to reduce attack surface.
  return DOMPurify.sanitize(dirtyHtml, {
    USE_PROFILES: { html: true },
    ALLOWED_TAGS: [
      "a",
      "b",
      "blockquote",
      "br",
      "code",
      "div",
      "em",
      "h1",
      "h2",
      "h3",
      "h4",
      "hr",
      "i",
      "img",
      "li",
      "ol",
      "p",
      "pre",
      "span",
      "strong",
      "u",
      "ul",
    ],
    ALLOWED_ATTR: [
      "href",
      "target",
      "rel",
      "class",
      "title",
      "src",
      "alt",
      "width",
      "height",
    ],
    // Disallow potentially dangerous URL schemes.
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
  });
}
