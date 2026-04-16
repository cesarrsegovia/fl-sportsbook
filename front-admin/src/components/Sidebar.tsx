import {
  LayoutDashboard,
  Radio,
  Calendar,
  Ticket,
  AlertTriangle,
  CreditCard,
  FileText,
  LogOut,
  Gift,
} from 'lucide-react';
import { useAdminStore } from '../store/useAdminStore';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'feed', label: 'Feed Health', icon: Radio },
  { id: 'events', label: 'Events', icon: Calendar },
  { id: 'tickets', label: 'Tickets', icon: Ticket },
  { id: 'review', label: 'Manual Review', icon: AlertTriangle },
  { id: 'settlements', label: 'Settlements', icon: CreditCard },
  { id: 'promotions', label: 'Promotions', icon: Gift },
  { id: 'audit', label: 'Audit Log', icon: FileText },
];

interface Props {
  activePage: string;
  onNavigate: (page: string) => void;
}

export function Sidebar({ activePage, onNavigate }: Props) {
  const logout = useAdminStore((s) => s.logout);
  const manualReviewCount = useAdminStore((s) => s.manualReviewCount);
  const settlementFailedCount = useAdminStore((s) => s.settlementFailedCount);

  return (
    <aside className="w-60 bg-[#1a1a2e] border-r border-gray-800 flex flex-col h-screen">
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-lg font-bold text-white">Sportsbook Admin</h1>
      </div>
      <nav className="flex-1 p-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const badge =
            item.id === 'review'
              ? manualReviewCount
              : item.id === 'settlements'
                ? settlementFailedCount
                : 0;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm mb-1 ${
                activePage === item.id
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={18} />
              <span className="flex-1 text-left">{item.label}</span>
              {badge > 0 && (
                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      <div className="p-2 border-t border-gray-800">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded text-sm text-gray-400 hover:bg-white/5 hover:text-white"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}
