import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize an HTML string before rendering it via dangerouslySetInnerHTML.
 * Strips <script>, event handlers (onclick, onerror, ...), javascript: URLs,
 * and other XSS vectors while keeping normal blog/rich-text formatting.
 *
 * Use this for ANY HTML that originates from the database or a user
 * (blog content, ad code, team bios, AI output, etc.).
 */
/**
 * Sanitize an HTML string before rendering it via dangerouslySetInnerHTML.
 * Strips <script>, event handlers (onclick, onerror, ...), javascript: URLs,
 * and other XSS vectors while keeping normal blog/rich-text formatting.
 */
export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'target'],
    FORBID_TAGS: ['script', 'style'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  });
}

/**
 * Special sanitizer for AdSense and Ad placements.
 * Preserves <script>, <ins>, <iframe>, <style> and AdSense data attributes.
 */
export function sanitizeAdCode(dirty: string | null | undefined): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, {
    ADD_TAGS: ['script', 'ins', 'iframe', 'style', 'div', 'span', 'a', 'img'],
    ADD_ATTR: [
      'async', 'src', 'crossorigin', 'style', 'display', 
      'data-ad-client', 'data-ad-slot', 'data-ad-format', 
      'data-full-width-responsive', 'class', 'target', 'href', 'rel', 'alt'
    ],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  });
}
