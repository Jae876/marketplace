'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { REGIONS } from '@/lib/regions';
import BalanceBadge from '@/components/BalanceBadge';
import UserInbox from '@/components/UserInbox';
import MessageCenter from '@/components/MessageCenter';

interface Transaction {
  id: string;
  productId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  cryptocurrency: string;
  walletAddress: string;
  status: 'pending' | 'paid' | 'delivered' | 'completed' | 'cancelled';
  createdAt: string;
  confirmedAt?: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  region: string;
  type: string;
  size?: string;
  image?: string;
}

interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  balance?: number;
  trustScore?: number;
  recentDeposits?: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'profile' | 'inbox'>('overview');
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [productsMap, setProductsMap] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);
  const [profileEditing, setProfileEditing] = useState(false);
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('');
  const [type, setType] = useState('');
  const [userStats, setUserStats] = useState<{ balance: number; trustScore: number } | null>(null);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
  });
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [ordersFilterStatus, setOrdersFilterStatus] = useState<'all' | 'pending' | 'active' | 'completed'>('all');
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Fetch user info
      try {
        const userResponse = await fetch('/api/user/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const userData = await userResponse.json();
        if (userData.user) {
          setUser(userData.user);
          setProfileData({
            firstName: userData.user.firstName,
            lastName: userData.user.lastName,
            username: userData.user.username,
            email: userData.user.email,
          });
        }
      } catch (err) {
        console.error('[DASHBOARD] Error fetching user:', err);
      }

      // Fetch user transactions
      let transactionsArray: Transaction[] = [];
      try {
        const txnResponse = await fetch('/api/user/transactions', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const txnData = await txnResponse.json();
        transactionsArray = txnData.transactions || [];
        setTransactions(transactionsArray);
      } catch (err) {
        console.error('[DASHBOARD] Error fetching transactions:', err);
        setTransactions([]);
      }

      // Fetch all products (no auth required for browsing) - CRITICAL
      console.log('[DASHBOARD] Fetching products from /api/products...');
      try {
        const productsResponse = await fetch('/api/products', {
          method: 'GET',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log('[DASHBOARD] Products response status:', productsResponse.status);
        console.log('[DASHBOARD] Products response ok:', productsResponse.ok);
        
        if (!productsResponse.ok) {
          console.error('[DASHBOARD] Products API returned error status:', productsResponse.status);
          const errorText = await productsResponse.text();
          console.error('[DASHBOARD] Error response:', errorText);
          setProducts([]);
          setFilteredProducts([]);
          return;
        }
        
        const productsText = await productsResponse.text();
        console.log('[DASHBOARD] Products response text length:', productsText.length);
        console.log('[DASHBOARD] Products response text (first 500 chars):', productsText.substring(0, 500));
        
        if (!productsText || productsText.trim().length === 0) {
          console.error('[DASHBOARD] Empty response from products API');
          setProducts([]);
          setFilteredProducts([]);
          return;
        }
        
        let productsData;
        try {
          productsData = JSON.parse(productsText);
          console.log('[DASHBOARD] Parsed products data:', productsData);
          console.log('[DASHBOARD] Products array exists:', Array.isArray(productsData.products));
          console.log('[DASHBOARD] Products count:', productsData.products?.length || 0);
          
          if (!productsData.products) {
            console.error('[DASHBOARD] No products array in response! Response structure:', Object.keys(productsData));
            // Try to find products in different possible formats
            if (Array.isArray(productsData)) {
              console.log('[DASHBOARD] Response is an array directly, using it');
              productsData = { products: productsData };
            } else if (productsData.data && Array.isArray(productsData.data)) {
              console.log('[DASHBOARD] Products in data property');
              productsData = { products: productsData.data };
            }
          }
        } catch (parseError: any) {
          console.error('[DASHBOARD] Failed to parse products response:', parseError);
          console.error('[DASHBOARD] Response text:', productsText);
          setProducts([]);
          setFilteredProducts([]);
          return;
        }
        
        const productsArray = Array.isArray(productsData.products) ? productsData.products : [];
        console.log('[DASHBOARD] Final products array length:', productsArray.length);
        console.log('[DASHBOARD] First product:', productsArray[0]);
        
        setProducts(productsArray);
        
        // Build product map for transactions
        const productMap: Record<string, Product> = {};
        transactionsArray.forEach((t: Transaction) => {
          const product = productsArray.find((p: Product) => p.id === t.productId);
          if (product) {
            productMap[t.productId] = product;
          }
        });
        setProductsMap(productMap);
        setFilteredProducts(productsArray);
        console.log('[DASHBOARD] Successfully set products:', productsArray.length, 'and filtered products:', productsArray.length);
      } catch (fetchError: any) {
        console.error('[DASHBOARD] Error fetching products:', fetchError);
        console.error('[DASHBOARD] Error message:', fetchError.message);
        console.error('[DASHBOARD] Error stack:', fetchError.stack);
        setProducts([]);
        setFilteredProducts([]);
      }

      // Fetch user stats (balance and trust score)
      try {
        const statsResponse = await fetch('/api/user/stats', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const statsData = await statsResponse.json();
        if (statsData.balance !== undefined && statsData.trustScore !== undefined) {
          setUserStats({
            balance: statsData.balance,
            trustScore: statsData.trustScore,
          });
        }
      } catch (err) {
        console.error('[DASHBOARD] Error fetching user stats:', err);
      }
    } catch (error: any) {
      console.error('[DASHBOARD] Error fetching dashboard data:', error);
      console.error('[DASHBOARD] Error details:', error.message, error.stack);
      setProducts([]);
      setFilteredProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter products when search/region/type changes
  useEffect(() => {
    let filtered = [...products];
    
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower) ||
        p.type.toLowerCase().includes(searchLower)
      );
    }
    
    if (region) {
      filtered = filtered.filter(p => p.region.toLowerCase() === region.toLowerCase());
    }
    
    if (type) {
      const typeLower = type.toLowerCase().trim();
      filtered = filtered.filter(p => p.type.toLowerCase().includes(typeLower));
    }
    
    setFilteredProducts(filtered);
  }, [search, region, type, products]);

  const handleProfileSave = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(profileData),
      });

      const data = await response.json();
      if (response.ok) {
        setUser(data.user);
        setProfileEditing(false);
        alert('Profile updated successfully!');
      } else {
        alert(data.error || 'Failed to update profile');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    router.push('/login');
  };

  const handleCancelOrder = async (transactionId: string) => {
    try {
      setCancellingOrderId(transactionId);
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/payment/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ transactionId }),
      });

      const data = await response.json();

      if (response.ok) {
        // Update local transaction status
        setTransactions(transactions.map(t => 
          t.id === transactionId ? { ...t, status: 'cancelled' } : t
        ));
        setCancelConfirmId(null);
        alert('Order cancelled successfully!');
      } else {
        alert(data.error || 'Failed to cancel order');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    } finally {
      setCancellingOrderId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-600/30 text-green-300';
      case 'paid':
        return 'bg-yellow-600/30 text-yellow-300';
      case 'pending':
        return 'bg-gray-600/30 text-gray-300';
      default:
        return 'bg-gray-600/30 text-gray-300';
    }
  };

  const getFilteredTransactions = () => {
    switch (ordersFilterStatus) {
      case 'pending':
        return transactions.filter(t => t.status === 'pending');
      case 'active':
        return transactions.filter(t => t.status === 'paid' || t.status === 'pending');
      case 'completed':
        return transactions.filter(t => t.status === 'completed');
      default:
        return transactions;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-900/50 text-green-300 border border-green-700/50';
      case 'paid':
        return 'bg-yellow-900/50 text-yellow-300 border border-yellow-700/50';
      case 'pending':
        return 'bg-gray-900/50 text-gray-300 border border-gray-700/50';
      case 'delivered':
        return 'bg-blue-900/50 text-blue-300 border border-blue-700/50';
      case 'cancelled':
        return 'bg-red-900/50 text-red-300 border border-red-700/50';
      default:
        return 'bg-gray-900/50 text-gray-300 border border-gray-700/50';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-100 via-purple-950 to-dark-200 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-100 via-purple-950 to-dark-200">
      <nav className="bg-dark-200/80 backdrop-blur-sm border-b border-purple-800/50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center">
              <Link href="/" className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Russian Roulette
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              {/* Message Center - Shows notifications and welcome modal */}
              {user && <MessageCenter />}
              {/* Balance Badge - Transparency Indicator */}
              {user && (
                <BalanceBadge 
                  balance={user.balance || 0} 
                  trustScore={user.trustScore || 0}
                  recentDeposits={user.recentDeposits || 0}
                />
              )}
              <Link
                href="/"
                className="text-gray-300 hover:text-purple-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Marketplace
              </Link>
              <button
                onClick={handleLogout}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-100 mb-2">Dashboard</h1>
          {user && (
            <p className="text-gray-400">
              Welcome back, {user.firstName} {user.lastName} (@{user.username})
            </p>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-purple-800/30">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'overview'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'products'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              Browse Products
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'profile'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab('inbox')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'inbox'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              📬 Inbox
            </button>
          </nav>
        </div>

        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Total Transactions */}
              <button
                onClick={() => {
                  setOrdersFilterStatus('all');
                  setShowOrdersModal(true);
                }}
                className="bg-gradient-to-br from-purple-900/40 to-purple-800/40 backdrop-blur-sm rounded-xl p-6 border border-purple-700/50 hover:border-purple-600/80 hover:from-purple-900/60 hover:to-purple-800/60 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between">
                  <div className="text-left">
                    <h3 className="text-gray-400 text-sm mb-2">Total Transactions</h3>
                    <p className="text-3xl font-bold text-purple-400 group-hover:text-purple-300 transition-colors">{transactions.length}</p>
                  </div>
                  <div className="text-2xl opacity-50 group-hover:opacity-100 transition-opacity">📊</div>
                </div>
                <p className="text-xs text-gray-500 mt-3 group-hover:text-gray-400">Click to view all orders</p>
              </button>

              {/* Active Orders */}
              <button
                onClick={() => {
                  setOrdersFilterStatus('active');
                  setShowOrdersModal(true);
                }}
                className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/40 backdrop-blur-sm rounded-xl p-6 border border-yellow-700/50 hover:border-yellow-600/80 hover:from-yellow-900/60 hover:to-yellow-800/60 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between">
                  <div className="text-left">
                    <h3 className="text-gray-400 text-sm mb-2">Active Orders</h3>
                    <p className="text-3xl font-bold text-yellow-400 group-hover:text-yellow-300 transition-colors">
                      {transactions.filter(t => t.status === 'paid' || t.status === 'pending').length}
                    </p>
                  </div>
                  <div className="text-2xl opacity-50 group-hover:opacity-100 transition-opacity">⏳</div>
                </div>
                <p className="text-xs text-gray-500 mt-3 group-hover:text-gray-400">Pending & In Progress</p>
              </button>

              {/* Completed Orders */}
              <button
                onClick={() => {
                  setOrdersFilterStatus('completed');
                  setShowOrdersModal(true);
                }}
                className="bg-gradient-to-br from-green-900/40 to-green-800/40 backdrop-blur-sm rounded-xl p-6 border border-green-700/50 hover:border-green-600/80 hover:from-green-900/60 hover:to-green-800/60 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between">
                  <div className="text-left">
                    <h3 className="text-gray-400 text-sm mb-2">Completed Orders</h3>
                    <p className="text-3xl font-bold text-green-400 group-hover:text-green-300 transition-colors">
                      {transactions.filter(t => t.status === 'completed').length}
                    </p>
                  </div>
                  <div className="text-2xl opacity-50 group-hover:opacity-100 transition-opacity">✓</div>
                </div>
                <p className="text-xs text-gray-500 mt-3 group-hover:text-gray-400">Click to view completed</p>
              </button>
            </div>

            <div className="bg-dark-200/80 backdrop-blur-sm rounded-xl shadow-lg border border-purple-800/30 overflow-hidden">
              <div className="p-6 border-b border-purple-800/30">
                <h2 className="text-2xl font-bold text-gray-100">Recent Transactions</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-purple-800/30">
                  <thead className="bg-dark-300/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Cryptocurrency
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-dark-200/50 divide-y divide-purple-800/30">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                          No transactions yet. Browse products to make your first purchase!
                        </td>
                      </tr>
                    ) : (
                      transactions.map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-dark-300/50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-100">
                              {productsMap[transaction.productId]?.name || 'Unknown Product'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-300">${transaction.amount.toFixed(2)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-300 uppercase">{transaction.cryptocurrency}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(transaction.status)}`}>
                              {transaction.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                            {new Date(transaction.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Orders Modal */}
            {showOrdersModal && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-dark-200 rounded-xl shadow-2xl border border-purple-700/50 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                  {/* Modal Header */}
                  <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 px-6 py-4 border-b border-purple-700/30 flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-100">My Orders</h2>
                      <p className="text-xs text-gray-400 mt-1">
                        {ordersFilterStatus === 'all' && 'All Transactions'}
                        {ordersFilterStatus === 'active' && 'Pending & Active Orders'}
                        {ordersFilterStatus === 'completed' && 'Completed Orders'}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowOrdersModal(false)}
                      className="text-gray-400 hover:text-gray-200 text-2xl"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Filter Buttons */}
                  <div className="px-6 py-4 border-b border-purple-700/30 flex gap-2 flex-wrap">
                    <button
                      onClick={() => setOrdersFilterStatus('all')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        ordersFilterStatus === 'all'
                          ? 'bg-purple-600 text-white'
                          : 'bg-purple-900/30 text-purple-300 hover:bg-purple-900/50'
                      }`}
                    >
                      All ({transactions.length})
                    </button>
                    <button
                      onClick={() => setOrdersFilterStatus('pending')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        ordersFilterStatus === 'pending'
                          ? 'bg-gray-600 text-white'
                          : 'bg-gray-900/30 text-gray-300 hover:bg-gray-900/50'
                      }`}
                    >
                      Pending ({transactions.filter(t => t.status === 'pending').length})
                    </button>
                    <button
                      onClick={() => setOrdersFilterStatus('active')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        ordersFilterStatus === 'active'
                          ? 'bg-yellow-600 text-white'
                          : 'bg-yellow-900/30 text-yellow-300 hover:bg-yellow-900/50'
                      }`}
                    >
                      Active ({transactions.filter(t => t.status === 'paid' || t.status === 'pending').length})
                    </button>
                    <button
                      onClick={() => setOrdersFilterStatus('completed')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        ordersFilterStatus === 'completed'
                          ? 'bg-green-600 text-white'
                          : 'bg-green-900/30 text-green-300 hover:bg-green-900/50'
                      }`}
                    >
                      Completed ({transactions.filter(t => t.status === 'completed').length})
                    </button>
                  </div>

                  {/* Modal Content - Scrollable */}
                  <div className="flex-1 overflow-y-auto p-6">
                    {getFilteredTransactions().length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-gray-400 text-lg mb-2">No orders found</p>
                        <p className="text-gray-500 text-sm">
                          {ordersFilterStatus === 'completed' && 'You haven\'t completed any orders yet.'}
                          {ordersFilterStatus === 'active' && 'You don\'t have any active orders.'}
                          {ordersFilterStatus === 'pending' && 'You don\'t have any pending orders.'}
                          {ordersFilterStatus === 'all' && 'Start browsing to make your first purchase!'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {getFilteredTransactions().map((transaction) => (
                          <div
                            key={transaction.id}
                            className="bg-slate-900/50 rounded-lg p-4 border border-purple-700/30 hover:border-purple-600/50 transition-colors"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Left Column */}
                              <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Product</p>
                                <p className="text-lg font-semibold text-gray-100 mb-3">
                                  {productsMap[transaction.productId]?.name || 'Unknown Product'}
                                </p>
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Order ID</p>
                                <p className="text-xs text-gray-400 font-mono">{transaction.id}</p>
                              </div>

                              {/* Right Column */}
                              <div>
                                <div className="grid grid-cols-2 gap-4 mb-3">
                                  <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Amount</p>
                                    <p className="text-xl font-bold text-purple-300">${transaction.amount.toFixed(2)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Currency</p>
                                    <p className="text-lg font-semibold text-blue-300">{transaction.cryptocurrency.toUpperCase()}</p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Status</p>
                                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(transaction.status)}`}>
                                      {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Date</p>
                                    <p className="text-xs text-gray-400">
                                      {new Date(transaction.createdAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Wallet Address (if applicable) */}
                            {transaction.walletAddress && (
                              <div className="mt-4 pt-4 border-t border-purple-700/30">
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Wallet Address</p>
                                <div className="bg-slate-800/50 p-2 rounded border border-purple-700/20 break-all">
                                  <p className="text-xs text-purple-300 font-mono">{transaction.walletAddress}</p>
                                </div>
                              </div>
                            )}

                            {/* Cancel Button for Pending Orders */}
                            {transaction.status === 'pending' && (
                              <div className="mt-4 pt-4 border-t border-purple-700/30">
                                {cancelConfirmId === transaction.id ? (
                                  <div className="bg-red-900/30 border border-red-700/50 p-3 rounded-lg">
                                    <p className="text-xs text-red-300 mb-3">Are you sure you want to cancel this order? This action cannot be undone.</p>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleCancelOrder(transaction.id)}
                                        disabled={cancellingOrderId === transaction.id}
                                        className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
                                      >
                                        {cancellingOrderId === transaction.id ? 'Cancelling...' : 'Yes, Cancel Order'}
                                      </button>
                                      <button
                                        onClick={() => setCancelConfirmId(null)}
                                        className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-100 text-xs font-semibold rounded-lg transition-colors"
                                      >
                                        Keep Order
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setCancelConfirmId(transaction.id)}
                                    className="w-full px-3 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-700/50 hover:border-red-600 text-red-300 hover:text-red-200 text-xs font-semibold rounded-lg transition-all"
                                  >
                                    ✕ Cancel Order
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div className="bg-dark-300/50 px-6 py-4 border-t border-purple-700/30 flex justify-end">
                    <button
                      onClick={() => setShowOrdersModal(false)}
                      className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-medium transition-all"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'products' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-100 mb-6">Browse Products</h2>
            <p className="text-gray-400 mb-4">Search and filter products to find what you're looking for</p>
            
            {/* Search and Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Search
                </label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products..."
                  className="w-full px-3 py-2 bg-dark-100 border border-gray-600 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Region
                </label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-100 border border-gray-600 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">All Regions</option>
                  {REGIONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Type (Item Name)
                </label>
                <input
                  type="text"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  placeholder="Enter item type (e.g., Electronics, Clothing)"
                  className="w-full px-3 py-2 bg-dark-100 border border-gray-600 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSearch('');
                    setRegion('');
                    setType('');
                  }}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-gray-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="bg-dark-200/80 backdrop-blur-sm rounded-xl p-12 text-center border border-purple-800/30">
                <p className="text-gray-400 text-lg mb-4">
                  {products.length === 0 
                    ? 'No products available yet. Check back later!' 
                    : 'No products match your filters. Try adjusting your search.'}
                </p>
                {/* Debug info */}
                <div className="mt-4 text-xs text-gray-500">
                  <p>Debug: Products in state: {products.length}</p>
                  <p>Filtered products: {filteredProducts.length}</p>
                  <p>Search: "{search}" | Region: "{region}" | Type: "{type}"</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <Link
                    key={product.id}
                    href={`/product/${product.id}`}
                    className="bg-dark-200/80 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden hover:shadow-purple-500/20 hover:scale-105 transition-all border border-purple-800/30"
                  >
                    {product.image && (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <div className="p-6">
                      <h3 className="text-xl font-semibold text-gray-100 mb-2">
                        {product.name}
                      </h3>
                      <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                        {product.description}
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                          ${product.price.toFixed(2)}
                        </span>
                        <div className="text-sm">
                          <span className="bg-purple-600/30 text-purple-300 px-2 py-1 rounded">
                            {product.region}
                          </span>
                        </div>
                      </div>
                      {product.size && (
                        <div className="mt-2">
                          <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
                            {product.size} pieces
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="bg-dark-200/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-purple-800/30">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-100">Profile</h2>
              {!profileEditing && (
                <button
                  onClick={() => setProfileEditing(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Edit Profile
                </button>
              )}
            </div>

            {profileEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={profileData.firstName}
                      onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                      className="w-full px-3 py-2 bg-dark-100 border border-gray-600 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={profileData.lastName}
                      onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                      className="w-full px-3 py-2 bg-dark-100 border border-gray-600 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={profileData.username}
                    onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                    className="w-full px-3 py-2 bg-dark-100 border border-gray-600 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-dark-100 border border-gray-600 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => {
                      setProfileEditing(false);
                      setProfileData({
                        firstName: user?.firstName || '',
                        lastName: user?.lastName || '',
                        username: user?.username || '',
                        email: user?.email || '',
                      });
                    }}
                    className="px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-dark-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleProfileSave}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">First Name</label>
                    <p className="text-gray-100">{user?.firstName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Last Name</label>
                    <p className="text-gray-100">{user?.lastName}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Username</label>
                  <p className="text-gray-100">@{user?.username}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                  <p className="text-gray-100">{user?.email}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'inbox' && (
          <div className="bg-dark-200/80 backdrop-blur-sm rounded-xl shadow-lg p-8 border border-purple-800/30">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-100 mb-2">📬 Inbox</h2>
              <p className="text-gray-400">Items delivered to you by sellers</p>
            </div>
            <UserInbox />
          </div>
        )}
      </main>
    </div>
  );
}
