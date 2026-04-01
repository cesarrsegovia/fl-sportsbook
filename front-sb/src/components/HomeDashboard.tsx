import { useState } from 'react';
import { useStore } from '../store/useStore';
import StandingsBoard from './StandingsBoard';

interface HomeDashboardProps {
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export default function HomeDashboard({ loading, error, onRetry }: HomeDashboardProps) {
  const { matches, odds, selectedSport, setSelectedMatchId, t, addBet } = useStore();
  const [activeTab, setActiveTab] = useState<'matches' | 'results' | 'standings'>('matches');

  const formatTime = (dateStr?: string | Date) => {
    if (!dateStr) return '0.0';
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '0.0';
    }
  };

  const renderMatchCard = (match: any) => {
    const isLive = match.status === 'LIVE';
    const isFinished = match.status === 'FINISHED';
    const matchOdds = odds[match.id];
    const isSoccer = selectedSport.toLowerCase() === 'soccer';

    return (
      <div key={match.id} onClick={() => setSelectedMatchId(match.id)} className="bg-surface-container-low rounded-xl p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 border border-outline-variant/10 hover:border-primary/30 transition-all cursor-pointer group hover:bg-surface-container/60 shadow-lg">
        <div className="flex-1 flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className={`w-12 h-12 rounded-full ${isLive ? 'bg-error/20 border border-error/50 shadow-[0_0_15px_rgba(255,113,108,0.2)]' : 'bg-surface-container-highest border border-outline-variant/5'} flex items-center justify-center flex-shrink-0 transition-all`}>
            <span className={`material-symbols-outlined text-[24px] ${isLive ? 'text-error animate-pulse' : 'text-primary group-hover:text-primary-dim'}`}>
              {isSoccer ? 'sports_soccer' : selectedSport === 'NHL' ? 'sports_hockey' : 'sports_basketball'}
            </span>
          </div>

          <div className="flex-1 w-full">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] text-on-surface-variant font-black uppercase tracking-widest bg-surface-container px-2 py-0.5 rounded-sm">
                {match.league || selectedSport}
              </span>
              <span className={`text-[10px] font-bold ${isLive ? 'text-error animate-pulse' : isFinished ? 'text-on-surface-variant' : 'text-on-surface/60'}`}>
                {isLive ? (match.currentClock || t('tweetLiveLabel')) : isFinished ? t('statusFinished') || 'Finished' : formatTime(match.startTime)}
              </span>
              {isLive && (
                <div className="flex items-center gap-1 bg-error/10 px-1.5 py-0.5 rounded-full border border-error/20">
                  <span className="w-1.5 h-1.5 bg-error rounded-full animate-pulse shadow-[0_0_5px_#ff716c]"></span>
                  <span className="text-error font-black tracking-tighter text-[8px]">LIVE</span>
                </div>
              )}
            </div>
            
            <div className="flex flex-col gap-1.5 w-full mt-2">
              <div className="flex items-center justify-between w-full lg:max-w-md">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-surface-container-highest rounded-sm flex items-center justify-center overflow-hidden">
                    {match.homeLogo ? <img src={match.homeLogo} alt="" className="w-full h-full object-contain" /> : <div className="w-full h-full opacity-20"></div>}
                  </div>
                  <h4 className="font-bold text-sm text-on-surface truncate group-hover:text-white transition-colors">{match.homeTeam}</h4>
                </div>
                <span className={`font-black text-lg ${isLive ? 'text-secondary' : isFinished ? 'text-on-surface-variant' : 'text-on-surface'}`}>
                  {match.status === 'SCHEDULED' ? '-' : match.homeScore}
                </span>
              </div>
              <div className="flex items-center justify-between w-full lg:max-w-md">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-surface-container-highest rounded-sm flex items-center justify-center overflow-hidden">
                    {match.awayLogo ? <img src={match.awayLogo} alt="" className="w-full h-full object-contain" /> : <div className="w-full h-full opacity-20"></div>}
                  </div>
                  <h4 className="font-bold text-sm text-on-surface truncate group-hover:text-white transition-colors">{match.awayTeam}</h4>
                </div>
                <span className={`font-black text-lg ${isLive ? 'text-secondary' : isFinished ? 'text-on-surface-variant' : 'text-on-surface'}`}>
                  {match.status === 'SCHEDULED' ? '-' : match.awayScore}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Odds Grid */}
        {!isFinished && matchOdds && (
          <div className="grid grid-cols-3 gap-2 w-full xl:w-auto mt-4 xl:mt-0 xl:min-w-[280px]">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (matchOdds.homeWin) addBet({ matchId: match.id, selection: 'home', oddsValue: matchOdds.homeWin, matchText: `${match.homeTeam} vs ${match.awayTeam}`, selectionText: `${match.homeTeam} to Win` });
              }}
              className="px-3 py-2 bg-surface-container-lowest hover:bg-surface-bright rounded-lg flex flex-col items-center justify-center transition-all group/btn border border-outline-variant/10 hover:border-primary/40 active:scale-95">
              <span className="text-[9px] text-on-surface-variant uppercase font-bold mb-0.5 group-hover/btn:text-primary transition-colors">{t('sbLocal') || '1'}</span>
              <span className="text-secondary font-black text-sm">{matchOdds.homeWin || '-'}</span>
            </button>
            {matchOdds.draw !== undefined && matchOdds.draw !== null ? (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (matchOdds.draw) addBet({ matchId: match.id, selection: 'draw', oddsValue: matchOdds.draw, matchText: `${match.homeTeam} vs ${match.awayTeam}`, selectionText: `Draw` });
                }}
                className="px-3 py-2 bg-surface-container-lowest hover:bg-surface-bright rounded-lg flex flex-col items-center justify-center transition-all group/btn border border-outline-variant/10 hover:border-primary/40 active:scale-95">
                <span className="text-[9px] text-on-surface-variant uppercase font-bold mb-0.5 group-hover/btn:text-primary transition-colors">{t('sbEmpate') || 'X'}</span>
                <span className="text-on-surface font-black text-sm">{matchOdds.draw || '-'}</span>
              </button>
            ) : (
              <div className="hidden"></div>
            )}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (matchOdds.awayWin) addBet({ matchId: match.id, selection: 'away', oddsValue: matchOdds.awayWin, matchText: `${match.homeTeam} vs ${match.awayTeam}`, selectionText: `${match.awayTeam} to Win` });
              }}
              className={`px-3 py-2 bg-surface-container-lowest hover:bg-surface-bright rounded-lg flex flex-col items-center justify-center transition-all group/btn border border-outline-variant/10 hover:border-primary/40 active:scale-95 ${matchOdds.draw === undefined || matchOdds.draw === null ? 'col-span-2' : ''}`}>
              <span className="text-[9px] text-on-surface-variant uppercase font-bold mb-0.5 group-hover/btn:text-primary transition-colors">{t('sbVisita') || '2'}</span>
              <span className="text-primary font-black text-sm">{matchOdds.awayWin || '-'}</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderMatches = (filter: 'active' | 'results') => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const filtered = matches.filter(m => {
      const status = m.status?.toUpperCase();
      const matchDate = m.startTime ? new Date(m.startTime).toISOString().split('T')[0] : '';
      const isPast = matchDate < todayStr;
      const isToday = matchDate === todayStr;
      const isFuture = matchDate > todayStr;

      if (filter === 'active') {
        if (status === 'LIVE') return true;
        if (status === 'SCHEDULED' && (isToday || isFuture)) return true;
        return false;
      } else {
        if (status === 'FINISHED') return true;
        if (status === 'SCHEDULED' && isPast) return true;
        return false;
      }
    });

    if (filter === 'active') {
      filtered.sort((a, b) => {
        if (a.status === 'LIVE' && b.status !== 'LIVE') return -1;
        if (a.status !== 'LIVE' && b.status === 'LIVE') return 1;
        return 0;
      });
    }

    const groupedMatches: Record<string, any[]> = {};
    filtered.forEach(m => {
      const date = m.startTime ? new Date(m.startTime).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' }) : (t('sbUnknownDate') || 'Unknown Date');
      const today = new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
      const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
      
      let label = date;
      if (date === today) label = t('sbHoy') || 'Today';
      else if (date === tomorrow) label = t('sbManana') || 'Tomorrow';

      if (!groupedMatches[label]) groupedMatches[label] = [];
      groupedMatches[label].push(m);
    });

    return (
      <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">
        <div className="flex items-center justify-between py-2 mb-6">
          <p className="text-xs font-black text-on-surface/50 uppercase tracking-[0.2em]">
            <span className="text-primary">{filter === 'active' ? (t('sbMainBoard') || 'Main Board') : (t('sbRecentResults') || 'Recent Results')}</span> • {filtered.length} {t('sbPartidos') || 'Matches'}
          </p>
        </div>
        
        {Object.keys(groupedMatches).length > 0 ? (
          Object.entries(groupedMatches).map(([dateLabel, dateMatches]) => (
            <div key={dateLabel} className="mb-8">
              <div className="flex items-center gap-4 mb-5 sticky top-[68px] bg-surface/90 py-3 z-10 backdrop-blur-md">
                <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.3em] bg-surface-container-highest px-3 py-1.5 rounded-full border border-outline-variant/20 shadow-sm">
                  {dateLabel}
                </span>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-outline-variant/40 to-transparent"></div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {dateMatches.map(renderMatchCard)}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-24 px-6 bg-surface-container-lowest/50 rounded-3xl border border-dashed border-outline-variant/30 flex flex-col items-center">
            <span className="material-symbols-outlined !text-[48px] text-outline-variant/50 mb-4">sports_score</span>
            <p className="text-on-surface-variant text-sm font-bold tracking-tight">
              {filter === 'active' ? (t('sbNoMatches') || 'No upcoming matches found.') : (t('sbNoResults') || 'No recent results found.')}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 w-full max-w-7xl mx-auto flex flex-col">
      {/* Category Header & Top Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center uppercase font-black text-secondary shadow-[0_0_15px_rgba(254,148,0,0.15)] ring-1 ring-secondary/20">
            <span className="material-symbols-outlined">
               {selectedSport.toLowerCase() === 'soccer' ? 'sports_soccer' : selectedSport === 'NHL' ? 'sports_hockey' : 'sports_basketball'}
            </span>
          </div>
          <h2 className="text-3xl font-black italic tracking-tight uppercase text-on-surface">{selectedSport}</h2>
        </div>
      </div>

      {/* Tab Selector Nav */}
      <nav className="flex items-center bg-surface-container-lowest rounded-xl p-1 mb-6 border border-outline-variant/10 shadow-inner overflow-x-auto no-scrollbar relative z-20 sticky top-0 md:static">
        {(['matches', 'results', 'standings'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 relative text-[11px] font-black py-3 px-4 uppercase tracking-[0.1em] transition-all rounded-lg whitespace-nowrap min-w-[120px] ${
              activeTab === tab 
                ? 'text-on-surface bg-surface-variant shadow-md scale-[1.02] z-10 ring-1 ring-outline-variant/30 border-b-2 border-b-secondary' 
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
            }`}
          >
            {tab === 'matches' ? (t('sbTabBoard') || 'Matches') : tab === 'results' ? (t('sbTabResults') || 'Results') : (t('sbTabStandings') || 'Standings')}
          </button>
        ))}
      </nav>

      {/* Rendering View */}
      <div className="w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-6 animate-pulse">
            <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin"></div>
            <p className="text-xs font-black text-primary/60 tracking-[0.2em] uppercase">Syncing Backend...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-32 gap-6">
            <div className="bg-error p-4 rounded-full text-on-error">
               <span className="material-symbols-outlined !text-[32px]">error</span>
            </div>
            <p className="text-sm font-bold text-error">{error}</p>
            {onRetry && <button onClick={onRetry} className="mt-4 bg-surface-container-high hover:bg-surface-bright px-4 py-2 rounded-lg font-bold text-on-surface">Retry</button>}
          </div>
        ) : (
          <>
            {activeTab === 'matches' && renderMatches('active')}
            {activeTab === 'results' && renderMatches('results')}
            {activeTab === 'standings' && <StandingsBoard />}
          </>
        )}
      </div>
    </div>
  );
}
