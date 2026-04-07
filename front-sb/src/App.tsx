import { useEffect } from 'react'
import { useStore } from './store/useStore'
import axios from 'axios'
import Layout from './components/Layout'
import HomeDashboard from './components/HomeDashboard'

const App: React.FC = () => {
  const {
    selectedSport,
    setMatches,
    setStandings,
    updateOdds,
  } = useStore()

  const fetchData = async () => {
    try {
      const sportPath = selectedSport.toLowerCase()
      const [matchesRes, standingsRes] = await Promise.all([
        axios.get(`http://127.0.0.1:3000/sports/${sportPath}`),
        axios.get(`http://127.0.0.1:3000/sports/${sportPath}/standings`)
      ])

      setMatches(matchesRes.data)
      setStandings(standingsRes.data)

      matchesRes.data.forEach((match: any) => {
        if (match.odds && match.odds.length > 0) {
          const odd = match.odds[0]
          updateOdds({
            matchId: match.id,
            homeWin: parseFloat(odd.homeWin),
            awayWin: parseFloat(odd.awayWin),
            draw: odd.draw ? parseFloat(odd.draw) : undefined
          })
        }
      })
    } catch {
      // Background data sync — errors are non-blocking in the new WC-focused UI
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedSport])

  return (
    <Layout>
      <HomeDashboard />
    </Layout>
  )
}


export default App
