import { PageHeader } from '@/components/gm/ui'
import { CharacterList } from '@/components/gm/CharacterList'

export default function GmOnlinePage() {
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="En vivo" title="Jugadores online" description="Personajes conectados ahora (characters.online). El tiempo conectado se calcula desde el último inicio de sesión de la cuenta; se actualiza cada 30 s." />
      <CharacterList onlineOnly />
    </div>
  )
}
