'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Message {
  id: string;
  title: string;
  content: string;
  type: 'system' | 'order' | 'notification' | 'delivery';
  transactionId?: string;
  isRead: boolean;
  createdAt: Date;
  itemDetails?: {
    productName: string;
    amount: number;
    cryptocurrency: string;
    walletAddress?: string;
    status: string;
  };
}

export default function MessageCenter() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [confirmingDelivery, setConfirmingDelivery] = useState(false);
  const [deliveryError, setDeliveryError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  // Check if user is logged in (has token)
  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);

    // Listen for storage changes (logout from other tabs/windows)
    const handleStorageChange = () => {
      const newToken = localStorage.getItem('token');
      setIsLoggedIn(!!newToken);
      if (!newToken) {
        setMessages([]);
        setIsOpen(false);
        setSelectedMessage(null);
        setShowWelcomeModal(false);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Load messages on component mount
  useEffect(() => {
    if (isLoggedIn) {
      fetchMessages();
    }
  }, [isLoggedIn]);

  // Update unread count
  useEffect(() => {
    const unread = messages.filter(m => !m.isRead).length;
    setUnreadCount(unread);
  }, [messages]);

  // Auto-open welcome modal ONCE when unread welcome message is detected (for users only)
  useEffect(() => {
    if (isLoggedIn) {
      const welcomeMsg = messages.find(m => (m as any).isWelcome === true && !m.isRead);
      if (welcomeMsg && !showWelcomeModal) {
        setShowWelcomeModal(true);
      }
    }
  }, [messages, isLoggedIn, showWelcomeModal]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/messages', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.error('Error fetching messages');
        return;
      }

      const data = await response.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/messages/${messageId}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      setMessages(prev =>
        prev.map(m => (m.id === messageId ? { ...m, isRead: true } : m))
      );
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const handleMessageClick = (message: Message) => {
    setSelectedMessage(message);
    if (!message.isRead) {
      markAsRead(message.id);
    }
  };

  const closeDetailView = () => {
    setSelectedMessage(null);
    setDeliveryError('');
  };

  const handleConfirmDelivery = async () => {
    if (!selectedMessage?.transactionId) {
      setDeliveryError('Transaction ID not found');
      return;
    }

    setConfirmingDelivery(true);
    setDeliveryError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/payment/confirm', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionId: selectedMessage.transactionId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to confirm delivery');
      }

      // Refresh messages and close modal
      fetchMessages();
      closeDetailView();
    } catch (error) {
      setDeliveryError(error instanceof Error ? error.message : 'Failed to confirm delivery');
    } finally {
      setConfirmingDelivery(false);
    }
  };

  return (
    <>
      {/* Message Center Icon - Top Left (Only show when logged in) */}
      {isLoggedIn && (
        <div className="fixed top-6 left-6 z-40">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="relative w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center text-xl"
            title="Messages"
          >
            ✉️
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Welcome Modal - Shows ONCE for new users (only if logged in as regular user, NOT admin) */}
      {isLoggedIn && showWelcomeModal && messages.length > 0 && (
        (() => {
          const welcomeMsg = messages.find(m => (m as any).isWelcome === true);
          if (!welcomeMsg) return null;
          
          return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-2xl shadow-2xl border border-purple-700/50 max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 px-6 py-4 border-b border-slate-700/50">
                  <h2 className="text-2xl font-semibold text-white">👋 Welcome to Russian Roulette</h2>
                  <p className="text-xs text-slate-400 mt-1">Platform Guidelines</p>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                  {welcomeMsg.content}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-700/50 px-6 py-4 flex gap-3">
                  <button
                    onClick={() => setShowWelcomeModal(false)}
                    className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg font-medium transition-all"
                  >
                    No, Dismiss
                  </button>
                  <button
                    onClick={() => {
                      markAsRead(welcomeMsg.id);
                      setShowWelcomeModal(false);
                    }}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-medium transition-all"
                  >
                    Yes, I Accept
                  </button>
                </div>
              </div>
            </div>
          );
        })()
      )}

      {/* Message Detail Modal (only if logged in) */}
      {isLoggedIn && selectedMessage && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-2xl shadow-2xl border border-slate-700/50 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-white">{selectedMessage.title}</h2>
                <p className="text-xs text-slate-400 mt-1">
                  {new Date(selectedMessage.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={closeDetailView}
                className="text-slate-500 hover:text-slate-300 text-2xl w-10 h-10 rounded-full hover:bg-slate-800/50 transition-all flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose prose-invert max-w-none">
                <p className="text-slate-200 whitespace-pre-wrap font-light leading-relaxed">
                  {selectedMessage.content}
                </p>

                {/* Item Details if order notification */}
                {selectedMessage.itemDetails && (
                  <div className="mt-6 bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                    <h3 className="text-lg font-semibold text-slate-100 mb-3">📦 Item Details</h3>
                    <div className="space-y-2 text-sm text-slate-300">
                      <p><span className="font-semibold">Product:</span> {selectedMessage.itemDetails.productName}</p>
                      <p><span className="font-semibold">Amount:</span> ${selectedMessage.itemDetails.amount.toFixed(2)}</p>
                      <p><span className="font-semibold">Cryptocurrency:</span> {selectedMessage.itemDetails.cryptocurrency.toUpperCase()}</p>
                      <p><span className="font-semibold">Wallet Address:</span></p>
                      <p className="font-mono text-xs bg-slate-900 p-2 rounded break-all">
                        {selectedMessage.itemDetails.walletAddress}
                      </p>
                      <p><span className="font-semibold">Status:</span> 
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                          selectedMessage.itemDetails.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                          selectedMessage.itemDetails.status === 'paid' ? 'bg-blue-500/20 text-blue-300' :
                          selectedMessage.itemDetails.status === 'deposit_confirmed' ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-slate-500/20 text-slate-300'
                        }`}>
                          {selectedMessage.itemDetails.status}
                        </span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-700/50 px-6 py-4">
              {deliveryError && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded text-red-300 text-sm">
                  {deliveryError}
                </div>
              )}
              <div className="flex gap-3">
                {selectedMessage?.type === 'delivery' && selectedMessage?.itemDetails?.status === 'delivered' && (
                  <button
                    onClick={handleConfirmDelivery}
                    disabled={confirmingDelivery}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-slate-600 disabled:to-slate-600 text-white rounded-lg font-medium transition-all"
                  >
                    {confirmingDelivery ? 'Confirming...' : '✅ Confirm Receipt & Release Payment'}
                  </button>
                )}
                <button
                  onClick={closeDetailView}
                  className={`${selectedMessage?.type === 'delivery' && selectedMessage?.itemDetails?.status === 'delivered' ? 'flex-1' : 'w-full'} px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg font-light transition-all`}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages Panel (only if logged in) */}
      {isLoggedIn && isOpen && (
        <div className="fixed top-24 left-6 w-96 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden flex flex-col max-h-[600px] z-40">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 px-6 py-4 border-b border-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Messages</h3>
                <p className="text-xs text-slate-400">{unreadCount} unread</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-500 hover:text-slate-300 text-xl w-8 h-8 rounded-full hover:bg-slate-800/50 transition-all flex items-center justify-center"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p>No messages yet</p>
              </div>
            ) : (
              messages.map(message => (
                <button
                  key={message.id}
                  onClick={() => handleMessageClick(message)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    message.isRead
                      ? 'bg-slate-800/30 hover:bg-slate-800/50'
                      : 'bg-slate-800/70 hover:bg-slate-800 border border-purple-700/30'
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <p className={`text-sm font-semibold ${message.isRead ? 'text-slate-300' : 'text-purple-300'}`}>
                      {message.title}
                    </p>
                    {!message.isRead && (
                      <span className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0 mt-1"></span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2">
                    {message.content}
                  </p>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-700/50 px-4 py-3 bg-slate-950/50">
            <button
              onClick={() => fetchMessages()}
              className="w-full text-center text-xs text-slate-400 hover:text-slate-300 py-2"
            >
              Refresh
            </button>
          </div>
        </div>
      )}
    </>
  );
}
