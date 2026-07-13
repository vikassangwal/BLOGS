import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize an HTML string before rendering it via dangerouslySetInnerHTML.
 * Strips <script>, event handlers (onclick, onerror, ...), javascript: URLs,
 * and other XSS vectors while keeping normal blog/rich-text formatting.
 *
 * Use this for ANY HTML that originates from the database or a user
 * (blog content, ad code, team bios, AI output, etc.).
 */
export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, {
    // Allow iframes for embeds (YouTube etc.) but the profile below still
    // strips dangerous attributes/URLs.
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'target'],
    FORBID_TAGS: ['script', 'style'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  });
}
