import { useState } from 'react';

interface Props {
  title: string;
  description: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  confirmLabel?: string;
  loading?: boolean;
}

export function ConfirmModal({
  title,
  description,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  loading = false,
}: Props) {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#1e1e2e] rounded-lg p-6 w-full max-w-md border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-gray-400 text-sm mb-4">{description}</p>
        <textarea
          className="w-full bg-[#2a2a3e] border border-gray-600 rounded p-2 text-white text-sm mb-1 focus:outline-none focus:border-blue-500"
          rows={3}
          placeholder="Reason (min 10 characters)..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <p className="text-xs text-gray-500 mb-4">
          {reason.length}/10 characters minimum
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={reason.length < 10 || loading}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
