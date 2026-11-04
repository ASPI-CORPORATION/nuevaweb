import { redirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'
import { getSession, getFullGmLevel } from '@/lib/auth'
import { queryCms } from '@/lib/db'
import DirectivosSidebar from '@/components/directivos/DirectivosSidebar'

export default async function DirectivosLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  if (!session) redirect('/login?redirect=/directivos')

  const gmlevel = await getFullGmLevel(session.id)

  if (gmlevel < 10) {
    // Log unauthorized access attempt
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
    try {
      await queryCms(
        'INSERT INTO cms_logs (account_id, action, details, ip) VALUES (?, ?, ?, ?)',
        [
          session.id,
          'INTENTO DE ACCESO NO AUTORIZADO',
          `Intento de acceso a /directivos - Usuario: ${session.username} (gmlevel: ${gmlevel})`,
          ip,
        ]
      )
    } catch {}
    redirect('/')
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background: 'linear-gradient(135deg, #0a0500 0%, #150b00 40%, #0a0500 100%)',
        boxShadow: 'inset 0 0 200px rgba(255, 215, 0, 0.03)',
      }}
    >
      <div
        className="border-b"
        style={{ borderColor: 'rgba(255, 215, 0, 0.15)', background: 'rgba(255, 215, 0, 0.03)' }}
      >
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center gap-3">
          <span className="text-yellow-400 text-lg">👑</span>
          <span className="font-['Cinzel'] font-bold text-yellow-400 text-sm tracking-wider">PANEL DE DIRECTIVOS</span>
          <span className="text-yellow-600 text-xs ml-auto">Acceso Total — Nivel 10</span>
        </div>
      </div>
      <div className="max-w-screen-xl mx-auto px-4 py-8">
        <div className="flex gap-6">
          <DirectivosSidebar user={{ ...session, gmlevel }} />
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  )
}
