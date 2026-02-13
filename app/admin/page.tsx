'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { REGIONS } from '@/lib/regions';
import { SUPPORTED_CRYPTOS } from '@/lib/crypto';
import BalanceBadge from '@/components/BalanceBadge';

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

interface WalletConfig {
  [key: string]: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'products' | 'wallets' | 'orders'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [wallets, setWallets] = useState<WalletConfig>(
    SUPPORTED_CRYPTOS.reduce((acc, crypto) => {
      acc[crypto.id] = '';
      return acc;
    }, {} as WalletConfig)
  );
  const [walletSearchTerm, setWalletSearchTerm] = useState('');
  const [regions, setRegions] = useState<string[]>(REGIONS);
  const [types, setTypes] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  
  // Order management states
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [itemDetails, setItemDetails] = useState('');
  const [orderFilter, setOrderFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [sendingItem, setSendingItem] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    region: '',
    type: '',
    size: '',
    image: '',
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check with server if admin session is valid (via httpOnly cookie)
        const response = await fetch('/api/admin/verify', {
          method: 'GET',
          credentials: 'include', // CRITICAL: Send httpOnly cookies with request
        });
        
        const data = await response.json();
        
        if (data.authorized) {
          setIsAuthorized(true);
          setAuthChecked(true);
        } else {
          setAuthChecked(true);
          router.push('/admin/login');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setAuthChecked(true);
        router.push('/admin/login');
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (isAuthorized) {
      fetchProducts();
      fetchWallets();
      fetchOptions();
    }
  }, [isAuthorized]);

