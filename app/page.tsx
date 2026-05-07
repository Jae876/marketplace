'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BalanceBadge from '@/components/BalanceBadge';
import ChatBot from '@/components/ChatBot';

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
}

export default function HomePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    setToken(storedToken);
    
    // Load dark mode preference from localStorage
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode !== null) {
      setDarkMode(JSON.parse(savedDarkMode));
    }
    
    fetchProducts();
    if (storedToken) {
      fetchUserProfile();
    }
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.user) {
        setUser(data.user);
      }
    } catch (err) {
      console.error('[HOME] Error fetching user profile:', err);
    }
  };

  const fetchProducts = async (query = '') => {
    try {
      setLoading(true);
      const url = new URL('/api/products', window.location.origin);
      if (query.trim()) {
        url.searchParams.append('search', query.trim());
      }
      
      const response = await fetch(url.toString(), {
        cache: 'no-store',
      });
      
      const text = await response.text();
      if (!text) {
        console.error('[HOME] Empty response from products API');
        setProducts([]);
        return;
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('[HOME] Failed to parse products response:', parseError);
        setProducts([]);
        return;
      }

      console.log('[HOME] Products fetched:', data.products?.length || 0);
      setProducts(data.products || []);
    } catch (error) {
      console.error('[HOME] Error fetching products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSearching(true);
    await fetchProducts(searchQuery);
    setIsSearching(false);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearching(true);
    fetchProducts('').then(() => setIsSearching(false));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    router.push('/login');
  };

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', JSON.stringify(newDarkMode));
  };

  return (
    <div className={darkMode ? "min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-black relative overflow-hidden" : "min-h-screen bg-gradient-to-br from-white via-gray-50 to-blue-50 relative overflow-hidden"}>
      {darkMode && (
        <>
          {/* Dark mode: Mysterious background elements */}
          <div className="fixed inset-0 opacity-30 pointer-events-none">
            <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
            <div className="absolute top-0 -right-4 w-72 h-72 bg-red-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
          </div>

          {/* Dark mode: Background image overlay */}
          <div 
            className="fixed inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: `url('data:image/svg+xml,%3Csvg width="100" height="100" xmlns="http://www.w3.org/2000/svg"%3E%3Cdefs%3E%3Cpattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"%3E%3Cpath d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(168,85,247,0.5)" stroke-width="0.5"/%3E%3C/pattern%3E%3C/defs%3E%3Crect width="100" height="100" fill="url(%23grid)" /%3E%3C/svg%3E')`,
              backgroundSize: '100px 100px'
            }}
          ></div>
        </>
      )}

      <nav className={`relative z-50 backdrop-blur-md border-b shadow-xl ${
        darkMode 
          ? 'bg-slate-900/80 border-purple-800/30' 
          : 'bg-white/80 border-blue-200/50'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 via-purple-400 to-pink-400 bg-clip-text text-transparent tracking-wider">
                ◇ Russian Roulette ◇
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                className={`p-2 rounded-lg transition-all ${
                  darkMode
                    ? 'bg-slate-800 hover:bg-slate-700 text-yellow-300'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                {darkMode ? '☀️' : '🌙'}
              </button>

              {token ? (
                <>
                  {/* Balance Badge - Transparency Indicator */}
                  {user && (user.balance !== undefined) && (
                    <BalanceBadge 
                      balance={user.balance || 0} 
                      trustScore={user.trustScore || 0} 
                    />
                  )}
                  <Link
                    href="/dashboard"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      darkMode
                        ? 'text-gray-300 hover:text-purple-400'
                        : 'text-gray-700 hover:text-blue-600'
                    }`}
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors text-white ${
                      darkMode
                        ? 'bg-purple-600 hover:bg-purple-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      darkMode
                        ? 'text-gray-300 hover:text-purple-400'
                        : 'text-gray-700 hover:text-blue-600'
                    }`}
                  >
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    className={`text-white px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      darkMode
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                        : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700'
                    }`}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h2 className={`text-5xl font-bold mb-4 ${
            darkMode
              ? 'bg-gradient-to-r from-red-300 via-purple-300 to-pink-300 bg-clip-text text-transparent'
              : 'text-gray-800'
          }`}>
            Welcome to Russian Roulette
          </h2>
          <p className={`text-xl font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Premium Marketplace Experience
          </p>
          <p className={darkMode ? 'text-gray-400 mb-8' : 'text-gray-600 mb-8'}>
            Discover exclusive items and opportunities in our marketplace
          </p>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for products... (name, description, region, type)"
                className={`w-full px-6 py-4 pl-12 rounded-xl focus:outline-none focus:ring-2 transition-all backdrop-blur-sm ${
                  darkMode
                    ? 'bg-slate-800/80 border border-purple-500/40 text-gray-100 placeholder-gray-500 focus:border-purple-500 focus:ring-purple-500/20'
                    : 'bg-white/80 border border-blue-300/50 text-gray-800 placeholder-gray-600 focus:border-blue-500 focus:ring-blue-500/20'
                }`}
              />
              <button
                type="submit"
                disabled={isSearching || loading}
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 disabled:opacity-50 transition-colors ${
                  darkMode
                    ? 'text-purple-400 hover:text-purple-300'
                    : 'text-blue-500 hover:text-blue-600'
                }`}
                title="Search"
              >
                {isSearching ? (
                  <div className={`inline-block animate-spin rounded-full w-5 h-5 border-b-2 ${darkMode ? 'border-purple-400' : 'border-blue-500'}`}></div>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
              </button>
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className={`absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors ${
                    darkMode
                      ? 'text-gray-500 hover:text-gray-400'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                  title="Clear search"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <p className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
              💡 Tip: Search by product name, description, region, or type for best results
            </p>
          </form>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className={`inline-block animate-spin rounded-full h-12 w-12 border-b-2 ${
              darkMode ? 'border-purple-500' : 'border-blue-500'
            }`}></div>
            <p className={`mt-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            {searchQuery ? (
              <>
                <p className={darkMode ? 'text-gray-400 mb-2' : 'text-gray-600 mb-2'}>No products found matching "{searchQuery}"</p>
                <button
                  onClick={handleClearSearch}
                  className={`underline transition-colors text-sm ${
                    darkMode
                      ? 'text-purple-400 hover:text-purple-300'
                      : 'text-blue-600 hover:text-blue-700'
                  }`}
                >
                  Clear search to see all products
                </button>
              </>
            ) : (
              <>
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>No products available. Check back later!</p>
                {!token && (
                  <div className="mt-6">
                    <Link
                      href="/signup"
                      className={`px-6 py-3 rounded-lg text-sm font-medium transition-all inline-block text-white ${
                        darkMode
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                          : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700'
                      }`}
                    >
                      Sign Up to Browse Products
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <>
            {searchQuery && (
              <div className="mb-4 flex items-center justify-between">
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Found <span className={`font-semibold ${darkMode ? 'text-purple-300' : 'text-blue-600'}`}>{products.length}</span> product{products.length !== 1 ? 's' : ''} matching "{searchQuery}"
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(searchQuery ? products : products.slice(0, 6)).map((product) => (
                <Link
                  key={product.id}
                  href={token ? `/product/${product.id}` : '/login'}
                  className={`rounded-xl shadow-2xl overflow-hidden hover:scale-105 transition-all border group ${
                    darkMode
                      ? 'bg-slate-800/60 backdrop-blur-md hover:shadow-red-500/20 border-purple-700/40 hover:border-red-500/60'
                      : 'bg-white/60 backdrop-blur-md hover:shadow-blue-500/20 border-blue-300/40 hover:border-blue-500/60'
                  }`}
                >
                  {product.image && (
                    <div className="relative overflow-hidden h-48">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className={`absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent ${darkMode ? 'opacity-60' : 'opacity-30'}`}></div>
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                      {product.name}
                    </h3>
                    <p className={`text-sm mb-4 line-clamp-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {product.description}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        ${product.price.toFixed(2)}
                      </span>
                      <div className="text-sm">
                        <span className={`px-2 py-1 rounded ${
                          darkMode
                            ? 'bg-purple-600/30 text-purple-300'
                            : 'bg-blue-200/50 text-blue-700'
                        }`}>
                          {product.region}
                        </span>
                      </div>
                    </div>
                    {product.type && (
                      <div className="mt-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          darkMode
                            ? 'text-gray-400 bg-gray-700'
                            : 'text-gray-600 bg-gray-300'
                        }`}>
                          {product.type}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Footer with Copyright and Organization Info */}
      <footer className={`relative z-20 border-t backdrop-blur-md mt-16 py-12 ${
        darkMode
          ? 'border-purple-800/30 bg-slate-900/80'
          : 'border-blue-200/50 bg-white/80'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-bold bg-gradient-to-r from-red-400 to-purple-400 bg-clip-text text-transparent mb-4">
                Russian Roulette
              </h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                A premium marketplace for exclusive items. Experience trading with elegance and precision.
              </p>
            </div>
            <div>
              <h4 className={`text-sm font-semibold mb-4 ${darkMode ? 'text-purple-300' : 'text-blue-600'}`}>Quick Links</h4>
              <ul className={`space-y-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <li><a href="#" className={`transition-colors ${darkMode ? 'hover:text-purple-400' : 'hover:text-blue-600'}`}>About Us</a></li>
                <li><a href="#" className={`transition-colors ${darkMode ? 'hover:text-purple-400' : 'hover:text-blue-600'}`}>Privacy Policy</a></li>
                <li><a href="#" className={`transition-colors ${darkMode ? 'hover:text-purple-400' : 'hover:text-blue-600'}`}>Terms of Service</a></li>
                <li><a href="#" className={`transition-colors ${darkMode ? 'hover:text-purple-400' : 'hover:text-blue-600'}`}>Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className={`text-sm font-semibold mb-4 ${darkMode ? 'text-purple-300' : 'text-blue-600'}`}>Organization</h4>
              <p className={`text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <strong>Russian Roulette Inc.</strong>
              </p>
              <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                A premier digital marketplace committed to excellence and security.
              </p>
            </div>
          </div>
          
          <div className={`border-t pt-8 text-center ${darkMode ? 'border-purple-800/30' : 'border-blue-200/50'}`}>
            <p className={`text-sm mb-2 ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
              © 2026 Russian Roulette. All rights reserved.
            </p>
            <p className={`text-xs ${darkMode ? 'text-gray-600' : 'text-gray-700'}`}>
              Designed with elegance, user safety, and precision. Secure. Exclusive. Premium.
            </p>
          </div>
        </div>
      </footer>

      {/* Chat Bot Widget */}
      <ChatBot />
    </div>
  );
}
