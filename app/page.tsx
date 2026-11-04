import { HeroSection } from '@/components/home/HeroSection'
import { PathsSection } from '@/components/home/PathsSection'
import { CustomSetsSection } from '@/components/home/CustomSetsSection'
import { NewsSection } from '@/components/home/NewsSection'
import { TopPvPSection } from '@/components/home/TopPvPSection'
import { DiscordSection } from '@/components/home/DiscordSection'

export default function HomePage() {
  return (
    <div className="relative">
      <HeroSection />
      <PathsSection />
      <CustomSetsSection />
      <NewsSection />
      <TopPvPSection />
      <DiscordSection />
    </div>
  )
}
