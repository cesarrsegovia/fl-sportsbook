import { PrismaClient } from '@prisma/client'
import axios from 'axios'
const prisma = new PrismaClient()

async function syncSoccerStandings() {
  console.log('Fetching soccer standings for ARG.1...')
  try {
    const url = `https://site.api.espn.com/apis/v2/sports/soccer/arg.1/standings`
    const { data } = await axios.get(url)

    const groups = data.children || (data.standings ? [data] : [])
    for (const group of groups) {
      const confName = group.name || 'General'
      const teams = (group.standings?.entries || group.entries) || []

      console.log(`Processing ${teams.length} teams for ${confName}...`)
      for (const entry of teams) {
        const team = entry.team
        const stats = entry.stats

        const wins = stats.find(s => s.name === 'wins')?.value || 0
        const losses = stats.find(s => s.name === 'losses')?.value || 0
        const pct = stats.find(s => ['winPercent', 'points'].includes(s.name))?.value || 0
        const seed = stats.find(s => ['rank', 'playoffSeed'].includes(s.name))?.value || 0
        const gamesBehind = stats.find(s => s.name === 'gamesBehind')?.value || 0
        const streak = stats.find(s => s.name === 'streak')?.displayValue || ''

        await prisma.teamRanking.upsert({
          where: {
            league_teamName: {
              league: 'SOCCER',
              teamName: team.displayName
            }
          },
          update: {
            wins: Math.floor(wins),
            losses: Math.floor(losses),
            pct: parseFloat(pct.toString()),
            seed: Math.floor(seed),
            gamesBehind: parseFloat(gamesBehind.toString()),
            streak: streak,
            teamAbbr: team.abbreviation,
            teamLogo: team.logos?.[0]?.href || null,
            lastUpdateAt: new Date()
          },
          create: {
            league: 'SOCCER',
            conference: confName,
            teamName: team.displayName,
            teamAbbr: team.abbreviation,
            teamLogo: team.logos?.[0]?.href || null,
            wins: Math.floor(wins),
            losses: Math.floor(losses),
            pct: parseFloat(pct.toString()),
            seed: Math.floor(seed),
            gamesBehind: parseFloat(gamesBehind.toString()),
            streak: streak
          }
        })
      }
    }
    console.log('Soccer standings sync completed!')
  } catch (error) {
    console.error('Error:', error.message)
  }
}

syncSoccerStandings()
  .finally(() => prisma.$disconnect())
