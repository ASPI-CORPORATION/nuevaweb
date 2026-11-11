/** Static WotLK 3.3.5a reference data (client-safe). */

export const CLASS_NAMES: Record<number, string> = {
  1: 'Guerrero', 2: 'Paladín', 3: 'Cazador', 4: 'Pícaro', 5: 'Sacerdote',
  6: 'Caballero de la Muerte', 7: 'Chamán', 8: 'Mago', 9: 'Brujo', 11: 'Druida',
}

export const CLASS_COLORS: Record<number, string> = {
  1: '#C79C6E', 2: '#F58CBA', 3: '#ABD473', 4: '#FFF569', 5: '#FFFFFF',
  6: '#C41F3B', 7: '#0070DE', 8: '#69CCF0', 9: '#9482C9', 11: '#FF7D0A',
}

export const RACE_NAMES: Record<number, string> = {
  1: 'Humano', 2: 'Orco', 3: 'Enano', 4: 'Elfo de la noche', 5: 'No-muerto',
  6: 'Tauren', 7: 'Gnomo', 8: 'Trol', 10: 'Elfo de sangre', 11: 'Draenei',
}

export type Faction = 'Alianza' | 'Horda'

const ALLIANCE_RACES = new Set([1, 3, 4, 7, 11])
const HORDE_RACES = new Set([2, 5, 6, 8, 10])

export function factionOf(race: number): Faction | null {
  if (ALLIANCE_RACES.has(race)) return 'Alianza'
  if (HORDE_RACES.has(race)) return 'Horda'
  return null
}

/** Zone ids from AreaTable.dbc (3.3.5a). Unknown ids are shown as "Zona #id", never guessed. */
export const ZONE_NAMES: Record<number, string> = {
  1: 'Dun Morogh', 3: 'Tierras Inhóspitas', 4: 'Las Tierras Devastadas', 8: 'Pantano de las Penas', 10: 'Bosque del Ocaso',
  11: 'Los Humedales', 12: 'Bosque de Elwynn', 14: 'Durotar', 15: 'Marjal Revolcafango', 16: 'Azshara', 17: 'Los Baldíos',
  28: 'Tierras de la Peste del Oeste', 33: 'Vega de Tuercespina', 36: 'Montañas de Alterac', 38: 'Loch Modan',
  40: 'Páramos de Poniente', 41: 'Paso de la Muerte', 44: 'Montañas Crestagrana', 45: 'Tierras Altas de Arathi',
  46: 'Las Estepas Ardientes', 47: 'Tierras del Interior', 51: 'La Garganta de Fuego', 65: 'Cementerio de Dragones',
  66: "Zul'Drak", 67: 'Las Cumbres Tormentosas', 85: 'Claros de Tirisfal', 130: 'Bosque de Argénteos',
  139: 'Tierras de la Peste del Este', 141: 'Teldrassil', 148: 'Costa Oscura', 210: 'Corona de Hielo', 215: 'Mulgore',
  267: 'Laderas de Trabalomas', 331: 'Vallefresno', 357: 'Feralas', 361: 'Frondavil', 394: 'Colinas Pardas',
  400: 'Las Mil Agujas', 405: 'Desolace', 406: 'Sierra Espolón', 440: 'Tanaris', 490: "Cráter de Un'Goro",
  493: 'Claro de la Luna', 495: 'Fiordo Aquilonal', 618: 'Cuna del Invierno', 1377: 'Silithus', 1497: 'Entrañas',
  1519: 'Ventormenta', 1537: 'Forjaz', 1637: 'Orgrimmar', 1638: 'Cima del Trueno', 1657: 'Darnassus',
  2597: 'Valle de Alterac', 2817: 'Bosque Canto de Cristal', 3277: 'Garganta Grito de Guerra', 3358: 'Cuenca de Arathi',
  3430: 'Bosque Canción Eterna', 3433: 'Tierras Fantasma', 3483: 'Península del Fuego Infernal', 3487: 'Lunargenta',
  3518: 'Nagrand', 3519: 'Bosque de Terokkar', 3520: 'Valle Sombraluna', 3521: 'Marisma de Zangar',
  3522: 'Montañas Filospada', 3523: 'Tormenta Abisal', 3524: 'Isla Bruma Azur', 3525: 'Isla Bruma de Sangre',
  3537: 'Tundra Boreal', 3557: 'El Exodar', 3703: 'Ciudad de Shattrath', 3711: 'Cuenca de Sholazar',
  3820: 'Ojo de la Tormenta', 4080: "Isla de Quel'Danas", 4197: 'Conquista del Invierno', 4298: 'Enclave Escarlata',
  4384: 'Playa de los Ancestros', 4395: 'Dalaran', 4710: 'Isla de la Conquista', 4812: 'Ciudadela de la Corona de Hielo',
}

export function zoneName(zone: number | null | undefined): string {
  if (!zone) return 'Desconocida'
  return ZONE_NAMES[zone] ?? `Zona #${zone}`
}

export interface Capital {
  key: string
  label: string
  faction: Faction
  /** Candidate names in acore_world.game_tele; the first one present is used. */
  tele: string[]
}

export const CAPITALS: Capital[] = [
  { key: 'stormwind', label: 'Ventormenta', faction: 'Alianza', tele: ['Stormwind', 'StormwindCity'] },
  { key: 'ironforge', label: 'Forjaz', faction: 'Alianza', tele: ['Ironforge'] },
  { key: 'darnassus', label: 'Darnassus', faction: 'Alianza', tele: ['Darnassus'] },
  { key: 'exodar', label: 'El Exodar', faction: 'Alianza', tele: ['Exodar', 'TheExodar'] },
  { key: 'orgrimmar', label: 'Orgrimmar', faction: 'Horda', tele: ['Orgrimmar'] },
  { key: 'undercity', label: 'Entrañas', faction: 'Horda', tele: ['Undercity'] },
  { key: 'thunderbluff', label: 'Cima del Trueno', faction: 'Horda', tele: ['ThunderBluff'] },
  { key: 'silvermoon', label: 'Lunargenta', faction: 'Horda', tele: ['SilvermoonCity', 'Silvermoon'] },
]

export function defaultCapital(faction: Faction | null): Capital | null {
  if (faction === 'Alianza') return CAPITALS[0]
  if (faction === 'Horda') return CAPITALS[4]
  return null
}
