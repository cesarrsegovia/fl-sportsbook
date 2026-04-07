import { useState, useMemo } from 'react';
import { worldCupTeams, getFlagUrl, type WorldCupTeam } from '../data/worldCupTeams';

// ─── Types & Constants ──────────────────────────────────────────────────
type ActiveTab = 'teams' | 'matches' | 'bracket';

const CONFEDERATION_META: Record<string, { label: string; region: string; color: string; glow: string; teams: number }> = {
  UEFA:     { label: 'UEFA',     region: 'Europe',       color: '#4f83cc', glow: 'rgba(79,131,204,0.35)',   teams: 16 },
  CONMEBOL: { label: 'CONMEBOL', region: 'South America', color: '#00c875', glow: 'rgba(0,200,117,0.35)',   teams: 6  },
  CONCACAF: { label: 'CONCACAF', region: 'North America / Caribbean', color: '#fe9400', glow: 'rgba(254,148,0,0.35)', teams: 6 },
  AFC:      { label: 'AFC',      region: 'Asia',         color: '#c084fc', glow: 'rgba(192,132,252,0.35)', teams: 9  },
  CAF:      { label: 'CAF',      region: 'Africa',       color: '#f97316', glow: 'rgba(249,115,22,0.35)',  teams: 10 },
  OFC:      { label: 'OFC',      region: 'Oceania',      color: '#22d3ee', glow: 'rgba(34,211,238,0.35)',  teams: 1  },
};

const CONFEDERATION_ORDER = ['UEFA', 'CONMEBOL', 'CONCACAF', 'AFC', 'CAF', 'OFC'];

// ─── Sub-components ─────────────────────────────────────────────────────

function HeroSection() {
  return (
    <div className="wc-hero relative overflow-hidden rounded-3xl mb-8 border border-white/5 shadow-2xl">
      <img 
        src="/banner-wc26gem.png" 
        alt="FIFA World Cup 2026" 
        className="w-full h-auto object-cover animate-in fade-in duration-1000"
      />
    </div>
  );
}

