'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockTimer, setBlockTimer] = useState(0);

  // Verify password on the server instead of client
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isBlocked) {
      setError(`Too many failed attempts. Please try again in ${blockTimer} seconds.`);
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Call a verification API instead of checking locally
      console.log('[ADMIN-LOGIN] Sending password to verify API');
      const response = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      console.log('[ADMIN-LOGIN] Response status:', response.status);
      const data = await response.json();
      console.log('[ADMIN-LOGIN] Response data:', data);

      if (response.ok && data.success) {
        console.log('[ADMIN-LOGIN] SUCCESS - Redirecting to admin');
        // Successful login - clear failed attempts
        localStorage.removeItem('adminFailedAttempts');
        localStorage.removeItem('adminBlocked');
        localStorage.removeItem('adminBlockTime');
        localStorage.setItem('adminPassword', password);
        // Set a dummy token for admin access
        localStorage.setItem('token', 'admin-token-' + Date.now());
        router.push('/admin');
      } else {
        console.log('[ADMIN-LOGIN] FAILED - Invalid password response');
        // Failed attempt
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        localStorage.setItem('adminFailedAttempts', newAttempts.toString());

        const MAX_ATTEMPTS = 3;
        if (newAttempts >= MAX_ATTEMPTS) {
          // Block access
          const BLOCK_DURATION = 300;
          const blockUntil = Date.now() + BLOCK_DURATION * 1000;
          localStorage.setItem('adminBlocked', 'true');
          localStorage.setItem('adminBlockTime', blockUntil.toString());
          setIsBlocked(true);
          setBlockTimer(BLOCK_DURATION);
          setError(`❌ Access blocked after ${MAX_ATTEMPTS} failed attempts. You have been redirected to user access. Try again in ${BLOCK_DURATION} seconds.`);
          
          // Auto redirect to user after 3 seconds
          setTimeout(() => {
            router.push('/');
          }, 3000);
        } else {
          setError(`Invalid password. ${MAX_ATTEMPTS - newAttempts} attempt${MAX_ATTEMPTS - newAttempts !== 1 ? 's' : ''} remaining.`);
        }
      }
    } catch (err) {
      console.error('[ADMIN-LOGIN] Catch error:', err);
      setError('Login failed - server error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check if user is blocked on mount
    const blocked = localStorage.getItem('adminBlocked');
    const blockTime = localStorage.getItem('adminBlockTime');
    
    if (blocked && blockTime) {
      const now = Date.now();
      const remainingTime = Math.ceil((parseInt(blockTime) - now) / 1000);
      
      if (remainingTime > 0) {
        setIsBlocked(true);
        setBlockTimer(remainingTime);
        setError(`Too many failed attempts. Please try again in ${remainingTime} seconds.`);
        
        const interval = setInterval(() => {
          setBlockTimer(prev => {
            if (prev <= 1) {
              clearInterval(interval);
              setIsBlocked(false);
              localStorage.removeItem('adminBlocked');
              localStorage.removeItem('adminBlockTime');
              localStorage.removeItem('adminFailedAttempts');
              setFailedAttempts(0);
              setError('');
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        return () => clearInterval(interval);
      } else {
        localStorage.removeItem('adminBlocked');
        localStorage.removeItem('adminBlockTime');
        localStorage.removeItem('adminFailedAttempts');
        setFailedAttempts(0);
        setIsBlocked(false);
      }
    } else {
      const stored = localStorage.getItem('adminFailedAttempts');
      if (stored) {
        setFailedAttempts(parseInt(stored));
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('adminPassword');
    localStorage.removeItem('token');
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            Russian Roulette
          </h1>
          <p className="text-slate-400">Admin Access</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-8 backdrop-blur-sm">
          <div className="mb-6">
            <label className="block text-slate-300 font-medium mb-2">
              Admin Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              disabled={loading}
              autoFocus
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-slate-600 disabled:to-slate-600 text-white rounded-lg font-medium transition-all"
          >
            {loading ? 'Authenticating...' : 'Access Admin Panel'}
          </button>

          <button
            type="button"
            onClick={() => router.push('/')}
            className="w-full mt-3 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg font-medium transition-all"
          >
            Back to Home
          </button>
        </form>

        {/* Info */}
        <div className="mt-8 text-center">
          <p className="text-slate-400 text-sm">
            🔐 Admin access is password protected
          </p>
        </div>
      </div>
    </div>
  );
}
