import { z } from 'zod'
import { NextResponse } from 'next/server'
import { NEWS_CATEGORIES, isSafeImageUrl, slugify } from '@/lib/content-config'
import { sanitizeRichHtml, htmlToPlainText, makeExcerpt } from '@/lib/sanitize'
import { executeCms } from '@/lib/db'

const fields = {
  title: z.string().trim().min(3, 'El título debe tener al menos 3 caracteres').max(200, 'Título demasiado largo'),
  slug: z.string().trim().max(150),
  excerpt: z.string().trim().max(500, 'El resumen admite hasta 500 caracteres'),
  content: z.string().max(200_000, 'El contenido es demasiado largo'),
  image: z.string().trim().max(500)
    .refine(v => v === '' || isSafeImageUrl(v), 'La imagen debe ser una subida del panel o una URL https'),
  category: z.enum(NEWS_CATEGORIES, { message: 'Categoría inválida' }),
  published: z.boolean(),
  pinned: z.boolean(),
}

export const newsInputSchema = z.object({
  ...fields,
  slug: fields.slug.optional(),
  excerpt: fields.excerpt.optional(),
  content: fields.content.default(''),
  image: fields.image.default(''),
  published: fields.published.default(false),
  pinned: fields.pinned.default(false),
})

/** Partial update — no defaults, so toggling one flag never resets another. */
export const newsPatchSchema = z.object(fields).partial()

export type NewsInput = z.infer<typeof newsInputSchema>

/** Normalizes editor input into the row stored in cms_news. */
export function prepareNews(d: NewsInput) {
  const content = sanitizeRichHtml(d.content)
  const slug = slugify(d.slug || d.title)
  const excerpt = (d.excerpt && d.excerpt.length > 0 ? d.excerpt : makeExcerpt(content, 300)).slice(0, 500)
  return { ...d, content, slug, excerpt, image: d.image || null }
}

export function publishProblem(row: { title: string; content: string }): string | null {
  if (htmlToPlainText(row.content).length < 10 && !/<img\b/i.test(row.content)) {
    return 'Para publicar, la noticia necesita contenido (al menos 10 caracteres).'
  }
  return null
}

export function dbErrorResponse(err: unknown, context: string) {
  const code = (err as { code?: string })?.code
  if (code === 'ER_DUP_ENTRY') {
    return NextResponse.json({ error: 'Ya existe una publicación con ese slug. Cambiá el título o el slug.' }, { status: 409 })
  }
  if (code === 'WARN_DATA_TRUNCATED' || code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD' || code === 'ER_DATA_TOO_LONG') {
    return NextResponse.json({ error: 'Algún campo no coincide con la estructura de la tabla. Ejecutá la migración pendiente.' }, { status: 422 })
  }
  console.error(`[${context}]`, err instanceof Error ? err.message : err)
  return NextResponse.json({ error: 'Error interno al guardar. Revisá los logs del servidor.' }, { status: 500 })
}

export async function logContentAction(accountId: number, action: string, details: string, ip: string) {
  await executeCms(
    'INSERT INTO cms_logs (account_id, action, details, ip) VALUES (?, ?, ?, ?)',
    [accountId, action, details, ip]
  ).catch(() => {})
}
