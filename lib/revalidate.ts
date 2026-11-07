import { revalidatePath } from 'next/cache'

/** Public pages that show news. Route handlers mark them stale; they regenerate on next visit. */
export function revalidateNewsPages(slugs: Array<string | null | undefined> = []) {
  revalidatePath('/')
  revalidatePath('/news')
  revalidatePath('/news/[slug]', 'page')
  for (const s of slugs) if (s) revalidatePath(`/news/${s}`)
}

export function revalidateChangelogPages() {
  revalidatePath('/')
  revalidatePath('/changelog')
}
