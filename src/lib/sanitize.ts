/**
 * Safe HTML sanitizer that never crashes on Server-Side Rendering (SSR)
 * or in Serverless Edge/Node environments.
 */
export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return '';
  
  // During SSR on server, return cleaned HTML without script/event handlers
  // This avoids JSDOM and window initialization crashes in Node/serverless
  if (typeof window === 'undefined') {
    return dirty
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/\s+on\w+="[^"]*"/gi, '')
      .replace(/\s+on\w+='[^']*'/gi, '')
      .replace(/javascript:[^"']*/gi, '');
  }

  try {
    // Client-side execution can safely use DOMPurify
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const DOMPurify = require('isomorphic-dompurify');
    const purify = DOMPurify.default || DOMPurify;
    return purify.sanitize(dirty, {
      ADD_TAGS: ['iframe'],
      ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'target'],
      FORBID_TAGS: ['script', 'style'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
    });
  } catch {
    return dirty
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/\s+on\w+="[^"]*"/gi, '');
  }
}

/**
 * Special sanitizer for AdSense and Ad placements.
 * Preserves <script>, <ins>, <iframe>, <style> and AdSense data attributes.
 */
export function sanitizeAdCode(dirty: string | null | undefined): string {
  if (!dirty) return '';
  
  if (typeof window === 'undefined') {
    return dirty;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const DOMPurify = require('isomorphic-dompurify');
    const purify = DOMPurify.default || DOMPurify;
    return purify.sanitize(dirty, {
      ADD_TAGS: ['script', 'ins', 'iframe', 'style', 'div', 'span', 'a', 'img'],
      ADD_ATTR: [
        'async', 'src', 'crossorigin', 'style', 'display', 
        'data-ad-client', 'data-ad-slot', 'data-ad-format', 
        'data-full-width-responsive', 'class', 'target', 'href', 'rel', 'alt'
      ],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
    });
  } catch {
    return dirty;
  }
}

