import { useStore } from '../store/useStore';

export default function StandingsBoard() {
  const { standings, selectedSport, t } = useStore();

  const sortedStandings = [...standings].sort((a, b) => a.seed - b.seed);
  const activeStandings = sortedStandings.length > 0;
  const conferences = Array.from(new Set(standings.map(s => s.conference || 'General')));

  const renderConference = (title: string, data: any[]) => {
    const isSoccer = selectedSport.toLowerCase() === 'soccer';
    
    return (
      <div key={title} className="mb-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-3 py-3 px-1 border-b border-outline-variant/20 mb-4">
          <div className="w-1.5 h-6 bg-secondary rounded-full shadow-[0_0_12px_#fe9400]"></div>
          <h3 className="text-sm font-black text-secondary uppercase tracking-widest">{title}</h3>
        </div>
        
        <div className="overflow-x-auto rounded-xl border border-outline-variant/10 bg-surface-container-low/50 backdrop-blur-md">
          <table className="w-full text-left text-[11px] border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-surface-container-highest/60 text-on-surface-variant uppercase font-black text-[9px] tracking-widest border-b border-outline-variant/20">
                <th className="py-4 px-3 w-8 text-center">#</th>
                <th className="py-4 px-2">{t('sbEquipo')}</th>
                {isSoccer ? (
                  <>
                    <th className="py-4 text-center w-8">{t('sbPJ')}</th>
                    <th className="py-4 text-center w-6">{t('sbG')}</th>
                    <th className="py-4 text-center w-6">{t('sbE')}</th>
                    <th className="py-4 text-center w-6">{t('sbP')}</th>
                    <th className="py-4 text-center w-8">{t('sbGF')}</th>
                    <th className="py-4 text-center w-8">{t('sbGC')}</th>
                    <th className="py-4 text-center w-8">{t('sbDG')}</th>
                    <th className="py-4 px-3 text-center w-12 bg-surface-container/50 text-on-surface">{t('sbPTS')}</th>
                  </>
                ) : (
                  <>
                    <th className="py-4 text-center w-10">W</th>
                    <th className="py-4 text-center w-10">L</th>
                    <th className="py-4 text-center w-10">PCT</th>
                    <th className="py-4 px-3 text-center w-12 border-l border-outline-variant/10">GB</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="font-bold">
              {data.map((team, idx) => (
                <tr key={team.id} className={`border-b border-outline-variant/5 last:border-0 hover:bg-surface-bright/40 transition-colors ${idx % 2 === 0 ? 'bg-surface-container-lowest/30' : ''}`}>
                  <td className="py-3 text-center text-on-surface-variant font-black">{team.seed || idx + 1}</td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-surface-container-highest rounded-lg p-0.5 flex-shrink-0 flex items-center justify-center border border-outline-variant/10">
                        {team.teamLogo ? <img src={team.teamLogo} alt="" className="w-full h-full object-contain" /> : <span className="material-symbols-outlined text-[14px] text-tertiary">sports_score</span>}
                      </div>
                      <span className="text-on-surface truncate max-w-[120px] font-bold">{team.teamAbbr || team.teamName}</span>
                    </div>
                  </td>
                  {isSoccer ? (
                    <>
                      <td className="py-3 text-center text-on-surface-variant">{(team.wins || 0) + (team.draws || 0) + (team.losses || 0)}</td>
                      <td className="py-3 text-center text-on-surface/80">{team.wins || 0}</td>
                      <td className="py-3 text-center text-on-surface/80">{team.draws || 0}</td>
                      <td className="py-3 text-center text-on-surface/80">{team.losses || 0}</td>
                      <td className="py-3 text-center text-on-surface-variant">{team.goalsFor || 0}:{team.goalsAgainst || 0}</td>
                      <td className="py-3 text-center text-on-surface/80">{(team.goalsFor || 0) - (team.goalsAgainst || 0)}</td>
                      <td className="py-3 px-3 text-center text-secondary bg-surface-container/30 text-xs font-black">
                        {team.points || (team.wins * 3 + team.draws)}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-3 text-center text-on-surface/80">{team.wins}-{team.losses}</td>
                      <td className="py-3 text-center text-on-surface/80">{(team.pct || 0).toFixed(3)}</td>
                      <td className="py-3 px-3 text-center text-on-surface-variant border-l border-outline-variant/10">{team.streak || '-'}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="pb-20">
      {!activeStandings ? (
        <div className="text-center py-20 px-6 bg-surface-container-low rounded-3xl border border-dashed border-outline-variant/20 mx-4">
           <span className="material-symbols-outlined !text-[48px] text-outline-variant mb-4">leaderboard</span>
           <p className="text-on-surface-variant text-sm font-medium italic">{t('sbNoStandings') || 'Standings not available for this league.'}</p>
        </div>
      ) : (
        conferences.map(conf => (
          renderConference(conf, sortedStandings.filter(s => (s.conference || 'General') === conf))
        ))
      )}
    </div>
  );
}
