import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAdminStore } from './store/useAdminStore';
import { getStats } from './api/admin.api';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { FeedHealthPage } from './pages/FeedHealthPage';
import { EventsPage } from './pages/EventsPage';
import { TicketsPage } from './pages/TicketsPage';
import { ManualReviewPage } from './pages/ManualReviewPage';
import { SettlementPage } from './pages/SettlementPage';
import { AuditPage } from './pages/AuditPage';
import { PromotionsPage } from './pages/PromotionsPage';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';

const WS_URL = import.meta.env.VITE_SPORTSBOOK_WS_URL || 'http://localhost:3000';

const pageTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  feed: 'Feed Health',
  events: 'Events',
  tickets: 'Tickets',
  review: 'Manual Review',
  settlements: 'Settlements',
  promotions: 'Promotions',
  audit: 'Audit Log',
};

function AdminLayout() {
  const [activePage, setActivePage] = useState('dashboard');
  const setStats = useAdminStore((s) => s.setStats);
  const incrementManualReviewCount = useAdminStore((s) => s.incrementManualReviewCount);
  const incrementSettlementFailedCount = useAdminStore((s) => s.incrementSettlementFailedCount);

  useEffect(() => {
    const fetch = () => getStats().then(setStats).catch(console.error);
    fetch();
    const id = setInterval(fetch, 30000);
    return () => clearInterval(id);
  }, [setStats]);

  useEffect(() => {
    const socket = io(WS_URL);
    socket.on('TICKET_UPDATE', (data: { ticketId: string; userId: string; status: string }) => {
      if (data.status === 'MANUAL_REVIEW') incrementManualReviewCount();
      if (data.status === 'SETTLEMENT_FAILED') incrementSettlementFailedCount();
    });
    return () => { socket.disconnect(); };
  }, [incrementManualReviewCount, incrementSettlementFailedCount]);

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <DashboardPage />;
      case 'feed': return <FeedHealthPage />;
      case 'events': return <EventsPage />;
      case 'tickets': return <TicketsPage />;
      case 'review': return <ManualReviewPage />;
      case 'settlements': return <SettlementPage />;
      case 'promotions': return <PromotionsPage />;
      case 'audit': return <AuditPage />;
      default: return <DashboardPage />;
    }
  };

  return (
    <div className="flex h-screen bg-[#0f0f1a]">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title={pageTitles[activePage] || 'Dashboard'} />
        <main className="flex-1 overflow-auto">{renderPage()}</main>
      </div>
    </div>
  );
}

export default function App() {
  const token = useAdminStore((s) => s.token);
  return token ? <AdminLayout /> : <LoginPage />;
}
