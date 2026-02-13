'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
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

export default function ProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params?.id as string;
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedCrypto, setSelectedCrypto] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [error, setError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'completed'>('pending');
  const [quantity, setQuantity] = useState(1);
  const [user, setUser] = useState<{ balance?: number; trustScore?: number; recentDeposits?: number } | null>(null);
  const [showCryptoDropdown, setShowCryptoDropdown] = useState(false);
  const [cryptoSearchTerm, setCryptoSearchTerm] = useState('');
  const [showNetworkSelector, setShowNetworkSelector] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [showBalanceModal, setShowBalanceModal] = useState(false);

  useEffect(() => {
    if (productId) {
      fetchProduct();
    }
    fetchUserData();
  }, [productId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (showCryptoDropdown && !target.closest('.crypto-dropdown-container')) {
        setShowCryptoDropdown(false);
      }
    };

    if (showCryptoDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCryptoDropdown]);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        cache: 'no-store',
      });
      const data = await response.json();
      if (data.user) {
        setUser(data.user);
      }
    } catch (err) {
      console.error('[PRODUCT] Error fetching user data:', err);
    }
  };

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/products/${productId}`);
      const data = await response.json();
      setProduct(data.product);
      setQuantity(1); // Reset quantity when product changes
      setShowPayment(false); // Reset payment view
      setSelectedCrypto('');
      setWalletAddress('');
      setTransactionId('');
      setPaymentStatus('pending');
    } catch (error) {
      console.error('Error fetching product:', error);
      setError('Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyClick = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    setShowPayment(true);
  };

  const handleCryptoSelect = (cryptoId: string) => {
    // Find the crypto to check if it has multiple networks
    const crypto = SUPPORTED_CRYPTOS.find(c => c.id === cryptoId);
    
    if (crypto && crypto.networks && crypto.networks.length > 0) {
      // Show network selector
      setSelectedCrypto(cryptoId);
      setShowNetworkSelector(true);
      setShowCryptoDropdown(false);
    } else {
      // Single network or no network selection needed
      proceedWithPayment(cryptoId, '');
    }
  };

  const proceedWithPayment = async (cryptoId: string, network: string = '') => {
    setSelectedCrypto(cryptoId);
    setSelectedNetwork(network);
    setError('');
    setShowNetworkSelector(false);

    try {
      const token = localStorage.getItem('token');
      const paymentCrypto = network ? `${cryptoId}_${network}` : cryptoId;
      
      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId,
          cryptocurrency: paymentCrypto,
          quantity: quantity,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create payment');
        return;
      }

      setWalletAddress(data.walletAddress);
      setTransactionId(data.transactionId);
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  const handlePaymentConfirm = async () => {
    if (!transactionId) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/payment/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ transactionId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to confirm payment');
        return;
      }

      setPaymentStatus('paid');
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  const handleDeliveryConfirm = async () => {
    if (!transactionId) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/payment/confirm', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ transactionId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to confirm delivery');
        return;
      }

      setPaymentStatus('completed');
      alert('Transaction completed! Escrow released. Your deposit will be reflected in your balance.');
      
      // Redirect to dashboard to see updated balance and deposit indicator
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-100 via-purple-950 to-dark-200 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-100 via-purple-950 to-dark-200 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-100 mb-4">Product not found</h1>
          <button
            onClick={() => router.push('/')}
            className="text-purple-400 hover:text-purple-300"
          >
            Back to marketplace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-dark-100 via-purple-950 to-dark-200"
    >
      <nav className="bg-dark-200/80 backdrop-blur-sm border-b border-purple-800/50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center">
              <Link href="/" className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Russian Roulette
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              {/* Balance Badge - Transparency Indicator */}
              {user && (
                <BalanceBadge 
                  balance={user.balance || 0} 
                  trustScore={user.trustScore || 0}
                  recentDeposits={user.recentDeposits || 0}
                  onModalOpen={setShowBalanceModal}
                  showModal={showBalanceModal}
                />
              )}
              <button
                onClick={() => router.push('/')}
                className="text-gray-300 hover:text-purple-400 font-medium transition-colors"
              >
                ← Back to Marketplace
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ display: showBalanceModal ? 'none' : 'block' }}>
        <div className="bg-dark-200/80 backdrop-blur-sm rounded-xl shadow-lg overflow-visible border border-purple-800/30">
          {product.image && (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-64 object-cover"
            />
          )}
          <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-100 mb-4">{product.name}</h1>
            <p className="text-gray-300 mb-6">{product.description}</p>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <span className="text-sm text-gray-400">Price</span>
                <p className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  ${product.price.toFixed(2)}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-400">Region</span>
                <p className="text-lg font-semibold text-gray-100">{product.region}</p>
              </div>
              <div>
                <span className="text-sm text-gray-400">Type</span>
                <p className="text-lg font-semibold text-gray-100">{product.type}</p>
              </div>
              {product.size && (
                <div>
                  <span className="text-sm text-gray-400">Pieces Available</span>
                  <p className="text-lg font-semibold text-gray-100">{product.size} pieces</p>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-900/50 border border-red-600 text-red-200 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            {!showPayment ? (
              <div>
                {product.size && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Quantity (Available: {product.size} pieces)
                    </label>
                    <div className="flex items-center space-x-4">
                      <button
                        type="button"
                        onClick={() => {
                          const maxQty = parseInt(product.size || '1');
                          if (quantity > 1) {
                            setQuantity(quantity - 1);
                          }
                        }}
                        disabled={quantity <= 1}
                        className="px-4 py-2 bg-dark-100 border border-gray-600 text-gray-100 rounded-lg hover:bg-dark-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={product.size || undefined}
                        value={quantity}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 1;
                          const maxQty = product.size ? parseInt(product.size) : undefined;
                          if (maxQty && value > maxQty) {
                            setQuantity(maxQty);
                          } else if (value >= 1) {
                            setQuantity(value);
                          }
                        }}
                        className="w-20 px-3 py-2 bg-dark-100 border border-gray-600 text-gray-100 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const maxQty = parseInt(product.size || '999999');
                          if (quantity < maxQty) {
                            setQuantity(quantity + 1);
                          }
                        }}
                        disabled={product.size ? quantity >= parseInt(product.size) : false}
                        className="px-4 py-2 bg-dark-100 border border-gray-600 text-gray-100 rounded-lg hover:bg-dark-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        +
                      </button>
                      <span className="text-gray-400 text-sm">
                        Total: ${(product.price * quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
                <button
                  onClick={handleBuyClick}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition-all"
                >
                  Buy Now {quantity > 1 && `(${quantity} pieces)`}
                </button>
              </div>
            ) : (
              <div className="border-t border-purple-800/30 pt-6">
                {/* Network Selector Modal */}
                {showNetworkSelector && selectedCrypto && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-2xl p-8 border border-purple-700/30 max-w-md w-full">
                      <h3 className="text-2xl font-bold text-gray-100 mb-2">Select Network</h3>
                      <p className="text-gray-400 mb-6">
                        {SUPPORTED_CRYPTOS.find(c => c.id === selectedCrypto)?.name} is available on multiple networks. Select which network to use:
                      </p>
                      
                      <div className="grid grid-cols-1 gap-3">
                        {SUPPORTED_CRYPTOS.find(c => c.id === selectedCrypto)?.networks?.map((network) => (
                          <button
                            key={network.id}
                            onClick={() => proceedWithPayment(selectedCrypto, network.id)}
                            className="p-4 bg-gradient-to-r from-purple-600/20 to-pink-600/20 hover:from-purple-600/40 hover:to-pink-600/40 border border-purple-600/50 hover:border-purple-500 rounded-lg transition-all text-left group"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{network.icon}</span>
                              <div>
                                <p className="font-semibold text-gray-100 group-hover:text-gray-50">{network.name}</p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() => {
                          setShowNetworkSelector(false);
                          setSelectedCrypto('');
                          setSelectedNetwork('');
                        }}
                        className="w-full mt-6 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded-lg transition-colors text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {!selectedCrypto ? (
                  <div>
                    <h2 className="text-2xl font-bold mb-6 text-gray-100">Complete Your Purchase</h2>
                    
                    <div className="relative z-50 crypto-dropdown-container">
                      {/* Buy Now Button - Opens Dropdown */}
                      <button
                        onClick={() => {
                          setShowCryptoDropdown(!showCryptoDropdown);
                          if (showCryptoDropdown) {
                            setCryptoSearchTerm('');
                          }
                        }}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition-all shadow-lg"
                      >
                        💳 Buy Now
                      </button>

                      {/* Cryptocurrency Dropdown Menu */}
                      {showCryptoDropdown && (
                        <div className="absolute left-0 right-0 top-full mt-2 bg-slate-950 border-2 border-purple-700/50 rounded-lg shadow-2xl overflow-hidden max-h-[70vh]">
                          {/* Dropdown Header with Search */}
                          <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 px-4 py-3 border-b border-purple-700/30 sticky top-0 z-10 space-y-2">
                            <p className="text-xs font-semibold text-purple-200">💰 SELECT PAYMENT CURRENCY</p>
                            <input
                              type="text"
                              placeholder="🔍 Search coin or token (name, symbol)..."
                              value={cryptoSearchTerm}
                              onChange={(e) => setCryptoSearchTerm(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-800 border border-purple-600/30 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs"
                            />
                            <p className="text-[10px] text-gray-400">Sorted by Popularity</p>
                          </div>

                          {/* Crypto Options Grid - Scrollable */}
                          <div className="p-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 overflow-y-auto max-h-[calc(70vh-120px)]">
                            {/* Dynamic Crypto Buttons - Filtered */}
                            {SUPPORTED_CRYPTOS.filter((crypto) => {
                              const searchLower = cryptoSearchTerm.toLowerCase();
                              return (
                                crypto.name.toLowerCase().includes(searchLower) ||
                                crypto.symbol.toLowerCase().includes(searchLower) ||
                                crypto.id.toLowerCase().includes(searchLower)
                              );
                            }).map((crypto) => {
                              const colorMap: { [key: string]: string } = {
                                'orange': 'from-orange-500/20 to-orange-600/20 hover:from-orange-500/40 hover:to-orange-600/40 border-orange-600/50 hover:border-orange-500',
                                'blue': 'from-blue-500/20 to-blue-600/20 hover:from-blue-500/40 hover:to-blue-600/40 border-blue-600/50 hover:border-blue-500',
                                'green': 'from-green-500/20 to-green-600/20 hover:from-green-500/40 hover:to-green-600/40 border-green-600/50 hover:border-green-500',
                                'yellow': 'from-yellow-500/20 to-yellow-600/20 hover:from-yellow-500/40 hover:to-yellow-600/40 border-yellow-600/50 hover:border-yellow-500',
                                'cyan': 'from-cyan-500/20 to-cyan-600/20 hover:from-cyan-500/40 hover:to-cyan-600/40 border-cyan-600/50 hover:border-cyan-500',
                                'purple': 'from-purple-500/20 to-purple-600/20 hover:from-purple-500/40 hover:to-purple-600/40 border-purple-600/50 hover:border-purple-500',
                                'pink': 'from-pink-500/20 to-pink-600/20 hover:from-pink-500/40 hover:to-pink-600/40 border-pink-600/50 hover:border-pink-500',
                                'indigo': 'from-indigo-500/20 to-indigo-600/20 hover:from-indigo-500/40 hover:to-indigo-600/40 border-indigo-600/50 hover:border-indigo-500',
                                'red': 'from-red-500/20 to-red-600/20 hover:from-red-500/40 hover:to-red-600/40 border-red-600/50 hover:border-red-500',
                                'gray': 'from-gray-400/20 to-gray-500/20 hover:from-gray-400/40 hover:to-gray-500/40 border-gray-500/50 hover:border-gray-400',
                                'sky': 'from-sky-500/20 to-sky-600/20 hover:from-sky-500/40 hover:to-sky-600/40 border-sky-600/50 hover:border-sky-500',
                                'emerald': 'from-emerald-500/20 to-emerald-600/20 hover:from-emerald-500/40 hover:to-emerald-600/40 border-emerald-600/50 hover:border-emerald-500',
                                'amber': 'from-amber-500/20 to-amber-600/20 hover:from-amber-500/40 hover:to-amber-600/40 border-amber-600/50 hover:border-amber-500',
                                'teal': 'from-teal-500/20 to-teal-600/20 hover:from-teal-500/40 hover:to-teal-600/40 border-teal-600/50 hover:border-teal-500',
                                'black': 'from-gray-700/20 to-gray-800/20 hover:from-gray-700/40 hover:to-gray-800/40 border-gray-800/50 hover:border-gray-700',
                                'white': 'from-gray-300/20 to-gray-400/20 hover:from-gray-300/40 hover:to-gray-400/40 border-gray-400/50 hover:border-gray-300',
                              };
                              const colorClass = colorMap[crypto.color] || colorMap['purple'];
                              return (
                                <button
                                  key={crypto.id}
                                  onClick={() => {
                                    handleCryptoSelect(crypto.id);
                                    setShowCryptoDropdown(false);
                                  }}
                                  className={`p-2 bg-gradient-to-br ${colorClass} border rounded-lg transition-all text-center group`}
                                  title={crypto.name}
                                >
                                  <div className="text-2xl mb-1">{crypto.icon}</div>
                                  <div className="text-[10px] font-bold text-gray-100 group-hover:text-gray-50">{crypto.symbol}</div>
                                </button>
                              );
                            })}
                          
                          </div>

                          {/* Dropdown Footer */}
                          <div className="px-4 py-3 border-t border-purple-700/30 bg-slate-950/50">
                            <p className="text-xs text-gray-500 text-center flex items-center justify-center gap-2">
                              🔒 <span>Secure Escrow Payment Active</span>
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : walletAddress ? (
                  <div>
                    <div className="flex items-center gap-2 mb-6">
                      <button
                        onClick={() => {
                          setSelectedCrypto('');
                          setWalletAddress('');
                        }}
                        className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-gray-300 rounded-lg transition-colors"
                      >
                        ← Change Method
                      </button>
                      <h2 className="text-2xl font-bold text-gray-100">Payment Instructions</h2>
                    </div>
                    
                    <div className="bg-gradient-to-br from-slate-800 to-slate-700 p-6 rounded-xl mb-6 border border-purple-700/30 shadow-lg">
                      <p className="text-xs text-purple-300 font-semibold mb-3 uppercase tracking-widest">◆ Send Payment To</p>
                      <div className="bg-slate-900/50 p-4 rounded-lg mb-4 border border-purple-700/50 backdrop-blur-sm">
                        <p className="font-mono text-sm text-purple-300 break-all leading-relaxed">
                          {walletAddress}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(walletAddress);
                          alert('Wallet address copied to clipboard!');
                        }}
                        className="w-full px-3 py-2 text-xs bg-purple-600/50 hover:bg-purple-600/70 text-purple-200 rounded-lg transition-colors font-medium"
                      >
                        📋 Copy Address
                      </button>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-900/30 to-emerald-800/30 p-4 rounded-lg mb-6 border border-emerald-700/50">
                      <p className="text-xs text-emerald-300 font-semibold mb-2 flex items-center gap-2">
                        🔒 Escrow Protection Active
                      </p>
                      <p className="text-xs text-emerald-200">
                        Your funds are protected by our escrow system. Once payment is confirmed and item is delivered, funds will be released to seller.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                        <p className="text-xs text-gray-400 uppercase mb-1 tracking-wider">Quantity</p>
                        <p className="text-lg font-bold text-gray-100">{quantity} {quantity === 1 ? 'piece' : 'pieces'}</p>
                      </div>
                      <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                        <p className="text-xs text-gray-400 uppercase mb-1 tracking-wider">Total USD</p>
                        <p className="text-lg font-bold text-purple-300">${(product.price * quantity).toFixed(2)}</p>
                      </div>
                    </div>

                    {/* Token Amount Display */}
                    <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 p-4 rounded-lg mb-6 border border-purple-700/50">
                      <div className="flex items-center gap-2 mb-3">
                        <p className="text-xs text-purple-300 font-semibold uppercase tracking-widest">💰 Payment Amount in {selectedCrypto.toUpperCase()}</p>
                        {selectedNetwork && (
                          <span className="ml-auto text-xs bg-purple-600/50 text-purple-200 px-2 py-1 rounded">
                            {SUPPORTED_CRYPTOS.find(c => c.id === selectedCrypto)?.networks?.find(n => n.id === selectedNetwork)?.name}
                          </span>
                        )}
                      </div>
                      <div className="bg-slate-900/50 p-4 rounded-lg border border-purple-700/50 backdrop-blur-sm">
                        <p className="text-2xl font-bold text-purple-200">
                          {(() => {
                            // Mock exchange rates (in production, fetch from API)
                            const rates: { [key: string]: number } = {
                              'bitcoin': 0.0000285,
                              'ethereum': 0.000475,
                              'tether': 1.0,
                              'bnb': 0.00168,
                              'xrp': 2.47,
                              'solana': 0.000525,
                              'usdc': 1.0,
                              'cardano': 0.69,
                              'dogecoin': 23.8,
                              'polygon': 0.42,
                              'polkadot': 0.0335,
                              'litecoin': 0.000268,
                              'bitcoin-cash': 0.000893,
                              'chainlink': 0.0105,
                              'arbitrum': 0.0385,
                              'avalanche': 0.000595,
                              'uniswap': 0.0128,
                              'tron': 0.0315,
                              'steth': 0.000475,
                              'wbtc': 0.0000285,
                              'monero': 0.00197,
                              'cosmos': 0.108,
                              'optimism': 0.0312,
                              'zcash': 0.00325,
                              'aave': 0.00428,
                              'compound': 0.00693,
                              'maker': 0.000985,
                              'curve': 0.206,
                              'dai': 1.0,
                              'busd': 1.0,
                            };
                            const rate = rates[selectedCrypto] || 1;
                            const tokenAmount = (product.price * quantity) / (1 / rate);
                            return `${tokenAmount.toFixed(8)} ${SUPPORTED_CRYPTOS.find(c => c.id === selectedCrypto)?.symbol || selectedCrypto.toUpperCase()}`;
                          })()}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          Equivalent of ${(product.price * quantity).toFixed(2)} USD
                        </p>
                      </div>
                    </div>
                    
                    {paymentStatus === 'pending' && (
                      <button
                        onClick={handlePaymentConfirm}
                        className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg"
                      >
                        ✓ Confirm Payment Sent
                      </button>
                    )}
                    
                    {paymentStatus === 'paid' && (
                      <div className="bg-yellow-900/50 border border-yellow-600 p-4 rounded-lg mb-4">
                        <p className="text-yellow-200">
                          Payment received! Waiting for delivery confirmation. Once you receive the item, click below to release escrow.
                        </p>
                      </div>
                    )}
                    
                    {paymentStatus === 'paid' && (
                      <button
                        onClick={handleDeliveryConfirm}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-lg transition-all"
                      >
                        Confirm Delivery & Release Escrow
                      </button>
                    )}
                    
                    {paymentStatus === 'completed' && (
                      <div className="bg-green-900/50 border border-green-600 p-4 rounded-lg">
                        <p className="text-green-200 font-semibold">
                          ✓ Transaction completed! Escrow has been released.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                    <p className="mt-2 text-gray-400">Loading payment details...</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

