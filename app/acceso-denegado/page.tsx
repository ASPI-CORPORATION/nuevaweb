import type { Metadata } from 'next'
import { AccessDenied } from '@/components/panel/AccessDenied'

export const metadata: Metadata = { title: 'Acceso denegado — WoW Argentina', robots: { index: false } }

const AREAS: Record<string, string> = {
  '/gm': 'el Panel GM',
  '/admin': 'el Panel Admin',
  '/directivos': 'el Panel de Directivos',
}

export default async function AccesoDenegadoPage({ searchParams }: { searchParams: Promise<{ area?: string }> }) {
  const { area = '' } = await searchParams
  const key = Object.keys(AREAS).find(k => area === k || area.startsWith(k + '/'))
  return <AccessDenied area={key ? AREAS[key] : 'esta sección'} />
}
