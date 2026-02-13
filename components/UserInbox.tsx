'use client';

import { useEffect, useState } from 'react';

interface ItemMessage {
  id: string;
  transactionId: string;
  productName: string;
  itemContent: string;
  amount: number;
  cryptocurrency: string;
  isRead: boolean;
  createdAt: string;
}

export default function UserInbox() {
  const [messages, setMessages] = useState<ItemMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<ItemMessage | null>(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/user/inbox', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch messages');
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/user/inbox/${messageId}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to mark as read');
      
      // Update local state
      setMessages(messages.map(m => 
        m.id === messageId ? { ...m, isRead: true } : m
      ));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-400">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-lg">📭 No items delivered yet</p>
        <p className="text-sm mt-2">Your purchased items will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map(message => (
        <div
          key={message.id}
          onClick={() => {
            setSelectedMessage(message);
            if (!message.isRead) {
              markAsRead(message.id);
            }
          }}
          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
            message.isRead
              ? 'bg-slate-800 border-slate-700 hover:border-purple-600'
              : 'bg-purple-900/30 border-purple-600 hover:border-purple-500 shadow-lg'
          }`}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="font-bold text-gray-100 flex items-center gap-2">
                {!message.isRead && <span className="w-2 h-2 bg-purple-400 rounded-full"></span>}
                📦 {message.productName}
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                ${message.amount} {message.cryptocurrency.toUpperCase()}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {new Date(message.createdAt).toLocaleDateString()} · {new Date(message.createdAt).toLocaleTimeString()}
              </p>
            </div>
            <span className="text-2xl">✅</span>
          </div>
        </div>
      ))}

      {/* Detail Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-xl shadow-2xl border border-purple-600/50 w-full max-w-2xl">
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-100">📦 {selectedMessage.productName}</h2>
                  <p className="text-gray-400 text-sm mt-1">
                    ${selectedMessage.amount} {selectedMessage.cryptocurrency.toUpperCase()}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="text-gray-500 hover:text-gray-300 text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-6 border border-purple-700/30 mb-6">
                <h3 className="text-sm font-semibold text-gray-400 mb-3">ITEM DETAILS</h3>
                <div className="bg-slate-900 rounded p-4 font-mono text-sm text-gray-200 whitespace-pre-wrap break-words max-h-[300px] overflow-y-auto">
                  {selectedMessage.itemContent}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-gray-200 rounded-lg font-semibold transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    // Copy to clipboard
                    navigator.clipboard.writeText(selectedMessage.itemContent);
                    alert('Copied to clipboard!');
                  }}
                  className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
                >
                  📋 Copy to Clipboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
