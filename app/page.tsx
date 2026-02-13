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

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    setToken(storedToken);
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

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/products', {
        cache: 'no-store', // Prevent caching
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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-black relative overflow-hidden">
      {/* Mysterious background elements */}
      <div className="fixed inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-red-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      {/* Background image overlay */}
      <div 
        className="fixed inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `url('data:image/svg+xml,%3Csvg width="100" height="100" xmlns="http://www.w3.org/2000/svg"%3E%3Cdefs%3E%3Cpattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"%3E%3Cpath d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(168,85,247,0.5)" stroke-width="0.5"/%3E%3C/pattern%3E%3C/defs%3E%3Crect width="100" height="100" fill="url(%23grid)" /%3E%3C/svg%3E')`,
          backgroundSize: '100px 100px'
        }}
      ></div>

      <nav className="relative z-50 bg-slate-900/80 backdrop-blur-md border-b border-purple-800/30 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 via-purple-400 to-pink-400 bg-clip-text text-transparent tracking-wider">
                ◇ Russian Roulette ◇
              </h1>
            </div>
            <div className="flex items-center space-x-4">
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
                    className="text-gray-300 hover:text-purple-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-gray-300 hover:text-purple-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-all"
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
          <h2 className="text-5xl font-bold bg-gradient-to-r from-red-300 via-purple-300 to-pink-300 bg-clip-text text-transparent mb-4">
            Welcome to Russian Roulette
          </h2>
          <p className="text-xl text-gray-300 mb-2">Premium Marketplace Experience</p>
          <p className="text-gray-400">Discover exclusive items and opportunities in our marketplace</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">No products available. Check back later!</p>
            {!token && (
              <div className="mt-6">
                <Link
                  href="/signup"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-lg text-sm font-medium transition-all inline-block"
                >
                  Sign Up to Browse Products
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.slice(0, 6).map((product) => (
              <Link
                key={product.id}
                href={token ? `/product/${product.id}` : '/login'}
                className="bg-slate-800/60 backdrop-blur-md rounded-xl shadow-2xl overflow-hidden hover:shadow-red-500/20 hover:scale-105 transition-all border border-purple-700/40 hover:border-red-500/60 group"
              >
                {product.image && (
                  <div className="relative overflow-hidden h-48">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
                  </div>
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
                  {product.type && (
                    <div className="mt-2">
                      <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
                        {product.type}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Footer with Copyright and Organization Info */}
      <footer className="relative z-20 border-t border-purple-800/30 bg-slate-900/80 backdrop-blur-md mt-16 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-bold bg-gradient-to-r from-red-400 to-purple-400 bg-clip-text text-transparent mb-4">
                Russian Roulette
              </h3>
              <p className="text-gray-400 text-sm">
                A premium marketplace for exclusive items. Experience trading with elegance and precision.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-purple-300 mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-purple-400 transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-purple-400 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-purple-400 transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-purple-400 transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-purple-300 mb-4">Organization</h4>
              <p className="text-gray-400 text-sm mb-2">
                <strong>Russian Roulette Inc.</strong>
              </p>
              <p className="text-gray-500 text-xs">
                A premier digital marketplace committed to excellence and security.
              </p>
            </div>
          </div>
          
          <div className="border-t border-purple-800/30 pt-8 text-center">
            <p className="text-gray-500 text-sm mb-2">
              © 2026 Russian Roulette. All rights reserved.
            </p>
            <p className="text-gray-600 text-xs">
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
