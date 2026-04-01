import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const matches = await prisma.match.groupBy({
    by: ['league'],
    _count: {
      id: true
    }
  })
  console.log('Matches by league:', JSON.stringify(matches, null, 2))
  
  const odds = await prisma.odds.count()
  console.log('Total odds entries:', odds)
  
  const standings = await prisma.teamRanking.groupBy({
    by: ['league'],
    _count: {
      id: true
    }
  })
  console.log('Standings by league:', JSON.stringify(standings, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
