'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    securityPhrase: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [availableWords, setAvailableWords] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Initialize puzzle words when component mounts
  React.useEffect(() => {
    const words = ['apple', 'banana', 'cherry', 'dragon', 'elephant', 'forest', 'galaxy', 'horizon'];
    setAvailableWords(words.sort(() => Math.random() - 0.5));
  }, []);

  const handleWordClick = (word: string) => {
    if (selectedWords.length < 4 && !selectedWords.includes(word)) {
      setSelectedWords([...selectedWords, word]);
    }
  };

  const handleRemoveWord = (index: number) => {
    setSelectedWords(selectedWords.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (selectedWords.length !== 4) {
      setError('Please select exactly 4 words for your security phrase');
      return;
    }

    const securityPhrase = selectedWords.join(' ');

    setLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          securityPhrase,
        }),
      });

      // Read response as text first
      const text = await response.text();
      
      // Check if response is empty
      if (!text) {
        setError('Empty response from server. Please try again.');
        setLoading(false);
        return;
      }

      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        setError('Invalid response from server. Please try again.');
        setLoading(false);
        return;
      }

      if (!response.ok) {
        setError(data.error || 'Signup failed. Please check your information and try again.');
        setLoading(false);
        return;
      }

      if (!data.token || !data.userId) {
        setError('Invalid response data. Please try again.');
        setLoading(false);
        return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.userId);
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'Network error. Please check your connection and try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dark-100 via-purple-950 to-dark-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-dark-200/90 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-purple-800/50">
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            Russian Roulette
          </h1>
          <h2 className="mt-6 text-2xl font-extrabold text-gray-100">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Join our marketplace platform
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-900/50 border border-red-600 text-red-200 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-3 py-2 bg-dark-100 border border-gray-600 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-3 py-2 bg-dark-100 border border-gray-600 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Doe"
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
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-3 py-2 bg-dark-100 border border-gray-600 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="johndoe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Email address *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-dark-100 border border-gray-600 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="john@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 pr-10 bg-dark-100 border border-gray-600 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                      <path d="M15.171 11.586a4 4 0 111.414-1.414l1.473 1.473a1 1 0 001.414 1.414l14-14a1 1 0 00-1.414-1.414l1.473-1.473a1 1 0 001.414 1.414l14 14a1 1 0 00-1.414-1.414z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Security Phrase (Select 4 words) *
              </label>
              <div className="bg-dark-100 rounded-lg p-4 mb-3 min-h-[80px] border border-gray-600">
                {selectedWords.length === 0 ? (
                  <p className="text-gray-500 text-sm">Select words below...</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedWords.map((word, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 bg-purple-600 text-white rounded-lg text-sm"
                      >
                        {word}
                        <button
                          type="button"
                          onClick={() => handleRemoveWord(index)}
                          className="ml-2 text-purple-200 hover:text-white"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {availableWords.map((word) => (
                  <button
                    key={word}
                    type="button"
                    onClick={() => handleWordClick(word)}
                    disabled={selectedWords.includes(word)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedWords.includes(word)
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-purple-700 hover:bg-purple-600 text-white'
                    }`}
                  >
                    {word}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-400">
                Remember these words! You'll need them to log in.
              </p>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || selectedWords.length !== 4}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Creating account...' : 'Sign up'}
            </button>
          </div>

          <div className="text-center">
            <a href="/login" className="text-sm text-purple-400 hover:text-purple-300">
              Already have an account? Sign in
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
