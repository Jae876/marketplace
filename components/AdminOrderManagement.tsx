'use client';

import { useEffect, useState } from 'react';

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

interface Notification {
  id: string;
  message: string;
  buyer: string;
  product: string;
  type: 'success' | 'error';
}

export default function AdminOrderManagement() {
  const [token, setToken] = useState<string | null>(null);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [showSendItemModal, setShowSendItemModal] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [itemDetails, setItemDetails] = useState('');
  const [sendingItem, setSendingItem] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending'>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    setToken(storedToken);
  }, []);

  const fetchOrders = async () => {
    if (!token) return;
    setLoadingOrders(true);
    try {
      const response = await fetch('/api/admin/orders', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch orders');
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      addNotification('Failed to load orders', 'Unknown', '', 'error');
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleOpenOrdersModal = () => {
    setFilterStatus('all');
    fetchOrders();
    setShowOrdersModal(true);
  };

  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowOrdersModal(false);  // Close modal, show Send Item button instead
    setItemDetails('');
  };

  const handleSendItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !itemDetails.trim()) return;

    setSendingItem(true);
    try {
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

      if (!response.ok) throw new Error('Failed to send item');
      
      const data = await response.json();
      
      // Add success notification
      addNotification(
        '✅ Item Delivered Successfully!',
        data.buyerName,
        selectedOrder.productName,
        'success'
      );

      // Reset form
      setItemDetails('');
      setSelectedOrder(null);
      setShowSendItemModal(false);

      // Refresh orders
      setTimeout(() => fetchOrders(), 1500);
    } catch (error) {
      console.error('Error sending item:', error);
      addNotification('Failed to send item', 'Unknown', '', 'error');
    } finally {
      setSendingItem(false);
    }
  };

  const addNotification = (message: string, buyer: string, product: string, type: 'success' | 'error') => {
    const id = Date.now().toString();
    const notification: Notification = { id, message, buyer, product, type };
    setNotifications(prev => [...prev, notification]);

    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const getFilteredOrders = () => {
    if (filterStatus === 'all') return orders;
    if (filterStatus === 'paid') return orders.filter(o => o.status === 'paid' || o.status === 'completed');
    if (filterStatus === 'pending') return orders.filter(o => o.status === 'pending' || o.status === 'deposit_confirmed');
    return orders;
  };

  const filteredOrders = getFilteredOrders();

  return (
    <>
      {/* Notification Container - Top Right */}
      <div className="fixed top-4 right-4 z-[100] space-y-3">
        {notifications.map(notif => (
          <div
            key={notif.id}
            className={`rounded-lg shadow-2xl p-5 border max-w-md animate-slide-in ${
              notif.type === 'success'
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 border-green-400/50'
                : 'bg-gradient-to-r from-red-500 to-rose-500 border-red-400/50'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="text-3xl">{notif.type === 'success' ? '✅' : '❌'}</div>
              <div className="flex-1">
                <h3 className="font-bold text-white text-lg">{notif.message}</h3>
                {notif.buyer && <p className="text-white text-sm mt-1">👤 {notif.buyer}</p>}
                {notif.product && <p className="text-white text-sm">📦 {notif.product}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Button 1: View Orders */}
      <button
        onClick={handleOpenOrdersModal}
        className="fixed bottom-8 right-8 z-40 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-full font-bold shadow-lg hover:shadow-2xl transition-all flex items-center gap-2 hover:scale-105"
        title="View all orders - Paid, Created, Pending"
      >
        <span className="text-xl">📦</span>
        <span>View Orders</span>
      </button>

      {/* Button 2: Send Item (Standalone) */}
      <button
        onClick={() => {
          if (!selectedOrder) {
            addNotification('Please select an order first', 'Unknown', '', 'error');
            return;
          }
          setShowSendItemModal(true);
        }}
        className="fixed bottom-8 right-[300px] z-40 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-full font-bold shadow-lg hover:shadow-2xl transition-all flex items-center gap-2 hover:scale-105 animate-slide-in"
        title="Send item to selected buyer"
      >
        <span className="text-xl">📤</span>
        <span>Send Item</span>
      </button>

      {/* Orders Modal */}
      {showOrdersModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-2xl shadow-2xl border border-purple-500/30 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 px-8 py-6 border-b border-slate-700/50 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-white">📦 Order Management</h2>
                <p className="text-slate-400 mt-1">Select an order to send item</p>
              </div>
              <button
                onClick={() => setShowOrdersModal(false)}
                className="text-slate-500 hover:text-slate-300 text-4xl font-bold leading-none transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="px-8 py-4 border-b border-slate-700/50 flex gap-3 flex-wrap bg-slate-900/50">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filterStatus === 'all'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/50'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                All ({orders.length})
              </button>
              <button
                onClick={() => setFilterStatus('paid')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filterStatus === 'paid'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/50'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                💰 Paid ({orders.filter(o => o.status === 'paid' || o.status === 'completed').length})
              </button>
              <button
                onClick={() => setFilterStatus('pending')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filterStatus === 'pending'
                    ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/50'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                ⏳ Created ({orders.filter(o => o.status === 'pending' || o.status === 'deposit_confirmed').length})
              </button>
            </div>

            {/* Orders Content */}
            <div className="flex-1 overflow-y-auto p-8">
              {loadingOrders ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center gap-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-3 border-purple-500 border-t-transparent"></div>
                    <p className="text-slate-400 text-lg">Loading orders...</p>
                  </div>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-400 text-xl">📭 No orders in this category</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredOrders.map(order => (
                    <button
                      key={order.transactionId}
                      onClick={() => handleSelectOrder(order)}
                      className={`text-left rounded-xl border-2 transition-all p-5 hover:shadow-xl hover:shadow-purple-600/20 hover:scale-105 ${
                        order.status === 'paid' || order.status === 'completed'
                          ? 'bg-gradient-to-br from-emerald-900/20 to-slate-900 border-emerald-500/50'
                          : 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700/50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-bold text-white">{order.productName}</h3>
                          <p className="text-xs text-slate-500">ID: {order.transactionId.slice(0, 8)}...</p>
                        </div>
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${
                            order.status === 'paid' || order.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                          }`}
                        >
                          {order.status === 'paid' || order.status === 'completed' ? '💰 PAID' : '⏳ CREATED'}
                        </span>
                      </div>

                      <div className="space-y-2 text-sm text-slate-300">
                        <p>👤 {order.buyerName}</p>
                        <p>📧 {order.buyerEmail}</p>
                        <p>@ {order.buyerUsername}</p>
                        <p className="font-semibold">💰 ${order.amount.toFixed(2)} {order.cryptocurrency.toUpperCase()}</p>
                      </div>

                      {order.itemDelivered && (
                        <div className="mt-3 p-2 bg-green-500/20 border border-green-500/50 rounded text-green-300 text-xs text-center font-semibold">
                          ✅ Item Already Delivered
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Send Item Modal */}
      {showSendItemModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-2xl shadow-2xl border border-purple-500/30 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 px-8 py-6 border-b border-slate-700/50 flex items-center justify-between sticky top-0">
              <div>
                <h2 className="text-3xl font-bold text-white">📤 Send Item</h2>
                <p className="text-slate-400 mt-1">{selectedOrder.productName}</p>
              </div>
              <button
                onClick={() => {
                  setShowSendItemModal(false);
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
              {/* Buyer Info */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                <h3 className="text-slate-200 font-bold text-lg mb-4 flex items-center gap-2">
                  <span>👤</span>
                  Buyer Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 font-semibold mb-1">NAME</p>
                    <p className="text-slate-100 font-medium">{selectedOrder.buyerName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-semibold mb-1">USERNAME</p>
                    <p className="text-slate-100 font-medium">@{selectedOrder.buyerUsername}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs text-slate-500 font-semibold mb-1">EMAIL</p>
                    <p className="text-slate-100 font-medium break-all">{selectedOrder.buyerEmail}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-semibold mb-1">STATUS</p>
                    <p className="text-slate-100 font-medium uppercase">{selectedOrder.status}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-semibold mb-1">AMOUNT</p>
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
                  onChange={e => setItemDetails(e.target.value)}
                  placeholder="Enter item details such as:&#10;• Account credentials&#10;• Product keys&#10;• Login information&#10;• Download links&#10;• Activation codes&#10;&#10;This will be delivered to buyer's inbox with notification."
                  className="w-full px-4 py-4 bg-slate-800 border-2 border-slate-700 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 resize-none min-h-[240px] font-mono text-sm"
                />
                <p className="text-xs text-slate-500 mt-2">Characters: {itemDetails.length}</p>
              </div>

              {/* Info Box */}
              <div className="bg-blue-950/30 rounded-xl p-5 border border-blue-500/30">
                <p className="text-blue-300 text-sm font-bold mb-2 flex items-center gap-2">
                  <span>ℹ️</span>
                  Delivery Information
                </p>
                <ul className="text-xs text-blue-200 space-y-2 ml-6 list-disc">
                  <li>Item will appear in buyer's inbox immediately</li>
                  <li>Buyer receives notification in top-right corner</li>
                  <li>Buyer can review item and release payment</li>
                  <li>Seamless experience from payment to delivery</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => {
                    setShowSendItemModal(false);
                    setItemDetails('');
                    setShowOrdersModal(true);
                  }}
                  className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg font-bold transition-all"
                >
                  ← Back to Orders
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
    </>
  );
}
