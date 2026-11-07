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
  description: 'Servidor privado de World of Warcraft Wrath of the Lich King 3.3.5a. Tres caminos: Aventurero Blizzlike, Instant 80, Leveo Rápido. Sets Custom argentinos. ¡Únite a la comunidad!',
  keywords: 'WoW Argentina, World of Warcraft privado, Wrath of the Lich King, WotLK 3.3.5a, AzerothCore, servidor WoW Argentina',
  openGraph: {
    title: 'WoW Argentina - Dominá Rasganorte',
    description: 'El mejor servidor WoW WotLK de Argentina. Tres caminos, Sets Custom, comunidad argentina.',
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
