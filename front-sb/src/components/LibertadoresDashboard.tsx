import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import type { Match, TeamRanking } from '@sportsbook/types';

type ActiveTab = 'today' | 'groups' | 'fixture';

// Reusing style constants similar to HomeDashboard for premium feel
const META = { color: '#fe9400', glow: 'rgba(254,148,0,0.35)' }; 

function GroupsView({ standings }: { standings: TeamRanking[] }) {
  const groupsToRender = useMemo(() => {
    // Group by conference
    const groups: Record<string, TeamRanking[]> = {};
    standings.forEach(team => {
      // Copa Libertadores conferences are usually "Group A", "Group B", etc.
      const conf = team.conference || 'General';
      if (!groups[conf]) groups[conf] = [];
      groups[conf].push(team);
    });
    // Sort groups alphabetically by name
    return Object.entries(groups).sort((a,b) => a[0].localeCompare(b[0]));
  }, [standings]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {groupsToRender.map(([groupName, teams]) => (
        <div key={groupName} className="rounded-2xl border border-outline-variant/10 overflow-hidden" style={{ background: `linear-gradient(135deg, ${META.color}08 0%, #101417 100%)` }}>
          <div className="w-full flex items-center justify-between px-5 py-4 bg-white/5">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-lg" style={{ background: META.color, boxShadow: `0 0 8px ${META.glow}` }} />
              <h3 className="font-black text-sm text-white tracking-tight uppercase">{groupName}</h3>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/10 bg-black/20 text-on-surface-variant font-bold">
                  <th className="px-4 py-3 font-semibold w-8 text-center">#</th>
                  <th className="px-4 py-3 font-semibold text-left">Team</th>
                  <th className="px-2 py-3 font-semibold text-center w-8">PJ</th>
                  <th className="px-2 py-3 font-semibold text-center w-8">G</th>
                  <th className="px-2 py-3 font-semibold text-center w-8">E</th>
                  <th className="px-2 py-3 font-semibold text-center w-8">P</th>
                  <th className="px-2 py-3 font-semibold text-center w-12 text-on-surface">Pts</th>
                </tr>
              </thead>
              <tbody>
                {teams.sort((a,b) => a.seed - b.seed).map((team) => {
                  const tAny = team as any;
                  const played = team.wins + team.losses + (tAny.draws || 0);
                  return (
                    <tr key={team.id} className="border-b border-outline-variant/5 last:border-none hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 text-center text-on-surface-variant font-medium">{team.seed}</td>
                      <td className="px-4 py-3 font-bold text-white flex items-center gap-2">
                        {team.teamLogo && <img src={team.teamLogo} alt={team.teamAbbr} className="w-5 h-5 object-contain bg-white/80 rounded-sm" />}
                        <span className="truncate max-w-[120px] sm:max-w-none">{team.teamName}</span>
                      </td>
                      <td className="px-2 py-3 text-center">{played}</td>
                      <td className="px-2 py-3 text-center text-primary/80">{team.wins}</td>
                      <td className="px-2 py-3 text-center text-secondary/80">{tAny.draws || 0}</td>
                      <td className="px-2 py-3 text-center text-error/80">{team.losses}</td>
                      <td className="px-2 py-3 text-center text-[#fe9400] font-black">{tAny.points || (team.wins * 3 + (tAny.draws || 0))}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      
      {groupsToRender.length === 0 && (
         <div className="text-center py-20 flex flex-col items-center gap-3 animate-in fade-in">
           <span className="material-symbols-outlined text-4xl text-on-surface-variant">hourglass_empty</span>
           <p className="text-on-surface-variant text-sm font-bold">Waiting for tournament data...</p>
         </div>
      )}
    </div>
  );
}

function MatchCard({ match }: { match: Match }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/15 flex flex-col sm:flex-row items-center justify-between gap-4 hover:border-[#fe9400]/30 transition-colors">
        <div className="flex items-center gap-4 w-full sm:w-[45%] justify-end">
          <span className="font-black text-sm text-right">{match.homeTeam}</span>
          {match.homeLogo && <img src={match.homeLogo} alt={match.homeTeam} className="w-8 h-8 object-contain bg-white/90 p-0.5 rounded-full" />}
        </div>
        
        <div className="flex flex-col items-center justify-center min-w-[80px]">
          {match.status === 'LIVE' ? (
            <>
                <span className="text-[#fe9400] font-black text-lg animate-pulse">{match.homeScore} - {match.awayScore}</span>
                <span className="text-[10px] text-[#fe9400] uppercase font-bold bg-[#fe9400]/10 px-2 py-0.5 rounded-full mt-1">{match.currentClock || 'LIVE'}</span>
            </>
          ) : match.status === 'FINISHED' ? (
            <>
                <span className="text-on-surface font-black text-lg">{match.homeScore} - {match.awayScore}</span>
                <span className="text-[10px] text-on-surface-variant uppercase font-bold">FINAL</span>
            </>
          ) : (
            <span className="text-xs text-on-surface-variant font-bold py-1 px-3 bg-white/5 rounded-full">
              {new Date(match.startTime as string | number).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 w-full sm:w-[45%] justify-start">
          {match.awayLogo && <img src={match.awayLogo} alt={match.awayTeam} className="w-8 h-8 object-contain bg-white/90 p-0.5 rounded-full" />}
          <span className="font-black text-sm text-left">{match.awayTeam}</span>
        </div>
    </div>
  )
}

function TodayMatchesView({ matches }: { matches: Match[] }) {
  const todayMatches = useMemo(() => {
    const today = new Date();
    return matches.filter(m => {
       if (m.status === 'LIVE') return true;
       const d = new Date(m.startTime as string | number);
       return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    });
  }, [matches]);

  return (
    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {todayMatches.length === 0 ? (
         <div className="text-center py-20 flex flex-col items-center gap-3 bg-surface-container-lowest rounded-2xl border border-outline-variant/10">
           <span className="material-symbols-outlined text-4xl text-on-surface-variant">event_busy</span>
           <p className="text-on-surface-variant text-sm font-bold">No matches scheduled for today</p>
         </div>
      ) : (
        todayMatches.map(match => <MatchCard key={match.id} match={match} />)
      )}
    </div>
  );
}

function FixtureView({ matches }: { matches: Match[] }) {
  const matchdays = useMemo(() => {
    const sortedMatches = [...matches].sort((a, b) => new Date(a.startTime as string | number).getTime() - new Date(b.startTime as string | number).getTime());
    
    // Group by week (Monday as week start)
    const groupedByWeek: Record<string, Match[]> = {};
    
    sortedMatches.forEach(m => {
      const d = new Date(m.startTime as string | number);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(new Date(d).setDate(diff));
      monday.setHours(0,0,0,0);
      const weekId = monday.getTime().toString();
      
      if (!groupedByWeek[weekId]) groupedByWeek[weekId] = [];
      groupedByWeek[weekId].push(m);
    });

    const sortedWeeks = Object.keys(groupedByWeek).sort((a, b) => parseInt(a) - parseInt(b));
    const result: { id: string; label: string; matches: Match[] }[] = [];
    
    sortedWeeks.forEach((weekId, index) => {
       result.push({
           id: `matchday_${index + 1}`,
           label: `Matchday ${index + 1}`,
           matches: groupedByWeek[weekId]
       });
    });
    
    return result;
  }, [matches]);

  const [selectedMatchday, setSelectedMatchday] = useState<string>(() => matchdays.length > 0 ? matchdays[0].id : '');

  useMemo(() => {
    if (!selectedMatchday && matchdays.length > 0) {
      setSelectedMatchday(matchdays[0].id);
    }
  }, [matchdays, selectedMatchday]);

  const activeMatchday = matchdays.find(md => md.id === selectedMatchday);

  const activeMatchesGroupedByDate = useMemo(() => {
     if (!activeMatchday) return [];
     const grouped: Record<string, Match[]> = {};
     activeMatchday.matches.forEach(m => {
       const dateStr = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(m.startTime as string | number));
       if (!grouped[dateStr]) grouped[dateStr] = [];
       grouped[dateStr].push(m);
     });
     // They are already sorted in activeMatchday.matches, so entry order is chronological
     return Object.entries(grouped);
  }, [activeMatchday]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {matchdays.length === 0 ? (
         <div className="text-center py-20 flex flex-col items-center gap-3 bg-surface-container-lowest rounded-2xl border border-outline-variant/10">
           <span className="material-symbols-outlined text-4xl text-on-surface-variant">calendar_month</span>
           <p className="text-on-surface-variant text-sm font-bold">Fixture not available yet</p>
         </div>
      ) : (
        <>
          <div className="flex items-center justify-between bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/10">
             <span className="font-bold text-sm text-on-surface-variant flex items-center gap-2">
                <span className="material-symbols-outlined text-[#fe9400] text-lg">calendar_month</span>
                Select Matchday:
             </span>
             <div className="relative min-w-[140px]">
               <select 
                  value={selectedMatchday} 
                  onChange={(e) => setSelectedMatchday(e.target.value)}
                  className="w-full appearance-none bg-[#1C2024] border border-outline-variant/20 text-white font-bold text-xs py-2 pl-4 pr-10 rounded-lg outline-none focus:border-[#fe9400] cursor-pointer shadow-inner transition-colors hover:border-outline-variant/40 hover:bg-[#20252A]"
               >
                 {matchdays.map((md) => (
                    <option key={md.id} value={md.id} className="bg-[#1C2024] font-bold">{md.label}</option>
                 ))}
               </select>
               <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" style={{ fontSize: '18px' }}>expand_more</span>
             </div>
          </div>
          
          <div className="flex flex-col gap-6 mt-2">
             <h3 className="font-black text-sm text-white uppercase tracking-widest border-b border-white/5 pb-3">
                {activeMatchday?.label}
             </h3>
             <div className="flex flex-col gap-8">
                {activeMatchesGroupedByDate.map(([dateTitle, dateMatches]) => (
                  <div key={dateTitle} className="flex flex-col gap-3">
                     <h4 className="font-bold text-[11px] text-[#fe9400] uppercase tracking-wider px-2 border-l-2 border-[#fe9400] capitalize">
                        {dateTitle}
                     </h4>
                     <div className="flex flex-col gap-2">
                       {dateMatches.map(match => (
                         <MatchCard key={match.id} match={match} />
                       ))}
                     </div>
                  </div>
                ))}
             </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function LibertadoresDashboard() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('today');
  const { matches, standings } = useStore();

  const tabs: { id: ActiveTab; label: string; icon: string }[] = [
    { id: 'today', label: 'Today / Live', icon: 'sports_soccer' },
    { id: 'groups', label: 'Groups & Standings', icon: 'table_rows' },
    { id: 'fixture', label: 'Full Fixture', icon: 'calendar_month' },
  ];

  return (
    <div className="p-4 md:p-6 w-full max-w-7xl mx-auto flex flex-col">
      {/* Title block */}
      <div className="w-full bg-[#1C2024] rounded-3xl p-8 mb-8 border border-white/5 shadow-2xl relative overflow-hidden">
         {/* Subtle background glow */}
         <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#fe9400] blur-[100px] opacity-10 rounded-full" />
         
         <div className="relative z-10 flex items-center gap-4">
             <span className="material-symbols-outlined text-[#fe9400] text-5xl">emoji_events</span>
             <div>
                <h1 className="text-3xl font-black text-white uppercase tracking-tight">Copa Libertadores</h1>
                <p className="text-on-surface-variant text-sm font-medium mt-1">Conmebol 2026</p>
             </div>
         </div>
      </div>

      {/* Tab Nav */}
      <nav className="flex items-center bg-surface-container-lowest rounded-xl p-1 mb-6 border border-outline-variant/10 shadow-inner overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 text-[11px] font-black py-3 px-4 uppercase tracking-[0.1em] transition-all rounded-lg whitespace-nowrap min-w-[120px] ${
              activeTab === tab.id
                ? 'text-white bg-surface-variant shadow-md scale-[1.02] ring-1 ring-outline-variant/30 border-b-2 border-b-[#fe9400]'
                : 'text-on-surface-variant hover:text-white hover:bg-surface-container-low'
            }`}
          >
            <span className="material-symbols-outlined text-base" style={{ fontSize: '16px', color: activeTab === tab.id ? '#fe9400' : 'inherit' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <div className="w-full">
        {activeTab === 'today'   && <TodayMatchesView matches={matches} />}
        {activeTab === 'groups'  && <GroupsView standings={standings} />}
        {activeTab === 'fixture' && <FixtureView matches={matches} />}
      </div>
    </div>
  );
}
