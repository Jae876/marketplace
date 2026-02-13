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
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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

  // Show welcome message for new USERS ONLY (not admin) - from API
  useEffect(() => {
    if (messages.length > 0) {
      const welcomeMsg = messages.find(m => (m as any).isWelcome === true);
      if (welcomeMsg && !welcomeMsg.isRead) {
        setShowWelcomeModal(true);
      }
    }
  }, [messages]);

  // Fetch user name for welcome message
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        const userId = decoded.userId;
        // Store for use in welcome message
        localStorage.setItem('currentUserId', userId);
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    }
  }, []);

  // Update unread count
  useEffect(() => {
    const unread = messages.filter(m => !m.isRead).length;
    setUnreadCount(unread);
  }, [messages]);

  const addWelcomeMessage = () => {
    // Get user info from token
    let userName = 'new user';
    let userUsername = '@user';
    
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        // You'll need to get full user details from API or localStorage
        const userFirstName = localStorage.getItem('userFirstName') || 'User';
        const userUsername_stored = localStorage.getItem('userUsername') || '@user';
        userName = userFirstName;
        userUsername = userUsername_stored;
      }
    } catch (error) {
      console.error('Error getting user info:', error);
    }

    const welcomeMessage: Message = {
      id: 'welcome-' + Date.now(),
      title: '👋 Welcome to Russian Roulette',
      content: `Welcome to Russian Roulette! 🎉
We're thrilled to have you join our community as a new user. Here at Russian Roulette, you can securely browse, buy, and sell premium digital products, accounts, services, and more — all powered by cryptocurrency transactions in a safe, escrow-protected environment.

To help you get started smoothly and ensure a positive experience for everyone, please take a moment to review these important platform guidelines:

═══════════════════════════════════════════════════════════════

📋 HOW TRANSACTIONS WORK

1. BROWSING & ORDERING
   Explore the Marketplace to find products that interest you. When you're ready, place your order — your funds will be held securely in escrow (not released to the seller yet).

2. DELIVERY OF ITEM
   • The seller will deliver your purchased item via two channels for your convenience and verification:
      ✓ Sent to the registered email associated with your account.
      ✓ Also delivered directly to your inbox/messages on the Russian Roulette platform. 
   • Check both your email (including spam/junk folder) and your platform inbox shortly after the seller marks the order as "in progress" or "shipped."

3. VERIFICATION & CONFIRMATION
   • Once you receive and fully verify the item (test login, check details, ensure it matches the product description), confirm that everything is correct and satisfactory.
   • Only after you confirm should you release the funds from escrow to the seller. This protects both buyers and sellers.

4. RELEASING FUNDS
   • Go to your Active Orders section.
   • If satisfied → Click to release escrow (funds go to the seller).
   • If there's an issue → Open a dispute immediately so our support team can assist. Do not release funds if the item is incorrect, not delivered, or doesn't work as described.

═══════════════════════════════════════════════════════════════

💡 QUICK TIPS FOR NEW USERS

✓ Always double-check product descriptions before purchasing.
✓ Keep your account secure — never share login credentials outside the platform.
✓ Use only cryptocurrencies supported on the platform for deposits and transactions.
✓ If anything feels off or you need help, reach out via support or check the Help section.

═══════════════════════════════════════════════════════════════

Your safety and satisfaction are our top priorities. We use escrow to make every deal fair and secure.

Happy shopping, and welcome aboard, ${userName} (${userUsername})! 🚀`,
      type: 'system',
      isRead: false,
      createdAt: new Date(),
    };
    setMessages([welcomeMessage]);
  };

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
        // Preserve welcome message if it exists
        setMessages(prev => {
          const welcomeMsg = prev.find(m => m.id.startsWith('welcome-'));
          if (welcomeMsg) {
            return [welcomeMsg, ...data.messages];
          }
          return data.messages;
        });
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
      {/* Welcome Modal - Auto-opens for new users */}
      {showWelcomeModal && messages.length > 0 && messages[0]?.type === 'system' && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={() => setShowWelcomeModal(false)}
          />
          
          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-2xl shadow-2xl border border-purple-700/50 max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 px-8 py-6 border-b border-slate-700/50 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">{messages[0]?.title}</h2>
                  <p className="text-xs text-slate-400 mt-1">🎓 Platform Guidelines</p>
                </div>
                <button
                  onClick={() => setShowWelcomeModal(false)}
                  className="text-slate-500 hover:text-slate-300 text-2xl w-10 h-10 rounded-full hover:bg-slate-800/50 transition-all flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-8 space-y-4 text-slate-200 text-sm leading-relaxed whitespace-pre-wrap font-light">
                {messages[0]?.content}
              </div>

              {/* Footer */}
              <div className="border-t border-slate-700/50 px-8 py-4 bg-slate-950/50 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowWelcomeModal(false);
                  }}
                  className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg font-medium transition-all"
                >
                  No, Dismiss
                </button>
                <button
                  onClick={() => {
                    setShowWelcomeModal(false);
                    const welcomeMsg = messages.find(m => (m as any).isWelcome === true);
                    if (welcomeMsg) {
                      markAsRead(welcomeMsg.id);
                    }
                  }}
                  className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-medium transition-all"
                >
                  Yes, I Accept
                </button>
              </div>
            </div>
          </div>
        </>
      )}

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

      {/* Welcome Message Modal - Auto-opens for new users (only if logged in) - BLOCKING MODAL */}
      {isLoggedIn && showWelcomeModal && messages.find(m => (m as any).isWelcome === true) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 pointer-events-auto">
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-2xl shadow-2xl border border-slate-700/50 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 px-6 py-4 border-b border-slate-700/50">
              <div>
                <h2 className="text-2xl font-semibold text-white">👋 Welcome to Russian Roulette</h2>
                <p className="text-xs text-slate-400 mt-1">Please review our guidelines before proceeding</p>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose prose-invert max-w-none">
                <p className="text-slate-200 whitespace-pre-wrap font-light leading-relaxed">
                  {messages.find(m => (m as any).isWelcome === true)?.content}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-700/50 px-6 py-4 flex gap-3">
              <button
                onClick={() => setShowWelcomeModal(false)}
                className="flex-1 px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg font-light transition-all"
              >
                Got it, let me explore!
              </button>
            </div>
          </div>
        </div>
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
