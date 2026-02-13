'use client';

import { useEffect, useState } from 'react';

interface BalanceBadgeProps {
  balance: number;
  trustScore?: number;
  recentDeposits?: number;
  onModalOpen?: (isOpen: boolean) => void;
  showModal?: boolean;
}

export default function BalanceBadge({ balance, trustScore = 0, recentDeposits = 0, onModalOpen, showModal }: BalanceBadgeProps) {
  const [hasRecentActivity, setHasRecentActivity] = useState(false);
  const [showPulse, setShowPulse] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [transactionHistory, setTransactionHistory] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Use controlled state from parent if provided
  const isModalOpen = showModal !== undefined ? showModal : showBalanceModal;

  useEffect(() => {
    // Check if there are recent deposits (within last 24 hours)
    if (recentDeposits > 0) {
      setHasRecentActivity(true);
      setShowPulse(true);
      // Stop pulse animation after 10 seconds, but keep indicator visible
      const timer = setTimeout(() => setShowPulse(false), 10000);
      return () => clearTimeout(timer);
    } else {
      setHasRecentActivity(false);
      setShowPulse(false);
    }
  }, [recentDeposits]);

  // Fetch transaction history when modal opens
  useEffect(() => {
    if (isModalOpen && transactionHistory.length === 0) {
      fetchTransactionHistory();
    }
  }, [isModalOpen, transactionHistory.length]);

  const fetchTransactionHistory = async () => {
    try {
      setLoadingTransactions(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/user/transactions', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.transactions) {
        setTransactionHistory(data.transactions);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Calculate trust level based on trust score
  const getTrustLevel = () => {
    if (trustScore >= 80) return { level: 'High', color: 'text-green-400', dot: 'bg-green-500' };
    if (trustScore >= 50) return { level: 'Medium', color: 'text-yellow-400', dot: 'bg-yellow-500' };
    if (trustScore > 0) return { level: 'Low', color: 'text-blue-400', dot: 'bg-blue-500' };
    return { level: 'New', color: 'text-gray-400', dot: 'bg-gray-500' };
  };

  const trust = getTrustLevel();

  // Calculate statistics
  const deposited = transactionHistory
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const pending = transactionHistory
    .filter(t => t.status === 'pending' || t.status === 'paid')
    .reduce((sum, t) => sum + t.amount, 0);

  const cancelled = transactionHistory
    .filter(t => t.status === 'cancelled')
    .length;

  return (
    <>
      {/* Balance Badge - Now Clickable */}
      <button
        onClick={() => {
          setShowBalanceModal(true);
          onModalOpen?.(true);
        }}
        className="relative flex items-center space-x-4 bg-dark-200/80 backdrop-blur-sm rounded-lg px-4 py-2.5 border border-purple-800/30 shadow-lg hover:border-purple-700/50 hover:bg-dark-200 transition-all cursor-pointer group"
      >
        {/* Balance Display with Deposit Indicator at Top Corner */}
        <div className="relative">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xs text-gray-400 uppercase tracking-wide group-hover:text-gray-300 transition-colors">Balance</span>
          </div>
          <div className="relative inline-block">
            <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent group-hover:from-purple-300 group-hover:to-pink-300">
              ${balance.toFixed(2)}
            </span>
            {/* Deposit Activity Indicator - Small Circle at Top-Right Corner */}
            {hasRecentActivity && (
              <div className="absolute -top-1 -right-2">
                <div className="relative">
                  <div
                    className={`w-2.5 h-2.5 rounded-full bg-green-500 ${
                      showPulse ? 'animate-pulse' : ''
                    } shadow-lg shadow-green-500/70 border-2 border-dark-200`}
                    title={`${recentDeposits} recent deposit${recentDeposits > 1 ? 's' : ''} in last 24 hours - Transparency Verified`}
                  >
                    {/* Outer glow effect for visibility */}
                    {showPulse && (
                      <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75"></div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Trust Score Indicator */}
        {trustScore > 0 && (
          <div className="flex flex-col items-center">
            <div className="flex items-center space-x-1.5 mb-1">
              <span className="text-xs text-gray-400 uppercase tracking-wide group-hover:text-gray-300 transition-colors">Trust</span>
              {/* Trust Indicator Circle */}
              <div
                className={`w-2 h-2 rounded-full ${trust.dot} shadow-md`}
                title={`Trust Score: ${trustScore}% (${trust.level} Trust)`}
              />
            </div>
            <span className={`text-sm font-semibold ${trust.color}`}>
              {trustScore}%
            </span>
          </div>
        )}

        {/* New User Indicator */}
        {trustScore === 0 && balance === 0 && (
          <div className="flex items-center space-x-1.5">
            <div className="w-2 h-2 rounded-full bg-gray-500" title="New User" />
            <span className="text-xs text-gray-500 group-hover:text-gray-400">New</span>
          </div>
        )}

        {/* Click indicator */}
        <div className="ml-auto text-gray-500 group-hover:text-gray-400 opacity-0 group-hover:opacity-100 transition-all">
          <span className="text-xs">→</span>
        </div>
      </button>

      {/* Balance Details Modal */}
      {isModalOpen && (
        <>
          {/* Backdrop - Highest z-index */}
          <div 
            className="fixed inset-0 bg-gradient-to-br from-black/20 via-black/10 to-black/20 backdrop-blur-md z-[99998]"
            onClick={() => {
              setShowBalanceModal(false);
              onModalOpen?.(false);
            }}
          />
          
          {/* Modal Container */}
          <div 
            className="fixed inset-0 flex items-center justify-center z-[99999] p-4 pointer-events-none"
            onClick={() => {
              setShowBalanceModal(false);
              onModalOpen?.(false);
            }}
          >
            <div 
              className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-2xl shadow-2xl border border-slate-700/50 max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
              style={{
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)'
              }}
            >
            {/* Decorative Top Accent */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
            
            {/* Modal Header - Minimal & Elegant */}
            <div className="px-8 py-6 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-light text-white tracking-tight">Financial Overview</h2>
                  <p className="text-sm text-slate-400 mt-2">Your balance, deposits & transaction history</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowBalanceModal(false);
                    onModalOpen?.(false);
                  }}
                  className="text-slate-500 hover:text-slate-300 text-2xl w-10 h-10 rounded-full hover:bg-slate-800/50 transition-all flex items-center justify-center flex-shrink-0"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* Main Balance Display */}
              <div className="relative">
                <div className="text-slate-500 text-sm uppercase tracking-widest mb-3">Current Balance</div>
                <div className="text-6xl font-light text-white mb-2">
                  ${balance.toFixed(2)}
                </div>
                <div className="h-px bg-gradient-to-r from-purple-500/50 via-purple-500/20 to-transparent w-32 mb-4" />
                <p className="text-slate-400 text-sm">Available for future purchases</p>
              </div>

              {/* Summary Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Total Deposited */}
                <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700/30 hover:border-slate-600/50 transition-colors">
                  <p className="text-slate-500 text-xs uppercase tracking-widest mb-3">Total Deposited</p>
                  <p className="text-2xl font-light text-slate-100">${deposited.toFixed(2)}</p>
                  <p className="text-xs text-slate-500 mt-2">{transactionHistory.filter(t => t.status === 'completed').length} completed transactions</p>
                </div>

                {/* Pending Value */}
                <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700/30 hover:border-slate-600/50 transition-colors">
                  <p className="text-slate-500 text-xs uppercase tracking-widest mb-3">Pending Value</p>
                  <p className="text-2xl font-light text-slate-100">${pending.toFixed(2)}</p>
                  <p className="text-xs text-slate-500 mt-2">{transactionHistory.filter(t => t.status === 'pending' || t.status === 'paid').length} active orders</p>
                </div>
              </div>

              {/* Statistics Bar */}
              <div>
                <div className="text-slate-500 text-xs uppercase tracking-widest mb-4">Transaction Activity</div>
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-slate-800/40 rounded-lg p-4 text-center border border-slate-700/30">
                    <p className="text-xl font-light text-slate-100">{transactionHistory.length}</p>
                    <p className="text-xs text-slate-500 mt-1">Total</p>
                  </div>
                  <div className="bg-slate-800/40 rounded-lg p-4 text-center border border-slate-700/30">
                    <p className="text-xl font-light text-green-400">{transactionHistory.filter(t => t.status === 'completed').length}</p>
                    <p className="text-xs text-slate-500 mt-1">Completed</p>
                  </div>
                  <div className="bg-slate-800/40 rounded-lg p-4 text-center border border-slate-700/30">
                    <p className="text-xl font-light text-amber-400">{transactionHistory.filter(t => t.status === 'pending' || t.status === 'paid').length}</p>
                    <p className="text-xs text-slate-500 mt-1">Active</p>
                  </div>
                  <div className="bg-slate-800/40 rounded-lg p-4 text-center border border-slate-700/30">
                    <p className="text-xl font-light text-red-400">{cancelled}</p>
                    <p className="text-xs text-slate-500 mt-1">Cancelled</p>
                  </div>
                </div>
              </div>

              {/* Recent Transactions */}
              <div>
                <div className="text-slate-500 text-xs uppercase tracking-widest mb-4">Recent Activity</div>
                {loadingTransactions ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                    <p className="text-slate-400 mt-3 text-sm">Loading transactions...</p>
                  </div>
                ) : transactionHistory.length === 0 ? (
                  <div className="bg-slate-800/20 rounded-xl p-8 text-center border border-slate-700/30">
                    <p className="text-slate-400">No transactions yet.</p>
                    <p className="text-xs text-slate-500 mt-2">Start exploring products to make your first purchase</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {transactionHistory.slice(0, 10).map((tx) => (
                      <div key={tx.id} className="bg-slate-800/20 rounded-lg p-4 border border-slate-700/30 hover:border-slate-600/50 hover:bg-slate-800/30 transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm text-slate-100 font-light">Order #{tx.id.slice(0, 8)}</p>
                            <p className="text-xs text-slate-500 mt-1">{new Date(tx.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-light text-slate-100">${tx.amount.toFixed(2)}</p>
                            <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full mt-1 ${
                              tx.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                              tx.status === 'paid' ? 'bg-amber-500/20 text-amber-300' :
                              tx.status === 'pending' ? 'bg-slate-500/20 text-slate-300' :
                              tx.status === 'cancelled' ? 'bg-red-500/20 text-red-300' :
                              'bg-blue-500/20 text-blue-300'
                            }`}>
                              {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                          <span className="uppercase">{tx.cryptocurrency}</span>
                          <span>Released: ${tx.amount.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gradient-to-r from-slate-900/50 to-slate-900/30 px-8 py-5 border-t border-slate-700/50 flex justify-end">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowBalanceModal(false);
                  onModalOpen?.(false);
                }}
                className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg font-light transition-all border border-slate-600/50 hover:border-slate-500"
              >
                Close
              </button>
            </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
