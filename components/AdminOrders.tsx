'use client';

import { useEffect, useState } from 'react';

interface Order {
  id: string;
  transactionId: string;
  productId: string;
  productName: string;
  buyerId: string;
  buyerUsername: string;
  amount: number;
  cryptocurrency: string;
  status: string;
  createdAt: string;
  inboxItemSent?: boolean;
}

interface AdminOrdersProps {}

export default function AdminOrders({}: AdminOrdersProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [itemDetails, setItemDetails] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/orders', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch orders');
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleSendItem = async () => {
    if (!selectedOrder || !itemDetails.trim()) {
      setError('Please enter item details');
      return;
    }

    try {
      setSending(true);
      setError('');
      setSuccess('');

      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/send-item', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionId: selectedOrder.transactionId,
          buyerId: selectedOrder.buyerId,
          productName: selectedOrder.productName,
          itemDetails,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send item');
        return;
      }

      setSuccess(`Item details sent to ${selectedOrder.buyerUsername}!`);
      
      // Update local order to show item was sent
      setOrders(orders.map(o => 
        o.id === selectedOrder.id ? { ...o, inboxItemSent: true } : o
      ));

      // Close modal
      setTimeout(() => {
        setSelectedOrder(null);
        setItemDetails('');
        setSuccess('');
      }, 2000);
    } catch (err) {
      console.error('Error sending item:', err);
      setError('Failed to send item');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="text-gray-400">Loading orders...</div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-blue-50/10 border border-blue-400/50 rounded-lg p-6 text-center">
        <p className="text-gray-300">No pending orders at the moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-100">Manage Orders</h2>
      <p className="text-gray-400 mb-6">Send item details to buyers after they've paid</p>

      {error && (
        <div className="bg-red-900/50 border border-red-600 text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-900/50 border border-green-600 text-green-200 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      <div className="grid gap-4">
        {orders.map((order) => (
          <div
            key={order.id}
            className="bg-slate-900/50 border border-purple-700/30 rounded-lg p-4 hover:border-purple-600/60 transition"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-bold text-gray-100">{order.productName}</h3>
                <p className="text-sm text-gray-400 mt-1">Buyer: {order.buyerUsername}</p>
                <p className="text-sm text-gray-400">Amount: {order.amount} {order.cryptocurrency}</p>
                <p className="text-xs text-gray-500 mt-2">
                  Ordered: {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString()}
                </p>
              </div>
              <div className="ml-4 flex flex-col items-end gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  order.status === 'paid' 
                    ? 'bg-green-900/50 text-green-300 border border-green-600'
                    : order.status === 'deposit_confirmed'
                    ? 'bg-blue-900/50 text-blue-300 border border-blue-600'
                    : 'bg-gray-900/50 text-gray-400 border border-gray-600'
                }`}>
                  {order.status.toUpperCase()}
                </span>
                {order.inboxItemSent ? (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-900/50 text-purple-300 border border-purple-600">
                    ✓ Item Sent
                  </span>
                ) : (
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded transition"
                  >
                    Send Item
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Send Item Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-lg max-w-md shadow-2xl border border-purple-700/50">
            <div className="bg-red-600 text-white p-4 border-b border-purple-700">
              <h3 className="text-lg font-bold">Send Item to {selectedOrder.buyerUsername}</h3>
              <p className="text-red-100 text-sm mt-1">{selectedOrder.productName}</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-200 mb-2">
                  Item Details
                </label>
                <p className="text-xs text-gray-400 mb-3">
                  Include login credentials, download links, or any information the buyer needs to verify and confirm the item.
                </p>
                <textarea
                  value={itemDetails}
                  onChange={(e) => setItemDetails(e.target.value)}
                  placeholder="Enter item details (e.g., username, password, download link, account info, etc.)"
                  className="w-full h-48 px-3 py-2 bg-slate-800 border border-purple-600/30 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="bg-blue-900/30 p-3 rounded border border-blue-600/50">
                <p className="text-xs text-blue-200">
                  <strong>Note:</strong> This will be delivered directly to the buyer's inbox. They will review it and confirm the item before releasing funds.
                </p>
              </div>
            </div>

            <div className="bg-slate-800/50 p-4 border-t border-purple-700/50 flex gap-3">
              <button
                onClick={() => {
                  setSelectedOrder(null);
                  setItemDetails('');
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-100 font-semibold py-2 px-4 rounded transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSendItem}
                disabled={sending || !itemDetails.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-semibold py-2 px-4 rounded transition"
              >
                {sending ? 'Sending...' : 'Send to Inbox'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
