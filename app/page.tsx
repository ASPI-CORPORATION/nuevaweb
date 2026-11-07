import { HeroSection } from '@/components/home/HeroSection'
import { PathsSection } from '@/components/home/PathsSection'
import { CustomSetsSection } from '@/components/home/CustomSetsSection'
import { ServerStatusSection } from '@/components/home/ServerStatusSection'
import { WhyPlaySection } from '@/components/home/WhyPlaySection'
import { NewsSection } from '@/components/home/NewsSection'
import { TopPvPSection } from '@/components/home/TopPvPSection'
import { HowToStartSection } from '@/components/home/HowToStartSection'
import { DiscordSection } from '@/components/home/DiscordSection'

// News, server status and PvP top read live DB data; without this the page was frozen at build time
export const revalidate = 60

export default function HomePage() {
  return (
    <div className="relative">
      <HeroSection />
      <PathsSection />
      <CustomSetsSection />
      <ServerStatusSection />
      <WhyPlaySection />
      <NewsSection />
      <TopPvPSection />
      <HowToStartSection />
      <DiscordSection />
    </div>
  )
}
