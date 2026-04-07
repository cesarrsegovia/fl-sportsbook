import { useState } from 'react';
import type { ReactNode } from 'react';
import { useStore } from '../store/useStore';
import BetSlip from './BetSlip';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { selectedSport, setSelectedSport, toggleBetSlip, bets } = useStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const sports = [
    { id: 'FIFA World Cup', label: 'FIFA World Cup', icon: 'trophy' },
    { id: 'Libertadores', label: 'Libertadores', icon: 'emoji_events' },
    { id: 'NBA', label: 'NBA', icon: 'sports_basketball' },
    { id: 'Soccer', label: 'Soccer', icon: 'sports_soccer' },
    { id: 'NHL', label: 'NHL', icon: 'sports_hockey' },
  ];

  return (
    <div className="bg-surface text-on-surface selection:bg-primary selection:text-on-primary">
      {/* TopNavBar Shell */}
      <header className="bg-[#0B0E11]/80 backdrop-blur-xl docked full-width top-0 sticky z-50 flex justify-between items-center w-full px-6 py-4 border-b border-outline-variant/10">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-1 font-black italic tracking-tighter text-3xl select-none cursor-default uppercase" style={{ fontFamily: "'Inter', sans-serif", letterSpacing: "-0.05em" }}>
            <span className="text-white">FL-SP</span>
            <span className="flex items-center -mx-0.5">
              <span className="material-symbols-outlined text-4xl text-[#FE9400]" style={{ fontVariationSettings: "'FILL' 1, 'wght' 900" }}>trophy</span>
            </span>
            <span className="text-white">RTS</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 font-['Inter'] font-bold tracking-tight">
            {sports.map(sport => (
              <button 
                key={sport.id}
                onClick={() => setSelectedSport(sport.id)}
                className={`transition-colors py-1 flex items-center gap-2 ${selectedSport === sport.id ? 'text-[#F8F9FE] border-b-2 border-[#85ADFF]' : 'text-[#F8F9FE]/60 hover:text-[#F8F9FE]'}`}
              >
                {sport.label}
              </button>
            ))}
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center bg-surface-container-lowest px-4 py-2 rounded-full border border-outline-variant/15 group hover:border-[#85ADFF]/50 transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant mr-2 group-focus-within:text-[#85ADFF]">search</span>
            <input className="bg-transparent border-none outline-none focus:ring-0 text-sm w-48 text-on-surface" placeholder="Search markets..." type="text" />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => toggleBetSlip()} className="p-2 hover:bg-[#282D31]/50 transition-all rounded-full scale-95 active:opacity-80 transition-transform relative">
              <span className="material-symbols-outlined text-[#85ADFF]">account_balance_wallet</span>
              {bets.length > 0 && <span className="absolute top-1 right-0 w-3.5 h-3.5 bg-secondary rounded-full border border-surface text-[8px] font-black text-on-secondary flex items-center justify-center">{bets.length}</span>}
            </button>
            <button className="p-2 hover:bg-[#282D31]/50 transition-all rounded-full scale-95 active:opacity-80 transition-transform">
              <span className="material-symbols-outlined text-[#85ADFF]">person</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-screen">
        {/* SideNavBar Shell */}
        <aside className={`hidden md:flex h-screen fixed left-0 top-0 pt-20 bg-[#101417] flex-col gap-2 p-4 font-['Inter'] text-sm font-medium z-40 border-r border-outline-variant/5 transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
          <div className={`flex items-center mt-2 ${isSidebarOpen ? 'justify-between px-2' : 'justify-center'} py-2`}>
            {isSidebarOpen && (
              <div>
                <h3 className="text-lg font-bold text-[#F8F9FE] whitespace-nowrap">Navigation</h3>
                <p className="text-xs text-on-surface-variant whitespace-nowrap">Browse Markets</p>
              </div>
            )}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
              className="p-2 text-[#F8F9FE]/50 hover:text-[#F8F9FE] transition-colors rounded-full hover:bg-[#1C2024] shrink-0"
            >
              <span className="material-symbols-outlined">{isSidebarOpen ? 'menu_open' : 'menu'}</span>
            </button>
          </div>
          <nav className="flex flex-col gap-1 overflow-y-auto no-scrollbar mt-2">
            <button className={`flex items-center gap-3 p-3 bg-[#1C2024] text-[#85ADFF] transition-all duration-200 ease-in-out ${isSidebarOpen ? 'rounded-r-lg border-l-4 border-[#85ADFF]' : 'rounded-lg justify-center w-full'}`}>
              <span className="material-symbols-outlined shrink-0 text-xl">home</span> 
              {isSidebarOpen && <span className="whitespace-nowrap">Home</span>}
            </button>
            <button onClick={() => setSelectedSport('Live')} className={`flex items-center gap-3 p-3 text-[#F8F9FE]/50 hover:bg-[#1C2024] hover:text-[#F8F9FE] transition-all duration-200 ease-in-out ${isSidebarOpen ? '' : 'justify-center w-full rounded-lg'}`}>
              <span className="material-symbols-outlined text-error shrink-0 text-xl">sensors</span> 
              {isSidebarOpen && <span className="whitespace-nowrap">Live Now</span>}
            </button>
            <button className={`flex items-center gap-3 p-3 text-[#F8F9FE]/50 hover:bg-[#1C2024] hover:text-[#F8F9FE] transition-all duration-200 ease-in-out ${isSidebarOpen ? '' : 'justify-center w-full rounded-lg'}`}>
              <span className="material-symbols-outlined shrink-0 text-xl">trophy</span> 
              {isSidebarOpen && <span className="whitespace-nowrap">Leagues</span>}
            </button>
            <button className={`flex items-center gap-3 p-3 text-[#F8F9FE]/50 hover:bg-[#1C2024] hover:text-[#F8F9FE] transition-all duration-200 ease-in-out ${isSidebarOpen ? '' : 'justify-center w-full rounded-lg'}`}>
              <span className="material-symbols-outlined shrink-0 text-xl">history</span> 
              {isSidebarOpen && <span className="whitespace-nowrap">History</span>}
            </button>
          </nav>
          <div className="mt-auto py-4">
            <button className={`w-full py-3 bg-primary text-on-primary-fixed font-black hover:shadow-[0_0_15px_rgba(133,173,255,0.4)] transition-all active:scale-95 uppercase tracking-tighter flex justify-center items-center ${isSidebarOpen ? 'rounded-xl' : 'rounded-full aspect-square p-0'}`}>
              {isSidebarOpen ? 'Deposit Now' : <span className="material-symbols-outlined">payments</span>}
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-20'} lg:mr-80 md:pb-8 border-r border-outline-variant/5`}>
          {children}
        </main>

        <BetSlip />
      </div>

      {/* Mobile Navigation Shell */}
      <nav className="fixed bottom-0 w-full z-50 md:hidden bg-[#0B0E11]/90 backdrop-blur-lg border-t border-[#1C2024] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex justify-around items-center h-16 px-4">
        {sports.map(sport => (
          <button 
            key={sport.id}
            onClick={() => setSelectedSport(sport.id)}
            className={`flex flex-col items-center justify-center font-['Inter'] text-[10px] font-bold uppercase transition-transform duration-150 ${selectedSport === sport.id ? 'text-[#FE9400] scale-110' : 'text-[#F8F9FE]/40'}`}
          >
            <span className="material-symbols-outlined">{sport.icon || (sport.id.toLowerCase() === 'soccer' ? 'sports_soccer' : sport.id === 'NHL' ? 'sports_hockey' : 'sports_basketball')}</span>
            <span className="max-w-[60px] truncate text-center">{sport.label}</span>
          </button>
        ))}
        <button onClick={() => toggleBetSlip()} className="flex flex-col items-center justify-center text-[#F8F9FE]/40 hover:text-[#FE9400] font-['Inter'] text-[10px] font-bold uppercase transition-colors duration-150 relative">
          <span className="material-symbols-outlined">receipt_long</span>
          <span>My Bets</span>
          {bets.length > 0 && <span className="absolute top-0 right-1 w-3 h-3 bg-secondary rounded-full text-[7px] font-black text-on-secondary flex items-center justify-center">{bets.length}</span>}
        </button>
      </nav>

      {/* Contextual FAB for quick bet on mobile */}
      <button className="fixed bottom-20 right-6 md:hidden w-14 h-14 bg-secondary text-on-secondary rounded-full flex items-center justify-center shadow-2xl z-40 active:scale-90 transition-transform">
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
      </button>
    </div>
  );
}
