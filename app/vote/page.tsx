import { getSession } from '@/lib/auth'
import { VoteClient } from '@/components/vote/VoteClient'
import { queryCms, queryCmsFirst } from '@/lib/db'
import { ExternalLink } from 'lucide-react'

interface VoteStatus {
  site: string
  lastVote: Date | null
  canVote: boolean
  cooldownHours: number
}

async function getVoteStatus(accountId: number): Promise<VoteStatus[]> {
  const cooldownConfig = await queryCmsFirst<{ value: string }>(
    'SELECT value FROM cms_config WHERE key_name = ?',
    ['vote_cooldown_hours']
  )
  const cooldownHours = parseInt(cooldownConfig?.value || '12')

  const sites = ['TopG', 'WoW-Servers']
  const statuses: VoteStatus[] = []

  for (const site of sites) {
    const lastVote = await queryCmsFirst<{ created_at: Date }>(
      `SELECT created_at FROM cms_votes WHERE account_id = ? AND site = ? ORDER BY created_at DESC LIMIT 1`,
      [accountId, site]
    )

    const canVote = !lastVote || (
      new Date().getTime() - new Date(lastVote.created_at).getTime() > cooldownHours * 60 * 60 * 1000
    )

    statuses.push({
      site,
      lastVote: lastVote?.created_at ?? null,
      canVote,
      cooldownHours,
    })
  }

  return statuses
}

async function getMyVotes(accountId: number) {
  return queryCms<{ site: string; created_at: Date; rewarded: number }>(
    'SELECT site, created_at, rewarded FROM cms_votes WHERE account_id = ? ORDER BY created_at DESC LIMIT 20',
    [accountId]
  )
}

export default async function VotePage() {
  const session = await getSession()

  let voteStatuses: VoteStatus[] = []
  let myVotes: Array<{ site: string; created_at: Date; rewarded: number }> = []
  let coinsConfig = { value: '1' }

  try {
    const config = await queryCmsFirst<{ value: string }>(
      'SELECT value FROM cms_config WHERE key_name = ?',
      ['vote_coins_reward']
    )
    if (config) coinsConfig = config

    if (session) {
      voteStatuses = await getVoteStatus(session.id)
      myVotes = await getMyVotes(session.id)
    }
  } catch {
    // DB no disponible
  }

  const topgConfig = { value: '#' }
  const wowServersConfig = { value: '#' }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <h1 className="font-['Cinzel'] font-black text-4xl text-white mb-2">Votar</h1>
          <p className="text-slate-400">
            Votá por WoW Argentina en las listas de servidores y ganás{' '}
            <span className="text-yellow-400 font-semibold">{coinsConfig.value} Moneda Argentina</span> por voto.
          </p>
        </div>

        <VoteClient
          session={session ? { id: session.id, username: session.username } : null}
          voteStatuses={voteStatuses}
          myVotes={myVotes}
          coinsReward={parseInt(coinsConfig.value)}
        />
      </div>
    </div>
  )
}