  const fetchOptions = async () => {
    try {
      // Admin session is via httpOnly cookie, no need for Authorization header
      const response = await fetch('/api/admin/options', {
        credentials: 'include', // Send cookies with request
      });
      const data = await response.json();
      // Only fetch sizes for reference, types are now custom input
      if (data.sizes) setSizes(data.sizes);
    } catch (error) {
      console.error('Error fetching options:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      // Admin session is via httpOnly cookie, no need for Authorization header
      const response = await fetch('/api/products', {
        credentials: 'include', // Send cookies with request
        cache: 'no-store', // Prevent caching
      });
      
      const text = await response.text();
      
      if (!text) {
        console.error('[ADMIN] Empty response from products API');
        setProducts([]);
        return;
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('[ADMIN] Failed to parse products response:', parseError);
        setProducts([]);
        return;
      }

      console.log('[ADMIN] Products fetched:', data.products?.length || 0);
      setProducts(data.products || []);
    } catch (error) {
      console.error('[ADMIN] Error fetching products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchWallets = async () => {
    try {
      // Admin session is via httpOnly cookie, no need for Authorization header
      const response = await fetch('/api/admin/wallets', {
        credentials: 'include', // Send cookies with request
      });
      const data = await response.json();
      if (data.wallets) {
        setWallets(data.wallets);
      }
    } catch (error) {
      console.error('Error fetching wallets:', error);
    }
  };

  const fetchOrders = async () => {
    // Admin session is via httpOnly cookie, no need for token
    
    try {
      setLoadingOrders(true);
      const response = await fetch('/api/admin/orders', {
        credentials: 'include', // Send cookies with request
      });
      
      if (!response.ok) throw new Error('Failed to fetch orders');
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Failed to load orders');
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleSendItem = async () => {
    if (!selectedOrder || !itemDetails.trim()) {
      setError('Please select an order and enter item details');
      return;
    }

    try {
      setSendingItem(true);
      const response = await fetch('/api/admin/send-item', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Send cookies with request
        body: JSON.stringify({
          transactionId: selectedOrder.transactionId,
          itemContent: itemDetails,
        }),
      });

      if (!response.ok) throw new Error('Failed to send item');

      setSuccess(`✅ Item delivered to ${selectedOrder.buyerName}!`);
      setItemDetails('');
      setSelectedOrder(null);
      fetchOrders();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error sending item:', error);
      setError('Failed to send item');
    } finally {
      setSendingItem(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate required fields
    if (!formData.name || !formData.description || !formData.price || !formData.region || !formData.type) {
      setError('Please fill all required fields.');
      return;
    }

    // Validate price
    const priceNum = parseFloat(formData.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Please enter a valid price greater than 0.');
      return;
    }

    try {
      // Admin session is via httpOnly cookie, token not needed here
      const url = '/api/admin/products';
      const method = editingProduct ? 'PUT' : 'POST';

      console.log('[ADMIN] Submitting product:', { method, hasName: !!formData.name, hasPrice: !!formData.price });

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Send cookies with request
        body: JSON.stringify({
          ...(editingProduct && { id: editingProduct.id }),
          name: formData.name.trim(),
          description: formData.description.trim(),
          price: priceNum,
          region: formData.region.trim(),
          type: formData.type.trim(),
          size: formData.size ? formData.size.trim() : undefined,
          image: formData.image ? formData.image.trim() : undefined,
        }),
      });

      // Read response as text first
      const text = await response.text();
      
      if (!text) {
        setError('Empty response from server. Please try again.');
        return;
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        setError('Invalid response from server. Please try again.');
        return;
      }

      if (!response.ok) {
        setError(data.error || 'Failed to save product. Please check your input and try again.');
        return;
      }

      setSuccess(editingProduct ? 'Product updated successfully!' : 'Product created successfully!');
      setShowForm(false);
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        region: '',
        type: '',
        size: '',
        image: '',
      });
      
      // Refresh products list immediately
      await fetchProducts();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('[ADMIN] Submit error:', err);
      setError(err.message || 'Network error. Please check your connection and try again.');
    }
  };

  const handleWalletSave = async () => {
    setError('');
    setSuccess('');
    
    try {
      // Admin session is via httpOnly cookie, token not needed here

      console.log('[ADMIN] Saving wallets:', wallets);

      const response = await fetch('/api/admin/wallets', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Send cookies with request
        body: JSON.stringify(wallets),
      });

      // Read response as text first
      const text = await response.text();
      
      if (!text) {
        setError('Empty response from server. Please try again.');
        return;
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('[ADMIN] Failed to parse wallet response:', parseError);
        setError('Invalid response from server. Please try again.');
        return;
      }

      if (!response.ok) {
        setError(data.error || 'Failed to save wallets. Please check your input and try again.');
        return;
      }

      setSuccess('Wallet addresses updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('[ADMIN] Wallet save error:', err);
      setError(err.message || 'Network error. Please check your connection and try again.');
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      region: product.region,
      type: product.type,
      size: product.size || '',
      image: product.image || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/products?id=${id}`, {
        method: 'DELETE',
        credentials: 'include', // Send cookies with request
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to delete product');
        return;
      }

      setSuccess('Product deleted successfully!');
      fetchProducts();
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-100 via-purple-950 to-dark-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
          <p className="text-gray-300 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-100 via-purple-950 to-dark-200 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-400 mb-4">Access Denied</h1>
          <p className="text-gray-300 mb-6">{error || 'Admin privileges required'}</p>
          <Link href="/" className="text-purple-400 hover:text-purple-300 underline">
            Back to Marketplace
          </Link>
        </div>
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
              <Link
                href="/"
                className="text-gray-300 hover:text-purple-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Marketplace
              </Link>
              <button
                onClick={() => {
                  localStorage.removeItem('adminPassword');
                  router.push('/');
                }}
                className="text-gray-300 hover:text-red-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-100 mb-2">Admin Panel</h1>
          <p className="text-gray-400">Manage products and payment wallets</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-purple-800/30">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('products')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'products'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              Products
            </button>
            <button
              onClick={() => {
                setActiveTab('wallets');
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'wallets'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              Wallet Addresses
            </button>
            <button
              onClick={() => {
                setActiveTab('orders');
                fetchOrders();
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'orders'
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              Order Management
            </button>
          </nav>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-600 text-red-200 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-900/50 border border-green-600 text-green-200 px-4 py-3 rounded-lg mb-4">
            {success}
          </div>
        )}

        {activeTab === 'products' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-100">Products</h2>
              <button
                onClick={() => {
                  setShowForm(true);
                  setEditingProduct(null);
                  setFormData({
                    name: '',
                    description: '',
                    price: '',
                    region: '',
                    type: '',
                    size: '',
                    image: '',
                  });
                }}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-lg font-medium transition-all"
              >
                Add Product
              </button>
            </div>

            {showForm && (
              <div className="bg-dark-200/80 backdrop-blur-sm rounded-xl shadow-lg p-6 mb-8 border border-purple-800/30">
                <h2 className="text-xl font-bold mb-4 text-gray-100">
                  {editingProduct ? 'Edit Product' : 'Create New Product'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 bg-dark-100 border border-gray-600 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Price *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        className="w-full px-3 py-2 bg-dark-100 border border-gray-600 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Region *
                      </label>
                      <select
                        required
                        value={formData.region}
                        onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                        className="w-full px-3 py-2 bg-dark-100 border border-gray-600 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="">Select Region</option>
                        {regions.map((region) => (
                          <option key={region} value={region}>
                            {region}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Type (Item Name) *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        placeholder="Enter item type (e.g., Electronics, Clothing, Accessories)"
                        className="w-full px-3 py-2 bg-dark-100 border border-gray-600 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Pieces (Optional)
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={formData.size}
                        onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                        placeholder="Enter number of pieces"
                        className="w-full px-3 py-2 bg-dark-100 border border-gray-600 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Image URL
                      </label>
                      <input
                        type="url"
                        value={formData.image}
                        onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                        className="w-full px-3 py-2 bg-dark-100 border border-gray-600 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Description *
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 bg-dark-100 border border-gray-600 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        setEditingProduct(null);
                      }}
                      className="px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-dark-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all"
                    >
                      {editingProduct ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
              </div>
            ) : (
              <div className="bg-dark-200/80 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden border border-purple-800/30">
                <table className="min-w-full divide-y divide-purple-800/30">
                  <thead className="bg-dark-300/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Region
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Pieces
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-dark-200/50 divide-y divide-purple-800/30">
                    {products.map((product) => (
                      <tr key={product.id} className="hover:bg-dark-300/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-100">{product.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-300">${product.price.toFixed(2)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-300">{product.region}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-300">{product.type}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-300">{product.size ? `${product.size} pieces` : '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEdit(product)}
                            className="text-purple-400 hover:text-purple-300 mr-4"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {activeTab === 'wallets' && (
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-2xl p-8 border border-purple-700/30">
            <div className="mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent mb-2">
                ◆ Exodus Wallet Configuration
              </h2>
              <p className="text-gray-400">Configure receiving wallet addresses for 130+ cryptocurrencies</p>
            </div>
            
            {/* Search Bar */}
            <div className="mb-6">
              <input
                type="text"
                placeholder="🔍 Search cryptocurrency (name, symbol, or ID)..."
                value={walletSearchTerm}
                onChange={(e) => setWalletSearchTerm(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900/50 border border-purple-700/50 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Wallet Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[70vh] overflow-y-auto pr-2">
              {SUPPORTED_CRYPTOS.filter((crypto) => {
                const searchLower = walletSearchTerm.toLowerCase();
                return (
                  crypto.name.toLowerCase().includes(searchLower) ||
                  crypto.symbol.toLowerCase().includes(searchLower) ||
                  crypto.id.toLowerCase().includes(searchLower)
                );
              }).map((crypto) => (
                <div key={crypto.id} className="bg-slate-900/50 p-4 rounded-lg border border-purple-700/30 hover:border-purple-600/50 transition-colors">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{crypto.icon}</span>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-gray-100">{crypto.name}</h3>
                      <p className="text-xs text-gray-400">{crypto.symbol}</p>
                    </div>
                  </div>
                  
                  {/* Multi-Network Selector */}
                  {crypto.networks && crypto.networks.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs text-purple-300 font-semibold mb-2">Select Network:</p>
                      <div className="space-y-2">
                        {crypto.networks.map((network) => {
                          const walletKey = `${crypto.id}_${network.id}`;
                          return (
                            <div key={walletKey} className="bg-slate-800/50 p-2 rounded-lg border border-purple-600/30">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm">{network.icon}</span>
                                <label className="text-xs text-gray-300 font-medium">{network.name}</label>
                              </div>
                              <input
                                type="text"
                                value={wallets[walletKey] || ''}
                                onChange={(e) => setWallets({ ...wallets, [walletKey]: e.target.value })}
                                placeholder={`${crypto.symbol} on ${network.name}...`}
                                className="w-full px-2 py-1 bg-slate-700 border border-purple-600/30 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-xs"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    /* Single Network */
                    <div>
                      <input
                        type="text"
                        value={wallets[crypto.id] || ''}
                        onChange={(e) => setWallets({ ...wallets, [crypto.id]: e.target.value })}
                        placeholder={`Enter ${crypto.symbol} address...`}
                        className="w-full px-3 py-2 bg-slate-800 border border-purple-700/50 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-xs"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8 p-4 bg-slate-900/30 rounded-lg border border-purple-700/20">
              <p className="text-xs text-gray-500 text-center">
                Configured: <span className="text-purple-400 font-semibold">{Object.values(wallets).filter(v => v).length}</span> / <span className="text-gray-400">{SUPPORTED_CRYPTOS.length}</span> cryptocurrencies • All addresses are securely stored and used for payment processing only
              </p>
            </div>

            <div className="flex justify-end mt-8">
              <button
                onClick={handleWalletSave}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-purple-500/50"
              >
                ✓ Save All Configurations
              </button>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-2xl p-8 border border-purple-700/30">
            <div className="mb-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent mb-2">
                📦 Order Management
              </h2>
              <p className="text-gray-400">View paid orders and send items to buyers</p>
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2 mb-6">
              {[
                { label: `All (${orders.length})`, value: 'all' },
                { label: `💰 Paid (${orders.filter(o => o.status === 'paid').length})`, value: 'paid' },
                { label: `⏳ Pending (${orders.filter(o => o.status !== 'paid').length})`, value: 'pending' },
              ].map(filter => (
                <button
                  key={filter.value}
                  onClick={() => setOrderFilter(filter.value as any)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    orderFilter === filter.value
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Orders Table */}
            {loadingOrders ? (
              <div className="text-center py-12 text-gray-400">Loading orders...</div>
            ) : orders.filter(o => orderFilter === 'all' || o.status === orderFilter || (orderFilter === 'pending' && o.status !== 'paid')).length === 0 ? (
              <div className="text-center py-12 text-gray-400">No orders found</div>
            ) : (
              <div className="bg-slate-900/50 rounded-lg border border-purple-700/30 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-800/50 border-b border-purple-700/30">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Product</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Buyer</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Email</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Amount</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Status</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-700/20">
                    {orders.filter(o => orderFilter === 'all' || o.status === orderFilter || (orderFilter === 'pending' && o.status !== 'paid')).map(order => (
                      <tr key={order.transactionId} className="hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-200">{order.productName}</td>
                        <td className="px-6 py-4 text-sm text-gray-200">{order.buyerName}</td>
                        <td className="px-6 py-4 text-sm text-gray-300 text-xs font-mono">{order.buyerEmail}</td>
                        <td className="px-6 py-4 text-sm text-purple-400 font-semibold">
                          ${order.amount.toFixed(2)} {order.cryptocurrency.toUpperCase()}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            order.status === 'paid'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {order.status === 'paid' ? '💰 PAID' : '⏳ PENDING'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setItemDetails('');
                            }}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
                          >
                            📤 Send Item
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Send Item Modal - Opens when order selected */}
            {selectedOrder && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 mt-8">
                <div className="bg-slate-900 rounded-xl shadow-2xl border border-emerald-600/50 w-full max-w-2xl p-8">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-100">📤 Send Item</h3>
                      <p className="text-gray-400 text-sm mt-1">{selectedOrder.productName}</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedOrder(null);
                        setItemDetails('');
                      }}
                      className="text-gray-500 hover:text-gray-300 text-2xl"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Buyer Info */}
                  <div className="bg-slate-800/50 rounded-lg p-4 mb-6 border border-purple-700/30">
                    <h4 className="text-sm font-semibold text-gray-400 mb-3">BUYER INFORMATION</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">NAME</p>
                        <p className="text-gray-200">{selectedOrder.buyerName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">USERNAME</p>
                        <p className="text-gray-200">@{selectedOrder.buyerUsername}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500 mb-1">EMAIL</p>
                        <p className="text-gray-200 text-sm font-mono">{selectedOrder.buyerEmail}</p>
                      </div>
                    </div>
                  </div>

                  {/* Item Details Textarea */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Item Details / Credentials</label>
                    <textarea
                      value={itemDetails}
                      onChange={(e) => setItemDetails(e.target.value)}
                      placeholder="Enter item details, credentials, product keys, download links, setup instructions, etc."
                      className="w-full px-4 py-3 bg-slate-800 border border-purple-700/50 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none h-32 font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-2">{itemDetails.length} characters</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setSelectedOrder(null);
                        setItemDetails('');
                      }}
                      className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-gray-200 rounded-lg font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSendItem}
                      disabled={sendingItem || !itemDetails.trim()}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all"
                    >
                      {sendingItem ? '⏳ Sending...' : '✓ Send Item to Buyer'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
