'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Order {
  transactionId: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  buyerUsername: string;
  productName: string;
  amount: number;
  cryptocurrency: string;
  createdAt: string;
  status: string;
  itemDelivered: boolean;
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [itemDetails, setItemDetails] = useState('');
  const [sendingItem, setSendingItem] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending'>('all');
  const [notification, setNotification] = useState<{ message: string; buyer: string; product: string } | null>(null);

  useEffect(() => {
    checkAuthAndFetchOrders();
  }, []);

  useEffect(() => {
    // Filter orders based on selected status
    if (filterStatus === 'all') {
      setFilteredOrders(allOrders);
    } else if (filterStatus === 'paid') {
      setFilteredOrders(allOrders.filter(o => o.status === 'paid' || o.status === 'completed'));
    } else if (filterStatus === 'pending') {
      setFilteredOrders(allOrders.filter(o => o.status === 'pending' || o.status === 'deposit_confirmed'));
    }
  }, [filterStatus, allOrders]);

  const checkAuthAndFetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const adminPassword = localStorage.getItem('adminPassword');
      
      if (!adminPassword) {
        router.push('/admin/login');
        return;
      }

      setIsAuthorized(true);

      // Fetch orders
      const ordersResponse = await fetch('/api/admin/orders', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!ordersResponse.ok) {
        const errorData = await ordersResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch orders: ${ordersResponse.status}`);
      }

      const data = await ordersResponse.json();
      setAllOrders(data.orders || []);
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleSendItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !itemDetails.trim()) {
      setError('Please enter item details');
      return;
    }

    setSendingItem(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionId: selectedOrder.transactionId,
          itemContent: itemDetails,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send item');
      }

      const data = await response.json();
      setSuccess(`✅ Item sent to ${data.buyerName}`);
      
      // Show notification in top-right
      setNotification({
        message: '✅ Item Delivered Successfully!',
        buyer: data.buyerName,
        product: selectedOrder.productName,
      });
      
      // Hide notification after 5 seconds
      setTimeout(() => setNotification(null), 5000);
      
      setItemDetails('');
      setSelectedOrder(null);

      // Refresh orders
      setTimeout(() => {
        checkAuthAndFetchOrders();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send item');
    } finally {
      setSendingItem(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          {error ? (
            <>
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={() => router.push('/admin/login')}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
              >
                Go to Admin Login
              </button>
            </>
          ) : (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
              <p className="text-slate-400">Checking authorization...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Top-right Notification */}
        {notification && (
          <div className="fixed top-4 right-4 z-50 animate-slide-in">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg shadow-2xl p-5 border border-green-400/50 max-w-md">
              <div className="flex items-start gap-3">
                <div className="text-3xl">✅</div>
                <div className="flex-1">
                  <h3 className="font-bold text-white text-lg">{notification.message}</h3>
                  <p className="text-green-100 text-sm mt-2">👤 {notification.buyer}</p>
                  <p className="text-green-100 text-sm">📦 {notification.product}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all inline-flex items-center gap-2"
          >
            ← Back
          </button>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            📦 Order Management System
          </h1>
          <p className="text-slate-400 text-lg">Manage orders, view payment status, and deliver items to buyers</p>
        </div>

        {/* Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-green-300 flex items-center gap-2">
            <span className="text-xl">✅</span>
            {success}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 flex items-center gap-2">
            <span className="text-xl">❌</span>
            {error}
          </div>
        )}

        {/* Filter Buttons */}
        <div className="mb-8 flex gap-3 flex-wrap">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              filterStatus === 'all'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/50'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            All Orders ({allOrders.length})
          </button>
          <button
            onClick={() => setFilterStatus('paid')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              filterStatus === 'paid'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/50'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            💰 Paid ({allOrders.filter(o => o.status === 'paid' || o.status === 'completed').length})
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              filterStatus === 'pending'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/50'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            ⏳ Initiated ({allOrders.filter(o => o.status === 'pending' || o.status === 'deposit_confirmed').length})
          </button>
        </div>

        {/* Orders Grid */}
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-3 border-purple-500 border-t-transparent"></div>
              <p className="text-slate-400 text-lg">Loading orders...</p>
            </div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-16 bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-700">
            <p className="text-slate-400 text-xl">📭 No orders found in this category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrders.map((order) => (
              <div
                key={order.transactionId}
                className={`rounded-xl border-2 transition-all p-6 hover:shadow-xl hover:shadow-purple-600/20 ${
                  order.status === 'paid' || order.status === 'completed'
                    ? 'bg-gradient-to-br from-emerald-900/20 to-slate-900 border-emerald-500/50'
                    : 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700/50'
                }`}
              >
                {/* Status Badge */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">{order.productName}</h3>
                    <p className="text-xs text-slate-500 mt-1">ID: {order.transactionId.slice(0, 8)}...</p>
                  </div>
                  <div
                    className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${
                      order.status === 'paid' || order.status === 'completed'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                        : order.status === 'pending' || order.status === 'deposit_confirmed'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                        : 'bg-slate-500/20 text-slate-300 border border-slate-500/50'
                    }`}
                  >
                    {order.status === 'paid' || order.status === 'completed' ? '💰 PAID' : '⏳ INITIATED'}
                  </div>
                </div>

                {/* Buyer Info */}
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="text-slate-500">👤</span>
                    <span>{order.buyerName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="text-slate-500">📧</span>
                    <span className="truncate">{order.buyerEmail}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="text-slate-500">@</span>
                    <span>{order.buyerUsername}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="text-slate-500">💰</span>
                    <span className="font-semibold">${order.amount.toFixed(2)} {order.cryptocurrency.toUpperCase()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300 text-xs">
                    <span className="text-slate-500">📅</span>
                    <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent my-4"></div>

                {/* Action Button */}
                {order.itemDelivered ? (
                  <div className="w-full p-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-lg text-green-300 text-center font-semibold flex items-center justify-center gap-2">
                    <span className="text-xl">✅</span>
                    Item Delivered
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedOrder(order);
                      setItemDetails('');
                      setError('');
                      setSuccess('');
                    }}
                    className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-bold transition-all hover:shadow-lg hover:shadow-purple-600/50 flex items-center justify-center gap-2"
                  >
                    <span>📤</span>
                    Send Item
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Item Details Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-2xl shadow-2xl border border-purple-500/30 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 px-8 py-6 border-b border-slate-700/50 flex items-center justify-between sticky top-0">
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-white">📦 Send Item to Buyer</h2>
                  <p className="text-slate-400 mt-1">
                    <strong>{selectedOrder.productName}</strong>
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedOrder(null);
                    setItemDetails('');
                  }}
                  className="text-slate-500 hover:text-slate-300 text-4xl font-bold leading-none transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Content */}
              <div className="p-8 space-y-6">
                {/* Buyer Information Section */}
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                  <h3 className="text-slate-200 font-bold text-lg mb-4 flex items-center gap-2">
                    <span>👤</span>
                    Buyer Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 font-semibold mb-1">FULL NAME</p>
                      <p className="text-slate-100 font-medium">{selectedOrder.buyerName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-semibold mb-1">USERNAME</p>
                      <p className="text-slate-100 font-medium">@{selectedOrder.buyerUsername}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-xs text-slate-500 font-semibold mb-1">EMAIL ADDRESS</p>
                      <p className="text-slate-100 font-medium break-all">{selectedOrder.buyerEmail}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-semibold mb-1">ORDER STATUS</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">
                          {selectedOrder.status === 'paid' || selectedOrder.status === 'completed' ? '💰' : '⏳'}
                        </span>
                        <span className="text-slate-100 font-medium uppercase">{selectedOrder.status}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-semibold mb-1">AMOUNT PAID</p>
                      <p className="text-slate-100 font-medium">
                        ${selectedOrder.amount.toFixed(2)} {selectedOrder.cryptocurrency.toUpperCase()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Item Details Input */}
                <div>
                  <label className="block text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
                    <span>📝</span>
                    Item Details / Credentials
                  </label>
                  <textarea
                    value={itemDetails}
                    onChange={(e) => setItemDetails(e.target.value)}
                    placeholder="Enter item details such as:&#10;• Account credentials&#10;• Product keys&#10;• Login information&#10;• Download links&#10;• Activation codes&#10;• License keys&#10;• API credentials&#10;&#10;This will be sent to the buyer's inbox and email."
                    className="w-full px-4 py-4 bg-slate-800 border-2 border-slate-700 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 resize-none min-h-[280px] font-mono text-sm"
                  />
                  <p className="text-xs text-slate-500 mt-2">Character count: {itemDetails.length}</p>
                </div>

                {/* Important Notes */}
                <div className="bg-blue-950/30 rounded-xl p-5 border border-blue-500/30">
                  <p className="text-blue-300 text-sm font-bold mb-2 flex items-center gap-2">
                    <span className="text-lg">ℹ️</span>
                    Important Information
                  </p>
                  <ul className="text-xs text-blue-200 space-y-2 ml-6 list-disc">
                    <li>Item will be delivered to buyer's inbox immediately</li>
                    <li>Buyer will receive email notification at <strong>{selectedOrder.buyerEmail}</strong></li>
                    <li>Buyer must confirm receipt before payment is fully released</li>
                    <li>Keep item details clear and complete</li>
                    <li>Include instructions if necessary</li>
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOrder(null);
                      setItemDetails('');
                    }}
                    className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendItem}
                    disabled={sendingItem || !itemDetails.trim()}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-all hover:shadow-lg hover:shadow-purple-600/50 flex items-center justify-center gap-2"
                  >
                    {sendingItem ? (
                      <>
                        <span className="inline-block animate-spin">⏳</span>
                        Sending...
                      </>
                    ) : (
                      <>
                        <span>📤</span>
                        Send Item to Buyer
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
