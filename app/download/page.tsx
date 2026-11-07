'use client'

import { motion } from 'framer-motion'
import { Download, Settings, User, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'

const steps = [
  {
    number: '01',
    icon: Download,
    title: 'Descargá el cliente',
    description: 'Necesitás el cliente de World of Warcraft versión 3.3.5a (Wrath of the Lich King). Si no lo tenés, podés descargarlo desde los links de abajo.',
    actions: [
      { label: 'Descarga Oficial (Drive)', href: '#' },
      { label: 'Torrent (BitTorrent)', href: '#' },
    ],
  },
  {
    number: '02',
    icon: Settings,
    title: 'Configurá el realmlist',
    description: 'Abrí la carpeta del cliente de WoW, buscá el archivo Data/enUS/realmlist.wtf (o Data/esES/) y editalo con el Bloc de Notas. Reemplazá el contenido por:',
    code: `set realmlist logon.wowargentina.com.ar`,
  },
  {
    number: '03',
    icon: User,
    title: 'Creá tu cuenta y jugá',
    description: 'Creá tu cuenta en este sitio, abrí el WoW.exe, ingresá tu usuario y contraseña, ¡y ya estás dentro de Rasganorte!',
    actions: [
      { label: 'Crear Cuenta', href: '/register' },
    ],
  },
]

const faq = [
  {
    q: '¿El servidor es gratuito?',
    a: 'Sí, WoW Argentina es completamente gratuito. Podés donar para apoyar el servidor y recibir Moneda Argentina, pero no es obligatorio para disfrutar del juego.',
  },
  {
    q: '¿Cuál es la versión del cliente que necesito?',
    a: 'Necesitás World of Warcraft versión 3.3.5a (12340), que es Wrath of the Lich King. No funciona con versiones más nuevas ni más viejas.',
  },
  {
    q: '¿Puedo usar el cliente original de Blizzard?',
    a: 'Sí, si ya tenés el cliente original de WoW WotLK 3.3.5a solo necesitás cambiar el realmlist.',
  },
  {
    q: '¿Cuáles son las tasas de XP?',
    a: 'Depende del camino que elegís: Aventurero Blizzlike (x2 XP), Leveo Rápido (x5 XP con NPCs en 20/40/60), Instant 80 (comenzás directo en 80).',
  },
  {
    q: '¿Hay wipes o reseteos?',
    a: 'No planeamos hacer wipes. El servidor está construido para durar y evolucionar con nuevos sets y contenido custom.',
  },
  {
    q: '¿Dónde pido ayuda?',
    a: 'En nuestro Discord o creando un ticket de soporte desde tu panel de cuenta.',
  },
]

export default function DownloadPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="font-['Cinzel'] font-black text-4xl md:text-5xl text-white mb-4">
            Cómo Jugar
          </h1>
          <p className="text-slate-400 text-lg">
            Tres pasos y estás en Rasganorte. Fácil, rápido, gratis.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-6 mb-20">
          {steps.map((step, i) => {
            const Icon = step.icon
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex flex-col sm:flex-row gap-4 sm:gap-6 card-dark p-5 sm:p-6"
              >
                <div className="flex-shrink-0">
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <Icon className="w-7 h-7 text-blue-400" />
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-[#74ACDF] font-mono font-bold mb-1">PASO {step.number}</div>
                  <h3 className="font-['Cinzel'] font-bold text-xl text-white mb-2">{step.title}</h3>
                  <p className="text-slate-400 leading-relaxed mb-4">{step.description}</p>
                  {step.code && (
                    <div className="bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 font-mono text-green-400 text-sm mb-4 break-all">
                      {step.code}
                    </div>
                  )}
                  {step.actions && (
                    <div className="flex flex-wrap gap-3">
                      {step.actions.map(action => (
                        <Link
                          key={action.href}
                          href={action.href}
                          className="px-5 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 hover:border-blue-500/50 text-blue-300 rounded-xl text-sm font-medium transition-all"
                        >
                          {action.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Requisitos */}
        <div className="mb-16 bg-slate-900/40 border border-slate-700/40 rounded-2xl p-6">
          <h2 className="font-['Cinzel'] font-bold text-xl text-white mb-4">Requisitos del sistema</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-slate-400 font-medium mb-2">Mínimos</div>
              <ul className="space-y-1 text-slate-500">
                <li>• CPU: Dual Core 2 GHz</li>
                <li>• RAM: 2 GB</li>
                <li>• GPU: GeForce 7600 / Radeon X1600</li>
                <li>• Disco: 15 GB libres</li>
                <li>• Internet: 1 Mbps</li>
              </ul>
            </div>
            <div>
              <div className="text-slate-400 font-medium mb-2">Recomendados</div>
              <ul className="space-y-1 text-slate-500">
                <li>• CPU: Quad Core 2.5 GHz</li>
                <li>• RAM: 4 GB</li>
                <li>• GPU: GeForce GTX 460 o superior</li>
                <li>• Disco: SSD recomendado</li>
                <li>• Internet: 5 Mbps</li>
              </ul>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div>
          <h2 className="font-['Cinzel'] font-bold text-2xl text-white mb-6">Preguntas frecuentes</h2>
          <div className="space-y-3">
            {faq.map((item, i) => (
              <div key={i} className="bg-slate-900/60 border border-slate-700/50 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-800/30 transition-colors"
                >
                  <span className="font-medium text-white">{item.q}</span>
                  {openFaq === i ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  )}
                </button>
                {openFaq === i && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    className="px-5 pb-4 text-slate-400 text-sm leading-relaxed"
                  >
                    {item.a}
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
