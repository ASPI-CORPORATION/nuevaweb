'use client'

import { motion } from 'framer-motion'
import { Download, Settings, UserPlus, Gamepad2 } from 'lucide-react'
import Link from 'next/link'

const steps = [
  {
    num: '01',
    Icon: Download,
    color: '#75C7FF',
    title: 'Descargá WoW 3.3.5a',
    desc: 'Necesitás el cliente de World of Warcraft versión 3.3.5a (Wrath of the Lich King). Si ya lo tenés instalado, saltá al paso 2.',
    cta: { label: 'Ir a Descargas', href: '/download' },
  },
  {
    num: '02',
    Icon: Settings,
    color: '#4ade80',
    title: 'Cambiá el Realmlist',
    desc: 'En la carpeta del juego, abrí Data/enUS/realmlist.wtf y reemplazá el contenido por:',
    code: `set realmlist ${process.env.NEXT_PUBLIC_REALMLIST || 'logon.wowargentina.com.ar'}`,
  },
  {
    num: '03',
    Icon: UserPlus,
    color: '#F6B40E',
    title: 'Creá tu Cuenta',
    desc: 'Registrate gratis en nuestra web. Con un usuario y contraseña ya podés entrar al juego.',
    cta: { label: 'Crear Cuenta', href: '/register' },
  },
  {
    num: '04',
    Icon: Gamepad2,
    color: '#a78bfa',
    title: 'Entrá a Jugar',
    desc: 'Abrí WoW, seleccioná Wrath of the Lich King en la pantalla de inicio y entrá con tus credenciales. ¡Bienvenido a Rasganorte!',
  },
]

export function HowToStartSection() {
  return (
    <section className="relative z-10 py-20 md:py-28 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4"
            style={{ background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.18)', color: '#4ade80' }}>
            <Gamepad2 className="w-3.5 h-3.5" /> Guía de inicio
          </div>
          <h2 className="font-['Cinzel'] font-black text-4xl md:text-5xl text-white mb-4">
            Cómo{' '}
            <span style={{ background: 'linear-gradient(135deg, #4ade80, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Empezar
            </span>
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            En 4 pasos simples estás jugando en WoW Argentina.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Connecting line (desktop) */}
          <div className="hidden md:block absolute top-10 left-[calc(12.5%+8px)] right-[calc(12.5%+8px)] h-px"
            style={{ background: 'linear-gradient(to right, rgba(117,199,255,0.08), rgba(117,199,255,0.2), rgba(117,199,255,0.08))' }} />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <motion.div key={step.num}
                initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.12 }}
                className="relative flex flex-col">

                {/* Number circle */}
                <div className="relative z-10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 font-['Cinzel'] font-black text-2xl"
                  style={{
                    background: `radial-gradient(ellipse at 50% 30%, ${step.color}20, rgba(10,20,40,0.9))`,
                    border: `2px solid ${step.color}30`,
                    color: step.color,
                    boxShadow: `0 0 24px ${step.color}20`,
                  }}>
                  <step.Icon className="w-8 h-8" style={{ color: step.color }} />
                </div>

                {/* Card */}
                <div className="flex-1 rounded-2xl p-5 text-center md:text-left"
                  style={{ background: 'rgba(10,20,40,0.6)', border: '1px solid rgba(117,199,255,0.08)', backdropFilter: 'blur(12px)' }}>
                  <div className="text-xs font-bold tracking-widest mb-2" style={{ color: `${step.color}80` }}>
                    PASO {step.num}
                  </div>
                  <h3 className="font-['Cinzel'] font-bold text-base text-white mb-2">{step.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed mb-3">{step.desc}</p>

                  {step.code && (
                    <div className="rounded-lg px-3 py-2 text-xs font-mono break-all mb-3"
                      style={{ background: 'rgba(117,199,255,0.07)', border: '1px solid rgba(117,199,255,0.14)', color: '#75C7FF' }}>
                      {step.code}
                    </div>
                  )}

                  {step.cta && (
                    <Link href={step.cta.href}>
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold transition-all hover:gap-2.5"
                        style={{ color: step.color }}>
                        {step.cta.label} →
                      </span>
                    </Link>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px"
        style={{ background: 'linear-gradient(to right, transparent, rgba(74,222,128,0.1), transparent)' }} />
    </section>
  )
}
