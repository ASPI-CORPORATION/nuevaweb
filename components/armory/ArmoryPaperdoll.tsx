'use client'

import { useState, useEffect } from 'react'

export interface EquippedItem {
  slot: number
  itemEntry: number
  itemName: string
  quality: number
  itemLevel: number
  displayId: number
  inventoryType: number
  socketColor1: number
  socketColor2: number
  socketColor3: number
  stats: Array<{ type: number; value: number }>
}

interface Props {
  // Keys come as strings after JSON serialization across the server→client boundary
  equipped: Record<string, EquippedItem>
  avgIlvl: number
}

// ── constants ────────────────────────────────────────────────────────────────

const QUALITY_COLORS = ['#9d9d9d', '#ffffff', '#1eff00', '#0070dd', '#a335ee', '#ff8000']
const QUALITY_NAMES  = ['Pobre', 'Común', 'Poco común', 'Raro', 'Épico', 'Legendario']

const SLOT_NAMES: Record<number, string> = {
  0: 'Cabeza',  1: 'Cuello',   2: 'Hombros', 3: 'Camisa',
  4: 'Pecho',   5: 'Cintura',  6: 'Piernas', 7: 'Pies',
  8: 'Muñecas', 9: 'Manos',   10: 'Anillo 1', 11: 'Anillo 2',
  12: 'Amuleto 1', 13: 'Amuleto 2', 14: 'Espalda',
  15: 'Mano Principal', 16: 'Mano Sec.', 17: 'A Distancia', 18: 'Tabardo',
}

// Placeholder icons for empty slots (all exist on zamimg CDN)
const SLOT_PLACEHOLDER: Record<number, string> = {
  0:  'ui-paperdoll-slot-head',
  1:  'ui-paperdoll-slot-neck',
  2:  'ui-paperdoll-slot-shoulder',
  3:  'ui-paperdoll-slot-shirt',
  4:  'ui-paperdoll-slot-chest',
  5:  'ui-paperdoll-slot-waist',
  6:  'ui-paperdoll-slot-legs',
  7:  'ui-paperdoll-slot-feet',
  8:  'ui-paperdoll-slot-wrists',
  9:  'ui-paperdoll-slot-hands',
  10: 'ui-paperdoll-slot-finger',
  11: 'ui-paperdoll-slot-finger',
  12: 'ui-paperdoll-slot-trinket',
  13: 'ui-paperdoll-slot-trinket',
  14: 'ui-paperdoll-slot-chest',    // back/cloak reuses chest placeholder
  15: 'ui-paperdoll-slot-mainhand',
  16: 'ui-paperdoll-slot-secondaryhand',
  17: 'ui-paperdoll-slot-ranged',
  18: 'ui-paperdoll-slot-tabard',
}

const STAT_NAMES: Record<number, string> = {
  3: 'Agilidad',  4: 'Fuerza',   5: 'Intelecto', 6: 'Espíritu', 7: 'Aguante',
  12: 'Defensa',  13: 'Esquiva', 14: 'Parada',   15: 'Bloqueo',
  31: 'Impacto',  32: 'Golpe Crítico', 35: 'Resiliencia', 36: 'Celeridad',
  37: 'Pericia',  38: 'Poder de Ataque', 39: 'PA a Distancia',
  43: 'Regen. de Maná', 44: 'Penet. de Armadura',
  45: 'Poder de Hechizos', 46: 'Regen. de Vida', 47: 'Penet. de Hechizos',
}

const SOCKET_STYLES: Record<number, { label: string; bg: string }> = {
  1: { label: 'Meta',     bg: '#3d3d3d' },
  2: { label: 'Rojo',     bg: '#c41e3a' },
  4: { label: 'Amarillo', bg: '#a08000' },
  8: { label: 'Azul',     bg: '#0070dd' },
}

