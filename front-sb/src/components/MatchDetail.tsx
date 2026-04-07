import React from 'react'
import { useStore } from '../store/useStore'

const MatchDetail: React.FC = () => {
  const { matches, selectedMatchId, setSelectedMatchId, odds } = useStore()
  const match = matches.find(m => m.id === selectedMatchId)

  if (!match) return null

  /**
   * Helper to resolve team primary colors for UI branding.
   */
  const getTeamColor = (teamName: string) => {
    const lower = teamName.toLowerCase()
    if (lower.includes('lakers')) return '#552583'
    if (lower.includes('celtics')) return '#007A33'
    if (lower.includes('warriors')) return '#1D428A'
    if (lower.includes('bulls')) return '#CE1141'
    if (lower.includes('suns')) return '#E56020'
    return '#f4c025'
  }

  const primaryColor = getTeamColor(match.homeTeam)

  /**
   * Main component layout for match details.
   */
  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 flex flex-col h-full bg-[#050505] relative overflow-hidden">
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] h-[300px] blur-[120px] opacity-[0.08] pointer-events-none rounded-full"
        style={{ background: `radial-gradient(circle, ${primaryColor} 0%, transparent 70%)` }}
      ></div>

      <div className="relative z-10 px-4 pt-2">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => setSelectedMatchId(null)}
            className="w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all active:scale-95 group shadow-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-0.5 transition-transform"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div className="flex flex-col">
            <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] leading-none mb-1">{match.league}</h2>
            <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${match.status === 'LIVE' ? 'bg-red-500 animate-pulse' : 'bg-gray-600'}`}></span>
                <p className={`text-[10px] font-black uppercase tracking-widest ${match.status === 'LIVE' ? 'text-red-500' : 'text-gray-300'}`}>
                    {match.status === 'LIVE' ? 'Live' : match.status === 'FINISHED' ? 'Finished' : 'Scheduled'}
                </p>
            </div>
          </div>
        </div>

        <div className="relative group mb-8">
            <div className="absolute inset-0 bg-white/[0.02] blur-xl rounded-[24px] group-hover:bg-white/[0.04] transition-all"></div>
            <div className="relative bg-white/[0.03] border border-white/10 rounded-[24px] p-4 shadow-2xl overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.02] rounded-full -translate-y-1/2 translate-x-1/2"></div>
                
                <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col items-center gap-4 flex-1">
                        <div className="relative">
                            <div className="absolute inset-0 bg-white/5 blur-2xl rounded-full"></div>
                            <div className="relative w-16 h-16 bg-white/5 rounded-[18px] flex items-center justify-center p-2.5 shadow-inner border border-white/10 group-hover:scale-105 transition-transform duration-500">
                                {match.homeLogo ? <img src={match.homeLogo} className="w-full h-full object-contain" alt="" /> : <div className="w-full h-full bg-white/5 rounded-lg"></div>}
                            </div>
                        </div>
                        <div className="text-center">
                            <span className="block text-[11px] font-black text-white uppercase tracking-tighter leading-tight drop-shadow-sm truncate max-w-[80px]">{match.homeTeam}</span>
                            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Home</span>
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-2 px-1">
                            <span className={`text-3xl font-black tabular-nums tracking-tighter transition-all ${match.status === 'FINISHED' ? 'text-gray-500' : 'text-white'}`}>
                                {match.status === 'SCHEDULED' ? '-' : match.homeScore}
                            </span>
                            <span className="text-xl font-black text-white/10">:</span>
                            <span className={`text-3xl font-black tabular-nums tracking-tighter transition-all ${match.status === 'FINISHED' ? 'text-gray-500' : 'text-white'}`}>
                                {match.status === 'SCHEDULED' ? '-' : match.awayScore}
                            </span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] font-black text-[#f4c025] bg-[#f4c025]/10 px-3 py-1 rounded-full uppercase tracking-widest border border-[#f4c025]/20">
                                {match.currentClock || 'VS'}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-4 flex-1">
                        <div className="relative">
                            <div className="absolute inset-0 bg-white/5 blur-2xl rounded-full"></div>
                            <div className="relative w-16 h-16 bg-white/5 rounded-[18px] flex items-center justify-center p-2.5 shadow-inner border border-white/10 group-hover:scale-105 transition-transform duration-500">
                                {match.awayLogo ? <img src={match.awayLogo} className="w-full h-full object-contain" alt="" /> : <div className="w-full h-full bg-white/5 rounded-lg"></div>}
                            </div>
                        </div>
                        <div className="text-center">
                            <span className="block text-[11px] font-black text-white uppercase tracking-tighter leading-tight drop-shadow-sm truncate max-w-[80px]">{match.awayTeam}</span>
                            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Away</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="space-y-8 pb-12">
            {/* Period-by-period statistics (Linescores) */}
            {match.homeLinescores && match.homeLinescores.length > 0 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                    <div className="flex items-center justify-between mb-4 px-1">
                        <h3 className="text-[9px] font-black text-gray-500 uppercase tracking-[0.25em]">Period Stats</h3>
                        <div className="h-px flex-1 bg-white/5 mx-4"></div>
                    </div>
                    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-sm">
                        <table className="w-full text-[11px]">
                            <thead>
                                <tr className="bg-white/5 text-gray-500 uppercase font-black text-[9px] tracking-widest">
                                    <th className="py-3 px-3 text-left">Team</th>
                                    {match.homeLinescores.map((l, i) => <th key={i} className="py-3 text-center w-10">Q{l.period}</th>)}
                                    <th className="py-3 px-4 text-right w-12 border-l border-white/5 bg-white/5 text-white">Total</th>
                                </tr>
                            </thead>
                            <tbody className="font-bold">
                                <tr className="border-b border-white/5 group/row hover:bg-white/[0.02] transition-colors">
                                    <td className="py-4 px-4 text-gray-400 group-hover/row:text-white transition-colors">{match.homeTeam.split(' ').pop()}</td>
                                    {match.homeLinescores.map((l, i) => <td key={i} className="py-4 text-center tabular-nums text-gray-200">{l.value}</td>)}
                                    <td className="py-4 px-4 text-right text-[#f4c025] tabular-nums border-l border-white/5 bg-white/[0.02] text-sm font-black">{match.homeScore}</td>
                                </tr>
                                <tr className="group/row hover:bg-white/[0.02] transition-colors">
                                    <td className="py-4 px-4 text-gray-400 group-hover/row:text-white transition-colors truncate max-w-[60px]">{match.awayTeam.split(' ').pop()}</td>
                                    {match.awayLinescores && match.awayLinescores.map((l, i) => <td key={i} className="py-4 text-center tabular-nums text-gray-200">{l.value}</td>)}
                                    <td className="py-4 px-4 text-right text-[#f4c025] tabular-nums border-l border-white/5 bg-white/[0.02] text-sm font-black">{match.awayScore}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Individual category leaders (e.g., Points, Rebounds) */}
            {match.leaders && match.leaders.length > 0 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                    <div className="flex items-center justify-between mb-4 px-1">
                        <h3 className="text-[9px] font-black text-gray-500 uppercase tracking-[0.25em]">Individual Leaders</h3>
                        <div className="h-px flex-1 bg-white/5 mx-4"></div>
                    </div>
                    <div className="grid grid-cols-1 gap-2.5">
                        {match.leaders.map((leader, i) => (
                            <div 
                                key={i} 
                                className="relative flex items-center justify-between p-4 bg-white/[0.03] border border-white/10 rounded-2xl group hover:bg-[#f4c025]/[0.08] hover:border-[#f4c025]/30 transition-all duration-300 transform hover:-translate-y-0.5"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="relative w-12 h-12 bg-white/5 rounded-xl overflow-hidden flex items-center justify-center p-0.5 border border-white/10 shadow-lg group-hover:scale-110 transition-transform duration-500">
                                        {leader.athlete.headshot ? (
                                            <img src={leader.athlete.headshot} className="w-full h-full object-cover" alt="" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-white/10 to-transparent flex items-center justify-center text-[8px] text-gray-600 font-black">N/A</div>
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[13px] font-black text-white group-hover:text-amber-50 transition-colors uppercase tracking-tight">{leader.athlete.displayName}</span>
                                            <span className="text-[9px] font-black text-[#f4c025] bg-[#f4c025]/10 px-1.5 py-0.5 rounded-sm uppercase">{leader.athlete.position}</span>
                                        </div>
                                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1 group-hover:text-gray-400 transition-colors">{leader.name}</span>
                                    </div>
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-0 bg-white/5 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <div className="relative text-2xl font-black text-white tabular-nums tracking-tighter drop-shadow-md">
                                        {leader.value}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Betting Odds Section */}
            {match.status !== 'FINISHED' && odds[match.id] && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 bg-gradient-to-br from-[#f4c025]/10 to-transparent border border-[#f4c025]/20 rounded-3xl p-6 mt-4">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-[#f4c025] rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(244,192,37,0.3)]">
                            <span className="material-symbols-outlined !text-[18px] text-black">analytics</span>
                        </div>
                        <h4 className="text-[11px] font-black text-white uppercase tracking-widest">Match Odds</h4>
                    </div>
                    <div className="flex flex-row gap-2">
                        <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                            <p className="text-[8px] text-gray-500 font-bold uppercase mb-1">Home</p>
                            <p className="text-base font-black text-[#f4c025]">{odds[match.id].homeWin || '-'}</p>
                        </div>
                        {odds[match.id].draw !== undefined && odds[match.id].draw !== null && (
                            <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                                <p className="text-[8px] text-gray-500 font-bold uppercase mb-1">Draw</p>
                                <p className="text-base font-black text-[#f4c025]">{odds[match.id].draw}</p>
                            </div>
                        )}
                        <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                            <p className="text-[8px] text-gray-500 font-bold uppercase mb-1">Away</p>
                            <p className="text-base font-black text-[#f4c025]">{odds[match.id].awayWin || '-'}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  )
}

export default MatchDetail
