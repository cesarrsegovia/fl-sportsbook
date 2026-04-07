import { useEffect, useState } from 'react'
import { useStore } from './store/useStore'
import axios from 'axios'
import Layout from './components/Layout'
import HomeDashboard from './components/HomeDashboard'
import LibertadoresDashboard from './components/LibertadoresDashboard'

const App: React.FC = () => {
  const {
    selectedSport,
    setSelectedSport,
    setMatches,
    setStandings,
    updateOdds,
  } = useStore()

  const [showBanner, setShowBanner] = useState(true);

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
      {showBanner && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="relative w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500 border border-white/10 bg-[#0A0A0A]">
              <button 
                onClick={() => setShowBanner(false)} 
                className="absolute top-4 right-4 z-10 w-8 h-8 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black hover:scale-110 active:scale-95 transition-all"
                aria-label="Close banner"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
              
              <div 
                 className="w-full cursor-pointer relative flex items-center justify-center overflow-hidden" 
                 onClick={() => { 
                   setShowBanner(false); 
                   setSelectedSport('Libertadores'); 
                 }}
              >
                 <img 
                   src="/banner-libertadores.png" 
                   alt="Copa Libertadores" 
                   className="w-full h-auto object-cover hover:scale-[1.03] transition-transform duration-700" 
                 />
              </div>
           </div>
        </div>
      )}
      {selectedSport === 'Libertadores' ? <LibertadoresDashboard /> : <HomeDashboard />}
    </Layout>
  )
}


export default App
