'use client';

import { useState, useRef, useEffect } from 'react';

interface CryptoOption {
  id: string;
  name: string;
  symbol: string;
  icon: string;
  color: string;
}

interface CryptoDropdownProps {
  selected?: CryptoOption | null;
  onSelect: (crypto: CryptoOption) => void;
  disabled?: boolean;
}

const EXODUS_SUPPORTED_CRYPTOS: CryptoOption[] = [
  // Major Coins
  {
    id: 'bitcoin',
    name: 'Bitcoin',
    symbol: 'BTC',
    icon: '₿',
    color: 'from-orange-500 to-orange-600',
  },
  {
    id: 'ethereum',
    name: 'Ethereum',
    symbol: 'ETH',
    icon: 'Ξ',
    color: 'from-blue-500 to-blue-600',
  },
  // Stablecoins
  {
    id: 'usdt',
    name: 'Tether USD',
    symbol: 'USDT',
    icon: '₮',
    color: 'from-green-500 to-green-600',
  },
  {
    id: 'usdc',
    name: 'USD Coin',
    symbol: 'USDC',
    icon: '$',
    color: 'from-cyan-500 to-cyan-600',
  },
  {
    id: 'dai',
    name: 'Dai',
    symbol: 'DAI',
    icon: '◇',
    color: 'from-yellow-500 to-orange-500',
  },
  {
    id: 'busd',
    name: 'Binance USD',
    symbol: 'BUSD',
    icon: '฿',
    color: 'from-yellow-600 to-yellow-700',
  },
  // Layer 1 Blockchains
  {
    id: 'cardano',
    name: 'Cardano',
    symbol: 'ADA',
    icon: '₳',
    color: 'from-blue-600 to-purple-600',
  },
  {
    id: 'solana',
    name: 'Solana',
    symbol: 'SOL',
    icon: '◎',
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 'polkadot',
    name: 'Polkadot',
    symbol: 'DOT',
    icon: '●',
    color: 'from-red-500 to-pink-500',
  },
  {
    id: 'ripple',
    name: 'XRP',
    symbol: 'XRP',
    icon: '✕',
    color: 'from-blue-400 to-blue-500',
  },
  // Other Popular Coins
  {
    id: 'litecoin',
    name: 'Litecoin',
    symbol: 'LTC',
    icon: 'Ł',
    color: 'from-gray-300 to-gray-400',
  },
  {
    id: 'dogecoin',
    name: 'Dogecoin',
    symbol: 'DOGE',
    icon: '🐕',
    color: 'from-yellow-400 to-yellow-500',
  },
  {
    id: 'avalanche',
    name: 'Avalanche',
    symbol: 'AVAX',
    icon: '▲',
    color: 'from-red-600 to-red-700',
  },
  {
    id: 'polygon',
    name: 'Polygon',
    symbol: 'MATIC',
    icon: '◈',
    color: 'from-purple-600 to-indigo-600',
  },
  {
    id: 'optimism',
    name: 'Optimism',
    symbol: 'OP',
    icon: '⊛',
    color: 'from-red-500 to-red-600',
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum',
    symbol: 'ARB',
    icon: '⬜',
    color: 'from-blue-700 to-blue-800',
  },
  {
    id: 'cosmos',
    name: 'Cosmos',
    symbol: 'ATOM',
    icon: '☉',
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 'monero',
    name: 'Monero',
    symbol: 'XMR',
    icon: '₥',
    color: 'from-orange-600 to-red-600',
  },
  {
    id: 'zcash',
    name: 'Zcash',
    symbol: 'ZEC',
    icon: 'ⓩ',
    color: 'from-yellow-500 to-yellow-600',
  },
  {
    id: 'chainlink',
    name: 'Chainlink',
    symbol: 'LINK',
    icon: '🔗',
    color: 'from-blue-600 to-sky-600',
  },
  {
    id: 'uniswap',
    name: 'Uniswap',
    symbol: 'UNI',
    icon: '🦄',
    color: 'from-pink-500 to-rose-500',
  },
  {
    id: 'aave',
    name: 'Aave',
    symbol: 'AAVE',
    icon: '👻',
    color: 'from-indigo-600 to-purple-600',
  },
  {
    id: 'curve',
    name: 'Curve',
    symbol: 'CRV',
    icon: '⟿',
    color: 'from-amber-500 to-amber-600',
  },
  {
    id: 'maker',
    name: 'Maker',
    symbol: 'MKR',
    icon: 'Ⓜ',
    color: 'from-green-600 to-emerald-600',
  },
  {
    id: 'compound',
    name: 'Compound',
    symbol: 'COMP',
    icon: 'ⓒ',
    color: 'from-green-500 to-green-600',
  },
];

export default function CryptoDropdown({ selected, onSelect, disabled = false }: CryptoDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (crypto: CryptoOption) => {
    onSelect(crypto);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-4 py-3 bg-gradient-to-r from-slate-800 to-slate-700 border-2 border-purple-700/50 rounded-lg hover:border-purple-500 transition-all flex items-center justify-between ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gradient-to-r hover:from-slate-700 hover:to-slate-600 cursor-pointer'
        }`}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            {selected ? (
              <>
                <span className="text-2xl">{selected.icon}</span>
                <div className="text-left">
                  <div className="text-sm font-semibold text-gray-200">{selected.name}</div>
                  <div className="text-xs text-gray-400">{selected.symbol}</div>
                </div>
              </>
            ) : (
              <span className="text-gray-400">Select a cryptocurrency...</span>
            )}
          </div>
          <span
            className={`text-purple-400 transition-transform duration-200 text-lg ${
              isOpen ? 'rotate-180' : ''
            }`}
          >
            ▼
          </span>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-slate-900 border-2 border-purple-700/50 rounded-lg shadow-2xl overflow-hidden backdrop-blur-sm max-w-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 px-4 py-4 border-b border-purple-700/30 sticky top-0">
            <h3 className="text-sm font-bold text-purple-300 flex items-center gap-2 mb-2">
              💰 Select Cryptocurrency
            </h3>
            <p className="text-xs text-gray-400">Choose from 24+ supported cryptocurrencies</p>
          </div>

          {/* Options List - All Cryptos Scrollable */}
          <div className="p-2 max-h-96 overflow-y-auto">
            {EXODUS_SUPPORTED_CRYPTOS.map((crypto) => (
              <button
                key={crypto.id}
                onClick={() => handleSelect(crypto)}
                className={`w-full p-3 rounded-lg border-2 transition-all text-left group flex items-center gap-3 mb-2 ${
                  selected?.id === crypto.id
                    ? `bg-gradient-to-r ${crypto.color} border-purple-300 shadow-lg`
                    : 'border-purple-700/30 hover:border-purple-500/60 hover:bg-slate-800/80'
                }`}
              >
                <span className="text-2xl flex-shrink-0">{crypto.icon}</span>
                <div className="flex-grow min-w-0">
                  <div className="text-sm font-bold text-gray-100 group-hover:text-gray-50">
                    {crypto.name}
                  </div>
                  <div className="text-xs text-gray-400 group-hover:text-gray-300">
                    {crypto.symbol}
                  </div>
                </div>
                {selected?.id === crypto.id && (
                  <span className="text-lg">✓</span>
                )}
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-purple-700/30 bg-slate-950/50 sticky bottom-0">
            <p className="text-xs text-gray-500 text-center">
              💳 Secure Payment Processing with Escrow
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
