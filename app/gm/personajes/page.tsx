import { PageHeader } from '@/components/gm/ui'
import { CharacterList } from '@/components/gm/CharacterList'

export default function GmPersonajesPage() {
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Jugadores" title="Personajes" description="Buscá cualquier personaje de acore_characters y resolvé los problemas habituales: desatascar, enviar a capital y sanciones." />
      <CharacterList onlineOnly={false} />
    </div>
  )
}
