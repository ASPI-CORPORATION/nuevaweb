import type { Metadata } from 'next'
import { Suspense } from 'react'
import './globals.css'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { SnowEffect } from '@/components/effects/SnowEffect'
import { MaintenanceBanner } from '@/components/layout/MaintenanceBanner'
import { Toaster } from '@/components/ui/toaster'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://wowargentina.com.ar'),
  title: 'WoW Argentina - Dominá Rasganorte',
  description: 'WoW Argentina — Instant 80. Servidor de World of Warcraft Wrath of the Lich King 3.3.5a: nivel 80 inmediato, PvP y PvE, ICC, arenas y BGs con Crossfaction. Lanzamiento: viernes 13 de noviembre de 2026, 18:00 (Argentina).',
  keywords: 'WoW Argentina, World of Warcraft privado, Wrath of the Lich King, WotLK 3.3.5a, AzerothCore, servidor WoW Argentina',
  openGraph: {
    title: 'WoW Argentina - Dominá Rasganorte',
    description: 'WoW Argentina — Instant 80: PvP y PvE de WotLK 3.3.5a con Crossfaction en raids y BGs. Comunidad argentina.',
    url: process.env.NEXT_PUBLIC_SITE_URL,
    siteName: 'WoW Argentina',
    images: [{ url: '/images/og-image.jpg' }],
    locale: 'es_AR',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <SnowEffect />
        <Suspense fallback={null}>
          <MaintenanceBanner />
        </Suspense>
        <Navbar />
        {/* No z-index here: it would trap every page modal below the fixed navbar */}
        <main className="relative">{children}</main>
        <Footer />
        <Toaster />
      </body>
    </html>
  )
}