// Left column: 8 slots, Right column: 8 slots, Bottom: 3 weapon slots
const LEFT_SLOTS   = [0, 1, 2, 14, 4, 3, 18, 8]
const RIGHT_SLOTS  = [9, 5, 6, 7, 10, 11, 12, 13]
const BOTTOM_SLOTS = [15, 16, 17]

function zamImg(icon: string) {
  return `https://wow.zamimg.com/images/wow/icons/large/${icon}.jpg`
}

// ── ItemSlot ──────────────────────────────────────────────────────────────────

function ItemSlot({
  slotId,
  item,
  iconName,
  tip,
}: {
  slotId: number
  item: EquippedItem | undefined
  iconName: string | null
  tip: 'right' | 'left' | 'above'
}) {
  const [hover, setHover] = useState(false)

  const qColor   = item ? (QUALITY_COLORS[item.quality] ?? '#fff') : null
  const imgSrc   = item && iconName
    ? zamImg(iconName)
    : zamImg(SLOT_PLACEHOLDER[slotId] ?? 'inv_misc_questionmark')

  const sockets = item
    ? [item.socketColor1, item.socketColor2, item.socketColor3].filter(c => c > 0)
    : []

  const tipClasses: Record<typeof tip, string> = {
    right: 'left-full top-0 ml-2',
    left:  'right-full top-0 mr-2',
    above: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Icon box */}
      <div
        className="w-14 h-14 rounded-lg overflow-hidden transition-transform duration-150 hover:scale-110 cursor-pointer"
        style={{
          border: qColor
            ? `2px solid ${qColor}bb`
            : '2px solid rgba(255,255,255,0.08)',
          boxShadow: qColor && item
            ? `0 0 10px ${qColor}44, inset 0 0 4px ${qColor}22`
            : '0 0 4px rgba(0,0,0,0.6)',
        }}
      >
        <img
          src={imgSrc}
          alt={item?.itemName ?? SLOT_NAMES[slotId]}
          width={56}
          height={56}
          className="w-full h-full object-cover"
          style={{ opacity: item ? 1 : 0.35 }}
          onError={e => {
            (e.target as HTMLImageElement).src = zamImg('inv_misc_questionmark')
          }}
        />
      </div>

      {/* Tooltip */}
      {hover && item && (
        <div
          className={`absolute z-50 w-64 p-3 rounded-xl pointer-events-none ${tipClasses[tip]}`}
          style={{
            background: 'rgba(4, 8, 18, 0.97)',
            border: `1px solid ${qColor ?? '#fff'}55`,
            boxShadow: `0 8px 32px rgba(0,0,0,0.9), 0 0 0 1px ${qColor ?? '#fff'}22`,
          }}
        >
          {/* Item name */}
          <p className="font-bold text-sm leading-snug mb-0.5" style={{ color: qColor ?? '#fff' }}>
            {item.itemName}
          </p>
          {/* Quality · iLvl */}
          <p className="text-xs mb-2.5" style={{ color: '#718096' }}>
            {QUALITY_NAMES[item.quality] ?? 'Desconocido'} · iLvl {item.itemLevel}
          </p>
          {/* Stats */}
          {item.stats.length > 0 && (
            <div className="space-y-0.5 mb-2.5">
              {item.stats.map((s, i) => {
                const label = STAT_NAMES[s.type]
                if (!label) return null
                return (
                  <p key={i} className="text-xs text-green-400">
                    +{s.value} {label}
                  </p>
                )
              })}
            </div>
          )}
          {/* Sockets */}
          {sockets.length > 0 && (
            <div className="flex items-center gap-1.5 mb-2.5">
              {sockets.map((sc, i) => {
                const st = SOCKET_STYLES[sc]
                return (
                  <div
                    key={i}
                    title={st?.label ?? 'Gema'}
                    className="w-3.5 h-3.5 rounded-full border border-white/20 flex-shrink-0"
                    style={{ background: st?.bg ?? '#555' }}
                  />
                )
              })}
            </div>
          )}
          {/* Slot label */}
          <p className="text-xs pt-2 border-t border-white/10" style={{ color: '#4a5568' }}>
            {SLOT_NAMES[slotId]}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function ArmoryPaperdoll({ equipped, avgIlvl }: Props) {
  const [icons, setIcons] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const entries = Object.values(equipped)
      .map(i => i.itemEntry)
      .filter(e => e > 0)

    if (entries.length === 0) {
      setLoading(false)
      return
    }

    fetch(`/api/item-icons?entries=${entries.join(',')}`)
      .then(r => r.json())
      .then((data: Record<number, string>) => {
        setIcons(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [equipped])

  const getIcon = (item: EquippedItem | undefined) =>
    item ? (icons[item.itemEntry] ?? null) : null

  // Keys are stringified after serialization, normalise to number index
  const slotMap = Object.fromEntries(
    Object.entries(equipped).map(([k, v]) => [Number(k), v]),
  ) as Record<number, EquippedItem>

  const equippedCount = Object.keys(equipped).length

  return (
    <div>
      {/* Header: iLvl + count */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {avgIlvl > 0 && (
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
            style={{
              background: 'rgba(117,199,255,0.08)',
              border: '1px solid rgba(117,199,255,0.25)',
              color: '#75C7FF',
            }}
          >
            <span style={{ color: '#4a7a9b' }}>iLvl Prom.</span>
            <span className="text-xl font-black">{avgIlvl}</span>
          </div>
        )}
        <span className="text-xs" style={{ color: '#4a5568' }}>
          {equippedCount} {equippedCount === 1 ? 'pieza equipada' : 'piezas equipadas'}
          {loading && ' · cargando iconos…'}
        </span>
      </div>

      {/* Paperdoll: left col / center / right col */}
      <div className="flex gap-3 items-start justify-center flex-wrap md:flex-nowrap">

        {/* ── Left column ── */}
        <div className="flex flex-col gap-2.5">
          {LEFT_SLOTS.map(id => (
            <ItemSlot
              key={id}
              slotId={id}
              item={slotMap[id]}
              iconName={getIcon(slotMap[id])}
              tip="right"
            />
          ))}
        </div>

        {/* ── Center silhouette ── */}
        <div
          className="hidden md:flex flex-1 min-w-[160px] max-w-[260px] items-center justify-center rounded-2xl self-stretch"
          style={{
            background:
              'radial-gradient(ellipse at 50% 40%, rgba(117,199,255,0.07) 0%, transparent 70%)',
            border: '1px solid rgba(117,199,255,0.07)',
            minHeight: '480px',
          }}
        >
          <div className="text-center select-none">
            <div
              className="text-7xl mb-3 opacity-60"
              style={{ filter: 'drop-shadow(0 0 12px rgba(117,199,255,0.3))' }}
            >
              ⚔️
            </div>
            <p className="text-xs" style={{ color: '#2d3748' }}>Personaje</p>
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="flex flex-col gap-2.5">
          {RIGHT_SLOTS.map(id => (
            <ItemSlot
              key={id}
              slotId={id}
              item={slotMap[id]}
              iconName={getIcon(slotMap[id])}
              tip="left"
            />
          ))}
        </div>
      </div>

      {/* ── Bottom row: weapons ── */}
      <div className="flex gap-6 justify-center mt-5">
        {BOTTOM_SLOTS.map(id => (
          <div key={id} className="flex flex-col items-center gap-1.5">
            <ItemSlot
              slotId={id}
              item={slotMap[id]}
              iconName={getIcon(slotMap[id])}
              tip="above"
            />
            <span className="text-xs" style={{ color: '#4a5568' }}>
              {SLOT_NAMES[id]}
            </span>
          </div>
        ))}
      </div>

      {/* Mobile note */}
      <p className="text-center text-xs mt-6 md:hidden" style={{ color: '#2d3748' }}>
        Pasá el cursor sobre cada pieza para ver detalles
      </p>
    </div>
  )
}