function ConfederationBlock({ confederation, teams }: { confederation: string; teams: WorldCupTeam[] }) {
  const meta = CONFEDERATION_META[confederation];
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-2xl border overflow-hidden transition-all duration-300"
      style={{ borderColor: `${meta.color}22`, background: `linear-gradient(135deg, ${meta.color}08 0%, #101417 100%)` }}>
      {/* Header */}
      <button
        id={`conf-header-${confederation}`}
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-lg"
            style={{ background: meta.color, boxShadow: `0 0 8px ${meta.glow}` }} />
          <div className="text-left">
            <p className="font-black text-sm text-white tracking-tight">{meta.label}</p>
            <p className="text-[10px] text-white/40 font-medium">{meta.region}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-black px-2.5 py-1 rounded-full"
            style={{ background: `${meta.color}22`, color: meta.color }}>
            {teams.length} teams
          </span>
          <span className="material-symbols-outlined text-white/30 text-sm transition-transform duration-300"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', fontSize: '18px' }}>
            expand_more
          </span>
        </div>
      </button>

      {/* Team grid */}
      {expanded && (
        <div className="px-5 pb-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
          {teams.map((team) => (
            <div
              key={team.name}
              className="team-card group flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 border border-transparent hover:border-white/10"
              style={{ background: 'rgba(255,255,255,0.03)' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = `${meta.color}12`;
                (e.currentTarget as HTMLElement).style.borderColor = `${meta.color}30`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
              }}
            >
              <img src={getFlagUrl(team.code, 40)} alt={team.name} className="w-6 h-4 object-cover rounded-sm flex-shrink-0 shadow-sm" />
              <span className="text-xs font-bold text-white/80 group-hover:text-white transition-colors leading-tight truncate">
                {team.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TeamsView() {
  const [search, setSearch] = useState('');
  const [filterConf, setFilterConf] = useState<string>('ALL');

  const grouped = useMemo(() => {
    const filtered = worldCupTeams.filter((t) => {
      const matchSearch = t.name.toLowerCase().includes(search.toLowerCase());
      const matchConf = filterConf === 'ALL' || t.confederation === filterConf;
      return matchSearch && matchConf;
    });
    return CONFEDERATION_ORDER.reduce<Record<string, WorldCupTeam[]>>((acc, conf) => {
      const items = filtered.filter((t) => t.confederation === conf);
      if (items.length > 0) acc[conf] = items;
      return acc;
    }, {});
  }, [search, filterConf]);

  const totalShown = Object.values(grouped).flat().length;

  return (
    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center bg-surface-container-lowest px-4 py-2.5 rounded-xl border border-outline-variant/15 group hover:border-primary/30 transition-colors flex-1 max-w-sm">
          <span className="material-symbols-outlined text-on-surface-variant mr-2 text-lg">search</span>
          <input
            id="wc-team-search"
            className="bg-transparent border-none outline-none text-sm w-full text-on-surface placeholder:text-on-surface-variant/50"
            placeholder="Search teams..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-on-surface-variant hover:text-on-surface transition-colors">
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="filter-all"
            onClick={() => setFilterConf('ALL')}
            className={`text-[10px] font-black px-3 py-2 rounded-lg uppercase tracking-wider transition-all ${filterConf === 'ALL' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
          >
            All
          </button>
          {CONFEDERATION_ORDER.map((conf) => {
            const meta = CONFEDERATION_META[conf];
            return (
              <button
                key={conf}
                id={`filter-${conf}`}
                onClick={() => setFilterConf(conf)}
                className="text-[10px] font-black px-3 py-2 rounded-lg uppercase tracking-wider transition-all"
                style={{
                  background: filterConf === conf ? `${meta.color}25` : 'transparent',
                  color: filterConf === conf ? meta.color : 'rgba(255,255,255,0.4)',
                  border: filterConf === conf ? `1px solid ${meta.color}40` : '1px solid transparent',
                }}
                onMouseEnter={(e) => { if (filterConf !== conf) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)'; }}
                onMouseLeave={(e) => { if (filterConf !== conf) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.4)'; }}
              >
                {conf}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats strip */}
      <div className="flex items-center gap-4 flex-wrap pb-1">
        <p className="text-[10px] font-black text-on-surface/30 uppercase tracking-[0.2em]">
          Showing <span className="text-primary">{totalShown}</span> of 48 teams
        </p>
        <div className="h-3 w-px bg-outline-variant/30" />
        {CONFEDERATION_ORDER.map((conf) => {
          const count = worldCupTeams.filter(t => t.confederation === conf).length;
          const meta = CONFEDERATION_META[conf];
          return (
            <span key={conf} className="text-[9px] font-bold" style={{ color: `${meta.color}90` }}>
              {conf} · {count}
            </span>
          );
        })}
      </div>

      {/* Confederation blocks */}
      <div className="flex flex-col gap-3 pb-16">
        {Object.entries(grouped).map(([conf, teams]) => (
          <ConfederationBlock key={conf} confederation={conf} teams={teams} />
        ))}
        {totalShown === 0 && (
          <div className="text-center py-20 flex flex-col items-center gap-3">
            <span className="text-5xl">🔍</span>
            <p className="text-on-surface-variant text-sm font-bold">No team found</p>
            <button onClick={() => { setSearch(''); setFilterConf('ALL'); }} className="text-xs text-primary hover:underline">
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ComingSoonView({ title, icon }: { title: string; icon: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-28 gap-5 animate-in fade-in duration-500">
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center bg-surface-container-highest border border-outline-variant/20">
        <span className="material-symbols-outlined text-4xl text-on-surface-variant">{icon}</span>
      </div>
      <div className="text-center">
        <p className="font-black text-lg text-on-surface">{title}</p>
        <p className="text-sm text-on-surface-variant mt-1">Available once FIFA publishes the group draw.</p>
      </div>
      <span className="text-[10px] font-bold text-secondary/70 bg-secondary/10 border border-secondary/20 px-4 py-2 rounded-full uppercase tracking-widest">
        Coming Soon · Draw Dec 2025
      </span>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────
export default function HomeDashboard() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('teams');

  const tabs: { id: ActiveTab; label: string; icon: string }[] = [
    { id: 'teams', label: 'Qualified', icon: 'groups' },
    { id: 'matches', label: 'Matches', icon: 'sports_soccer' },
    { id: 'bracket', label: 'Groups', icon: 'account_tree' },
  ];

  return (
    <div className="p-4 md:p-6 w-full max-w-7xl mx-auto flex flex-col">
      <HeroSection />

      {/* Tab Nav */}
      <nav className="flex items-center bg-surface-container-lowest rounded-xl p-1 mb-6 border border-outline-variant/10 shadow-inner overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`tab-wc-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 text-[11px] font-black py-3 px-4 uppercase tracking-[0.1em] transition-all rounded-lg whitespace-nowrap min-w-[120px] ${
              activeTab === tab.id
                ? 'text-on-surface bg-surface-variant shadow-md scale-[1.02] ring-1 ring-outline-variant/30 border-b-2 border-b-secondary'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
            }`}
          >
            <span className="material-symbols-outlined text-base" style={{ fontSize: '16px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <div className="w-full">
        {activeTab === 'teams'   && <TeamsView />}
        {activeTab === 'matches' && <ComingSoonView title="Match Schedule" icon="calendar_month" />}
        {activeTab === 'bracket' && <ComingSoonView title="Group Stage" icon="account_tree" />}
      </div>
    </div>
  );
}
