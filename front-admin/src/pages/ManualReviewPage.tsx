import { useEffect, useState } from 'react';
import { getTickets } from '../api/admin.api';
import { ManualReviewCard } from '../components/ManualReviewCard';

/**
 * @page ManualReviewPage
 * @description Vista para la gestión manual de tickets que no pudieron ser calificados automáticamente.
 */
export function ManualReviewPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getTickets({ status: 'MANUAL_REVIEW' });
      setTickets(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch tickets');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleTicketRemoved = (ticketId: string) => {
    setTickets((prev) => prev.filter((t) => t.id !== ticketId));
  };

  return (
    <div className="p-6">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white font-bold text-2xl">Manual Review</h2>
          <p className="text-gray-400 text-sm">
            {tickets.length} tickets require operator intervention
          </p>
        </div>
        <button 
          onClick={fetchTickets}
          className="text-blue-400 text-sm hover:underline"
          disabled={isLoading}
        >
          {isLoading ? 'Refreshing...' : 'Refresh List'}
        </button>
      </header>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {tickets.length === 0 && !isLoading && (
        <div className="bg-[#1a1a2e] border border-gray-800 rounded-lg p-12 text-center text-gray-500">
          <p className="text-lg mb-1">Queue is empty!</p>
          <p className="text-sm">All tickets have been successfully graded or are pending automatic review.</p>
        </div>
      )}

      <div className="grid gap-6">
        {tickets.map((ticket) => (
          <ManualReviewCard 
            key={ticket.id} 
            ticket={ticket} 
            onGraded={handleTicketRemoved} 
          />
        ))}
      </div>
    </div>
  );
}

