import { NextResponse } from 'next/server'

// Server-side in-memory icon cache (survives across requests in same process)
const iconCache = new Map<number, string>()

async function fetchWowheadIcon(entry: number): Promise<string | null> {
  const cached = iconCache.get(entry)
  if (cached !== undefined) return cached

  try {
    // dataEnv=4 = WoTLK on wowhead
    const res = await fetch(
      `https://nether.wowhead.com/tooltip/item/${entry}?dataEnv=4&locale=0`,
      { signal: AbortSignal.timeout(4000) },
    )
    if (!res.ok) return null
    const data = (await res.json()) as { icon?: string }
    const icon = data.icon?.toLowerCase() ?? null
    if (icon) iconCache.set(entry, icon)
    return icon
  } catch {
    return null
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const param = searchParams.get('entries') ?? ''

  const entries = param
    .split(',')
    .map(Number)
    .filter(n => Number.isInteger(n) && n > 0)
    .slice(0, 25)

  if (entries.length === 0) {
    return NextResponse.json({})
  }

  const results = await Promise.all(
    entries.map(async entry => ({ entry, icon: await fetchWowheadIcon(entry) })),
  )

  const map: Record<number, string> = {}
  for (const { entry, icon } of results) {
    if (icon) map[entry] = icon
  }

  return NextResponse.json(map, {
    headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600' },
  })
}
