import { useAdminStore } from '../store/useAdminStore';

export function TopBar({ title }: { title: string }) {
  const username = useAdminStore((s) => s.username);

  return (
    <header className="h-14 border-b border-gray-800 flex items-center justify-between px-6 bg-[#1a1a2e]">
      <h2 className="text-white font-semibold">{title}</h2>
      <span className="text-gray-400 text-sm">Operator: {username}</span>
    </header>
  );
}
