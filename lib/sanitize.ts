import sanitizeHtml from 'sanitize-html'
import { isSafeImageUrl } from '@/lib/content-config'

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'br', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's',
    'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'hr', 'code', 'pre', 'span',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { img: ['https'] },
  allowProtocolRelative: false,
  exclusiveFilter: frame => frame.tag === 'img' && !isSafeImageUrl(frame.attribs.src ?? ''),
  transformTags: {
    a: (tagName, attribs) => {
      const href = attribs.href ?? ''
      const out: Record<string, string> = { href }
      if (/^https?:\/\//i.test(href)) {
        out.target = '_blank'
        out.rel = 'noopener noreferrer nofollow'
      }
      return { tagName, attribs: out }
    },
    img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: 'lazy' } }),
  },
}

/** Sanitizes rich text produced by the admin editor (and legacy HTML) before storing or rendering. */
export function sanitizeRichHtml(html: string): string {
  return sanitizeHtml(html ?? '', OPTIONS)
}

export function htmlToPlainText(html: string): string {
  // Pad block boundaries so "<h2>A</h2><p>B</p>" becomes "A B", not "AB"
  const spaced = (html ?? '').replace(/<\/?(p|h[1-6]|li|ul|ol|blockquote|div|br|hr|pre)\b[^>]*>/gi, ' $& ')
  return sanitizeHtml(spaced, { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export function makeExcerpt(html: string, max = 220): string {
  const text = htmlToPlainText(html)
  if (text.length <= max) return text
  return text.slice(0, max).replace(/\s+\S*$/, '') + '…'
}
